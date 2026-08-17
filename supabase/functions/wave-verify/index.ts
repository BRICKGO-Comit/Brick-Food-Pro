import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const reqBody = await req.json()
    const sessionId = reqBody.sessionId || reqBody.session_id
    const orderIdParam = reqBody.orderId

    if (!sessionId && !orderIdParam) {
      throw new Error('Missing sessionId or orderId')
    }

    const waveSecretKey = Deno.env.get('WAVE_SECRET_KEY') || 'wave_ci_prod_PA5WLkmrmQFnB4KFiW4MIZNVIN51qM86Lhctic9fGunvsA2ddFpMqXKEnVpMFmTLomFwOeBpWnWmmp2DlTyEYBhCEXhQrtX3ig'
    
    // Support Mock / Sandbox sessions if explicitly marked as mock
    if (sessionId && String(sessionId).startsWith('cos_mock_')) {
      console.warn('Sandbox mode: Validating mock Wave payment session for order:', orderIdParam)
      if (orderIdParam) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'paid', status: 'nouvelle' })
          .eq('id', orderIdParam)
      }
      return new Response(JSON.stringify({
        isPaid: true,
        sessionData: { payment_status: 'succeeded', checkout_status: 'complete' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Call Wave API to get session details
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${waveSecretKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errText = await waveResponse.text()
      throw new Error(`Wave API error: ${errText}`)
    }

    const sessionData = await waveResponse.json()
    const isPaid = sessionData.payment_status === 'succeeded' || sessionData.checkout_status === 'complete'

    // If paid, update the database
    if (isPaid && sessionData.client_reference) {
      const orderId = sessionData.client_reference
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', status: 'nouvelle' })
        .eq('id', orderId)
        
      if (error) {
        console.error('Failed to update order status in DB:', error.message)
      }
    }

    return new Response(JSON.stringify({ isPaid, sessionData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Verification Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
