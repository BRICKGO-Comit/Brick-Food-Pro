'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import Link from 'next/link';

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyCount, setVerifyCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, offer:offers(*), restaurant:restaurants(*), client:profiles!client_id(full_name, phone)')
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      setOrder(data);
      return data;
    } catch (err) {
      console.error("[ConfirmationPage] Erreur chargement commande:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Détection et vérification active du paiement Wave (Realtime + Polling actif)
  useEffect(() => {
    if (!orderId) return;

    let isDone = false;
    let pollTimer: any = null;

    // Récupérer le sessionId Wave depuis l'URL, le stockage local ou la commande
    const getActiveSessionId = () => {
      if (typeof window === 'undefined') return null;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qSession = urlParams.get('sessionId') || urlParams.get('session_id') || urlParams.get('wave_session_id');
        if (qSession) return qSession;
        const stored = localStorage.getItem(`wave_session_${orderId}`) || sessionStorage.getItem(`wave_session_${orderId}`);
        if (stored) return stored;
      } catch (e) {}
      return order?.payment_ref || null;
    };

    // 1. Écoute temps réel Supabase Postgres Changes
    const channel = supabase
      .channel(`order-payment-check-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          const newStatus = payload?.new?.payment_status;
          if (newStatus === 'paid' || newStatus === 'payee') {
            isDone = true;
            fetchOrder();
          }
        }
      )
      .subscribe();

    // 2. Polling actif si la commande est en pending
    if (order && (order.payment_status === 'pending' || !order.payment_status)) {
      setIsVerifying(true);
      let attempts = 0;

      pollTimer = setInterval(async () => {
        if (isDone || attempts >= 25) {
          clearInterval(pollTimer);
          setIsVerifying(false);
          return;
        }

        attempts++;
        setVerifyCount(attempts);

        try {
          // A. Vérification directe en base
          const { data: latestOrder } = await supabase
            .from('orders')
            .select('payment_status, payment_ref')
            .eq('id', orderId)
            .maybeSingle();

          if (latestOrder?.payment_status === 'paid' || latestOrder?.payment_status === 'payee') {
            isDone = true;
            clearInterval(pollTimer);
            setIsVerifying(false);
            fetchOrder();
            return;
          }

          const currentSessionId = latestOrder?.payment_ref || getActiveSessionId();

          // B. Appel actif de la route serveur /api/wave/verify
          try {
            const verifyResp = await fetch('/api/wave/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, sessionId: currentSessionId })
            });
            const verifyData = await verifyResp.json();
            if (verifyData?.isPaid) {
              isDone = true;
              clearInterval(pollTimer);
              setIsVerifying(false);
              fetchOrder();
              return;
            }
          } catch (e) {
            // Ignorer si indisponible
          }

          // C. Fallback vers la Edge function wave-verify UNIQUEMENT si un sessionId est disponible
          if (currentSessionId) {
            try {
              const { data: verifyData } = await supabase.functions.invoke('wave-verify', {
                body: { orderId, sessionId: currentSessionId }
              });
              if (verifyData?.isPaid || verifyData?.sessionData?.payment_status === 'succeeded') {
                isDone = true;
                clearInterval(pollTimer);
                setIsVerifying(false);
                fetchOrder();
                return;
              }
            } catch (e) {
              // Ignorer si wave-verify indisponible
            }
          }
        } catch (err) {
          console.warn('[WaveActivePoll Error]:', err);
        }
      }, 2000);
    } else {
      setIsVerifying(false);
    }

    return () => {
      isDone = true;
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [orderId, order?.payment_status]);

  const handleManualCheck = async () => {
    setIsVerifying(true);
    const storedSession = typeof window !== 'undefined' 
      ? (localStorage.getItem(`wave_session_${orderId}`) || sessionStorage.getItem(`wave_session_${orderId}`))
      : null;
    const currentSessionId = storedSession || order?.payment_ref || null;

    try {
      const resp = await fetch('/api/wave/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, sessionId: currentSessionId })
      });
      const data = await resp.json();
      if (data?.isPaid) {
        await fetchOrder();
        setIsVerifying(false);
        return;
      }
    } catch (e) {}

    if (currentSessionId) {
      try {
        const { data } = await supabase.functions.invoke('wave-verify', { 
          body: { orderId, sessionId: currentSessionId } 
        });
        if (data?.isPaid) {
          await fetchOrder();
          setIsVerifying(false);
          return;
        }
      } catch (e) {}
    }

    const updated = await fetchOrder();
    if (updated?.payment_status === 'paid' || updated?.payment_status === 'payee') {
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);
  };

  const handleDirectConfirmation = async () => {
    setIsVerifying(true);
    try {
      // Validation directe par le client
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', status: 'nouvelle' })
        .eq('id', orderId);
      
      // Historique
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || order?.client_id;
      if (currentUserId) {
        await supabase.from('order_history').insert({
          order_id: orderId,
          action: 'payee_client_wave',
          actor_id: currentUserId
        });
      }

      await fetchOrder();
    } catch (e) {
      console.error('[Force Validate Error]:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyCode = () => {
    if (!order?.reservation_code) return;
    navigator.clipboard.writeText(order.reservation_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const code = order.reservation_code || `BD-${order.id?.slice(0, 5)?.toUpperCase() || '7892'}`;
    const total = Number(order.total_amount || 0).toLocaleString('fr-FR');
    const restoName = order.restaurant?.name || 'Restaurant Partenaire';
    const restoAddress = order.restaurant?.address || 'Abidjan';
    const restoPhone = order.restaurant?.phone || '+225 01 00 00 00 00';
    const offerTitle = order.offer?.title || 'Formule Gourmande';
    const clientName = order.client?.full_name || order.profiles?.full_name || 'Client Bénéficiaire';
    const clientPhone = order.client?.phone || order.profiles?.phone || 'Non renseigné';
    const diningText = order.delivery_mode === 'livraison' ? `📦 Livraison : ${order.delivery_address || 'À domicile'}` : (order.delivery_mode === 'retrait' ? '🛍️ Retrait au restaurant' : '🍽️ Sur place (au restaurant)');
    const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(code)}&margin=1`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pass Réservation Officiel #${code} - BRICK DEAL</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1E293B; background: #F8FAFC; }
          .card { background: #FFFFFF; border-radius: 24px; padding: 32px; border: 2.5px solid #E30613; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
          .header { text-align: center; border-bottom: 2px dashed #E2E8F0; padding-bottom: 18px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 900; color: #0F172A; }
          .logo span { color: #E30613; }
          .sublogo { font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-top: 4px; letter-spacing: 1px; }
          .badge { background: #DCFCE7; color: #15803D; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin-top: 10px; }
          
          .qr-box { text-align: center; margin: 20px 0; background: #FFFFFF; padding: 14px; border-radius: 18px; border: 1.5px solid #E2E8F0; display: inline-block; }
          .qr-img { width: 180px; height: 180px; display: block; margin: 0 auto; }
          
          .code-box { background: #0F172A; color: #10B981; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 20px; }
          .code-title { font-size: 11px; color: #94A3B8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
          .code-val { font-size: 34px; font-weight: 900; letter-spacing: 3px; margin-top: 4px; font-family: monospace; }
          
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          .details-table tr { border-bottom: 1px solid #F1F5F9; }
          .details-table td { padding: 9px 0; }
          .label { font-weight: 700; color: #64748B; }
          .val { font-weight: 800; color: #0F172A; text-align: right; }
          
          .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 24px; line-height: 1.5; border-top: 1px dashed #E2E8F0; padding-top: 16px; }
          @media print {
            body { background: #FFFFFF; padding: 0; }
            .card { box-shadow: none; border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">BRICK<span>DEAL</span></div>
            <div class="sublogo">PASS RÉSERVATION OFFICIEL • TICKET DE CONSOMMATION</div>
            <div class="badge">PAIEMENT CONFIRMÉ VIA WAVE (0% FRAIS)</div>
          </div>

          <div style="text-align: center;">
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR Code Pass" class="qr-img" />
              <div style="font-size: 10px; color: #64748B; font-weight: 700; margin-top: 6px;">
                SCANNEZ POUR VALIDER
              </div>
            </div>
          </div>

          <div class="code-box">
            <div class="code-title">CODE DU PASS RÉSERVATION</div>
            <div class="code-val">${code}</div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Établissement :</td>
              <td class="val">${restoName}</td>
            </tr>
            <tr>
              <td class="label">Adresse :</td>
              <td class="val">${restoAddress}</td>
            </tr>
            <tr>
              <td class="label">Contact Restaurant :</td>
              <td class="val">${restoPhone}</td>
            </tr>
            <tr>
              <td class="label">Formule réservée :</td>
              <td class="val">${offerTitle}</td>
            </tr>
            <tr>
              <td class="label">Bénéficiaire :</td>
              <td class="val">${clientName}</td>
            </tr>
            <tr>
              <td class="label">Téléphone client :</td>
              <td class="val">${clientPhone}</td>
            </tr>
            <tr>
              <td class="label">Option & Horaires :</td>
              <td class="val">${diningText}</td>
            </tr>
            <tr>
              <td class="label">Quantité :</td>
              <td class="val">${order.quantity || 1} personne(s)</td>
            </tr>
            <tr>
              <td class="label">Montant Payé :</td>
              <td class="val" style="color: #16A34A; font-size: 15px;">${total} FCFA</td>
            </tr>
            <tr>
              <td class="label">Date d'émission :</td>
              <td class="val">${dateStr}</td>
            </tr>
          </table>

          <div class="footer">
            Présentez ce Pass QR ou annoncez votre code au restaurant lors de votre venue.<br>
            <strong>BRICK DEAL • Plateforme officielle de bons plans & gastronomie.</strong>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '4rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: '44px', height: '44px', border: '3px solid #E2E8F0', borderTopColor: '#E30613', borderRadius: '50%', margin: '0 auto 1.2rem', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Génération de votre Pass en cours...</h2>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', maxWidth: '480px', margin: '0 auto', padding: '2.5rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔍</div>
            <h2 style={{ color: '#0F172A', fontWeight: '900', marginBottom: '0.8rem' }}>Commande introuvable</h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '1.5rem' }}>
              Cette réservation n'a pas pu être trouvée. Veuillez vérifier votre historique de commandes.
            </p>
            <Link href="/commandes" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#E30613', color: '#FFFFFF', borderRadius: '12px', textDecoration: 'none', fontWeight: '800' }}>
              Voir mes commandes
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid' || order.payment_status === 'payee';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(order.reservation_code || 'BD-12345')}&margin=1`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2.5rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '28px',
          border: isPaid ? '2px solid #E30613' : '2px solid #E2E8F0',
          boxShadow: '0 20px 50px rgba(0,0,0,0.07)',
          maxWidth: '540px',
          width: '100%',
          padding: '36px 26px',
          textAlign: 'center',
        }}>
          
          {/* ÉTAT 1 : EN ATTENTE DE VALIDATION WAVE */}
          {!isPaid ? (
            <div>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E0F7FC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <img src="/wave-icon.png" alt="Wave" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              </div>
              <h1 style={{ color: '#0F172A', fontSize: '22px', fontWeight: '900', margin: '0 0 8px 0' }}>
                Vérification du paiement Wave...
              </h1>
              <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
                Nous attendons la confirmation de votre transaction depuis l'application Wave Mobile Money.
              </p>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1.5px solid #E2E8F0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', border: '2.5px solid #CBD5E1', borderTopColor: '#1DC4E9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                  Détection active en cours ({verifyCount}s)...
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleManualCheck}
                  disabled={isVerifying}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#1DC4E9',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {isVerifying ? 'Vérification...' : '🔄 Actualiser le statut du paiement'}
                </button>

                {verifyCount >= 6 && (
                  <button
                    onClick={handleDirectConfirmation}
                    disabled={isVerifying}
                    style={{
                      width: '100%',
                      padding: '13px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✅ J'ai déjà validé sur l'application Wave (Débloquer mon Pass)
                  </button>
                )}

                <Link
                  href={`/checkout/${order.offer_id}`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  Recommencer le paiement Wave
                </Link>
              </div>
            </div>
          ) : (
            /* ÉTAT 2 : PAIEMENT VALIDÉ & PASS QR DYNAMIQUE */
            <div>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', fontSize: '36px' }}>
                ✅
              </div>
              <h1 style={{ color: '#0F172A', fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0' }}>
                Paiement Confirmé !
              </h1>
              <p style={{ color: '#16A34A', fontSize: '14px', fontWeight: '800', margin: '0 0 1.4rem 0' }}>
                Votre Pass officiel BRICK DEAL est activé
              </p>

              {/* QR CODE DYNAMIQUE SCANNABLE */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px',
                border: '2px dashed #E2E8F0',
                display: 'inline-block',
                margin: '0 auto 1.4rem auto',
                boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
              }}>
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${order.reservation_code}`}
                  style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                />
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', marginTop: '8px' }}>
                  SCANNEZ SUR PLACE AU RESTAURANT
                </div>
              </div>

              {/* CADRE CODE RÉSERVATION GÉANT */}
              <div style={{
                backgroundColor: '#0F172A',
                borderRadius: '18px',
                padding: '18px',
                marginBottom: '1.4rem',
                color: '#10B981',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  CODE DU PASS RÉSERVATION
                </div>
                <div style={{ fontSize: '34px', fontWeight: '900', letterSpacing: '3px', fontFamily: 'monospace' }}>
                  {order.reservation_code}
                </div>
                <button
                  onClick={handleCopyCode}
                  style={{
                    marginTop: '6px',
                    padding: '4px 12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {copiedCode ? '✓ Code copié !' : '📋 Copier le code'}
                </button>
              </div>

              {/* DÉTAILS RÉCAPITULATIFS */}
              <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '13px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>Établissement :</span>
                  <strong style={{ color: '#0F172A' }}>{order.restaurant?.name || 'Restaurant Partenaire'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>Formule :</span>
                  <strong style={{ color: '#0F172A' }}>{order.offer?.title}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>Bénéficiaire :</span>
                  <strong style={{ color: '#0F172A' }}>{order.client?.full_name || order.profiles?.full_name || 'Client'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>Détails :</span>
                  <span style={{ fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {order.delivery_address || (order.delivery_mode === 'livraison' ? '📦 Livraison' : '🍽️ Sur place')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>Quantité :</span>
                  <strong style={{ color: '#0F172A' }}>{order.quantity} personne(s)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: '#64748B', fontWeight: '700' }}>Montant Réglé via Wave :</span>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#16A34A' }}>
                    {Number(order.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  }}
                >
                  <span>📥</span>
                  <span>Télécharger / Imprimer le Pass (PDF)</span>
                </button>

                <Link
                  href="/commandes"
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    borderRadius: '14px',
                    fontWeight: '800',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'block',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  ⚡ Voir toutes mes réservations & suivi en direct
                </Link>

                <Link
                  href="/deals"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#FFFFFF',
                    color: '#E30613',
                    border: '1.5px solid #E30613',
                    borderRadius: '14px',
                    fontWeight: '800',
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  Découvrir d'autres offres
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
