// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('CHATWOOT_WEBHOOK_SECRET') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chatwoot-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('x-chatwoot-signature') || ''
      if (signature !== WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
    }

    const payload = await req.json()
    const event = payload.event
    console.log('Evento recebido:', event)

    // -----------------------------------------------------------------------
    // EVENTO: message_created (Incoming)
    // -----------------------------------------------------------------------
    if (event === 'message_created') {
      // Ignorar se não for mensagem recebida (evitar loop quando o agente responde)
      if (payload.message_type !== 'incoming') {
        return new Response(JSON.stringify({ message: 'Mensagem de saída, ignorado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      const contact = payload.sender || {}
      const chatwoot_contact_id = String(contact.id)

      // Busca o lead por chatwoot_contact_id
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, assigned_to')
        .eq('chatwoot_contact_id', chatwoot_contact_id)
        .maybeSingle()

      // Se o lead existe e tem um corretor atribuído, cria uma notificação
      if (lead && lead.assigned_to) {
        await supabase.from('notifications').insert([{
          user_id: lead.assigned_to,
          message: `Nova mensagem de ${lead.name}`,
          lead_id: lead.id
        }])
        console.log(`Notificação de mensagem criada para corretor ${lead.assigned_to}`)
      }

      return new Response(JSON.stringify({ message: 'Mensagem processada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // -----------------------------------------------------------------------
    // EVENTO: conversation_created
    // -----------------------------------------------------------------------
    if (event !== 'conversation_created') {
      return new Response(JSON.stringify({ message: `Evento "${event}" ignorado.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const contact = payload.meta?.sender
    const conversation_id = payload.id

    if (!contact || !contact.id) {
      return new Response(JSON.stringify({ message: 'Contato sem ID, ignorado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const chatwoot_contact_id = String(contact.id)
    const chatwoot_conversation_id = String(conversation_id)
    const name = contact.name || null
    const email = contact.email || null
    const phone_number = contact.phone_number || null

    const { data: existing } = await supabase
      .from('leads')
      .select('id, chatwoot_conversation_id')
      .eq('chatwoot_contact_id', chatwoot_contact_id)
      .maybeSingle()

    if (existing) {
      if (existing.chatwoot_conversation_id !== chatwoot_conversation_id) {
        await supabase
          .from('leads')
          .update({ chatwoot_conversation_id })
          .eq('id', existing.id)

        return new Response(JSON.stringify({ message: 'Lead atualizado.', lead_id: existing.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      return new Response(JSON.stringify({ message: 'Lead já existente.', lead_id: existing.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const secureName = name || `Contato WhatsApp #${chatwoot_contact_id}`
    const secureEmail = email || `chatwoot_${chatwoot_contact_id}@sem-email.interno`

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        name: secureName,
        email: secureEmail,
        phone: phone_number || '',
        chatwoot_contact_id,
        chatwoot_conversation_id,
        origin: 'outro',
        stage: 'novo_lead',
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir lead:', JSON.stringify(error))
      throw new Error(error.message)
    }

    return new Response(
      JSON.stringify({ message: 'Lead criado!', lead: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
