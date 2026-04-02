/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const allowedOrigins = ['http://localhost:8080', 'http://localhost:5173', 'https://crm.jbrimobiliaria.com.br', 'https://imobicrm.jbrimobiliaria.com.br', 'https://jbrimobiliaria.com.br', 'https://portaljbr.com.br', 'https://www.portaljbr.com.br', 'https://crm.portaljbr.com.br'];
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
      throw new Error('Unauthorized. Only admins can delete users.')
    }

    const { userId } = await req.json()
    if (!userId) throw new Error('userId missing')

    // Proteger Master Admin APENAS se ele já for de fato um Admin
    const MASTER_ADMIN_EMAIL = 'aleandroantunes@hotmail.com';
    const { data: targetProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, user_roles(role)')
      .eq('id', userId)
      .maybeSingle()

    // Como o user_roles é um join, garantimos que acessamos seguro:
    const isTargetMasterAdmin = targetProfile?.email === MASTER_ADMIN_EMAIL && 
      (Array.isArray(targetProfile?.user_roles) 
        ? targetProfile.user_roles[0]?.role === 'admin' 
        : targetProfile?.user_roles?.role === 'admin');

    if (isTargetMasterAdmin) {
      throw new Error('Ação Bloqueada: Não é possível excluir o Admin Master do sistema.')
    }

    const { error } = await supabaseClient.auth.admin.deleteUser(userId)
    
    // Se a exclusão no Auth falhar por não encontrar ou falha de sincronização, 
    // ignoramos o erro limitando a um log e prosseguimos com a purificação das tabelas.
    if (error) {
      console.warn('Aviso: Falha ao deletar do Auth, limpando da base local.', error);
    }

    // Limpa registros orfãos apagando primeiro dependentes e depois a rais
    const roleDel = await supabaseClient.from('user_roles').delete().eq('user_id', userId)
    if (roleDel.error) throw roleDel.error
    
    const profileDel = await supabaseClient.from('profiles').delete().eq('id', userId)
    if (profileDel.error) throw profileDel.error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
