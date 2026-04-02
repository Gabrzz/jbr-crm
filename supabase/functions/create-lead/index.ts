// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Um segredo opcional configurado no painel Supabase para autenticar webhooks.
const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-signature',
}

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    // Autenticação simples (baseada em Signature Header opcional ou API KEY)
    if (N8N_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-n8n-signature') || ''
      if (signature !== N8N_WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
    }

    const payload = await req.json()
    // Payload esperado de N8N: { name, phone, email, ... }
    
    // Nenhuma OS ou atribuição precisa ser explicitamente computada aqui caso  
    // a trigger do PostgreSQL "generate_lead_os" e a "assign_lead_round_robin"
    // ou demais atribuições automáticas estejam ativas! 
    // Assim que inserido, a trigger o preenche, garantindo "OS-XXXX" imutável e sem race.

    const { data: newLead, error } = await supabase
      .from('leads')
      .insert([{
        name: payload.name || 'Sem nome (N8N)',
        email: payload.email || null,
        phone: payload.phone || null,
        origin: payload.origin || 'outro',
        stage: 'novo_lead',
        notes: payload.notes || 'Lead recebido via N8N Edge Function',
        // Outros campos repassados caso queira pular stages etc (ex: stage 'visita')
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir o lead:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Retorna os dados completos recém-inseridos, ONDE a OS e assignment terão sidos computados pelo Postgres
    return new Response(JSON.stringify({ 
      message: 'Lead processado com sucesso!',
      lead: newLead
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Falha geral na Edge Function:', error)
    return new Response(JSON.stringify({ error: 'Erro inesperado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
