/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const allowedOrigins = ['http://localhost:8080', 'http://localhost:5173', 'https://crm.jbrimobiliaria.com.br', 'https://jbrimobiliaria.com.br', 'https://portaljbr.com.br', 'https://www.portaljbr.com.br', 'https://crm.portaljbr.com.br'];
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'http://localhost:8080',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthenticated')

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      throw new Error('Unauthorized. Only admins can invite users.')
    }

    const { email, role } = await req.json()
    if (!email || !role) throw new Error('Dados faltando (email, role)')

    // 1. Invite User with specific redirect
    const origin = req.headers.get('Origin') || 'https://crm.portaljbr.com.br'
    const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/update-password`
    })
    
    if (error) throw error

    const newUserId = data.user.id

    // 2. Insert Profile (Nome será preenchido pelo usuário no 1º acesso)
    await supabaseClient.from('profiles').upsert({
      id: newUserId,
      user_id: newUserId,
      name: '',
      email: email,
      active: true
    })

    // 3. Assign Role
    await supabaseClient.from('user_roles').upsert({
      user_id: newUserId,
      role: role
    })

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Erro desconhecido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Status mudado pra 200 pra conseguirmos ler o body na interface
    })
  }
})
