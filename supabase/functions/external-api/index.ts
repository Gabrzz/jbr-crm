/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const secretKey = Deno.env.get('EXTERNAL_API_KEY')
    
    if (!secretKey) {
        // Fallback or warning if secret is not set yet.
        console.warn("Missing EXTERNAL_API_KEY configuration in Edge Function environment.")
    }

    if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Invalid or missing Bearer token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const apiIndex = pathSegments.indexOf('external-api')
    
    // Parse resources and IDs
    // Eg: /external-api/leads/123 -> resource = 'leads', resourceId = '123'
    const resource = apiIndex !== -1 && pathSegments.length > apiIndex + 1 ? pathSegments[apiIndex + 1] : null;
    const resourceId = apiIndex !== -1 && pathSegments.length > apiIndex + 2 ? pathSegments[apiIndex + 2] : null;

    // Route: GET /imoveis
    if (req.method === 'GET' && resource === 'imoveis') {
      const wpUrl = Deno.env.get('WP_API_URL')
      const wpUser = Deno.env.get('WP_USER')
      const wpPass = Deno.env.get('WP_APP_PASSWORD')
      
      if (!wpUrl || !wpUser || !wpPass) {
        throw new Error('WP credentials not configured securely in Supabase secrets')
      }

      // Proxy pass standard WP endpoint with query string if any
      const endpoint = resourceId ? `/wp/v2/properties/${resourceId}${url.search}` : `/wp/v2/properties${url.search}`
      const targetUrl = `${wpUrl}${endpoint}`
      const basicAuth = 'Basic ' + btoa(`${wpUser}:${wpPass}`)
      
      const wpRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': basicAuth,
        }
      })
      
      let responseData = null;
      const resText = await wpRes.text()
      if (resText) {
        try {
          responseData = JSON.parse(resText)
        } catch (e) {
          responseData = resText
        }
      }
      
      if (!wpRes.ok) {
        return new Response(JSON.stringify({ error: responseData || 'WordPress API Error' }), {
          status: wpRes.status || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({ data: responseData }), {
        status: wpRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Route: POST /leads
    if (req.method === 'POST' && resource === 'leads') {
        const body = await req.json()
        
        const { data, error } = await supabaseAdmin
            .from('leads')
            .insert([body])
            .select()
            .single()
            
        if (error) throw error
        
        return new Response(JSON.stringify(data), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
    
    // Route: PUT or PATCH /leads/:id
    if ((req.method === 'PUT' || req.method === 'PATCH') && resource === 'leads' && resourceId) {
        const body = await req.json()
        
        const { data, error } = await supabaseAdmin
            .from('leads')
            .update(body)
            .eq('id', resourceId)
            .select()
            .single()
            
        if (error) throw error
        
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ error: `Not Found: route ${req.method} /${resource || ''}` }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
