'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AgentDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [recentOffers, setRecentOffers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modal Vente Terrain
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({
    restaurantId: '',
    offerId: '',
    clientName: '',
    clientPhone: '',
    diningOption: 'sur_place' as 'sur_place' | 'livraison',
    deliveryAddress: '',
    quantity: 1,
    paymentMethod: 'cash' as 'cash' | 'wave'
  });

  // Modal Affichage Pass QR généré
  const [generatedPassOrder, setGeneratedPassOrder] = useState<any | null>(null);
  const [selectedPassOrder, setSelectedPassOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'agent')) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;
    
    try {
      setDataLoading(true);
      const agentId = profile.id;
      
      const [
        { data: restosData },
        { data: offersData },
        { data: ordersData },
        { data: myProposalsData }
      ] = await Promise.all([
        supabase.from('restaurants').select('*').eq('agent_id', agentId).order('name'),
        supabase.from('offers').select('*, restaurant:restaurants(name)').eq('is_published', true).eq('status', 'validee'),
        supabase.from('orders').select('*, restaurant:restaurants(name), offer:offers(title, type)').eq('agent_id', agentId).order('created_at', { ascending: false }),
        supabase.from('offers').select('*, restaurant:restaurants(name)').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(5)
      ]);
      
      setRestaurants(restosData || []);
      setActiveOffers(offersData || []);
      setAllOrders(ordersData || []);
      setRecentOffers(myProposalsData || []);

      if (restosData && restosData.length > 0 && !orderForm.restaurantId) {
        setOrderForm(prev => ({ ...prev, restaurantId: restosData[0].id }));
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData();
      
      const ordersSubscription = supabase
        .channel('agent-orders-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `agent_id=eq.${profile.id}`
          },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(ordersSubscription);
      };
    }
  }, [profile?.id]);

  // Filtrage par période
  const filteredOrders = allOrders.filter(order => {
    if (periodFilter === 'all') return true;
    const orderDate = new Date(order.created_at);
    const now = new Date();
    if (periodFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (periodFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= weekAgo;
    }
    if (periodFilter === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalCommissions = filteredOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (Number(o.commission_amount) || 0), 0);

  const totalSalesCA = filteredOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // Filtrage des offres disponibles pour le restaurant sélectionné dans le modal
  const availableOffersForSelectedResto = activeOffers.filter(
    o => o.restaurant_id === orderForm.restaurantId
  );

  const selectedOfferObj = activeOffers.find(o => o.id === orderForm.offerId);
  const selectedOfferPrice = selectedOfferObj
    ? (selectedOfferObj.type === 'flash' ? selectedOfferObj.price_promo : selectedOfferObj.price)
    : 0;
  const currentTotal = selectedOfferPrice * orderForm.quantity;
  const currentCommission = currentTotal * ((selectedOfferObj?.commission_rate || 20) / 100);

  const handleCreateTerrainOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !orderForm.restaurantId || !orderForm.offerId) {
      alert("Veuillez sélectionner un restaurant et une offre.");
      return;
    }
    if (!orderForm.clientName.trim()) {
      alert("Veuillez renseigner le nom du client.");
      return;
    }

    setOrderSubmitting(true);
    try {
      // Générer code réservation officiel
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'BRK-';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          agent_id: profile.id,
          restaurant_id: orderForm.restaurantId,
          offer_id: orderForm.offerId,
          client_name: orderForm.clientName.trim(),
          client_phone: orderForm.clientPhone.trim() || 'Non renseigné',
          delivery_mode: orderForm.diningOption === 'livraison' ? 'livraison' : 'retrait',
          dining_option: orderForm.diningOption,
          delivery_address: orderForm.diningOption === 'livraison' ? (orderForm.deliveryAddress.trim() || 'Livraison') : 'Sur place',
          quantity: orderForm.quantity,
          total_amount: currentTotal,
          commission_amount: currentCommission,
          payment_status: 'paid', // Vente terrain encaissée
          status: 'nouvelle',
          reservation_code: code
        })
        .select('*, restaurant:restaurants(name, address), offer:offers(title, type)')
        .single();

      if (orderErr) throw orderErr;

      // Décrémenter stock si offre flash
      if (selectedOfferObj?.type === 'flash') {
        await supabase
          .from('offers')
          .update({ quantity_remaining: Math.max(0, (selectedOfferObj.quantity_remaining || 1) - orderForm.quantity) })
          .eq('id', orderForm.offerId);
      }

      // Historique
      await supabase.from('order_history').insert({
        order_id: newOrder.id,
        action: 'commande_creee_agent',
        actor_id: profile.id
      });

      setShowOrderModal(false);
      setGeneratedPassOrder(newOrder);
      setOrderForm({
        restaurantId: restaurants[0]?.id || '',
        offerId: '',
        clientName: '',
        clientPhone: '',
        diningOption: 'sur_place',
        deliveryAddress: '',
        quantity: 1,
        paymentMethod: 'cash'
      });
      loadDashboardData();

    } catch (err: any) {
      console.error("Erreur commande terrain:", err);
      alert("Erreur lors de la validation de la commande: " + (err.message || err));
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handlePrintPass = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer le Pass.");
      return;
    }

    const code = order.reservation_code || 'BRK-7892';
    const total = Number(order.total_amount || 0).toLocaleString('fr-FR');
    const restoName = order.restaurant?.name || 'Restaurant Partenaire';
    const offerTitle = order.offer?.title || 'Formule Repas';
    const clientName = order.client_name || order.profiles?.full_name || 'Client';
    const clientPhone = order.client_phone || 'Non renseigné';
    const diningText = order.dining_option === 'livraison' ? '📦 À emporter / Livraison' : '🍽️ Sur place (au restaurant)';
    const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pass Réservation - BRICK DEAL</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1E293B; background: #F8FAFC; text-align: center; }
          .card { background: #FFFFFF; border-radius: 20px; padding: 24px; border: 2px solid #E30613; max-width: 440px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .logo { font-size: 24px; font-weight: 900; color: #0F172A; }
          .logo span { color: #E30613; }
          .sublogo { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-top: 4px; }
          .badge { background: #FEE2E2; color: #E30613; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin: 12px 0; }
          .code-box { background: #0F172A; color: #10B981; border-radius: 14px; padding: 16px; text-align: center; margin: 16px 0; }
          .code-title { font-size: 11px; color: #94A3B8; font-weight: 700; text-transform: uppercase; }
          .code-val { font-size: 30px; font-weight: 900; letter-spacing: 3px; margin-top: 4px; }
          .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; text-align: left; }
          .label { font-weight: 700; color: #64748B; }
          .val { font-weight: 800; color: #0F172A; text-align: right; }
          .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 20px; line-height: 1.4; }
          @media print {
            body { background: #FFFFFF; padding: 0; }
            .card { box-shadow: none; border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">BRICK<span>DEAL</span></div>
          <div class="sublogo">PASS RÉSERVATION CLIENT • BON DE CONSOMMATION</div>
          <div class="badge">OFFRE VALIDÉE & CONFIRMÉE</div>

          <div class="code-box">
            <div class="code-title">CODE DU PASS RÉSERVATION</div>
            <div class="code-val">${code}</div>
          </div>

          <div class="details-row">
            <span class="label">Établissement :</span>
            <span class="val">${restoName}</span>
          </div>
          <div class="details-row">
            <span class="label">Offre :</span>
            <span class="val">${offerTitle}</span>
          </div>
          <div class="details-row">
            <span class="label">Client :</span>
            <span class="val">${clientName}</span>
          </div>
          <div class="details-row">
            <span class="label">Téléphone :</span>
            <span class="val">${clientPhone}</span>
          </div>
          <div class="details-row">
            <span class="label">Option :</span>
            <span class="val">${diningText}</span>
          </div>
          <div class="details-row">
            <span class="label">Quantité :</span>
            <span class="val">${order.quantity} formule(s)</span>
          </div>
          <div class="details-row">
            <span class="label">Total Réglé :</span>
            <span class="val" style="color: #10B981; font-size: 15px;">${total} FCFA</span>
          </div>
          <div class="details-row">
            <span class="label">Émis le :</span>
            <span class="val">${dateStr}</span>
          </div>

          <div class="footer">
            Présentez ce Pass au restaurant pour déguster votre formule.<br>
            <strong>BRICK DEAL • Tous droits réservés.</strong>
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

  if (loading || dataLoading) {
    return <div className="p-8 text-center" style={{ color: '#64748B' }}>Chargement de votre espace Agent...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* --- EN-TÊTE DASHBOARD & ACTIONS AGENT --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0F172A', margin: '0 0 6px 0' }}>
            Espace Commercial Terrain
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Bienvenue, <strong>{profile?.full_name || 'Agent'}</strong> • Suivez vos ventes, vos commissions et vos restaurants affiliés.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowOrderModal(true)}
            style={{
              backgroundColor: '#E30613',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(227, 6, 19, 0.3)',
            }}
          >
            <span>🚀</span>
            <span>Vente Terrain (Passer commande)</span>
          </button>

          <Link
            href="/agent-portal/restaurants"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 18px',
              fontWeight: '700',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span>
            <span>Restaurants ({restaurants.length})</span>
          </Link>

          <Link
            href="/agent-portal/propositions"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 18px',
              fontWeight: '700',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span>
            <span>Proposer une Offre</span>
          </Link>
        </div>
      </div>

      {/* --- SÉLECTEUR DE PÉRIODE --- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'today', label: "Aujourd'hui" },
          { id: 'week', label: '7 derniers jours' },
          { id: 'month', label: 'Ce mois-ci' },
          { id: 'all', label: 'Tout l’historique' }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodFilter(p.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: periodFilter === p.id ? '#0F172A' : '#F1F5F9',
              color: periodFilter === p.id ? '#FFFFFF' : '#475569',
              fontWeight: periodFilter === p.id ? '800' : '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* --- CARTES DE MÉTRIQUES --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>🏢 Restaurants Raccordés</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A' }}>{restaurants.length}</div>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '700', marginTop: '4px' }}>Partenaires actifs</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>📦 Commandes Réalisées</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A' }}>{filteredOrders.length}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Sur la période sélectionnée</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>📊 Volume Ventes Généré</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>{totalSalesCA.toLocaleString('fr-FR')} FCFA</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Chiffre d’affaires brut</div>
        </div>

        <div style={{ backgroundColor: '#ECFDF5', padding: '1.5rem', borderRadius: '16px', border: '1px solid #A7F3D0', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857', marginBottom: '6px' }}>🎁 Mes Commissions Gagnées</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#059669' }}>+{totalCommissions.toLocaleString('fr-FR')} FCFA</div>
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: '700', marginTop: '4px' }}>Net encaissé</div>
        </div>
      </div>

      {/* --- GRILLE : DERNIÈRES COMMANDES & DERNIÈRES PROPOSITIONS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Colonne Gauche : Dernières Ventes / Commissions */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Mes Ventes & Commissions ({filteredOrders.length})
            </h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Aucune commande enregistrée sur cette période.</p>
              <button
                onClick={() => setShowOrderModal(true)}
                style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#FFEBEB', color: '#E30613', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                + Enregistrer une première vente
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #F1F5F9', color: '#64748B' }}>
                    <th style={{ padding: '10px 6px' }}>Date</th>
                    <th style={{ padding: '10px 6px' }}>Code</th>
                    <th style={{ padding: '10px 6px' }}>Client</th>
                    <th style={{ padding: '10px 6px' }}>Offre</th>
                    <th style={{ padding: '10px 6px' }}>Total</th>
                    <th style={{ padding: '10px 6px' }}>Commission</th>
                    <th style={{ padding: '10px 6px' }}>Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '10px 6px', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: '800', color: '#E30613' }}>
                        {o.reservation_code}
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: '600' }}>
                        {o.client_name || 'Client'}
                      </td>
                      <td style={{ padding: '10px 6px', color: '#475569', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.offer?.title || 'Formule'}
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: '700' }}>
                        {Number(o.total_amount || 0).toLocaleString('fr-FR')} F
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: '800', color: '#10B981' }}>
                        +{Number(o.commission_amount || 0).toLocaleString('fr-FR')} F
                      </td>
                      <td style={{ padding: '10px 6px' }}>
                        <button
                          onClick={() => setSelectedPassOrder(o)}
                          style={{
                            backgroundColor: '#F1F5F9',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '700',
                          }}
                        >
                          🎟️ Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne Droite : Dernières Propositions d'Offres */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Mes Propositions Récentes
            </h2>
            <Link href="/agent-portal/propositions" style={{ fontSize: '13px', color: '#E30613', fontWeight: '700', textDecoration: 'none' }}>
              Voir tout →
            </Link>
          </div>

          {recentOffers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Aucune proposition d'offre pour le moment.</p>
              <Link
                href="/agent-portal/propositions"
                style={{ display: 'inline-block', marginTop: '12px', padding: '8px 16px', backgroundColor: '#FFEBEB', color: '#E30613', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}
              >
                + Soumettre une première offre
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentOffers.map(offer => {
                let badgeBg = '#FEF3C7';
                let badgeColor = '#D97706';
                let statusLabel = 'En attente';

                if (offer.status === 'validee') {
                  badgeBg = '#D1FAE5';
                  badgeColor = '#059669';
                  statusLabel = 'Validée & En ligne';
                } else if (offer.status === 'refusee') {
                  badgeBg = '#FEE2E2';
                  badgeColor = '#DC2626';
                  statusLabel = 'Refusée';
                } else if (offer.status === 'a_modifier') {
                  badgeBg = '#FFEDD5';
                  badgeColor = '#EA580C';
                  statusLabel = 'À corriger';
                }

                return (
                  <div key={offer.id} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{offer.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>🏢 {offer.restaurant?.name}</div>
                      </div>
                      <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '12px' }}>
                      <span>Type : <strong style={{ color: '#0F172A', textTransform: 'uppercase' }}>{offer.type}</strong></span>
                      <span>Prix : <strong style={{ color: '#10B981' }}>{Number(offer.type === 'flash' ? offer.price_promo : offer.price).toLocaleString('fr-FR')} FCFA</strong></span>
                    </div>

                    {offer.status === 'a_modifier' && offer.observation && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '12px', color: '#DC2626' }}>
                        <strong>Remarque modération :</strong> {offer.observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1 : VENTE TERRAIN (PASSER COMMANDE EN DIRECT POUR UN CLIENT)      */}
      {/* ========================================================================= */}
      {showOrderModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0F172A' }}>
                  🚀 Vente Assistée / Commande Terrain
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '13px' }}>
                  Enregistrez la commande du client et générez son Pass instantanément.
                </p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTerrainOrder}>
              {/* Étape 1 : Choisir le Restaurant */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  1. Établissement Partenaire :
                </label>
                <select
                  value={orderForm.restaurantId}
                  onChange={(e) => setOrderForm({ ...orderForm, restaurantId: e.target.value, offerId: '' })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">-- Sélectionnez un restaurant --</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.address || 'Abidjan'})</option>
                  ))}
                </select>
              </div>

              {/* Étape 2 : Choisir l'Offre */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  2. Formule / Offre :
                </label>
                <select
                  value={orderForm.offerId}
                  onChange={(e) => setOrderForm({ ...orderForm, offerId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">-- Sélectionnez l'offre active --</option>
                  {availableOffersForSelectedResto.map(o => (
                    <option key={o.id} value={o.id}>
                      [{o.type.toUpperCase()}] {o.title} — {Number(o.type === 'flash' ? o.price_promo : o.price).toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              {/* Étape 3 : Coordonnées Client */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Nom du Client :
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dupont"
                    value={orderForm.clientName}
                    onChange={(e) => setOrderForm({ ...orderForm, clientName: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Téléphone Client :
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 07 00 00 00 00"
                    value={orderForm.clientPhone}
                    onChange={(e) => setOrderForm({ ...orderForm, clientPhone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Étape 4 : Mode de Consommation */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  Option de dégustation :
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setOrderForm({ ...orderForm, diningOption: 'sur_place' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: orderForm.diningOption === 'sur_place' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                      backgroundColor: orderForm.diningOption === 'sur_place' ? '#FFF1F2' : '#FFFFFF',
                      color: orderForm.diningOption === 'sur_place' ? '#E30613' : '#475569',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    🍽️ Sur place
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderForm({ ...orderForm, diningOption: 'livraison' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: orderForm.diningOption === 'livraison' ? '2px solid #E30613' : '1.5px solid #E2E8F0',
                      backgroundColor: orderForm.diningOption === 'livraison' ? '#FFF1F2' : '#FFFFFF',
                      color: orderForm.diningOption === 'livraison' ? '#E30613' : '#475569',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    📦 À emporter / Livraison
                  </button>
                </div>

                {orderForm.diningOption === 'livraison' && (
                  <input
                    type="text"
                    placeholder="Adresse de livraison / Point de repère"
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '13px', marginTop: '10px', outline: 'none' }}
                  />
                )}
              </div>

              {/* Étape 5 : Quantité & Mode de règlement */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Quantité :
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, quantity: Math.max(1, orderForm.quantity - 1) })}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '900', minWidth: '24px', textAlign: 'center' }}>
                      {orderForm.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, quantity: orderForm.quantity + 1 })}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: '900', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Règlement :
                  </label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="cash">💵 Espèces / Encaissé</option>
                    <option value="wave">💳 Wave Money</option>
                  </select>
                </div>
              </div>

              {/* Récapitulatif Total & Commission */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                  <span style={{ color: '#64748B' }}>Total à encaisser :</span>
                  <span style={{ fontWeight: '900', color: '#0F172A', fontSize: '16px' }}>{currentTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#059669', fontWeight: '700' }}>Votre commission ({selectedOfferObj?.commission_rate || 20}%) :</span>
                  <span style={{ fontWeight: '900', color: '#059669' }}>+{currentCommission.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Bouton de Validation */}
              <button
                type="submit"
                disabled={orderSubmitting || !orderForm.offerId}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: orderSubmitting || !orderForm.offerId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(227, 6, 19, 0.3)',
                }}
              >
                {orderSubmitting ? 'Validation...' : '✅ Valider et Générer le Pass'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : AFFICHAGE & IMPRESSION DU PASS QR CLIENT                         */}
      {/* ========================================================================= */}
      {(generatedPassOrder || selectedPassOrder) && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000,
        }}>
          {(() => {
            const curOrder = generatedPassOrder || selectedPassOrder;
            return (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                maxWidth: '460px',
                width: '100%',
                padding: '28px',
                textAlign: 'center',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                border: '2px solid #E30613',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎟️</div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '900', color: '#0F172A' }}>
                  Pass Réservation BRICK DEAL
                </h2>
                <p style={{ margin: '0 0 1.2rem 0', color: '#10B981', fontSize: '13px', fontWeight: '800' }}>
                  COMMANDE VALIDÉE AVEC SUCCÈS
                </p>

                {/* Code Géant */}
                <div style={{ backgroundColor: '#0F172A', color: '#10B981', padding: '16px', borderRadius: '16px', marginBottom: '1.2rem' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>CODE DU PASS RÉSERVATION</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '3px', marginTop: '4px' }}>
                    {curOrder.reservation_code}
                  </div>
                </div>

                {/* Détails */}
                <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', fontSize: '13px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Établissement :</span>
                    <span style={{ fontWeight: '800', color: '#0F172A' }}>{curOrder.restaurant?.name || 'Restaurant'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Formule :</span>
                    <span style={{ fontWeight: '800', color: '#0F172A' }}>{curOrder.offer?.title || 'Offre'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Client :</span>
                    <span style={{ fontWeight: '800', color: '#0F172A' }}>{curOrder.client_name || 'Client'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Téléphone :</span>
                    <span style={{ fontWeight: '800', color: '#0F172A' }}>{curOrder.client_phone || 'Non renseigné'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Total Réglé :</span>
                    <span style={{ fontWeight: '900', color: '#10B981' }}>{Number(curOrder.total_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Votre Commission :</span>
                    <span style={{ fontWeight: '900', color: '#E30613' }}>+{Number(curOrder.commission_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handlePrintPass(curOrder)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>📥</span>
                    <span>Télécharger / Imprimer PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedPassOrder(null);
                      setSelectedPassOrder(null);
                    }}
                    style={{
                      padding: '12px 18px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
