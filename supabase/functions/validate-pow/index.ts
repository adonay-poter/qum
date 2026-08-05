import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Free models that accept JSON-style instructions (text tasks) */
const TEXT_MODEL = "google/gemma-2-9b-it:free";
/** Vision-capable free model for camera proof */
const VISION_MODEL = "google/gemma-3-27b-it:free";

interface PowRequest {
  mode: "text" | "image";
  taskPrompt: string;
  text?: string;
  imageBase64?: string;
}

interface PowResponse {
  isValid: boolean;
  reason: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a strict proof-of-work validator for an anti-addiction app.
You MUST reply with exactly one JSON object and nothing else.
Format: {"isValid":true,"reason":"short explanation"}
or {"isValid":false,"reason":"short explanation"}
Use boolean true/false for isValid, not strings.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
  if (!apiKey) {
    return json({ isValid: false, reason: "OPENROUTER_API_KEY not configured on server." }, 500);
  }

  let body: PowRequest;
  try {
    body = await req.json();
  } catch {
    return json({ isValid: false, reason: "Invalid JSON body." }, 400);
  }

  const isImage = body.mode === "image";
  const model = isImage ? VISION_MODEL : TEXT_MODEL;

  let userContent: unknown;
  if (!isImage) {
    userContent =
      `Task: ${body.taskPrompt}\n\nUser answer:\n${body.text ?? ""}\n\nDoes this answer the task with honest effort? Reply JSON only.`;
  } else {
    const imageUrl = body.imageBase64?.startsWith("data:")
      ? body.imageBase64
      : `data:image/jpeg;base64,${body.imageBase64 ?? ""}`;
    userContent = [
      {
        type: "text",
        text: `Task: ${body.taskPrompt}\n\nDoes this image show real proof of the task? Reply JSON only.`,
      },
      { type: "image_url", image_url: { url: imageUrl } },
    ];
  }

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://arch.app",
        "X-Title": "Arch PoW Validator",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: 256,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    const errText = await upstream.text();

    if (!upstream.ok) {
      console.error("OpenRouter error", upstream.status, errText);
      return json(
        {
          isValid: false,
          reason: `AI provider error (${upstream.status}). Check model and API key.`,
        },
        502,
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(errText);
    } catch {
      console.error("OpenRouter non-JSON", errText.slice(0, 300));
      return json({ isValid: false, reason: "Invalid response from AI provider." }, 502);
    }

    const raw = extractAssistantText(payload);
    const parsed = parsePowFromModel(raw);

    if (parsed) return json(parsed, 200);

    console.error("Unparseable model output:", raw.slice(0, 500));
    return json(
      {
        isValid: false,
        reason: "Could not parse AI response. Try again or rephrase your proof.",
      },
      200,
    );
  } catch (e) {
    console.error(e);
    return json({ isValid: false, reason: "Validation request failed." }, 500);
  }
});

function extractAssistantText(payload: Record<string, unknown>): string {
  const choices = payload.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: string }).text);
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

function parsePowFromModel(raw: string): PowResponse | null {
  const stripped = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/g, "")
    .trim();

  const jsonCandidates = [stripped, ...findJsonObjects(stripped)];

  for (const candidate of jsonCandidates) {
    const parsed = tryParseObject(candidate);
    if (parsed) return parsed;
  }

  return inferFromPlainText(stripped);
}

function findJsonObjects(text: string): string[] {
  const results: string[] = [];
  const re = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push(m[0]);
  }
  return results;
}

function tryParseObject(text: string): PowResponse | null {
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    return normalizePow(obj);
  } catch {
    return null;
  }
}

function normalizePow(obj: Record<string, unknown>): PowResponse | null {
  const isValidRaw =
    obj.isValid ??
    obj.valid ??
    obj.is_valid ??
    obj.passed ??
    obj.approved;

  const reasonRaw = obj.reason ?? obj.message ?? obj.explanation ?? obj.feedback;

  const isValid = coerceBool(isValidRaw);
  if (isValid === null) return null;

  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim()
      ? reasonRaw.trim()
      : isValid
        ? "Task accepted."
        : "Task rejected.";

  return { isValid, reason };
}

function coerceBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "1", "valid", "pass", "passed", "approve", "approved"].includes(v)) {
      return true;
    }
    if (["false", "no", "0", "invalid", "fail", "failed", "reject", "rejected"].includes(v)) {
      return false;
    }
  }
  return null;
}

function inferFromPlainText(text: string): PowResponse | null {
  const lower = text.toLowerCase();
  if (!lower) return null;

  const negative =
    /\b(invalid|not valid|does not|doesn't|reject|rejected|fail|failed|insufficient|lazy|blank|unrelated|no)\b/.test(
      lower,
    );
  const positive =
    /\b(valid|acceptable|passes|passed|approve|approved|sufficient|honest effort|yes)\b/.test(
      lower,
    );

  if (positive && !negative) {
    return { isValid: true, reason: "Approved by AI." };
  }
  if (negative) {
    return { isValid: false, reason: text.slice(0, 200) };
  }
  return null;
}

function json(data: PowResponse, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
