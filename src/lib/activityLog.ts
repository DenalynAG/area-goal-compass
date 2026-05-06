import { supabase } from "@/integrations/supabase/client";

/**
 * Inserta un registro en activity_log para auditoría.
 * Falla silenciosamente para no bloquear la operación principal.
 */
export async function logActivity(
  action: string,
  entity: string,
  entity_id?: string | null,
  extra?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let user_name = "";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name,email")
        .eq("id", user.id)
        .maybeSingle();
      user_name = (profile?.name || profile?.email || user.email || "") as string;
    } catch {
      user_name = user.email || "";
    }
    const finalAction = extra ? `${action} ${JSON.stringify(extra)}` : action;
    await supabase.from("activity_log").insert({
      user_id: user.id,
      user_name,
      action: finalAction,
      entity,
      entity_id: entity_id ? String(entity_id) : "",
    });
  } catch (e) {
    console.warn("logActivity failed", e);
  }
}