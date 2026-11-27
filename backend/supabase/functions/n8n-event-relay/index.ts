import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const allowedEvents = new Set([
  "voucher.created",
  "inventory.low_stock",
  "report.daily_summary",
]);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "Authentication required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (!supabaseUrl || !anonKey) {
    return json(500, { error: "Supabase function configuration is incomplete" });
  }
  if (!webhookUrl) {
    return json(503, { error: "n8n integration is not configured" });
  }

  let destination: URL;
  try {
    destination = new URL(webhookUrl);
  } catch {
    return json(500, { error: "N8N_WEBHOOK_URL must be a valid URL" });
  }
  if (destination.protocol !== "https:" && destination.hostname !== "localhost") {
    return json(500, { error: "n8n webhook URL must use HTTPS" });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json(401, { error: "Invalid or expired session" });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json(400, { error: "Request body must be valid JSON" });
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json(400, { error: "Request body must be an object" });
  }
  const body = input as Record<string, unknown>;
  if (typeof body.event !== "string" || !allowedEvents.has(body.event)) {
    return json(400, { error: "Unsupported event type" });
  }
  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return json(400, { error: "Payload must be an object" });
  }

  const serializedPayload = JSON.stringify(body.payload);
  if (serializedPayload.length > 16_000) {
    return json(413, { error: "Payload exceeds the 16 KB limit" });
  }

  const envelope = {
    id: crypto.randomUUID(),
    event: body.event,
    occurred_at: new Date().toISOString(),
    actor: { user_id: user.id },
    payload: body.payload,
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) headers["X-PrismERP-Webhook-Secret"] = webhookSecret;

    const response = await fetch(destination, {
      method: "POST",
      headers,
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error("n8n webhook returned status", response.status);
      return json(502, { error: "Automation endpoint rejected the event" });
    }
    return json(202, { accepted: true, event_id: envelope.id });
  } catch (error) {
    console.error("n8n webhook delivery failed", error);
    return json(502, { error: "Could not deliver event to automation endpoint" });
  }
});
