import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://easyconnectosh.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { finding_id } = await req.json()
    if (!finding_id) {
      return new Response(JSON.stringify({ error: 'finding_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Identify caller
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await userClient.auth.getUser()
    const callerId = userData?.user?.id ?? null

    const admin = createClient(supabaseUrl, serviceKey)

    // Load finding + plan
    const { data: finding, error: fErr } = await admin
      .from('audit_findings')
      .select('id, description, severity, audit_plan_id, due_date')
      .eq('id', finding_id)
      .single()
    if (fErr || !finding) {
      return new Response(JSON.stringify({ error: 'Finding not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: plan } = await admin
      .from('audit_plans')
      .select('id, title, area_id, subarea_id')
      .eq('id', finding.audit_plan_id)
      .single()

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve area & subarea leaders
    const recipients = new Set<string>()

    const { data: area } = await admin
      .from('areas').select('name, leader_user_id').eq('id', plan.area_id).single()
    if (area?.leader_user_id) recipients.add(area.leader_user_id)

    let subareaName = ''
    if (plan.subarea_id) {
      const { data: sub } = await admin
        .from('subareas').select('name, leader_user_id').eq('id', plan.subarea_id).single()
      if (sub?.leader_user_id) recipients.add(sub.leader_user_id)
      subareaName = sub?.name ?? ''
    }

    // Exclude caller
    if (callerId) recipients.delete(callerId)

    if (recipients.size === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = Array.from(recipients)
    const { data: profiles } = await admin
      .from('profiles').select('id, name, email').in('id', userIds)

    const areaLabel = [area?.name, subareaName].filter(Boolean).join(' / ')
    const title = `Nuevo hallazgo registrado (${finding.severity})`
    const body = `Se registró un nuevo hallazgo en ${areaLabel || 'tu área'} dentro de la auditoría "${plan.title}": ${finding.description}`
    const actionUrl = `${APP_URL}/calidad/auditorias`

    // In-app notifications
    const notifRows = userIds.map((uid) => ({
      user_id: uid,
      type: 'audit_finding',
      title,
      body,
      link: '/calidad/auditorias',
      created_by: callerId,
    }))
    await admin.from('notifications').insert(notifRows)

    // Emails
    let emailsSent = 0
    for (const p of profiles ?? []) {
      if (!p.email) continue
      try {
        await admin.functions.invoke('send-transactional-email', {
          body: {
            template: 'internal_notification',
            to: p.email,
            subject: `Nuevo hallazgo de auditoría — ${areaLabel || 'tu área'}`,
            data: {
              title,
              message: `Hola ${p.name ?? ''},\n\n${body}${finding.due_date ? `\n\nFecha compromiso: ${finding.due_date}` : ''}`,
              actionUrl,
              actionLabel: 'Ver en EasyConnect OSH',
            },
          },
        })
        emailsSent++
      } catch (e) {
        console.error('email send failed', p.email, e)
      }
    }

    return new Response(JSON.stringify({ ok: true, notified: userIds.length, emailsSent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('notify-new-finding error', e)
    const msg = e instanceof Error ? e.message : 'unknown'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})