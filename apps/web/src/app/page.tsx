'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './components/AuthProvider';
import PublicNavbar from './components/PublicNavbar';
import PublicFooter from './components/PublicFooter';

export default function UnifiedHomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirection automatique selon le rôle connecté
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'admin') {
        router.replace('/admin');
      } else if (profile.role === 'restaurant') {
        router.replace('/resto');
      } else if (profile.role === 'agent') {
        router.replace('/agent-portal');
      }
    }
  }, [user, profile, authLoading, router]);

  // État du catalogue d'offres en direct
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [now, setNow] = useState(new Date().getTime());

  // Horloge temps réel pour le compte à rebours Flash
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement des offres validées et publiées
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            restaurant:restaurants(name, address, photos)
          `)
          .eq('is_published', true)
          .eq('status', 'validee')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const validOffers = (data || []).filter((offer) => {
          if (offer.type === 'flash') {
            return new Date(offer.end_timestamp).getTime() > new Date().getTime() && (offer.quantity_remaining ?? 1) > 0;
          }
          return true;
        });

        setOffers(validOffers);
      } catch (err) {
        console.error('[HomePage] Erreur chargement offres:', err);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, []);

  // Filtrage des offres
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offer.restaurant?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offer.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedCategory === 'Tous') return matchesSearch;
    if (selectedCategory === '⚡ Flash') return matchesSearch && offer.type === 'flash';
    if (selectedCategory === '💑 Couple') return matchesSearch && offer.pack_type === 'couple';
    if (selectedCategory === '👨‍👩‍👧‍👦 Famille') return matchesSearch && offer.pack_type === 'famille';
    if (selectedCategory === '🎂 Anniversaire') return matchesSearch && offer.pack_type === 'anniversaire';
    if (selectedCategory === '👑 VIP') return matchesSearch && offer.pack_type === 'vip';
    if (selectedCategory === '💼 Business') return matchesSearch && offer.pack_type === 'business';

    return matchesSearch;
  });

  const formatTimeLeft = (endTime: string) => {
    const distance = new Date(endTime).getTime() - now;
    if (distance <= 0) return 'Expiré';
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const categories = ['Tous', '⚡ Flash', '💑 Couple', '👨‍👩‍👧‍👦 Famille', '🎂 Anniversaire', '👑 VIP', '💼 Business'];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        padding: '70px 24px 90px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(227, 6, 19, 0.15)',
              border: '1px solid rgba(227, 6, 19, 0.3)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: '#FF4D4D',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '20px',
            }}>
              🔥 L'application N°1 des bons plans gastronomiques
            </div>
            <h1 style={{ fontSize: '44px', fontWeight: '900', lineHeight: '1.15', marginBottom: '20px', letterSpacing: '-1px' }}>
              Vos offres flash & deals repas au meilleur prix
            </h1>
            <p style={{ fontSize: '17px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '32px' }}>
              Découvrez les promotions exclusives de vos restaurants préférés. Réservez en un clic, payez en toute sécurité via Wave Mobile Money et présentez votre Pass QR instantané.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <a
                href="#deals"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 8px 20px rgba(227, 6, 19, 0.35)',
                }}
              >
                🔥 Découvrir les Deals en Direct
              </a>
              <a
                href="#download"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                📱 Télécharger l'App (APK)
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '36px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#FFFFFF' }}>+10 000</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Clients actifs</span>
              </div>
              <div style={{ height: '30px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#FFFFFF' }}>100%</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Paiement Wave</span>
              </div>
              <div style={{ height: '30px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#10B981' }}>Pass QR</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Scan instantané</span>
              </div>
            </div>
          </div>

          {/* App Preview Card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              maxWidth: '380px',
              width: '100%',
            }}>
              <div style={{ backgroundColor: '#0F172A', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#E30613', fontWeight: '900', fontSize: '15px' }}>⚡ BRICK FLASH DU JOUR</span>
                <span style={{ backgroundColor: '#EF4444', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px' }}>-35%</span>
              </div>

              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800"
                alt="Offre gourmande Menu Duo"
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }}
              />

              <h3 style={{ color: '#FFF', fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Menu Duo Gourmet & Boissons</h3>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '14px' }}>🏢 Établissement Partenaire Privilège</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: '12px 16px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', textDecoration: 'line-through', display: 'block' }}>12 000 FCFA</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>7 800 FCFA</span>
                </div>
                <a href="#deals" style={{ backgroundColor: '#10B981', color: '#FFF', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', textDecoration: 'none' }}>
                  Pass QR Prêt
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Interactive des Bons Plans en Direct */}
      <section id="deals" style={{ padding: '70px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '32px' }}>
          <div>
            <span style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              OFFRES EN DIRECT
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '8px 0 0 0', letterSpacing: '-0.5px' }}>
              Nos Deals & Formules Disponibles
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', marginTop: '6px' }}>
              Réservez votre formule et profitez immédiatement de votre Pass QR au restaurant.
            </p>
          </div>

          {/* Recherche */}
          <div style={{ minWidth: '280px' }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un plat, un restaurant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* Filtres par Catégorie */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '10px 18px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '700',
                border: selectedCategory === cat ? 'none' : '1px solid #E2E8F0',
                backgroundColor: selectedCategory === cat ? '#E30613' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: selectedCategory === cat ? '0 4px 12px rgba(227, 6, 19, 0.25)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grille des Offres */}
        {loadingOffers ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
            Chargement des offres en direct...
          </div>
        ) : filteredOffers.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '60px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Aucune offre disponible</h3>
            <p style={{ color: '#64748B', fontSize: '14px' }}>De nouvelles formules et offres flash arrivent très vite.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px' }}>
            {filteredOffers.map((offer) => {
              const isFlash = offer.type === 'flash';
              const pricePromo = isFlash ? offer.price_promo : offer.price;
              const priceNormal = isFlash ? offer.price_normal : null;
              const discountPercent = isFlash && priceNormal && pricePromo ? Math.round(((priceNormal - pricePromo) / priceNormal) * 100) : null;
              const photoUrl = offer.photos?.[0] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800';

              return (
                <div
                  key={offer.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Photo & Badges */}
                  <div style={{ position: 'relative', height: '200px' }}>
                    <img
                      src={photoUrl}
                      alt={offer.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px' }}>
                      <span style={{
                        backgroundColor: isFlash ? '#E30613' : '#3B82F6',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}>
                        {isFlash ? '⚡ FLASH' : `🎁 ${offer.pack_type?.toUpperCase() || 'DEAL'}`}
                      </span>
                    </div>

                    {discountPercent && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '900',
                      }}>
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Timer Flash */}
                    {isFlash && offer.end_timestamp && (
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        color: '#FFFFFF',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span>⏳ Expire dans :</span>
                        <span style={{ color: '#FF4D4D', fontWeight: '900' }}>{formatTimeLeft(offer.end_timestamp)}</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>
                      🏢 {offer.restaurant?.name || 'Restaurant Partenaire'}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#0F172A', lineHeight: '1.3' }}>
                      {offer.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px', flex: 1 }}>
                      {offer.description?.substring(0, 95)}...
                    </p>

                    {/* Prix & Bouton Commande */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                      <div>
                        {priceNormal && (
                          <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through', display: 'block' }}>
                            {Number(priceNormal).toLocaleString()} FCFA
                          </span>
                        )}
                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                          {Number(pricePromo).toLocaleString()} FCFA
                        </span>
                      </div>

                      <Link
                        href={`/deals/${offer.id}`}
                        style={{
                          backgroundColor: '#E30613',
                          color: '#FFFFFF',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '13px',
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(227, 6, 19, 0.25)',
                        }}
                      >
                        Commander →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section Comment ça marche */}
      <section id="comment-ca-marche" style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '16px' }}>Comment ça marche ?</h2>
            <p style={{ color: '#64748B', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
              Une expérience fluide et 100% numérique pour profiter de vos repas préférés au meilleur prix.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FFEBEB', color: '#E30613', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
                🔍
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>1. Choisissez votre Deal</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
                Parcourez les offres flash éphémères et les deals exclusifs proposés par les meilleurs restaurants partenaires.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
                💳
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>2. Payez via Wave</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
                Réglez en toute sécurité directement sur la plateforme avec Wave Mobile Money. Validation instantanée.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
                🎟️
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>3. Obtenez votre Pass QR</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
                Votre Pass QR officiel est immédiatement généré avec votre code unique de réservation.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
                🍽️
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>4. Savourez sur place</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
                Présentez simplement votre Pass QR ou votre code de réservation au restaurant pour consommer votre formule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Établissements Partenaires & Agents */}
      <section id="partenaires" style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              POUR LES PROFESSIONNELS
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '900', margin: '12px 0 20px 0', lineHeight: '1.2' }}>
              Développez votre activité avec BRICK DEAL
            </h2>
            <p style={{ color: '#64748B', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
              Que vous soyez restaurateur souhaitant booster votre fréquentation ou agent commercial développant votre portefeuille, BRICK DEAL met à votre disposition des outils numériques dédiés.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Validation sécurisée des Pass QR par scan caméra ou saisie
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Suivi analytique des ventes, commissions et versements
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Soumission et publication instantanée de packs promotionnels
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '10px' }}>🏢 Établissements Partenaires</h3>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>Accédez à votre caisse numérique et validez les Pass QR des clients.</p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  textDecoration: 'none',
                  width: '100%',
                }}
              >
                Accès Espace Restaurateur
              </Link>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '10px' }}>👔 Agents Commerciaux</h3>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>Pilotez vos restaurants affiliés et suivez vos commissions.</p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  textDecoration: 'none',
                  width: '100%',
                }}
              >
                Accès Espace Agent Commercial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section Téléchargement App */}
      <section id="download" style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '70px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '16px' }}>
            Emportez BRICK DEAL partout avec vous
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '32px' }}>
            Téléchargez l'application officielle Android et iOS pour recevoir des alertes lors de chaque nouvelle offre flash.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <a
              href="#download"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#E30613',
                color: '#FFFFFF',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              📱 Télécharger l'Application APK
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
