'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import Link from 'next/link';

export default function SuiviCommandesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'toutes' | 'en_cours' | 'terminees'>('toutes');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/commandes');
    }
  }, [user, authLoading, router]);

  const loadClientOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(name, address, phone),
          offer:offers(title, type, price_normal, price_promo, price, photos)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Erreur chargement commandes client:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClientOrders();

      // Realtime subscription sur les commandes du client pour voir le changement de statut en direct
      const channel = supabase
        .channel('client-orders-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `client_id=eq.${user.id}`,
          },
          () => {
            loadClientOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Statistiques
  const totalCount = orders.length;
  const inProgressCount = orders.filter(o => o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee').length;
  const completedCount = orders.filter(o => o.status === 'terminee' || o.status === 'livree').length;

  const totalSavings = orders.reduce((sum, o) => {
    if (o.offer?.type === 'flash' && o.offer?.price_normal && o.offer?.price_promo) {
      return sum + ((o.offer.price_normal - o.offer.price_promo) * (o.quantity || 1));
    }
    return sum;
  }, 0);

  // Filtrage
  const filteredOrders = orders.filter(o => {
    if (filterTab === 'en_cours') {
      return o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee';
    }
    if (filterTab === 'terminees') {
      return o.status === 'terminee' || o.status === 'livree';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouvelle':
        return { label: '🟢 Pass Prêt / En attente', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
      case 'en_preparation':
        return { label: '🍳 En préparation', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' };
      case 'prete':
        return { label: '🛍️ Prête à servir', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
      case 'terminee':
      case 'livree':
        return { label: '✅ Consommée / Terminée', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      default:
        return { label: status, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' };
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
    const restoAddress = order.restaurant?.address || 'Abidjan';
    const offerTitle = order.offer?.title || 'Formule Repas';
    const clientName = profile?.full_name || user?.email || 'Client';
    const clientPhone = profile?.phone || 'Non renseigné';
    const diningText = order.delivery_mode === 'livraison' ? '📦 À emporter / Livraison' : '🍽️ Sur place (au restaurant)';
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
          .card { background: #FFFFFF; border-radius: 20px; padding: 28px; border: 2px solid #E30613; max-width: 440px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .logo { font-size: 26px; font-weight: 900; color: #0F172A; }
          .logo span { color: #E30613; }
          .sublogo { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-top: 4px; }
          .badge { background: #FEE2E2; color: #E30613; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin: 12px 0; }
          .code-box { background: #0F172A; color: #10B981; border-radius: 16px; padding: 18px; text-align: center; margin: 16px 0; }
          .code-title { font-size: 11px; color: #94A3B8; font-weight: 700; text-transform: uppercase; }
          .code-val { font-size: 32px; font-weight: 900; letter-spacing: 3px; margin-top: 4px; }
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
          <div class="sublogo">PASS RÉSERVATION OFFICIEL • BON DE CONSOMMATION</div>
          <div class="badge">PAIEMENT CONFIRMÉ VIA WAVE</div>

          <div class="code-box">
            <div class="code-title">CODE DU PASS RÉSERVATION</div>
            <div class="code-val">${code}</div>
          </div>

          <div class="details-row">
            <span class="label">Établissement :</span>
            <span class="val">${restoName}</span>
          </div>
          <div class="details-row">
            <span class="label">Adresse :</span>
            <span class="val">${restoAddress}</span>
          </div>
          <div class="details-row">
            <span class="label">Formule :</span>
            <span class="val">${offerTitle}</span>
          </div>
          <div class="details-row">
            <span class="label">Bénéficiaire :</span>
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
            <span class="label">Montant Payé :</span>
            <span class="val" style="color: #10B981; font-size: 15px;">${total} FCFA</span>
          </div>
          <div class="details-row">
            <span class="label">Date d'émission :</span>
            <span class="val">${dateStr}</span>
          </div>

          <div class="footer">
            Présentez ce Pass au restaurant pour récupérer ou déguster votre formule.<br>
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <PublicNavbar />

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', margin: '0 0 6px 0' }}>
              Suivi de mes Pass & Commandes
            </h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
              Consultez vos Pass de réservation en temps réel et présentez-les au restaurant.
            </p>
          </div>

          <Link
            href="/deals"
            style={{
              backgroundColor: '#E30613',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(227, 6, 19, 0.25)',
            }}
          >
            🔥 Explorer d'autres offres
          </Link>
        </div>

        {/* Cartes Métriques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>🎟️ Total Pass Réservés</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>{totalCount}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#C2410C', marginBottom: '4px' }}>⏳ Pass en Cours</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#C2410C' }}>{inProgressCount}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.2rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#047857', marginBottom: '4px' }}>✅ Pass Consommés</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#047857' }}>{completedCount}</div>
          </div>
          {totalSavings > 0 && (
            <div style={{ backgroundColor: '#ECFDF5', padding: '1.2rem', borderRadius: '16px', border: '1px solid #A7F3D0', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#047857', marginBottom: '4px' }}>💰 Économies Réalisées</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#059669' }}>+{totalSavings.toLocaleString('fr-FR')} FCFA</div>
            </div>
          )}
        </div>

        {/* Onglets de filtrage */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {[
            { id: 'toutes', label: `Toutes (${totalCount})` },
            { id: 'en_cours', label: `En cours (${inProgressCount})` },
            { id: 'terminees', label: `Terminées (${completedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: filterTab === tab.id ? '#0F172A' : '#FFFFFF',
                color: filterTab === tab.id ? '#FFFFFF' : '#475569',
                fontWeight: filterTab === tab.id ? '800' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: filterTab === tab.id ? '0 2px 8px rgba(15, 23, 42, 0.15)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Liste des Commandes */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            Chargement de vos réservations...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', padding: '3rem', borderRadius: '20px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
              Aucun Pass dans cette catégorie
            </h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '1.5rem' }}>
              Profitez des meilleures réductions du moment sur BRICK DEAL.
            </p>
            <Link
              href="/deals"
              style={{
                display: 'inline-block',
                backgroundColor: '#E30613',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Découvrir les offres
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map(order => {
              const statusPill = getStatusBadge(order.status);
              const dateStr = new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  {/* Photo & Restaurant / Formule */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: '1 1 auto' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '14px', backgroundColor: '#F1F5F9', overflow: 'hidden', flexShrink: 0 }}>
                      {order.offer?.photos?.[0] ? (
                        <img src={order.offer.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🍽️</div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#0F172A' }}>
                        {order.restaurant?.name || 'Restaurant'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B', margin: '2px 0' }}>
                        {order.offer?.title || 'Formule Repas'} • {order.quantity}x
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        🕒 {dateStr}
                      </div>
                    </div>
                  </div>

                  {/* Code Pass & Statut */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    
                    {/* Badge Statut */}
                    <span style={{
                      backgroundColor: statusPill.bg,
                      color: statusPill.color,
                      border: `1px solid ${statusPill.border}`,
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '800',
                    }}>
                      {statusPill.label}
                    </span>

                    {/* Cadre Code */}
                    <div style={{ backgroundColor: '#0F172A', color: '#10B981', padding: '8px 16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: '700' }}>CODE PASS</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1.5px' }}>
                        {order.reservation_code}
                      </div>
                    </div>

                    {/* Prix */}
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                        {Number(order.total_amount || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                      <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                        Paiement Wave validé
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#FFEBEB',
                          color: '#E30613',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        🎟️ Voir Pass
                      </button>

                      <button
                        onClick={() => handlePrintPass(order)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#F1F5F9',
                          color: '#0F172A',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title="Imprimer / Télécharger PDF"
                      >
                        📥 PDF
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL DU PASS QR OFFICIEL                                                 */}
      {/* ========================================================================= */}
      {selectedOrder && (
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
              RÉSERVATION CONFIRMÉE
            </p>

            {/* Code Géant */}
            <div style={{ backgroundColor: '#0F172A', color: '#10B981', padding: '18px', borderRadius: '16px', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>CODE DU PASS RÉSERVATION</div>
              <div style={{ fontSize: '34px', fontWeight: '900', letterSpacing: '3px', marginTop: '4px' }}>
                {selectedOrder.reservation_code}
              </div>
            </div>

            {/* Détails */}
            <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', fontSize: '13px', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Établissement :</span>
                <span style={{ fontWeight: '800', color: '#0F172A' }}>{selectedOrder.restaurant?.name || 'Restaurant'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Formule :</span>
                <span style={{ fontWeight: '800', color: '#0F172A' }}>{selectedOrder.offer?.title || 'Offre'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Option :</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>
                  {selectedOrder.delivery_mode === 'livraison' ? '📦 Livraison' : '🍽️ Sur place (au restaurant)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Quantité :</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>{selectedOrder.quantity} formule(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Montant Réglé :</span>
                <span style={{ fontWeight: '900', color: '#10B981' }}>{Number(selectedOrder.total_amount || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4', marginBottom: '1.5rem' }}>
              Présentez ce Pass au serveur ou à la caisse du restaurant pour consommer votre commande.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handlePrintPass(selectedOrder)}
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
                onClick={() => setSelectedOrder(null)}
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
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
