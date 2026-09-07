import { NextResponse } from 'next/server';

const WAVE_SECRET_KEY = process.env.WAVE_SECRET_KEY || 'wave_ci_prod_PA5WLkmrmQFnB4KFiW4MIZNVIN51qM86Lhctic9fGunvsA2ddFpMqXKEnVpMFmTLomFwOeBpWnWmmp2DlTyEYBhCEXhQrtX3ig';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kgcmbbesrzldoiwkckke.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, orderId, success_url, error_url } = body;

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Montant et identifiant de commande requis' },
        { status: 400 }
      );
    }

    const defaultSuccess = 'https://www.brickdeal.store/payment/success';
    const defaultError = 'https://www.brickdeal.store/payment/success';

    const validSuccess = success_url || defaultSuccess;
    const validError = error_url || defaultError;

    // 1. Tenter d'abord l'appel direct à l'API Wave officielle
    try {
      console.log(`[Wave API Server] Création de session pour commande ${orderId} (${amount} XOF)...`);
      const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount)).toString(),
          currency: 'XOF',
          client_reference: orderId,
          error_url: validError,
          success_url: validSuccess
        })
      });

      const waveData = await waveResponse.json();

      if (waveResponse.ok && (waveData.wave_launch_url || waveData.wave_checkout_url)) {
        return NextResponse.json({
          success: true,
          wave_launch_url: waveData.wave_launch_url || waveData.wave_checkout_url,
          sessionId: waveData.id,
          raw: waveData
        });
      } else {
        console.warn('[Wave API Warning]:', waveData);
      }
    } catch (waveErr: any) {
      console.warn('[Wave Direct API Error]:', waveErr.message);
    }

    // 2. Fallback vers la fonction Edge Supabase wave-checkout
    try {
      const edgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/wave-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount)),
          orderId,
          success_url: validSuccess,
          error_url: validError
        })
      });

      const edgeData = await edgeResponse.json();
      if (edgeResponse.ok && (edgeData.wave_launch_url || edgeData.wave_checkout_url)) {
        return NextResponse.json({
          success: true,
          wave_launch_url: edgeData.wave_launch_url || edgeData.wave_checkout_url,
          sessionId: edgeData.id || edgeData.sessionId,
          raw: edgeData
        });
      }
    } catch (edgeErr: any) {
      console.warn('[Wave Edge Function Error]:', edgeErr.message);
    }

    // 3. Fallback de secours
    return NextResponse.json({
      success: false,
      error: 'Impossible d\'initialiser la session Wave Checkout',
      fallbackUrl: validSuccess
    }, { status: 500 });

  } catch (err: any) {
    console.error('[Wave Checkout Route Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur serveur lors de la création de la session Wave' },
      { status: 500 }
    );
  }
}
