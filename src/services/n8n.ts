import { supabase } from "./supabase";

export type PrismAutomationEvent =
  | "voucher.created"
  | "inventory.low_stock"
  | "report.daily_summary";

type EventPayload = Record<string, unknown>;

export interface AutomationResult {
  accepted: boolean;
  event_id: string;
}

/** Send an allowlisted event through the authenticated Supabase Edge Function.
 * The n8n URL and shared secret are never included in the browser bundle.
 */
export async function sendAutomationEvent(
  event: PrismAutomationEvent,
  payload: EventPayload,
): Promise<AutomationResult> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error("Sign in before sending automation events");

  const { data, error } = await supabase.functions.invoke("n8n-event-relay", {
    body: { event, payload },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error("Automation event could not be delivered");
  if (!data?.accepted || typeof data?.event_id !== "string") throw new Error("Automation relay returned an unexpected response");
  return data as AutomationResult;
}
