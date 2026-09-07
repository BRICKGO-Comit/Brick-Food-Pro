'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import Link from 'next/link';

// Helpers pour les dates dynamiques en français
const getNextDays = (count: number) => {
  const list = [];
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
  const fullMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : `${daysOfWeek[d.getDay()]}.`;
    const shortDate = `${d.getDate()} ${months[d.getMonth()]}`;
    const fullDate = `${d.getDate()} ${fullMonths[d.getMonth()]} ${d.getFullYear()}`;
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    list.push({ label, shortDate, fullDate, ymd });
  }
  return list;
};

const DEFAULT_TIME_SLOTS = [
  '12h00', '12h30', '13h00', '13h30', '14h00',
  '19h00', '19h30', '20h00', '20h30', '21h00', '21h30', '22h00'
];

export default function CheckoutPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const offerId = params.offerId as string;
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const nextDays = getNextDays(7);
  const [bookingDate, setBookingDate] = useState<string>(nextDays[1].fullDate);
  const [bookingTime, setBookingTime] = useState<string>('19h30');
  const [customTime, setCustomTime] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [diningOption, setDiningOption] = useState<'sur_place' | 'retrait' | 'livraison'>('sur_place');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Vérification de retour avec erreur
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'payment_failed' || errorParam === 'payment_cancelled') {
      setError("Le paiement Wave précédent n'a pas été validé ou a été annulé. Vous pouvez réessayer.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/checkout/${offerId}`);
    } else if (profile) {
      if (profile.full_name && !clientName) setClientName(profile.full_name);
      if (profile.phone && !clientPhone) setClientPhone(profile.phone);
    }
  }, [user, profile, authLoading, router, offerId]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*, restaurant:restaurants(*)')
          .eq('id', offerId)
          .single();
          
        if (error) throw error;
        if (!data || !data.is_published || data.status !== 'validee') {
          throw new Error('Cette offre n\'est plus disponible actuellement.');
        }
        if (data.type === 'flash') {
          if (data.quantity_remaining <= 0 || new Date(data.end_timestamp).getTime() < new Date().getTime()) {
            throw new Error('Cette offre flash est expirée ou épuisée.');
          }
        }
        setOffer(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchOffer();
  }, [offerId, user]);

  const unitPrice = offer ? (offer.type === 'flash' ? Number(offer.price_promo) : Number(offer.price || 0)) : 0;
  const normalPrice = offer ? (offer.type === 'flash' ? Number(offer.price_normal) : (Number(offer.price || 0) * 1.3)) : 0;
  const totalAmount = unitPrice * quantity;
  const totalSavings = Math.max(0, Math.round((normalPrice - unitPrice) * quantity));
  const commissionRate = offer?.commission_rate || 10;
  const commissionAmount = Math.round((totalAmount * commissionRate) / 100);

  // Fonction de paiement Wave sécurisé
  const handleWaveCheckout = async () => {
    if (!user || !offer) return;
    
    if (!clientName.trim()) {
      alert("Veuillez indiquer le nom complet du bénéficiaire pour le Pass.");
      return;
    }

    if (diningOption === 'livraison' && !deliveryAddress.trim()) {
      alert("Veuillez préciser l'adresse de livraison.");
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      // 1. Code réservation unique
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 5; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      const code = `BD-${rand}`;
      
      // 2. Mise à jour du profil client
      if (clientName.trim() || clientPhone.trim()) {
        await supabase
          .from('profiles')
          .update({
            full_name: clientName.trim(),
            phone: clientPhone.trim() || null,
          })
          .eq('id', user.id);
      }

      // 3. Détermination de l'agent
      let agentId = offer.agent_id;
      if (!agentId && offer.restaurant_id) {
        const { data: restoData } = await supabase.from('restaurants').select('agent_id').eq('id', offer.restaurant_id).maybeSingle();
        agentId = restoData?.agent_id;
      }
      if (!agentId) {
        agentId = user.id;
      }

      // 4. Insertion de la commande en statut PENDING
      const effectiveTime = customTime.trim() ? customTime.trim() : bookingTime;
      const formattedDiningDetails = diningOption === 'livraison' 
        ? `Livraison : ${deliveryAddress.trim()} (${bookingDate} à ${effectiveTime})`
        : (diningOption === 'retrait' ? `À emporter (${bookingDate} à ${effectiveTime})` : `Sur place (${bookingDate} à ${effectiveTime})`);

      const insertPayload: any = {
        client_id: user.id,
        restaurant_id: offer.restaurant_id,
        offer_id: offer.id,
        agent_id: agentId,
        status: 'nouvelle',
        delivery_mode: diningOption === 'livraison' ? 'livraison' : 'retrait',
        dining_option: diningOption,
        delivery_address: formattedDiningDetails,
        quantity,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'pending',
        reservation_code: code
      };

      let { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();
      
      // Fallback si colonnes dining_option ou delivery_address non présentes dans le cache de schéma
      if (orderError && (orderError.message?.includes('dining_option') || orderError.message?.includes('delivery_address') || orderError.message?.includes('column'))) {
        delete insertPayload.dining_option;
        delete insertPayload.delivery_address;
        const retry = await supabase.from('orders').insert(insertPayload).select().single();
        order = retry.data;
        orderError = retry.error;
      }

      if (orderError) throw orderError;

      // 5. Historique d'audit
      await supabase.from('order_history').insert({
        order_id: order.id,
        action: 'creee',
        actor_id: user.id
      });

      // 6. Notifications multi-acteurs (Resto, Agent, Admin)
      const offerTypeBadge = offer.type === 'flash' ? 'Flash ⚡' : 'Deal 🏷️';
      const notifTitle = `Nouvelle commande ${offerTypeBadge}`;
      const notifBody = `${offer.title} — ${totalAmount.toLocaleString('fr-FR')} FCFA (${quantity} pers.) par ${clientName || 'Client'}`;
      const notifs: any[] = [];

      // Propriétaire du restaurant
      const { data: restoOwner } = await supabase
        .from('profiles')
        .select('id')
        .eq('restaurant_id', offer.restaurant_id)
        .maybeSingle();

      if (restoOwner) {
        notifs.push({
          user_id: restoOwner.id,
          order_id: order.id,
          title: '🍽️ ' + notifTitle,
          body: notifBody + ' — Préparez la commande !',
          type: 'new_order',
        });
      }

      // Agent
      if (agentId && agentId !== user.id) {
        notifs.push({
          user_id: agentId,
          order_id: order.id,
          title: '💰 ' + notifTitle,
          body: notifBody + ` — Commission: ${commissionAmount.toLocaleString('fr-FR')} FCFA`,
          type: 'new_order',
        });
      }

      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs);
      }

      // 7. Initialisation de la session Wave Checkout réelle via l'API interne sécurisée
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.brickdeal.store';
      const successUrl = `${origin}/checkout/confirmation/${order.id}`;
      const errorUrl = `${origin}/checkout/${offer.id}?error=payment_failed`;

      let checkoutUrl = '';

      // A. Appel de l'API interne Next.js Wave Checkout (exécute l'API Wave officielle côté serveur sans blocage CORS)
      try {
        const apiResp = await fetch('/api/wave/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(totalAmount),
            orderId: order.id,
            success_url: successUrl,
            error_url: errorUrl,
          })
        });
        const apiData = await apiResp.json();
        if (apiData?.wave_launch_url) {
          checkoutUrl = apiData.wave_launch_url;
        }
      } catch (internalApiErr) {
        console.warn('[Internal Wave Checkout API Error]:', internalApiErr);
      }

      // B. Fallback vers la fonction Edge Supabase wave-checkout
      if (!checkoutUrl) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('wave-checkout', {
            body: {
              amount: Math.round(totalAmount),
              orderId: order.id,
              success_url: successUrl,
              error_url: errorUrl,
            }
          });
          if (!edgeErr && edgeData) {
            checkoutUrl = edgeData.wave_launch_url || edgeData.wave_checkout_url || edgeData.checkout_url;
          }
        } catch (e) {
          console.warn('[Wave Edge Function Fallback]:', e);
        }
      }

      // 8. Redirection vers Wave
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        // Redirection directe vers la page de confirmation si Wave n'est pas joignable
        router.push(`/checkout/confirmation/${order.id}`);
      }
      
    } catch (err: any) {
      console.error("Erreur commande:", err);
      setError(err.message || 'Erreur lors de la validation');
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '4rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#E30613', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: '700' }}>Chargement de votre réservation...</p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', maxWidth: '500px', margin: '0 auto', padding: '2.5rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#E30613', marginBottom: '0.8rem', fontWeight: '900' }}>Offre Indisponible</h2>
            <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '14px', lineHeight: '1.5' }}>
              {error || "Cette formule n'est plus disponible actuellement."}
            </p>
            <button onClick={() => router.push('/deals')} style={{ padding: '12px 24px', backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
              Retour aux offres
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const discountPercent = offer?.type === 'flash' && offer.price_normal
    ? Math.round((1 - offer.price_promo / offer.price_normal) * 100)
    : 30;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2.5rem 1rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        
        {/* Fil d'ariane & Titre */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/deals" style={{ fontSize: '13px', color: '#64748B', textDecoration: 'none', fontWeight: '600' }}>
            ← Retour au catalogue des formules
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', marginTop: '0.6rem' }}>
            Finaliser votre réservation
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>
            Configurez votre date, heure et mode de consommation avant le règlement sécurisé.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1.5px solid #F87171', color: '#991B1B', padding: '14px 18px', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* COLONNE GAUCHE : PARAMÉTRAGE DE LA RÉSERVATION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* CARTE OFFRE SÉLECTIONNÉE */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.4rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                <div style={{ width: '92px', height: '92px', borderRadius: '16px', backgroundColor: '#F1F5F9', overflow: 'hidden', flexShrink: 0, border: '1px solid #E2E8F0' }}>
                  {offer.photos?.[0] ? (
                    <img src={offer.photos[0]} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🍽️</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: offer.type === 'flash' ? '#E30613' : '#2563EB', backgroundColor: offer.type === 'flash' ? '#FEE2E2' : '#EFF6FF', padding: '3px 10px', borderRadius: '8px' }}>
                      {offer.type === 'flash' ? '⚡ OFFRE FLASH' : '🏷️ DEAL SPÉCIAL'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#16A34A', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '8px' }}>
                      -{discountPercent}% ÉCONOMIE
                    </span>
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0F172A', margin: '4px 0' }}>{offer.title}</h3>
                  <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: '600' }}>
                    📍 {offer.restaurant?.name} — {offer.restaurant?.address || 'Abidjan'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                    <span style={{ color: '#E30613', fontWeight: '900', fontSize: '18px' }}>
                      {Number(unitPrice).toLocaleString('fr-FR')} FCFA
                    </span>
                    {normalPrice > unitPrice && (
                      <span style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'line-through' }}>
                        {Number(normalPrice).toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ÉTAPE 1 : DATE DE RÉSERVATION */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.6rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A', margin: 0 }}>
                  1. Choisissez votre date
                </h2>
                <span style={{ fontSize: '12px', color: '#E30613', fontWeight: '800' }}>📅 {bookingDate}</span>
              </div>

              {/* Badges horizontaux des jours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {nextDays.map((d, idx) => {
                  const isSelected = bookingDate === d.fullDate;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBookingDate(d.fullDate)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                        backgroundColor: isSelected ? '#E30613' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: isSelected ? '800' : '600', opacity: isSelected ? 0.9 : 0.7 }}>
                        {d.label}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '900', marginTop: '2px' }}>
                        {d.shortDate}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Option date libre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Autre date :</span>
                <input
                  type="date"
                  min={nextDays[0].ymd}
                  onChange={(e) => {
                    if (e.target.value) {
                      const parts = e.target.value.split('-');
                      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                      const fullMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                      setBookingDate(`${d.getDate()} ${fullMonths[d.getMonth()]} ${d.getFullYear()}`);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* ÉTAPE 2 : HEURE DE RÉSERVATION */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.6rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A', margin: 0 }}>
                  2. Choisissez l'heure
                </h2>
                <span style={{ fontSize: '12px', color: '#E30613', fontWeight: '800' }}>
                  ⏰ {customTime ? customTime : bookingTime}
                </span>
              </div>

              {/* Créneaux rapides */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {DEFAULT_TIME_SLOTS.map((time, idx) => {
                  const isSelected = !customTime && bookingTime === time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBookingTime(time);
                        setCustomTime('');
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                        backgroundColor: isSelected ? '#FFF1F2' : '#FFFFFF',
                        color: isSelected ? '#E30613' : '#334155',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Heure précise :</span>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* ÉTAPE 3 : MODE DE DÉGUSTATION */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.6rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A', marginBottom: '1rem' }}>
                3. Mode de dégustation
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: diningOption === 'livraison' ? '14px' : 0 }}>
                <button
                  type="button"
                  onClick={() => setDiningOption('sur_place')}
                  style={{
                    padding: '14px 10px',
                    borderRadius: '14px',
                    border: diningOption === 'sur_place' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                    backgroundColor: diningOption === 'sur_place' ? '#FFF1F2' : '#FFFFFF',
                    color: diningOption === 'sur_place' ? '#E30613' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>🍽️</span>
                  <span>Sur place</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiningOption('retrait')}
                  style={{
                    padding: '14px 10px',
                    borderRadius: '14px',
                    border: diningOption === 'retrait' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                    backgroundColor: diningOption === 'retrait' ? '#FFF1F2' : '#FFFFFF',
                    color: diningOption === 'retrait' ? '#E30613' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>🛍️</span>
                  <span>À emporter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiningOption('livraison')}
                  style={{
                    padding: '14px 10px',
                    borderRadius: '14px',
                    border: diningOption === 'livraison' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                    backgroundColor: diningOption === 'livraison' ? '#FFF1F2' : '#FFFFFF',
                    color: diningOption === 'livraison' ? '#E30613' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>🚚</span>
                  <span>Livraison</span>
                </button>
              </div>

              {diningOption === 'livraison' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Adresse de livraison exacte (commune, quartier, repère) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cocody Angré 8ème Tranche, près de la pharmacie"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #E30613',
                      fontSize: '13px',
                      fontWeight: '600',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              )}
            </div>

            {/* ÉTAPE 4 : COORDONNÉES DU BÉNÉFICIAIRE */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.6rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A', marginBottom: '1rem' }}>
                4. Bénéficiaire du Pass
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Nom et Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Eric Kouamé"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '13px',
                      outline: 'none',
                      fontWeight: '600',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Numéro de téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: +225 07 00 00 00 00"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '13px',
                      outline: 'none',
                      fontWeight: '600',
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
          
          {/* COLONNE DROITE : RÉSUMÉ FINANCIER & PAIEMENT WAVE */}
          <div style={{ position: 'sticky', top: '90px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.8rem', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
              
              <h2 style={{ fontSize: '17px', fontWeight: '900', color: '#0F172A', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1.5px solid #F1F5F9' }}>
                Récapitulatif de commande
              </h2>

              {/* SÉLECTEUR QUANTITÉ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Nombre de personnes / formules :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', fontSize: '18px', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '17px', fontWeight: '900', minWidth: '24px', textAlign: 'center', color: '#0F172A' }}>
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(offer.type === 'flash' ? Math.min(offer.quantity_remaining, quantity + 1) : quantity + 1)}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', fontSize: '18px', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* LIGNES DE DÉTAIL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '14px', borderBottom: '1.5px dashed #E2E8F0', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Formule ({quantity}x)</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{Number(totalAmount).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Date réservée</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{bookingDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Heure de dégustation</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>{customTime || bookingTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Option</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>
                    {diningOption === 'livraison' ? '🚚 Livraison' : (diningOption === 'retrait' ? '🛍️ Retrait' : '🍽️ Sur place')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: '700' }}>
                  <span>Frais de délivrance du Pass QR</span>
                  <span>Offerts (0 FCFA)</span>
                </div>
                {totalSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: '800', backgroundColor: '#F0FDF4', padding: '6px 10px', borderRadius: '8px', marginTop: '4px' }}>
                    <span>🎁 Votre économie totale :</span>
                    <span>+{Number(totalSavings).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
              </div>

              {/* TOTAL GÉNÉRAL */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 20px 0' }}>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>Total à payer</span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#E30613' }}>
                  {Number(totalAmount).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* ENCART WAVE MOBILE MONEY */}
              <div style={{ backgroundColor: '#E0F7FC', border: '2px solid #1DC4E9', borderRadius: '16px', padding: '14px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/wave-icon.png" alt="Wave" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#0F172A' }}>Wave Mobile Money</div>
                  <div style={{ fontSize: '11px', color: '#0084A8', fontWeight: '700', marginTop: '2px' }}>
                    Paiement instantané sécurisé • 0% de frais client
                  </div>
                </div>
                <span style={{ fontSize: '18px' }}>✓</span>
              </div>

              {/* BOUTON D'ACTION PRINCIPAL */}
              <button 
                type="button"
                onClick={handleWaveCheckout} 
                disabled={processing}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#1DC4E9',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: '900',
                  fontSize: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(29, 196, 233, 0.35)',
                  transition: 'transform 0.1s ease',
                }}
              >
                <img src="/wave-icon.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                <span>{processing ? 'Initialisation sécurisée...' : 'Payer via Wave Mobile Money'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0, fontWeight: '600' }}>
                  🔒 Cryptage SSL 256-bit • Pass QR délivré immédiatement après validation
                </p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
                  Assistance client WhatsApp 24/7 disponible en cas de besoin
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
