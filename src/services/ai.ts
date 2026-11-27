import { supabase } from './supabase';

/** Invoke the authenticated server-side Gemini proxy. Never pass API keys from the browser. */
export async function invokeAI<T extends Record<string, unknown>>(
  action: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  if (!supabase) {
    throw new Error('Secure AI service is unavailable because Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { action, payload },
  });

  if (error) {
    throw new Error('Secure AI service is unavailable. Deploy the gemini-proxy Edge Function and configure GEMINI_API_KEY in Supabase secrets.');
  }
  if (!data || typeof data !== 'object' || data.error) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'The secure AI service returned an invalid response.');
  }
  return data as T;
}
