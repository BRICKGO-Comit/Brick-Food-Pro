'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useParams } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';

export default function CheckoutPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const offerId = params.offerId as string;
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [diningOption, setDiningOption] = useState<'sur_place' | 'livraison'>('sur_place');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

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
          throw new Error('Offre indisponible');
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

  const handlePayment = async () => {
    if (!user || !offer) return;
    if (!clientName.trim()) {
      alert("Veuillez indiquer votre nom complet pour le Pass de réservation.");
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      // Générer code réservation officiel
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'BRK-';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const price = offer.type === 'flash' ? offer.price_promo : offer.price;
      const totalAmount = price * quantity;
      const commissionAmount = totalAmount * ((offer.commission_rate || 20) / 100);
      
      // Insérer la commande
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        client_id: user.id,
        restaurant_id: offer.restaurant_id,
        offer_id: offer.id,
        agent_id: offer.agent_id,
        status: 'nouvelle',
        delivery_mode: diningOption === 'livraison' ? 'livraison' : 'retrait',
        dining_option: diningOption,
        delivery_address: diningOption === 'livraison' ? (deliveryAddress.trim() || 'Livraison') : 'Sur place',
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || 'Non renseigné',
        quantity,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'paid', // Simulé paid via Wave
        reservation_code: code
      }).select().single();
      
      if (orderError) throw orderError;
      
      // Mettre à jour le stock si flash
      if (offer.type === 'flash') {
        await supabase
          .from('offers')
          .update({ quantity_remaining: Math.max(0, offer.quantity_remaining - quantity) })
          .eq('id', offer.id);
      }
      
      // Historique d'audit
      await supabase.from('order_history').insert({
        order_id: order.id,
        action: 'commande_creee',
        actor_id: user.id
      });
      
      // Redirection immédiate vers la confirmation & Pass QR
      router.push(`/checkout/confirmation/${order.id}`);
      
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
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          Préparation de votre commande...
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', maxWidth: '500px', margin: '0 auto', padding: '2rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <h2 style={{ color: '#E30613', marginBottom: '1rem' }}>Offre Indisponible</h2>
            <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>{error || "Cette formule n'est plus disponible actuellement."}</p>
            <button onClick={() => router.push('/deals')} style={{ padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
              Retour aux offres
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const unitPrice = offer.type === 'flash' ? offer.price_promo : offer.price;
  const total = unitPrice * quantity;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0F172A', marginBottom: '1.5rem' }}>
          Finaliser votre réservation
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Colonne Gauche : Formule & Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Récapitulatif Offre */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '84px', height: '84px', borderRadius: '12px', backgroundColor: '#F1F5F9', overflow: 'hidden', flexShrink: 0 }}>
                  {offer.photos?.[0] ? (
                    <img src={offer.photos[0]} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🍽️</div>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: offer.type === 'flash' ? '#E30613' : '#3B82F6', backgroundColor: offer.type === 'flash' ? '#FEE2E2' : '#EFF6FF', padding: '3px 8px', borderRadius: '6px' }}>
                    {offer.type === 'flash' ? '⚡ OFFRE FLASH' : '🎁 DEAL REPAS'}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '6px 0 2px 0' }}>{offer.title}</h3>
                  <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>🏢 {offer.restaurant?.name}</p>
                  <p style={{ color: '#10B981', fontWeight: '900', fontSize: '16px', margin: '4px 0 0 0' }}>
                    {Number(unitPrice).toLocaleString('fr-FR')} FCFA / formule
                  </p>
                </div>
              </div>
            </div>

            {/* Étape 1 : Coordonnées du bénéficiaire */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '1rem' }}>
                1. Bénéficiaire du Pass
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="Votre Nom & Prénom"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Numéro de téléphone</label>
                  <input
                    type="tel"
                    placeholder="Ex: 07 00 00 00 00"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Étape 2 : Mode de Dégustation */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '1rem' }}>
                2. Mode de dégustation
              </h2>
              <div style={{ display: 'flex', gap: '10px', marginBottom: diningOption === 'livraison' ? '12px' : 0 }}>
                <button
                  type="button"
                  onClick={() => setDiningOption('sur_place')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: diningOption === 'sur_place' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                    backgroundColor: diningOption === 'sur_place' ? '#FFF1F2' : '#FFFFFF',
                    color: diningOption === 'sur_place' ? '#E30613' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🍽️ Sur place (au restaurant)
                </button>
                <button
                  type="button"
                  onClick={() => setDiningOption('livraison')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: diningOption === 'livraison' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                    backgroundColor: diningOption === 'livraison' ? '#FFF1F2' : '#FFFFFF',
                    color: diningOption === 'livraison' ? '#E30613' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📦 À emporter / Livraison
                </button>
              </div>

              {diningOption === 'livraison' && (
                <input
                  type="text"
                  placeholder="Indiquez l'adresse de livraison ou commune"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                />
              )}
            </div>

          </div>
          
          {/* Colonne Droite : Quantité & Paiement */}
          <div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', position: 'sticky', top: '100px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid #F1F5F9' }}>
                Récapitulatif & Règlement
              </h2>

              {/* Quantité */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Nombre de formules :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: '900', minWidth: '24px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(offer.type === 'flash' ? Math.min(offer.quantity_remaining, quantity + 1) : quantity + 1)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lignes de calcul */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#64748B' }}>
                <span>Prix unitaire</span>
                <span>{Number(unitPrice).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#64748B' }}>
                <span>Quantité</span>
                <span>x {quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#10B981' }}>
                <span>Frais de service & Pass</span>
                <span>Offerts (0 FCFA)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1.5px dashed #E2E8F0', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>Total à régler</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#E30613' }}>{Number(total).toLocaleString('fr-FR')} FCFA</span>
              </div>

              {/* Bouton Wave Payment */}
              <button 
                onClick={handlePayment} 
                disabled={processing}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: '800',
                  fontSize: '15px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
              >
                {processing ? 'Génération de votre Pass...' : '💳 Payer via Wave Mobile Money'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '12px', margin: 0 }}>
                🔒 Paiement instantané sécurisé • Pass QR délivré immédiatement
              </p>

            </div>
          </div>

        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
