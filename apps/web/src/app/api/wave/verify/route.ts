import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WAVE_SECRET_KEY = process.env.WAVE_SECRET_KEY || 'wave_ci_prod_PA5WLkmrmQFnB4KFiW4MIZNVIN51qM86Lhctic9fGunvsA2ddFpMqXKEnVpMFmTLomFwOeBpWnWmmp2DlTyEYBhCEXhQrtX3ig';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kgcmbbesrzldoiwkckke.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, sessionId } = body;

    if (!orderId && !sessionId) {
      return NextResponse.json(
        { error: 'Identifiant de commande ou de session Wave requis' },
        { status: 400 }
      );
    }

    // 1. Vérifier si la commande est déjà marquée comme 'paid' en base
    if (orderId) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('*, offer:offers(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (currentOrder?.payment_status === 'paid' || currentOrder?.payment_status === 'payee') {
        return NextResponse.json({
          isPaid: true,
          order: currentOrder
        });
      }
    }

    // 2. Si un sessionId Wave est disponible, interroger directement l'API Wave
    if (sessionId) {
      try {
        const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${sessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WAVE_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (waveResponse.ok) {
          const sessionData = await waveResponse.json();
          const isPaid = sessionData.payment_status === 'succeeded' || sessionData.checkout_status === 'complete';

          if (isPaid) {
            const targetOrderId = orderId || sessionData.client_reference;
            if (targetOrderId) {
              // Mettre à jour la commande en paid
              const { data: updatedOrder } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', status: 'nouvelle' })
                .eq('id', targetOrderId)
                .select('*, offer:offers(*)')
                .single();

              // Mettre à jour le stock restant si offre flash
              if (updatedOrder?.offer?.type === 'flash' && updatedOrder?.offer_id) {
                const qty = updatedOrder.quantity || 1;
                await supabase
                  .from('offers')
                  .update({ quantity_remaining: Math.max(0, (updatedOrder.offer.quantity_remaining ?? 10) - qty) })
                  .eq('id', updatedOrder.offer_id);
              }

              // Notification de confirmation pour le client
              if (updatedOrder?.client_id) {
                await supabase.from('notifications').insert({
                  user_id: updatedOrder.client_id,
                  order_id: updatedOrder.id,
                  title: '🎉 Réservation confirmée !',
                  body: `Votre Pass ${updatedOrder.reservation_code || ''} est prêt pour dégustation.`,
                  type: 'status_update'
                });
              }

              return NextResponse.json({
                isPaid: true,
                order: updatedOrder,
                sessionData
              });
            }
          }
        }
      } catch (waveApiErr: any) {
        console.warn('[Wave Verify API Direct Warning]:', waveApiErr.message);
      }
    }

    // 3. Fallback vers la fonction Edge Supabase wave-verify
    try {
      const edgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/wave-verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, sessionId })
      });

      if (edgeResponse.ok) {
        const edgeData = await edgeResponse.json();
        if (edgeData.isPaid) {
          return NextResponse.json({
            isPaid: true,
            raw: edgeData
          });
        }
      }
    } catch (edgeErr: any) {
      console.warn('[Wave Verify Edge Function Warning]:', edgeErr.message);
    }

    return NextResponse.json({
      isPaid: false,
      message: 'En attente de confirmation Wave'
    });

  } catch (err: any) {
    console.error('[Wave Verify Route Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur lors de la vérification de la session' },
      { status: 500 }
    );
  }
}
