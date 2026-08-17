import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle GET requests (Browser redirects after Wave payment)
  if (req.method === 'GET') {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement Confirmé - BRICK DEAL</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #0F172A; color: white; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; }
    .card { background: #1E293B; border-radius: 24px; padding: 32px 24px; max-width: 380px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 900; color: #10B981; margin: 0 0 8px 0; }
    p { font-size: 14px; color: #94A3B8; margin-bottom: 24px; line-height: 1.5; }
    .btn { display: block; background: #D60309; color: white; font-weight: 800; padding: 14px 20px; border-radius: 14px; text-decoration: none; font-size: 15px; box-shadow: 0 4px 12px rgba(214, 3, 9, 0.4); }
  </style>
  <script>
    setTimeout(function() {
      window.location.href = "brickdeal://payment/success";
    }, 300);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Paiement Confirmé !</h1>
    <p>Votre réservation BRICK DEAL a été validée avec succès.</p>
    <a href="brickdeal://payment/success" class="btn">Ouvrir l'application BRICK DEAL</a>
  </div>
</body>
</html>`;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 200,
    })
  }

  try {
    const webhookSecret = Deno.env.get('WAVE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.warn('Missing WAVE_WEBHOOK_SECRET - processing event')
    }
    
    const bodyText = await req.text()
    let body: any = {}
    try {
      body = JSON.parse(bodyText)
    } catch (e) {
      body = {}
    }

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
