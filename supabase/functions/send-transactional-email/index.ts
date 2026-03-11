import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ReservationConfirmationEmail } from '../_shared/email-templates/reservation-confirmation.tsx'
import { InternalNotificationEmail } from '../_shared/email-templates/internal-notification.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'easyconnectosh'
const SENDER_DOMAIN = 'notify.oshpitalitygroup.com'
const FROM_DOMAIN = 'oshpitalitygroup.com'

const TEMPLATES: Record<string, React.ComponentType<any>> = {
  reservation_confirmation: ReservationConfirmationEmail,
  internal_notification: InternalNotificationEmail,
}

const DEFAULT_SUBJECTS: Record<string, string> = {
  reservation_confirmation: 'Confirmación de reserva',
  internal_notification: 'Notificación interna',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received', { method: req.method, hasAuth: !!req.headers.get('Authorization'), hasApiKey: !!req.headers.get('apikey') })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth: validate user JWT if provided; gateway verify_jwt=false allows internal calls
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const isKnownKey = token === serviceRoleKey || token === anonKey
      if (!isKnownKey) {
        const userSupabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          anonKey!,
          { global: { headers: { Authorization: authHeader } } }
        )
        const { error: claimsError } = await userSupabase.auth.getClaims(token)
        if (claimsError) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const body = await req.json()
    const { template, to, subject, data } = body

    if (!template || !to) {
      return new Response(JSON.stringify({ error: 'Missing required fields: template, to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const EmailTemplate = TEMPLATES[template]
    if (!EmailTemplate) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const templateProps = { siteName: SITE_NAME, siteUrl: `https://${FROM_DOMAIN}`, ...data }
    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

    const messageId = crypto.randomUUID()

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: template,
      recipient_email: to,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: subject || DEFAULT_SUBJECTS[template] || 'Notificación',
        html,
        text,
        purpose: 'transactional',
        label: template,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue transactional email', { error: enqueueError, template })
      await supabase.from('email_send_log').update({ status: 'failed', error_message: 'Failed to enqueue' })
        .eq('message_id', messageId)
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Transactional email enqueued', { template, to, messageId })

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-transactional-email:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
