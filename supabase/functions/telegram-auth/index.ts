import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHash, createHmac } from "node:crypto";

interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: TelegramAuthPayload;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON request body", 400);
  }

  const { hash, ...fields } = body;
  if (!hash || !fields.id || !fields.auth_date) {
    return jsonError("Missing required Telegram auth fields (id, auth_date, hash)", 400);
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  
  if (botToken) {
    // 1. Verify HMAC-SHA256 signature
    const isValid = verifyTelegramSignature(fields, hash, botToken);
    if (!isValid) {
      return jsonError("Invalid Telegram authentication signature", 401);
    }

    // 2. Verify auth_date freshness (must be within 24 hours / 86400s)
    const now = Math.floor(Date.now() / 1000);
    if (now - fields.auth_date > 86400) {
      return jsonError("Telegram login token has expired (auth_date too old)", 401);
    }
  } else {
    console.warn("TELEGRAM_BOT_TOKEN is not configured on Supabase Edge Function environment.");
  }

  // 3. Initialize Supabase Admin Client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError("Supabase environment variables (URL/SERVICE_ROLE_KEY) missing on server", 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const virtualEmail = `telegram_${fields.id}@telegram.qum`;
  const metadata = {
    telegram_id: fields.id,
    telegram_username: fields.username ?? null,
    first_name: fields.first_name ?? null,
    last_name: fields.last_name ?? null,
    photo_url: fields.photo_url ?? null,
    auth_provider: "telegram",
  };

  try {
    // Check if user exists or create them
    let userId: string | null = null;
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!listError && userList?.users) {
      const existingUser = userList.users.find(
        (u) => u.email === virtualEmail || u.user_metadata?.telegram_id === fields.id
      );
      if (existingUser) {
        userId = existingUser.id;
        // Update metadata if needed
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { ...existingUser.user_metadata, ...metadata },
        });
      }
    }

    if (!userId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (createError || !newUser.user) {
        console.error("Error creating user for Telegram login:", createError);
        return jsonError(`Failed to create user account: ${createError?.message ?? 'Unknown error'}`, 500);
      }
      userId = newUser.user.id;
    }

    // Generate magic link token hash to mint session for client
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: virtualEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Error generating auth link:", linkError);
      return jsonError("Failed to generate authentication session", 500);
    }

    // Exchange token_hash for active session tokens
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (sessionError || !sessionData?.session) {
      console.error("Error verifying OTP for session:", sessionError);
      return jsonError("Failed to verify session token", 500);
    }

    return new Response(
      JSON.stringify({
        session: sessionData.session,
        user: sessionData.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in telegram-auth edge function:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return jsonError(msg, 500);
  }
});

function verifyTelegramSignature(
  fields: Record<string, unknown>,
  hash: string,
  botToken: string
): boolean {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(fields).sort();
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${String(fields[key])}`)
    .join("\n");

  // Secret key is SHA256 of Telegram Bot Token
  const secretKey = createHash("sha256").update(botToken).digest();

  // HMAC-SHA256 signature
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash.toLowerCase() === hash.toLowerCase();
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
