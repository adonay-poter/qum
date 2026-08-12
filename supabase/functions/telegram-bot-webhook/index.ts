import { createClient } from "jsr:@supabase/supabase-js@2";

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const message = update.message;
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
      // Find pending session
      const { data: sessionRow, error: sessionErr } = await supabaseAdmin
        .from("telegram_auth_sessions")
        .select("*")
        .eq("session_code", sessionCode)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sessionErr || !sessionRow) {
        if (botToken) {
          await sendTelegramMessage(botToken, chatId, "⚠️ *This login link has expired or is invalid.* Please return to Qum and try clicking 'Login with Telegram' again.");
        }
        return new Response("Session expired or invalid", { status: 200, headers: corsHeaders });
      }

      // Create or locate user
      const virtualEmail = `telegram_${telegramUser.id}@telegram.qum`;
      const metadata = {
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        first_name: telegramUser.first_name ?? null,
        last_name: telegramUser.last_name ?? null,
        auth_provider: "telegram",
      };

      let userId: string | null = null;
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      if (userList?.users) {
        const existing = userList.users.find(
          (u) => u.email === virtualEmail || u.user_metadata?.telegram_id === telegramUser.id
        );
        if (existing) {
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...existing.user_metadata, ...metadata },
          });
        }
      }

      if (!userId) {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: virtualEmail,
          email_confirm: true,
          user_metadata: metadata,
        });

        if (createErr || !newUser.user) {
          console.error("User creation error:", createErr);
          if (botToken) {
            await sendTelegramMessage(botToken, chatId, "❌ Could not create account. Please try again.");
          }
          return new Response("Create user failed", { status: 200, headers: corsHeaders });
        }
        userId = newUser.user.id;
      }

      // Mint session tokens
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: virtualEmail,
      });

      if (linkErr || !linkData?.properties?.hashed_token) {
        console.error("Link generation error:", linkErr);
        if (botToken) {
          await sendTelegramMessage(botToken, chatId, "❌ Login generation failed.");
        }
        return new Response("Link gen failed", { status: 200, headers: corsHeaders });
      }

      const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (sessionErr || !sessionData?.session) {
        console.error("Session verification error:", sessionErr);
        if (botToken) {
          await sendTelegramMessage(botToken, chatId, "❌ Session verification failed.");
        }
        return new Response("Session verify failed", { status: 200, headers: corsHeaders });
      }

      // Update telegram_auth_sessions to 'approved' with tokens
      await supabaseAdmin
        .from("telegram_auth_sessions")
        .update({
          status: "approved",
          telegram_id: telegramUser.id,
          telegram_username: telegramUser.username ?? null,
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        })
        .eq("id", sessionRow.id);

      // Reply back to Telegram user
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
    } catch (e) {
      console.error("Error handling Telegram bot auth:", e);
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
