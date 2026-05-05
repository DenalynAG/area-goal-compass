import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await service
      .from("user_roles").select("role")
      .eq("user_id", callerId).eq("role", "super_admin").maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profile_id, email, password, role, name } = await req.json();
    if (!profile_id || !email || !password || !role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toString().trim().toLowerCase();

    // Try to create auth user with the same id as profile
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      id: profile_id,
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? "" },
    });

    let userId = created?.user?.id;
    if (createErr) {
      // If exists, find by email and update password
      let existing: any = null;
      for (let page = 1; page <= 25; page++) {
        const { data } = await service.auth.admin.listUsers({ page, perPage: 200 });
        const users = data?.users ?? [];
        existing = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (existing) break;
        if (users.length < 200) break;
      }
      if (!existing) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existing.id;
      await service.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }

    // Ensure profile id matches userId — if profile exists with different id, keep it; else handled by trigger
    // Assign role
    await service.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ user_id: userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});