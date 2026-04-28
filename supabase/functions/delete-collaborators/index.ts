import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runStep(label: string, request: Promise<{ error: any }>) {
  const { error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function deleteCollaborator(serviceClient: any, id: string) {
  const { data: profile, error: profileLookupError } = await serviceClient
    .from("profiles")
    .select("id,name,email")
    .eq("id", id)
    .maybeSingle();

  if (profileLookupError) throw new Error(`Consulta de perfil: ${profileLookupError.message}`);
  if (!profile) return { id, name: "", status: "failed", reason: "No se encontró el perfil" };

  const { data: evaluations, error: evaluationsError } = await serviceClient
    .from("evaluations")
    .select("id")
    .or(`collaborator_user_id.eq.${id},evaluator_user_id.eq.${id}`);

  if (evaluationsError) throw new Error(`Consulta de evaluaciones: ${evaluationsError.message}`);

  const evaluationIds = (evaluations ?? []).map((evaluation: { id: string }) => evaluation.id);
  if (evaluationIds.length > 0) {
    await runStep("Puntajes de evaluación", serviceClient.from("evaluation_scores").delete().in("evaluation_id", evaluationIds));
  }

  await runStep("Áreas lideradas", serviceClient.from("areas").update({ leader_user_id: null }).eq("leader_user_id", id));
  await runStep("Subáreas lideradas", serviceClient.from("subareas").update({ leader_user_id: null }).eq("leader_user_id", id));
  await runStep("Objetivos asignados", serviceClient.from("objectives").update({ owner_user_id: null }).eq("owner_user_id", id));
  await runStep("Mediciones KPI", serviceClient.from("kpi_measurements").update({ created_by: null }).eq("created_by", id));
  await runStep("Muestreos", serviceClient.from("sampling_records").update({ created_by: null }).eq("created_by", id));
  await runStep("Control de acceso acompañante", serviceClient.from("access_control").update({ companion_user_id: null }).eq("companion_user_id", id));
  await runStep("Control de acceso creador", serviceClient.from("access_control").update({ created_by: null }).eq("created_by", id));
  await runStep("Movimientos de activos colaborador", serviceClient.from("asset_movements").update({ collaborator_user_id: null }).eq("collaborator_user_id", id));
  await runStep("Movimientos de activos creador", serviceClient.from("asset_movements").update({ created_by: null }).eq("created_by", id));
  await runStep("Asignaciones de comfort", serviceClient.from("comfort_assignments").update({ assigned_user_id: null }).eq("assigned_user_id", id));
  await runStep("Asignaciones de comfort creadas", serviceClient.from("comfort_assignments").update({ created_by: null }).eq("created_by", id));
  await runStep("Hallazgos de auditoría", serviceClient.from("audit_findings").update({ responsible_user_id: null }).eq("responsible_user_id", id));
  await runStep("Evidencias revisadas", serviceClient.from("evidences").update({ reviewed_by: null }).eq("reviewed_by", id));
  await runStep("Evidencias cargadas", serviceClient.from("evidences").delete().eq("uploaded_by", id));
  await runStep("Comentarios newsletter", serviceClient.from("newsletter_comments").delete().eq("user_id", id));
  await runStep("Publicaciones newsletter creadas", serviceClient.from("newsletter_posts").update({ created_by: null }).eq("created_by", id));
  await runStep("Publicaciones newsletter dirigidas", serviceClient.from("newsletter_posts").update({ target_user_id: null }).eq("target_user_id", id));
  await runStep("Notificaciones creadas", serviceClient.from("notifications").update({ created_by: null }).eq("created_by", id));
  await runStep("Notificaciones", serviceClient.from("notifications").delete().eq("user_id", id));
  await runStep("Reconocimientos", serviceClient.from("recognition_posts").delete().or(`nominee_user_id.eq.${id},nominated_by.eq.${id}`));
  await runStep("Evaluaciones", serviceClient.from("evaluations").delete().or(`collaborator_user_id.eq.${id},evaluator_user_id.eq.${id}`));
  await runStep("Leader Pass", serviceClient.from("leader_pass_records").delete().eq("user_id", id));
  await runStep("Membresías", serviceClient.from("memberships").delete().eq("user_id", id));
  await runStep("Roles", serviceClient.from("user_roles").delete().eq("user_id", id));
  await runStep("Bitácora", serviceClient.from("activity_log").update({ user_id: null }).eq("user_id", id));

  const { data: deletedRows, error: deleteError } = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", id)
    .select("id");

  if (deleteError) throw new Error(`Perfil: ${deleteError.message}`);
  if (!deletedRows?.length) return { id, name: profile.name ?? "", status: "failed", reason: "El perfil no fue eliminado" };

  const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(id);
  if (authDeleteError && !authDeleteError.message?.toLowerCase().includes("not found")) {
    console.warn("Auth user could not be deleted", { id, error: authDeleteError.message });
  }

  return { id, name: profile.name ?? "", status: "deleted", reason: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    const callerId = userData?.user?.id;
    if (userError || !callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: roleCheck } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: requires super_admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? Array.from(new Set(body.ids.filter((id: unknown) => typeof id === "string" && uuidPattern.test(id))))
      : [];

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "No valid collaborator ids provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const id of ids) {
      if (id === callerId) {
        results.push({ id, name: "Tu usuario", status: "skipped", reason: "Se omitió el usuario actual" });
        continue;
      }

      try {
        results.push(await deleteCollaborator(serviceClient, id));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Error desconocido";
        results.push({ id, name: "", status: "failed", reason });
      }
    }

    const deleted = results.filter((result) => result.status === "deleted").length;
    const failed = results.filter((result) => result.status === "failed").length;
    const skipped = results.filter((result) => result.status === "skipped").length;

    return new Response(JSON.stringify({ requested: ids.length, deleted, failed, skipped, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});