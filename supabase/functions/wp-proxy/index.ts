/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const allowedOrigins = ['http://localhost:8080', 'http://localhost:5173', 'https://crm.jbrimobiliaria.com.br', 'https://imobicrm.jbrimobiliaria.com.br', 'https://jbrimobiliaria.com.br', 'https://portaljbr.com.br', 'https://www.portaljbr.com.br', 'https://crm.portaljbr.com.br'];
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'http://localhost:8080',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wp-endpoint, x-wp-method',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    // Security: Only logged in users (corretores/admins) can proxy to WordPress
    if (authError || !user) throw new Error('Unauthenticated')

    const wpUrl = Deno.env.get('WP_API_URL')
    const wpUser = Deno.env.get('WP_USER')
    const wpPass = Deno.env.get('WP_APP_PASSWORD')
    
    if (!wpUrl || !wpUser || !wpPass) {
      throw new Error('WP credentials not configured securely in Supabase secrets')
    }

    const endpoint = req.headers.get('x-wp-endpoint')
    const method = req.headers.get('x-wp-method') || 'GET'
    
    if (!endpoint) throw new Error('Missing x-wp-endpoint header')

    const targetUrl = `${wpUrl}${endpoint}`
    const basicAuth = 'Basic ' + btoa(`${wpUser}:${wpPass}`)
    
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': basicAuth,
      }
    }

    const contentType = req.headers.get('content-type') || ''
    
    if (method !== 'GET' && method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        // Forward FormData (for images/media uploads)
        const formData = await req.formData()
        fetchOptions.body = formData
      } else {
        // Forward JSON
        const text = await req.text()
        if (text) {
          fetchOptions.body = text
          fetchOptions.headers['Content-Type'] = 'application/json'
        }
      }
    }

    const wpRes = await fetch(targetUrl, fetchOptions)
    let responseData = null;
    // Safely parse JSON if exists
    let resText = await wpRes.text()
    
    // Normalize internal URLs to HTTPS to avoid mixed content (HTTP links on HTTPS page)
    if (resText) {
      const internalDomains = [
        'jbrimobiliaria.com.br',
        'portaljbr.com.br',
        'crm.jbrimobiliaria.com.br',
        'imobicrm.jbrimobiliaria.com.br'
      ];
      
      internalDomains.forEach(domain => {
        const httpSearch = `http://${domain}`;
        const httpsReplace = `https://${domain}`;
        resText = resText.split(httpSearch).join(httpsReplace);
      });
    }

    if (resText) {
      try {
        responseData = JSON.parse(resText)
      } catch (e) {
        responseData = resText
      }
    }

    if (!wpRes.ok) {
      return new Response(JSON.stringify({ error: responseData || 'WordPress API Error' }), {
        status: 200, // Return 200 so Supabase invoke doesn't swallow the error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so Supabase invoke doesn't swallow the error message
    })
  }
})
