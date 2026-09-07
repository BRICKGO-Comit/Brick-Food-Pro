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
  const [selectedCommune, setSelectedCommune] = useState('Toutes les communes');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [now, setNow] = useState(new Date().getTime());

  // Horloge temps réel pour les comptes à rebours
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
            restaurant:restaurants(name, address, photos, phone, category)
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

  // Filtrage combiné (Recherche + Catégorie + Commune)
  const filteredOffers = offers.filter((offer) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      offer.title?.toLowerCase().includes(term) ||
      offer.restaurant?.name?.toLowerCase().includes(term) ||
      offer.restaurant?.address?.toLowerCase().includes(term) ||
      offer.description?.toLowerCase().includes(term);

    const matchesCommune = selectedCommune === 'Toutes les communes' ||
      offer.restaurant?.address?.toLowerCase().includes(selectedCommune.toLowerCase()) ||
      offer.title?.toLowerCase().includes(selectedCommune.toLowerCase());

    if (!matchesSearch || !matchesCommune) return false;

    if (selectedCategory === 'Tous') return true;
    if (selectedCategory === '⚡ Flash') return offer.type === 'flash';
    if (selectedCategory === '🍔 Fast Good') return offer.title?.toLowerCase().includes('burger') || offer.description?.toLowerCase().includes('burger') || offer.title?.toLowerCase().includes('pizza');
    if (selectedCategory === '🍗 Grillades') return offer.title?.toLowerCase().includes('grill') || offer.title?.toLowerCase().includes('poulet') || offer.title?.toLowerCase().includes('choukouya') || offer.description?.toLowerCase().includes('brais');
    if (selectedCategory === '🍣 Sushis') return offer.title?.toLowerCase().includes('sushi') || offer.title?.toLowerCase().includes('asian') || offer.description?.toLowerCase().includes('saumon');
    if (selectedCategory === '🍹 Lounges') return offer.pack_type === 'vip' || offer.title?.toLowerCase().includes('lounge') || offer.title?.toLowerCase().includes('cocktail');
    if (selectedCategory === '💑 Menus Duo') return offer.pack_type === 'couple';
    if (selectedCategory === '👨‍👩‍👧‍👦 Famille') return offer.pack_type === 'famille';

    return true;
  });

  const formatCountdown = (endTime?: string) => {
    if (!endTime) return { h: '05', m: '42', s: '18' };
    const distance = new Date(endTime).getTime() - now;
    if (distance <= 0) return { h: '00', m: '00', s: '00' };
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0'),
    };
  };

  const categories = [
    { label: 'Tous', icon: '🍽️' },
    { label: '⚡ Flash', icon: '⚡' },
    { label: '🍔 Fast Good', icon: '🍔' },
    { label: '🍗 Grillades', icon: '🍗' },
    { label: '🍣 Sushis', icon: '🍣' },
    { label: '🍹 Lounges', icon: '🍹' },
    { label: '💑 Menus Duo', icon: '💑' },
    { label: '👨‍👩‍👧‍👦 Famille', icon: '👨‍👩‍👧‍👦' },
  ];

  const communesList = [
    'Toutes les communes',
    'Cocody',
    'Marcory / Zone 4',
    'Plateau',
    'Yopougon',
    'Deux Plateaux / Angré',
    'Treichville',
  ];

  // Sélection de l'offre héro mise en avant (première offre flash disponible ou fallback gourmand)
  const featuredOffer = offers.find((o) => o.type === 'flash') || offers[0];
  const featuredPricePromo = featuredOffer ? (featuredOffer.price_promo || featuredOffer.price || 7800) : 7800;
  const featuredPriceNormal = featuredOffer ? (featuredOffer.price_normal || 12000) : 12000;
  const featuredDiscount = Math.round(((featuredPriceNormal - featuredPricePromo) / featuredPriceNormal) * 100);
  const featuredCountdown = formatCountdown(featuredOffer?.end_timestamp);
  const featuredStockRemaining = featuredOffer?.quantity_remaining ?? 4;
  const featuredStockInitial = featuredOffer?.quantity_initial ?? 12;
  const featuredStockPercent = Math.min(100, Math.max(20, (featuredStockRemaining / featuredStockInitial) * 100));

  return (
    <div style={{ backgroundColor: '#FAF8F5', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      {/* ========================================================================= */}
      {/* NOUVEAU HERO GOURMET LUMINEUX & ÉLITE (DESIGN VALIDÉ) */}
      {/* ========================================================================= */}
      <section style={{
        background: 'radial-gradient(circle at 15% 25%, #FFF0ED 0%, #FAF8F5 70%)',
        padding: '50px 20px 80px 20px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid #F1EBE4',
      }}>
        
        {/* Éléments décoratifs en arrière-plan */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227, 6, 19, 0.04) 0%, rgba(250, 248, 245, 0) 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '50px',
          alignItems: 'center',
        }}>
          
          {/* COLONNE GAUCHE : TITRE & MOTEUR DE RECHERCHE CONCIERGE */}
          <div>
            
            {/* Pill Badge Lumineux */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #FECACA',
              padding: '6px 16px',
              borderRadius: '30px',
              marginBottom: '20px',
              boxShadow: '0 4px 14px rgba(227, 6, 19, 0.12)',
            }}>
              <span style={{ fontSize: '14px' }}>🔥</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#D60309', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                -30% à -70% de réduction du jour
              </span>
            </div>

            {/* Grand Titre Gourmet */}
            <h1 style={{
              fontSize: '48px',
              fontWeight: '950',
              lineHeight: '1.12',
              color: '#0F172A',
              letterSpacing: '-1.5px',
              marginBottom: '18px',
            }}>
              Les meilleures tables <br />
              d’Abidjan à <span style={{ color: '#D60309' }}>prix privilégié</span>
            </h1>

            {/* Sous-titre rassurant */}
            <p style={{
              fontSize: '17px',
              color: '#64748B',
              lineHeight: '1.6',
              marginBottom: '32px',
              maxWidth: '520px',
            }}>
              Découvrez chaque jour des offres exclusives négociées avec les meilleurs restaurants, maquis chics et lounges d'Abidjan. Réservez en 1 clic, payez par Wave et présentez votre Pass QR.
            </p>

            {/* MOTEUR DE RECHERCHE CONCIERGE GOURMET */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '10px 12px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              maxWidth: '580px',
              marginBottom: '32px',
            }}>
              
              {/* Sélecteur Commune */}
              <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRight: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <select
                  value={selectedCommune}
                  onChange={(e) => setSelectedCommune(e.target.value)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0F172A',
                    outline: 'none',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  {communesList.map((comm) => (
                    <option key={comm} value={comm}>{comm}</option>
                  ))}
                </select>
              </div>

              {/* Champ Spécialité ou Envie */}
              <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
                <span style={{ fontSize: '18px' }}>🍽️</span>
                <input
                  type="text"
                  placeholder="Spécialité culinaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    outline: 'none',
                    width: '100%',
                    fontWeight: '600',
                  }}
                />
              </div>

              {/* Bouton Action Trouver */}
              <a
                href="#deals"
                style={{
                  backgroundColor: '#D60309',
                  color: '#FFFFFF',
                  padding: '12px 22px',
                  borderRadius: '16px',
                  fontWeight: '900',
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 18px rgba(214, 3, 9, 0.35)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Trouver mon Deal</span>
                <span>→</span>
              </a>
            </div>

            {/* PREUVE SOCIALE EN DIRECT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                  alt="Client"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2.5px solid #FFFFFF', objectFit: 'cover' }}
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                  alt="Client"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2.5px solid #FFFFFF', objectFit: 'cover', marginLeft: '-12px' }}
                />
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop"
                  alt="Client"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2.5px solid #FFFFFF', objectFit: 'cover', marginLeft: '-12px' }}
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
                  alt="Client"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2.5px solid #FFFFFF', objectFit: 'cover', marginLeft: '-12px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0F172A' }}>
                    +450 réservations aujourd'hui
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Restaurants partenaires vérifiés à Abidjan
                </span>
              </div>
            </div>

          </div>

          {/* COLONNE DROITE : CARTE INTERACTIVE GOURMETTE FLOTTANTE (MOCKUP 1 VALIDÉ) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '28px',
              padding: '22px',
              border: '1.5px solid #F1EBE4',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.08)',
              maxWidth: '420px',
              width: '100%',
              position: 'relative',
            }}>
              
              {/* Image Culinaire Grand Angle avec Badges Flottants */}
              <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '20px', overflow: 'hidden', marginBottom: '18px' }}>
                <img
                  src={featuredOffer?.photos?.[0] || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'}
                  alt="Plat Vedette Gourmet"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Badge Réduction & Type */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                  <span style={{ backgroundColor: '#D60309', color: '#FFFFFF', padding: '5px 12px', borderRadius: '10px', fontSize: '11.5px', fontWeight: '900' }}>
                    -{featuredDiscount}% ÉCONOMIE
                  </span>
                  <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#FFFFFF', padding: '5px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', backdropFilter: 'blur(4px)' }}>
                    ⚡ FLASH DU JOUR
                  </span>
                </div>

                {/* Badges Flottants Officiels Wave & Pass QR */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                  <div style={{
                    backgroundColor: '#E0F7FC',
                    border: '1px solid #1DC4E9',
                    borderRadius: '10px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <img src="/wave-icon.png" alt="Wave" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#0084A8' }}>Wave</span>
                  </div>

                  <div style={{
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #16A34A',
                    borderRadius: '10px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <span style={{ fontSize: '12px' }}>🎟️</span>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#15803D' }}>Pass QR Prêt</span>
                  </div>
                </div>
              </div>

              {/* Titre & Établissement */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>
                    📍 {featuredOffer?.restaurant?.name || 'Restaurant Partenaire Privilège'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '800' }}>⭐ 4.9 (142 avis)</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: '2px 0 0 0', lineHeight: '1.3' }}>
                  {featuredOffer?.title || 'Menu Duo Gourmet & Boissons'}
                </h3>
              </div>

              {/* JAUGE DE STOCK EN DIRECT */}
              <div style={{ backgroundColor: '#FAF8F5', padding: '12px 14px', borderRadius: '14px', border: '1px solid #F1EBE4', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>Disponibilité en direct</span>
                  <span style={{ fontSize: '11.5px', color: '#D60309', fontWeight: '900' }}>
                    🔥 Plus que {featuredStockRemaining} formule(s) !
                  </span>
                </div>

                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${featuredStockPercent}%`,
                    height: '100%',
                    backgroundColor: '#D60309',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* COMPTE À REBOURS ÉLÉGANT */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                  ⏱ Expire dans :
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                    {featuredCountdown.h}h
                  </span>
                  <span style={{ fontWeight: '900', color: '#0F172A' }}>:</span>
                  <span style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                    {featuredCountdown.m}m
                  </span>
                  <span style={{ fontWeight: '900', color: '#0F172A' }}>:</span>
                  <span style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace' }}>
                    {featuredCountdown.s}s
                  </span>
                </div>
              </div>

              {/* PRIX & BOUTON D'ACTION IMMÉDIAT */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through', display: 'block' }}>
                    {Number(featuredPriceNormal).toLocaleString('fr-FR')} FCFA
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: '950', color: '#D60309' }}>
                    {Number(featuredPricePromo).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <Link
                  href={featuredOffer ? `/checkout/${featuredOffer.id}` : '#deals'}
                  style={{
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    padding: '12px 20px',
                    borderRadius: '14px',
                    fontWeight: '900',
                    fontSize: '13.5px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 6px 18px rgba(214, 3, 9, 0.35)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <span>⚡ Réserver mon Pass</span>
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION CATALOGUE DES FORMULES EN DIRECT AVEC FILTRES GOURMETS */}
      {/* ========================================================================= */}
      <section id="deals" style={{ padding: '60px 20px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        
        {/* En-tête de section */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D60309' }} />
              <span style={{ color: '#D60309', fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                OFFRES EN DIRECT DU JOUR
              </span>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '950', margin: 0, letterSpacing: '-0.5px', color: '#0F172A' }}>
              Explorez nos Deals & Menus du Moment
            </h2>
          </div>

          <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>
            {filteredOffers.length} formule(s) disponible(s) aujourd'hui
          </div>
        </div>

        {/* BARRE DES CATÉGORIES EN PILULES INTERACTIVES */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '14px',
          marginBottom: '28px',
          scrollbarWidth: 'none',
        }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setSelectedCategory(cat.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '30px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  border: isSelected ? '1.5px solid #D60309' : '1.5px solid #E2E8F0',
                  backgroundColor: isSelected ? '#D60309' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 6px 16px rgba(214, 3, 9, 0.25)' : '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* GRILLE DES OFFRES */}
        {loadingOffers ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#D60309', borderRadius: '50%', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: '800', fontSize: '15px' }}>Chargement des offres en direct d'Abidjan...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '60px 20px', textAlign: 'center', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🍽️</div>
            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px', color: '#0F172A' }}>Aucune offre trouvée pour ces critères</h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>Essayez d'ajuster votre commune ou de réinitialiser la recherche.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCommune('Toutes les communes');
                setSelectedCategory('Tous');
              }}
              style={{ padding: '10px 20px', backgroundColor: '#D60309', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
            >
              Afficher toutes les offres
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '26px' }}>
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
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1.5px solid #F1EBE4',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Photo & Badges */}
                  <div style={{ position: 'relative', height: '210px' }}>
                    <img
                      src={photoUrl}
                      alt={offer.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                      <span style={{
                        backgroundColor: isFlash ? '#D60309' : '#2563EB',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '900',
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
                        fontSize: '11.5px',
                        fontWeight: '900',
                      }}>
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Timer Flash si actif */}
                    {isFlash && offer.end_timestamp && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(4px)',
                        color: '#FFFFFF',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span>⏳ Expire dans :</span>
                        <span style={{ color: '#FCA5A5', fontWeight: '900' }}>
                          {formatCountdown(offer.end_timestamp).h}h : {formatCountdown(offer.end_timestamp).m}m : {formatCountdown(offer.end_timestamp).s}s
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Corps de Carte */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>
                      📍 {offer.restaurant?.name || 'Restaurant Partenaire'}
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: '900', marginBottom: '8px', color: '#0F172A', lineHeight: '1.3' }}>
                      {offer.title}
                    </h3>

                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px', flex: 1 }}>
                      {offer.description?.substring(0, 95)}...
                    </p>

                    {/* Prix & Bouton Réserver */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px dashed #F1F5F9' }}>
                      <div>
                        {priceNormal && (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', textDecoration: 'line-through', display: 'block' }}>
                            {Number(priceNormal).toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                        <span style={{ fontSize: '19px', fontWeight: '950', color: '#D60309' }}>
                          {Number(pricePromo).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <Link
                        href={`/checkout/${offer.id}`}
                        style={{
                          backgroundColor: '#D60309',
                          color: '#FFFFFF',
                          padding: '10px 18px',
                          borderRadius: '12px',
                          fontWeight: '900',
                          fontSize: '13px',
                          textDecoration: 'none',
                          boxShadow: '0 4px 14px rgba(214, 3, 9, 0.25)',
                        }}
                      >
                        Réserver →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION COMMENT ÇA MARCHE EN 4 ÉTAPES VISUELLES CLAIRES */}
      {/* ========================================================================= */}
      <section id="comment-ca-marche" style={{ backgroundColor: '#FFFFFF', padding: '80px 20px', borderTop: '1px solid #F1EBE4', borderBottom: '1px solid #F1EBE4' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ color: '#D60309', fontWeight: '900', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              EXPÉRIENCE 100% NUMÉRIQUE & SÉCURISÉE
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '950', marginTop: '8px', color: '#0F172A' }}>
              Comment fonctionne BRICK DEAL ?
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '580px', margin: '8px auto 0 auto' }}>
              Profitez d'une formule d'exception en 4 étapes simples et sans attente au restaurant.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '26px' }}>
            
            <div style={{ backgroundColor: '#FAF8F5', padding: '30px 24px', borderRadius: '22px', border: '1.5px solid #F1EBE4' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#FEE2E2', color: '#D60309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '18px' }}>
                🔍
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>
                1. Choisissez votre Deal
              </h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
                Parcourez les offres flash et menus négociés sur les restaurants réputés d'Abidjan.
              </p>
            </div>

            <div style={{ backgroundColor: '#FAF8F5', padding: '30px 24px', borderRadius: '22px', border: '1.5px solid #F1EBE4' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#E0F7FC', color: '#0084A8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '18px' }}>
                💳
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>
                2. Payez par Wave (0%)
              </h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
                Paiement instantané sécurisé par Wave Mobile Money, sans aucuns frais supplémentaires.
              </p>
            </div>

            <div style={{ backgroundColor: '#FAF8F5', padding: '30px 24px', borderRadius: '22px', border: '1.5px solid #F1EBE4' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '18px' }}>
                🎟️
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>
                3. Obtenez votre Pass QR
              </h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
                Votre Pass de réservation avec QR Code officiel et reçu PDF est immédiatement généré.
              </p>
            </div>

            <div style={{ backgroundColor: '#FAF8F5', padding: '30px 24px', borderRadius: '22px', border: '1.5px solid #F1EBE4' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '18px' }}>
                🍽️
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>
                4. Dégustez sur place
              </h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
                Présentez votre Pass QR au restaurateur lors de votre venue et savourez votre repas.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION PROFESSIONNELS (RESTAURANTS & AGENTS) */}
      {/* ========================================================================= */}
      <section id="partenaires" style={{ padding: '80px 20px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#D60309', fontWeight: '900', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ESPACE PROFESSIONNEL
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '950', margin: '10px 0 16px 0', lineHeight: '1.2', color: '#0F172A' }}>
              Développez votre activité avec BRICK DEAL
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
              Restaurateur à la recherche de clients qualifiés ou agent commercial développant votre portefeuille : nos outils vous permettent de piloter vos ventes en temps réel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: '700', color: '#0F172A' }}>
                <span style={{ color: '#16A34A', fontSize: '18px' }}>✓</span> Validation instantanée des Pass QR par scan caméra
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: '700', color: '#0F172A' }}>
                <span style={{ color: '#16A34A', fontSize: '18px' }}>✓</span> Notifications sonores et alertes en direct dès chaque commande
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: '700', color: '#0F172A' }}>
                <span style={{ color: '#16A34A', fontSize: '18px' }}>✓</span> Encaissement automatique et calcul transparent des commissions
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '22px', border: '1.5px solid #F1EBE4', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', marginBottom: '6px' }}>🏢 Restaurateurs Partenaires</h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', marginBottom: '18px' }}>Accédez à votre caisse numérique, suivez les commandes en cuisine et validez les Pass QR.</p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                Accès Espace Restaurant →
              </Link>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '22px', border: '1.5px solid #F1EBE4', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', marginBottom: '6px' }}>👔 Agents Commerciaux</h3>
              <p style={{ color: '#64748B', fontSize: '13.5px', marginBottom: '18px' }}>Enregistrez de nouveaux restaurants partenaires et suivez vos commissions en direct.</p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#D60309',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                Accès Espace Agent Commercial →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
