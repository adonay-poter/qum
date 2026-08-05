import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Polyfill for Deno.writeAll (removed in Deno 2.x, needed by the smtp library)
// @ts-ignore - Deno namespace-level assignment
if (!Deno.writeAll) {
  // @ts-ignore
  Deno.writeAll = async (writer: { write(p: Uint8Array): Promise<number> }, data: Uint8Array): Promise<void> => {
    while (data.length > 0) {
      const n = await writer.write(data);
      data = data.subarray(n);
    }
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Restrict to POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  // Custom SMTP credentials (provided by the user via Supabase Secrets)
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPortRaw = Deno.env.get("SMTP_PORT");
  const smtpUsername = Deno.env.get("SMTP_USERNAME");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const senderEmail = Deno.env.get("SENDER_EMAIL");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing backend configuration" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let email: string;
  try {
    const body = await req.json();
    email = body?.email?.trim().toLowerCase();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Simple email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: "Please provide a valid email address." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Insert into waitlist database table
  const { error: dbError } = await supabase
    .from("waitlist")
    .insert([{ email }]);

  if (dbError) {
    // Unique violation in Postgres is SQLSTATE 23505
    if (dbError.code === "23505") {
      return new Response(
        JSON.stringify({ ok: true, emailSent: false }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "An internal error occurred." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 2. Dispatch welcome email if SMTP credentials are set
  let emailSent = false;
  let emailWarning: string | null = null;

  if (smtpHost && smtpUsername && smtpPassword) {
    const parsedPort = parseInt(smtpPortRaw || "", 10);
    const port = !isNaN(parsedPort) ? parsedPort : 587;
    const fromAddress = senderEmail?.trim() || smtpUsername;

    console.log(
      `[join-waitlist] SMTP configured: host=${smtpHost} port=${port} user=${smtpUsername} sender=${fromAddress}`,
    );

    try {
      // Dynamically load the custom HTML template file
      const templateUrl = new URL("./welcome-template.html", import.meta.url);
      let emailHtml: string;
      try {
        emailHtml = await Deno.readTextFile(templateUrl);
      } catch (fileErr) {
        const msg = `Welcome email template not found at ${templateUrl.pathname}`;
        console.error(`[join-waitlist] ${msg}`, fileErr);
        emailWarning = msg;
        throw fileErr;
      }

      const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");
      const smtpClient = new SmtpClient();

      console.log(`[join-waitlist] Connecting to SMTP ${smtpHost}:${port}...`);
      if (port === 465) {
        await smtpClient.connectTLS({
          hostname: smtpHost,
          port,
          username: smtpUsername,
          password: smtpPassword,
        });
      } else {
        await smtpClient.connect({
          hostname: smtpHost,
          port,
          username: smtpUsername,
          password: smtpPassword,
        });
      }
      console.log(`[join-waitlist] Connected successfully`);

      console.log(`[join-waitlist] Sending welcome email to ${email}...`);
      await smtpClient.send({
        from: `QUM Waitlist <${fromAddress}>`,
        to: email,
        subject: "You're on the list! Welcome to QUM",
        html: emailHtml,
      });
      console.log(`[join-waitlist] Email sent to ${email}`);

      await smtpClient.close();
      emailSent = true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      console.error(`[join-waitlist] SMTP failed for ${email}: ${errMsg}`, errStack || "");
      if (!emailWarning) {
        emailWarning = `SMTP dispatch failed: ${errMsg}`;
      }
    }
  } else {
    emailWarning = "SMTP credentials (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD) not fully configured. Welcome email skipped.";
    console.warn(`[join-waitlist] ${emailWarning}`);
  }

  console.log(
    `[join-waitlist] Done: email=${email} ok=true emailSent=${emailSent}${emailWarning ? ` warning="${emailWarning}"` : ""}`,
  );

  // 3. Return success response
  return new Response(
    JSON.stringify({
      ok: true,
      emailSent,
      ...(emailWarning && { warning: emailWarning }),
    }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
