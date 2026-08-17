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

    // Get the Wave Secret Key from Deno env or fallback to production Wave key
    const waveSecretKey = Deno.env.get('WAVE_SECRET_KEY') || 'wave_ci_prod_PA5WLkmrmQFnB4KFiW4MIZNVIN51qM86Lhctic9fGunvsA2ddFpMqXKEnVpMFmTLomFwOeBpWnWmmp2DlTyEYBhCEXhQrtX3ig'

    const defaultHttpsSuccess = 'https://brick-food-pro-beta.vercel.app/payment/success'
    const defaultHttpsError = 'https://brick-food-pro-beta.vercel.app/payment/success'

    const validSuccessUrl = (success_url && typeof success_url === 'string' && success_url.startsWith('https://')) ? success_url : defaultHttpsSuccess
    const validErrorUrl = (error_url && typeof error_url === 'string' && error_url.startsWith('https://')) ? error_url : defaultHttpsError

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
        error_url: validErrorUrl,
        success_url: validSuccessUrl
      })
    })

    const data = await waveResponse.json()

    if (!waveResponse.ok) {
        console.error('Wave API Error:', data)
        throw new Error(data.message || 'Error generating wave session')
    }

    return new Response(JSON.stringify({
      ...data,
      sessionId: data.id || data.sessionId,
    }), {
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
