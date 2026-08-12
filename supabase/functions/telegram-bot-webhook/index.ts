const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const message = update?.message;
  if (!message || !message.text) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const chatId = message.chat.id;
  const telegramUser = message.from;
  const text = message.text.trim();

  // Match /start auth_<session_code>
  const match = text.match(/^\/start\s+auth_([a-zA-Z0-9_-]+)/);

  if (match) {
    const sessionCode = match[1];

    try {
      // 1. Find pending session from REST API
      const nowIso = new Date().toISOString();
      const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/telegram_auth_sessions?session_code=eq.${sessionCode}&status=eq.pending&expires_at=gt.${nowIso}&select=*`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );

      const sessionRows = await sessionRes.json();
      const sessionRow = sessionRows?.[0];

      if (!sessionRow) {
        if (botToken) {
          await sendTelegramMessage(
            botToken,
            chatId,
            "⚠️ *This login link has expired or is invalid.* Please return to Qum and click 'Login with Telegram' again."
          );
        }
        return new Response("Session expired or invalid", { status: 200, headers: corsHeaders });
      }

      // 2. Derive valid email and secure deterministic password for Telegram user
      const virtualEmail = `telegram_${telegramUser.id}@qum.app`;
      const securePassword = `TgP@ss_${telegramUser.id}_${serviceRoleKey.slice(0, 16)}`;
      const metadata = {
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        first_name: telegramUser.first_name ?? null,
        last_name: telegramUser.last_name ?? null,
        auth_provider: "telegram",
      };

      let userId: string | null = null;

      // Check if user exists by listing users
      const listUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (listUsersRes.ok) {
        const listData = await listUsersRes.json();
        const existing = listData?.users?.find(
          (u: any) => u.email === virtualEmail || u.user_metadata?.telegram_id === telegramUser.id
        );
        if (existing) {
          userId = existing.id;
          // Update password & metadata
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: "PUT",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: securePassword,
              email_confirm: true,
              user_metadata: { ...existing.user_metadata, ...metadata },
            }),
          });
        }
      }

      if (!userId) {
        // Create user
        const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: virtualEmail,
            password: securePassword,
            email_confirm: true,
            user_metadata: metadata,
          }),
        });

        const newUserData = await createRes.json();
        if (!createRes.ok || !newUserData?.id) {
          console.error("User creation failed:", newUserData);
          if (botToken) {
            const errDetail = newUserData?.msg || newUserData?.message || newUserData?.error_description || "Unknown";
            await sendTelegramMessage(botToken, chatId, `❌ User creation failed: ${errDetail}`);
          }
          return new Response("Create user failed", { status: 200, headers: corsHeaders });
        }
        userId = newUserData.id;
      }

      // 3. Obtain Access & Refresh tokens via generate_link + verify OTP OR Password Grant
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let errDetail = "";

      // Strategy A: Admin generate_link
      const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          email: virtualEmail,
        }),
      });

      const linkData = await linkRes.json();
      const tokenHash = linkData?.properties?.hashed_token;

      if (linkRes.ok && tokenHash) {
        const otpRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "magiclink",
            token_hash: tokenHash,
          }),
        });
        const otpData = await otpRes.json();
        if (otpRes.ok && otpData?.access_token) {
          accessToken = otpData.access_token;
          refreshToken = otpData.refresh_token;
        } else {
          errDetail = otpData?.msg || otpData?.error_description || JSON.stringify(otpData);
        }
      } else {
        errDetail = linkData?.msg || linkData?.message || linkData?.error_description || JSON.stringify(linkData);
      }

      // Strategy B: Password grant fallback
      if (!accessToken || !refreshToken) {
        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: virtualEmail,
            password: securePassword,
          }),
        });

        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData?.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token;
        } else {
          errDetail = tokenData?.error_description || tokenData?.msg || tokenData?.message || errDetail;
        }
      }

      if (!accessToken || !refreshToken) {
        console.error("Token generation failed:", errDetail);
        if (botToken) {
          await sendTelegramMessage(botToken, chatId, `❌ Session token failed: ${errDetail}`);
        }
        return new Response("Token gen failed", { status: 200, headers: corsHeaders });
      }

      // 4. Update telegram_auth_sessions to 'approved'
      await fetch(`${supabaseUrl}/rest/v1/telegram_auth_sessions?id=eq.${sessionRow.id}`, {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "approved",
          telegram_id: telegramUser.id,
          telegram_username: telegramUser.username ?? null,
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      });

      // 5. Send success response back to Telegram user
      if (botToken) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🎉 *Successfully Authenticated!*\n\nYou are now logged into *Qum*. Switch back to your browser to continue.`,
          [
            [
              {
                text: "🚀 Open Qum Web App",
                url: "https://qum.ethiodeploy.com/",
              },
            ],
          ]
        );
      }
    } catch (e: any) {
      console.error("Error in telegram-bot-webhook:", e);
      if (botToken) {
        await sendTelegramMessage(botToken, chatId, `❌ Internal error: ${e?.message ?? String(e)}`);
      }
    }
  } else if (text.startsWith("/start")) {
    if (botToken) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `👋 *Welcome to Qum Bot!*\n\nTo log in to Qum, visit our website and tap *Login with Telegram*.`,
        [
          [
            {
              text: "🌐 Open Qum App",
              url: "https://qum.ethiodeploy.com/",
            },
          ],
        ]
      );
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  inlineKeyboard?: Array<Array<{ text: string; url: string }>>
) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}
