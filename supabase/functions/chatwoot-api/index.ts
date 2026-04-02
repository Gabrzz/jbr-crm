/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CHATWOOT_URL = Deno.env.get('CHATWOOT_BASE_URL') || 'https://app.chatwoot.com'
    const CHATWOOT_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN')
    const CHATWOOT_ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!CHATWOOT_TOKEN) {
      throw new Error('CHATWOOT_API_TOKEN não configurado nas variáveis de ambiente.')
    }

    // ----------------------------------------------------------------
    // ROTA GET: Proxy autenticado de arquivos do Chatwoot (resolve CORS de áudio, imagens, PDF)
    // GET /chatwoot-api?url=https://.../arquivo.webm
    // ----------------------------------------------------------------
    if (req.method === 'GET') {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
      }

      const fileUrl = new URL(req.url).searchParams.get('url')
      if (!fileUrl || !fileUrl.startsWith('https://')) {
        return new Response(JSON.stringify({ error: 'Parâmetro url ausente ou inválido' }), { status: 400, headers: corsHeaders })
      }

      console.log('Proxying file URL:', fileUrl)

      // Tenta buscar sem token primeiro (funciona para S3, Azure Blob, CloudFront, etc.)
      let fileRes = await fetch(fileUrl)

      // Se falhar (ex: requer auth no Chatwoot direto), tenta com o token da API
      if (!fileRes.ok && CHATWOOT_TOKEN) {
        console.log('Retrying with Chatwoot API token, status was:', fileRes.status)
        fileRes = await fetch(fileUrl, { headers: { 'api_access_token': CHATWOOT_TOKEN } })
      }

      if (!fileRes.ok) {
        console.error('Proxy failed for URL:', fileUrl, 'Status:', fileRes.status)
        return new Response(JSON.stringify({ error: `Falha ao buscar arquivo: ${fileRes.status}` }), {
          status: fileRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const contentType = fileRes.headers.get('Content-Type') || 'application/octet-stream'
      console.log('Proxy success, ContentType:', contentType)

      return new Response(fileRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Content-Disposition': 'inline',
        },
      })
    }

    // ----------------------------------------------------------------
    // ROTA: Webhook legado do N8N/Chatwoot para Broadcast em tempo real
    // POST com header x-action: webhook  (usado internamente)
    // ----------------------------------------------------------------
    const xAction = req.headers.get('x-action')

    if (xAction === 'webhook') {
      const body = await req.json()
      const conversation_id = body.conversation?.id || body.conversation_id || body.id
      if (!conversation_id) {
        return new Response(JSON.stringify({ error: 'Missing conversation_id' }), { status: 400, headers: corsHeaders })
      }
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const channelId = `chatwoot_conv_${conversation_id}`
      const channel = supabaseAdmin.channel(channelId)
      await channel.send({ type: 'broadcast', event: 'new_message', payload: { message: body } })
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ----------------------------------------------------------------
    // ROTA: Envio de arquivo (multipart/form-data)
    // POST com header x-action: send_file
    // ----------------------------------------------------------------
    if (xAction === 'send_file') {
      // Valida o token do usuário
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
      }

      const formData = await req.formData()
      const conversation_id = formData.get('conversation_id')
      const content = formData.get('content') || ''
      const file = formData.get('file')

      if (!conversation_id || !file) {
        return new Response(JSON.stringify({ error: 'conversation_id e file são obrigatórios' }), { status: 400, headers: corsHeaders })
      }

      // Monta o multipart para o Chatwoot
      const cwForm = new FormData()
      cwForm.append('content', content)
      cwForm.append('message_type', 'outgoing')
      cwForm.append('private', 'false')
      cwForm.append('attachments[]', file)

      const cwRes = await fetch(
        `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}/messages`,
        {
          method: 'POST',
          headers: { 'api_access_token': CHATWOOT_TOKEN },
          body: cwForm,
        }
      )
      const responseData = await cwRes.json()
      return new Response(JSON.stringify(responseData), {
        status: cwRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ----------------------------------------------------------------
    // ROTAS JSON: lê o campo `action` do body
    // Requer autenticação JWT do usuário logado
    // ----------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorização não encontrado' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), { status: 401, headers: corsHeaders })
    }

    // Lê o body JSON
    let body: Record<string, unknown> = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), { status: 400, headers: corsHeaders })
    }

    const action = body.action as string
    console.log('Action recebida:', action)

    // -------------------------
    // ACTION: get_messages
    // -------------------------
    if (action === 'get_messages') {
      const conversation_id = body.conversation_id
      if (!conversation_id) {
        return new Response(JSON.stringify({ error: 'conversation_id é obrigatório' }), { status: 400, headers: corsHeaders })
      }

      const targetUrl = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}/messages`
      console.log('Buscando mensagens em:', targetUrl)

      const cwRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'api_access_token': CHATWOOT_TOKEN,
          'Content-Type': 'application/json',
        },
      })

      const responseData = await cwRes.json()
      console.log('Status Chatwoot:', cwRes.status)

      // Debug: logar estrutura dos attachments para entender formato
      if (responseData?.payload) {
        const msgs = Array.isArray(responseData.payload) ? responseData.payload : []
        for (const msg of msgs) {
          if (msg.attachments && msg.attachments.length > 0) {
            console.log('DEBUG ATTACHMENT MSG:', msg.id, JSON.stringify(msg.attachments[0]))
            break // só loga o primeiro para não poluir
          }
        }
      }

      if (!cwRes.ok) {
        console.error('Erro do Chatwoot:', JSON.stringify(responseData))
        return new Response(JSON.stringify({ error: `Chatwoot retornou ${cwRes.status}`, details: responseData }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------
    // ACTION: send_message (texto)
    // -------------------------
    if (action === 'send_message') {
      const { conversation_id, content } = body
      if (!conversation_id || !content) {
        return new Response(JSON.stringify({ error: 'conversation_id e content são obrigatórios' }), { status: 400, headers: corsHeaders })
      }

      const targetUrl = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}/messages`
      const cwRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'api_access_token': CHATWOOT_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, message_type: 'outgoing', private: false }),
      })

      const responseData = await cwRes.json()

      if (!cwRes.ok) {
        console.error('Erro ao enviar mensagem:', JSON.stringify(responseData))
        return new Response(JSON.stringify({ error: `Chatwoot retornou ${cwRes.status}`, details: responseData }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Action desconhecida: "${action}"` }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro na chatwoot-api:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
