import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const { email, password, user_id } = await req.json();
    if ((!email && !user_id) || !password) {
      return new Response(JSON.stringify({ error: "email or user_id, and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email ? email.toString().trim().toLowerCase() : "";

    // Find user — prefer direct lookup by user_id (profile id == auth.users.id),
    // since auth.users.email may differ from profiles.email.
    let targetUser: any = null;
    const lookup = {
      tried_user_id: false,
      tried_profile_email: false,
      tried_auth_email_scan: false,
      user_id_found: false,
      profile_email_found: false,
      auth_email_found: false,
      profile_resolved_id: null as string | null,
    };

    // 1) Try by explicit user_id from caller
    if (user_id) {
      lookup.tried_user_id = true;
      const { data, error } = await serviceClient.auth.admin.getUserById(user_id);
      if (!error && data?.user) { targetUser = data.user; lookup.user_id_found = true; }
    }

    // 2) Try resolving via profiles table (profile email -> profile id -> auth user)
    if (!targetUser && normalizedEmail) {
      lookup.tried_profile_email = true;
      const { data: prof } = await serviceClient
        .from("profiles")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      if (prof?.id) {
        lookup.profile_resolved_id = prof.id;
        const { data, error } = await serviceClient.auth.admin.getUserById(prof.id);
        if (!error && data?.user) { targetUser = data.user; lookup.profile_email_found = true; }
      }
    }

    // 3) Fallback: scan auth.users by email (legacy path)
    if (!targetUser && normalizedEmail) {
      lookup.tried_auth_email_scan = true;
      const perPage = 200;
      for (let page = 1; page <= 25; page++) {
        const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users ?? [];
        const found = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (found) { targetUser = found; lookup.auth_email_found = true; break; }
        if (users.length < perPage) break;
      }
    }

    if (!targetUser) {
      const reasons: string[] = [];
      if (lookup.tried_user_id && !lookup.user_id_found) {
        reasons.push(`No existe una cuenta de autenticación con el ID del perfil (${user_id}).`);
      }
      if (lookup.tried_profile_email) {
        if (!lookup.profile_resolved_id) {
          reasons.push(`No se encontró un perfil con el correo "${normalizedEmail}".`);
        } else {
          reasons.push(`El perfil existe (id ${lookup.profile_resolved_id}) pero no tiene cuenta de autenticación asociada.`);
        }
      }
      if (lookup.tried_auth_email_scan && !lookup.auth_email_found) {
        reasons.push(`Ningún usuario de autenticación tiene el correo "${normalizedEmail}".`);
      }
      const detail = reasons.length ? reasons.join(" ") : "No se pudo localizar al usuario.";
      return new Response(JSON.stringify({
        error: `Usuario no encontrado. ${detail}`,
        code: "user_not_found",
        lookup,
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the profile email so we can sync auth.email -> profile.email
    // (admins reset passwords expecting the user to log in with the email shown in the UI,
    // which lives in profiles.email and may differ from auth.users.email).
    let profileEmail: string | null = null;
    try {
      const { data: prof } = await serviceClient
        .from("profiles")
        .select("email")
        .eq("id", targetUser.id)
        .maybeSingle();
      profileEmail = prof?.email ? prof.email.toString().trim().toLowerCase() : null;
    } catch (_) { /* ignore */ }

    const desiredEmail = (normalizedEmail || profileEmail || targetUser.email || "").toLowerCase();
    const currentAuthEmail = (targetUser.email || "").toLowerCase();
    const shouldSyncEmail = !!desiredEmail && desiredEmail !== currentAuthEmail;

    const updatePayload: Record<string, unknown> = {
      password,
      email_confirm: true,
      user_metadata: { ...(targetUser.user_metadata ?? {}), must_change_password: true },
    };
    if (shouldSyncEmail) {
      updatePayload.email = desiredEmail;
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      updatePayload,
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit: password reset
    try {
      const { data: callerProfile } = await serviceClient
        .from("profiles")
        .select("name,email")
        .eq("id", callerId)
        .maybeSingle();
      await serviceClient.from("activity_log").insert({
        user_id: callerId,
        user_name: callerProfile?.name ?? callerProfile?.email ?? "",
        action: "reset_password",
        entity: "user_credentials",
        entity_id: normalizedEmail,
      });
    } catch (e) {
      console.error("activity_log reset_password failed", e);
    }

    // Send credentials email to the user
    let emailStatus: "enviado" | "fallido" = "fallido";
    let emailError: string | null = null;
    try {
      const loginUrl = "https://easyconnectosh.lovable.app/login";
      const recipientEmail = (desiredEmail || targetUser.email || normalizedEmail) as string;
      const message =
        `¡Bienvenido a la Plataforma de Gestión de Objetivos e Indicadores!\n\n` +
        `Te compartimos tus credenciales de acceso:\n` +
        `Usuario: ${recipientEmail}\n` +
        `Contraseña temporal: ${password}\n\n` +
        `Por seguridad, te recomendamos cambiar tu contraseña al iniciar sesión.`;

      const { error: mailErr } = await serviceClient.functions.invoke("send-transactional-email", {
        body: {
          template: "internal_notification",
          to: recipientEmail,
          subject: "Tus credenciales de acceso a EasyConnect OSH",
          data: {
            title: "¡Bienvenido a la Plataforma de Gestión de Objetivos e Indicadores!",
            message,
            actionUrl: loginUrl,
            actionLabel: "Acceder a la plataforma",
          },
        },
      });
      if (mailErr) {
        emailError = mailErr.message ?? "send failed";
      } else {
        emailStatus = "enviado";
      }
    } catch (mailErr) {
      console.error("Failed to send credentials email", mailErr);
      emailError = mailErr instanceof Error ? mailErr.message : "send failed";
    }

    // Audit: credentials email status
    try {
      const { data: callerProfile } = await serviceClient
        .from("profiles")
        .select("name,email")
        .eq("id", callerId)
        .maybeSingle();
      await serviceClient.from("activity_log").insert({
        user_id: callerId,
        user_name: callerProfile?.name ?? callerProfile?.email ?? "",
        action: emailStatus === "enviado" ? "send_credentials_success" : "send_credentials_failed",
        entity: "user_credentials_email",
        entity_id: normalizedEmail + (emailError ? ` | ${emailError}` : ""),
      });
    } catch (e) {
      console.error("activity_log send_credentials failed", e);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUser.id, email_status: emailStatus, email_error: emailError }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});