import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { buildAIRequest, extractGeminiText, parseInvoiceExtraction } from '../_shared/aiProxy.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://prism-erp.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getAllowedOrigins(): Set<string> {
  const configured = Deno.env.get('AI_ALLOWED_ORIGINS');
  return new Set(configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS);
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const cors: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (origin && !allowedOrigins.has(origin)) return jsonResponse({ error: 'Origin not allowed.' }, 403, cors);
  if (origin) cors['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS') return new Response('ok', { status: 204, headers: cors });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication required.' }, 401, cors);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ error: 'AI authentication is not configured.' }, 503, cors);

  // verify_jwt is enabled at the gateway; getUser also rejects an anon key used as a bearer token.
  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await authClient.auth.getUser(authorization.slice(7));
    if (error || !user) return jsonResponse({ error: 'A valid signed-in user session is required.' }, 401, cors);
  } catch {
    return jsonResponse({ error: 'Unable to verify the user session.' }, 401, cors);
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) return jsonResponse({ error: 'AI service is not configured. Set GEMINI_API_KEY in Supabase function secrets.' }, 503, cors);
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415, cors);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ error: 'Unable to read request body.' }, 400, cors);
  }
  if (new TextEncoder().encode(rawBody).byteLength > 8_000_000) {
    return jsonResponse({ error: 'Request payload is too large.' }, 413, cors);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, cors);
  }

  let aiRequest;
  try {
    aiRequest = buildAIRequest(body);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid AI request.' }, 400, cors);
  }

  if (aiRequest.action === 'health') return jsonResponse({ ok: true }, 200, cors);

  const providerBody: Record<string, unknown> = {
    contents: aiRequest.contents,
    generationConfig: aiRequest.generationConfig,
  };
  if (aiRequest.systemInstruction) {
    providerBody.systemInstruction = { parts: [{ text: aiRequest.systemInstruction }] };
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + aiRequest.model + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
        body: JSON.stringify(providerBody),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    return jsonResponse({ error: 'The AI provider could not be reached. Please try again.' }, 502, cors);
  }

  if (!providerResponse.ok) {
    // Do not return or log the provider body: it can contain sensitive request metadata.
    return jsonResponse({ error: 'The AI provider could not complete this request.' }, 502, cors);
  }

  let providerData: unknown;
  try {
    providerData = await providerResponse.json();
  } catch {
    return jsonResponse({ error: 'The AI provider returned an invalid response.' }, 502, cors);
  }

  try {
    const generatedText = extractGeminiText(providerData);
    if (aiRequest.action === 'invoice-extraction') {
      return jsonResponse({ invoice: parseInvoiceExtraction(generatedText) }, 200, cors);
    }
    return jsonResponse({ text: generatedText }, 200, cors);
  } catch {
    return jsonResponse({ error: 'The AI provider returned an unusable response. Please retry or enter the details manually.' }, 502, cors);
  }
});
