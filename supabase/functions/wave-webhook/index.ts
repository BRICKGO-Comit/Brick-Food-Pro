import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get('WAVE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.error('Missing WAVE_WEBHOOK_SECRET')
      return new Response('Server Configuration Error', { status: 500 })
    }
    
    const bodyText = await req.text()
    const body = JSON.parse(bodyText)

    // Wave sends various events, we care about checkout.session.completed
    if (body.type === 'checkout.session.completed') {
      const orderId = body.data.client_reference
      
      if (!orderId) {
        throw new Error('No client_reference found in webhook payload')
      }
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', status: 'nouvelle' })
        .eq('id', orderId)
        
      if (error) throw error
      console.log(`Order ${orderId} marked as paid successfully.`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
