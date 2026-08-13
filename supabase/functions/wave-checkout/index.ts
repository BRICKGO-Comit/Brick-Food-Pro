import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, orderId, success_url, error_url } = await req.json()

    // Get the Wave Secret Key from Supabase Edge Function environment variables
    const waveSecretKey = Deno.env.get('WAVE_SECRET_KEY')
    
    if (!waveSecretKey) {
      console.error('Missing WAVE_SECRET_KEY in environment variables')
      throw new Error('Server Configuration Error: Missing Secret Key')
    }

    // Call the Wave API to generate a checkout session
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waveSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency: 'XOF',
        client_reference: orderId,
        error_url: error_url || 'brickdeal://payment/error',
        success_url: success_url || 'brickdeal://payment/success'
      })
    })

    const data = await waveResponse.json()

    if (!waveResponse.ok) {
        console.error('Wave API Error:', data)
        throw new Error(data.message || 'Error generating wave session')
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
