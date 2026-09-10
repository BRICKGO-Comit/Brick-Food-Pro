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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [now, setNow] = useState(new Date().getTime());
  const [activeFlashIndex, setActiveFlashIndex] = useState(0);

  // Horloge temps réel pour les comptes à rebours
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement des offres réelles depuis Supabase
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

  // Helper compte à rebours
  const formatCountdown = (endTime?: string) => {
    if (!endTime) return { h: '05', m: '23', s: '18' };
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

  // LES VRAIES 9 CATÉGORIES OFFICIELLES DE L'APPLICATION MOBILE
  const categoriesList = [
    { id: 'restaurant', label: 'Restaurants', icon: '🍽️', desc: 'Gastronomie & Spécialités' },
    { id: 'maquis', label: 'Maquis & Grillades', icon: '🍗', desc: 'Poulet braisé, allocos' },
    { id: 'fast_food', label: 'Fast Food & Burgers', icon: '🍔', desc: 'Burgers, pizzas, tacos' },
    { id: 'lounge_bar', label: 'Lounge & Bars', icon: '🍸', desc: 'Cocktails & Ambiance' },
    { id: 'hotel', label: 'Hôtels & Séjours', icon: '🏨', desc: 'Chambres & Day-use' },
    { id: 'patisserie', label: 'Pâtisseries & Desserts', icon: '🍰', desc: 'Glaces, gâteaux, délices' },
    { id: 'flash', label: 'Offres Flash', icon: '⚡', desc: 'Quantités ultra-limitées' },
    { id: 'deal', label: 'Deals & Packs', icon: '🏷️', desc: 'Formules négociées' },
    { id: 'all', label: 'Toutes les offres', icon: '🌐', desc: 'Tout voir à Abidjan' },
  ];

  // Offres de démonstration pour garantir un rendu riche et complet par catégorie mobile
  const demoDeals = [
    // FAST FOOD
    {
      id: 'demo-1',
      title: 'Menu burger + frites + boisson',
      restaurant_name: 'Burger House',
      commune: 'Marcory',
      rating: '4.5',
      reviews: 320,
      price_promo: 3500,
      price_normal: 5000,
      discount: '-30%',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop',
      expiry: '07h 12m',
      category: 'fast_food',
    },
    {
      id: 'demo-ff2',
      title: 'Pizza Royale Feu de Bois',
      restaurant_name: 'Bella Pizza Abidjan',
      commune: 'Deux Plateaux',
      rating: '4.6',
      reviews: 180,
      price_promo: 5500,
      price_normal: 8000,
      discount: '-31%',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop',
      expiry: '05h 45m',
      category: 'fast_food',
    },
    {
      id: 'demo-ff3',
      title: 'Maxi Tacos 3 Viandes + Boisson',
      restaurant_name: "O'Tacos Angré",
      commune: 'Angré 8e Tranche',
      rating: '4.4',
      reviews: 140,
      price_promo: 4000,
      price_normal: 6000,
      discount: '-33%',
      image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop',
      expiry: '09h 15m',
      category: 'fast_food',
    },
    // MAQUIS & GRILLADES
    {
      id: 'demo-2',
      title: 'Tchep poisson + Alloco',
      restaurant_name: 'Le Maquis des Amis',
      commune: 'Cocody',
      rating: '4.3',
      reviews: 210,
      price_promo: 3000,
      price_normal: 5000,
      discount: '-40%',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
      expiry: '04h 35m',
      category: 'maquis',
    },
    {
      id: 'demo-mq2',
      title: 'Poulet Braisé Entier + Alloco',
      restaurant_name: 'Maquis Le Village',
      commune: 'Cocody - Angré',
      rating: '4.8',
      reviews: 285,
      price_promo: 4500,
      price_normal: 7500,
      discount: '-40%',
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop',
      expiry: '06h 20m',
      category: 'maquis',
    },
    {
      id: 'demo-mq3',
      title: 'Choukouya de Mouton Assaisonné',
      restaurant_name: 'Chez Tantie Grillades',
      commune: 'Yopougon',
      rating: '4.5',
      reviews: 190,
      price_promo: 4000,
      price_normal: 6500,
      discount: '-38%',
      image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&auto=format&fit=crop',
      expiry: '08h 10m',
      category: 'maquis',
    },
    // RESTAURANTS
    {
      id: 'demo-4',
      title: 'Mix Grillades + Frites + Boisson',
      restaurant_name: 'Le Grill Lounge',
      commune: 'Plateau',
      rating: '4.4',
      reviews: 156,
      price_promo: 6500,
      price_normal: 10000,
      discount: '-35%',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop',
      expiry: '08h 44m',
      category: 'restaurant',
    },
    {
      id: 'demo-res2',
      title: 'Menu Dégustation Gastronomique',
      restaurant_name: "L'Éléphant Blanc",
      commune: 'Marcory Zone 4',
      rating: '4.9',
      reviews: 230,
      price_promo: 12000,
      price_normal: 18000,
      discount: '-33%',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop',
      expiry: '11h 00m',
      category: 'restaurant',
    },
    // HOTELS & SEJOURS
    {
      id: 'demo-3',
      title: 'Séjour Détente & Petit-déj',
      restaurant_name: 'Hôtel Résidence Palm',
      commune: 'Riviera 4',
      rating: '4.7',
      reviews: 98,
      price_promo: 25000,
      price_normal: 40000,
      discount: '-38%',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop',
      expiry: '10h 01m',
      category: 'hotel',
    },
    {
      id: 'demo-ht2',
      title: 'Pass Piscine VIP + Déjeuner',
      restaurant_name: 'Hôtel Ivotel Abidjan',
      commune: 'Plateau',
      rating: '4.6',
      reviews: 412,
      price_promo: 15000,
      price_normal: 25000,
      discount: '-40%',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop',
      expiry: '14h 30m',
      category: 'hotel',
    },
    // LOUNGE & BARS
    {
      id: 'demo-5',
      title: 'Cocktail Signature + Tapas Duo',
      restaurant_name: 'Skyline Lounge Bar',
      commune: 'Marcory Zone 4',
      rating: '4.8',
      reviews: 412,
      price_promo: 7000,
      price_normal: 12000,
      discount: '-42%',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&auto=format&fit=crop',
      expiry: '12h 20m',
      category: 'lounge_bar',
    },
    // PATISSERIES
    {
      id: 'demo-pat1',
      title: 'Boîte 12 Macarons + 2 Thés',
      restaurant_name: 'La Maison du Macaron',
      commune: 'Cocody Danga',
      rating: '4.9',
      reviews: 165,
      price_promo: 6000,
      price_normal: 9500,
      discount: '-37%',
      image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&auto=format&fit=crop',
      expiry: '09h 00m',
      category: 'patisserie',
    },
  ];

  // Liste combinée DB réelle + compléments de démonstration
  const allDealsList = [
    ...offers.map((o) => ({
      id: o.id,
      title: o.title,
      restaurant_name: o.restaurant?.name || 'Restaurant Partenaire',
      commune: o.restaurant?.address?.split(',')[0] || 'Abidjan',
      rating: '4.7',
      reviews: 145,
      price_promo: o.price_promo || o.price || 5000,
      price_normal: o.price_normal || 8000,
      discount: o.price_normal && o.price_promo ? `-${Math.round(((o.price_normal - o.price_promo) / o.price_normal) * 100)}%` : '-30%',
      image: o.photos?.[0] || o.restaurant?.photos?.[0] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
      expiry: '06h 30m',
      category: o.type === 'flash' ? 'flash' : (o.restaurant?.category || 'restaurant'),
    })),
    ...demoDeals,
  ];

  // Filtrage selon la vraie catégorie mobile sélectionnée
  const filteredDeals = selectedCategory === 'all'
    ? allDealsList
    : allDealsList.filter((d) => {
        if (selectedCategory === 'flash') return d.category === 'flash';
        if (selectedCategory === 'deal') return d.category !== 'flash';
        return d.category === selectedCategory;
      });

  // Diaporama de l'offre Hero Flash du Jour (droite)
  const heroFlashList = [
    {
      resto: 'Maquis Le Village',
      location: 'Cocody - Angré',
      title: 'Tchep poulet + Alloco + Boisson',
      price: 2500,
      oldPrice: 5000,
      discount: '-50%',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop',
      link: offers[0] ? `/checkout/${offers[0].id}` : '/deals',
    },
    {
      resto: 'Burger House Gourmet',
      location: 'Marcory - Zone 4',
      title: 'Double Bacon Burger + Frites maison',
      price: 3500,
      oldPrice: 6000,
      discount: '-42%',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop',
      link: offers[1] ? `/checkout/${offers[1].id}` : '/deals',
    },
    {
      resto: 'Skyline Lounge Rooftop',
      location: 'Plateau',
      title: 'Cocktail Signature + Assiette Tapas Mixte',
      price: 5000,
      oldPrice: 9000,
      discount: '-45%',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000&auto=format&fit=crop',
      link: offers[2] ? `/checkout/${offers[2].id}` : '/deals',
    }
  ];

  const currentHeroFlash = heroFlashList[activeFlashIndex];
  const liveCountdown = formatCountdown();

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      <main style={{ flex: 1 }}>
        {/* ========================================================================= */}
        {/* SECTION 1 (IMAGE 1) : HERO SECTION + CARTE FLASH + CATÉGORIES + DEALS     */}
        {/* ========================================================================= */}
        <section style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #F1EBE4', padding: '48px 20px 40px 20px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            
            {/* GRILLE HERO (GAUCHE TEXTE / DROITE CARTE NOIRE FLASH DU JOUR) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px', alignItems: 'center', marginBottom: '44px' }}>
              
              {/* COLONNE GAUCHE */}
              <div>
                <h1 style={{
                  fontSize: 'clamp(2.4rem, 4vw, 3.8rem)',
                  fontWeight: '900',
                  lineHeight: '1.08',
                  letterSpacing: '-1.5px',
                  color: '#0F172A',
                  marginBottom: '18px',
                }}>
                  Les bons plans<br />
                  d'Abidjan.<br />
                  <span style={{ color: '#D60309' }}>Des prix qui ne durent pas.</span>
                </h1>

                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#64748B',
                  maxWidth: '490px',
                  marginBottom: '26px',
                }}>
                  Restaurants, maquis, lounges, hôtels, bien-être, loisirs...<br />
                  Découvrez chaque jour des offres exclusives négociées pour vous.
                </p>

                {/* 2 BOUTONS D'ACTION PILL */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                  <a
                    href="#deals"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#D60309',
                      color: '#FFFFFF',
                      padding: '13px 26px',
                      borderRadius: '50px',
                      fontWeight: '800',
                      fontSize: '15px',
                      textDecoration: 'none',
                      boxShadow: '0 6px 18px rgba(214, 3, 9, 0.28)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <span>🔍</span>
                    <span>Voir les offres</span>
                  </a>

                  <a
                    href="#categories"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      padding: '13px 24px',
                      borderRadius: '50px',
                      fontWeight: '700',
                      fontSize: '15px',
                      textDecoration: 'none',
                      border: '1.5px solid #E2E8F0',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>⊞</span>
                    <span>Explorer les catégories</span>
                  </a>
                </div>

                {/* 3 BADGES DE RÉASSURANCE */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', borderTop: '1px solid #EAE4DD', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>🏷️</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Jusqu'à -70%</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>sur vos sorties</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>🛡️</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Paiement sécurisé</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Wave, Orange Money, MTN</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>⚡</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Réservation rapide</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>avec votre Pass QR</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLONNE DROITE : CARTE NOIRE FLASH DU JOUR (MOCKUP 1) */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
                  maxWidth: '480px',
                  width: '100%',
                  position: 'relative',
                  border: '1px solid #1E293B',
                }}>
                  {/* Visuel culinaire immersif */}
                  <div style={{ position: 'relative', width: '100%', height: '230px' }}>
                    <img
                      src={currentHeroFlash.image}
                      alt={currentHeroFlash.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.2) 60%, transparent 100%)',
                    }} />

                    {/* Badge Réduction Jaune + Flash du Jour Rouge */}
                    <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 2 }}>
                      <span style={{
                        backgroundColor: '#FFCC00',
                        color: '#000000',
                        fontWeight: '900',
                        fontSize: '13px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                      }}>
                        {currentHeroFlash.discount}
                      </span>
                      <span style={{
                        backgroundColor: '#D60309',
                        color: '#FFFFFF',
                        fontWeight: '900',
                        fontSize: '11px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}>
                        FLASH DU JOUR
                      </span>
                    </div>

                    {/* Compte à rebours dynamique en haut à droite */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      padding: '5px 12px',
                      borderRadius: '50px',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 2,
                    }}>
                      <span>⏱</span>
                      <span>Expire dans {liveCountdown.h}h {liveCountdown.m}m {liveCountdown.s}s</span>
                    </div>
                  </div>

                  {/* Détails de l'offre Flash */}
                  <div style={{ padding: '20px 22px 18px 22px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', marginBottom: '2px' }}>
                      {currentHeroFlash.resto}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#94A3B8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📍</span>
                      <span>{currentHeroFlash.location}</span>
                    </div>

                    <div style={{ fontSize: '14.5px', color: '#E2E8F0', fontWeight: '600', marginBottom: '16px' }}>
                      {currentHeroFlash.title}
                    </div>

                    {/* Prix choc & Bouton rouge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#D60309' }}>
                          {currentHeroFlash.price.toLocaleString('fr-FR')} F
                        </span>
                        <span style={{ fontSize: '14px', color: '#64748B', textDecoration: 'line-through' }}>
                          {currentHeroFlash.oldPrice.toLocaleString('fr-FR')} F
                        </span>
                      </div>

                      <Link
                        href={currentHeroFlash.link}
                        style={{
                          backgroundColor: '#D60309',
                          color: '#FFFFFF',
                          padding: '10px 20px',
                          borderRadius: '10px',
                          fontWeight: '800',
                          fontSize: '13.5px',
                          textDecoration: 'none',
                          boxShadow: '0 4px 14px rgba(214, 3, 9, 0.4)',
                        }}
                      >
                        Voir l'offre →
                      </Link>
                    </div>

                    {/* Points de pagination et contrôles de carrousel */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1E293B', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {heroFlashList.map((_, idx) => (
                          <span
                            key={idx}
                            onClick={() => setActiveFlashIndex(idx)}
                            style={{
                              width: idx === activeFlashIndex ? '20px' : '6px',
                              height: '6px',
                              borderRadius: '3px',
                              backgroundColor: idx === activeFlashIndex ? '#D60309' : '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setActiveFlashIndex((prev) => (prev > 0 ? prev - 1 : heroFlashList.length - 1))}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#1E293B',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                          }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setActiveFlashIndex((prev) => (prev < heroFlashList.length - 1 ? prev + 1 : 0))}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#1E293B',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                          }}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* BARRE DES 9 VRAIES CATÉGORIES HORIZONTALES DE L'APP MOBILE (MOCKUP 1)     */}
            {/* ========================================================================= */}
            <div id="categories" style={{ marginTop: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
              }}>
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        backgroundColor: isActive ? '#D60309' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : '#0F172A',
                        border: isActive ? '1.5px solid #D60309' : '1.5px solid #F1EBE4',
                        borderRadius: '16px',
                        padding: '16px 12px 14px 12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 8px 20px rgba(214, 3, 9, 0.22)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '115px',
                      }}
                    >
                      <span style={{ fontSize: '26px', marginBottom: '8px' }}>{cat.icon}</span>
                      <span style={{
                        fontSize: '12.5px',
                        fontWeight: '800',
                        lineHeight: '1.2',
                        marginBottom: '6px',
                        color: isActive ? '#FFFFFF' : '#0F172A',
                      }}>
                        {cat.label}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: isActive ? 'rgba(255, 255, 255, 0.9)' : '#D60309',
                      }}>
                        Voir les offres →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION « LES DEALS DU MOMENT » 🔥 (IMAGE 1)                              */}
        {/* ========================================================================= */}
        <section id="deals" style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px' }}>🔥</span>
                <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>
                  Les Deals du moment
                </h2>
              </div>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Des offres exclusives près de chez vous
              </p>
            </div>

            <Link href="/deals" style={{ fontSize: '14px', fontWeight: '800', color: '#D60309', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Voir tout</span>
              <span>→</span>
            </Link>
          </div>

          {/* Grille des cartes de Deals (Taille compacte fixe 240px, ne s'étire jamais) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 240px))',
            gap: '20px',
            justifyContent: 'start',
          }}>
            {filteredDeals.slice(0, 10).map((deal) => (
              <div
                key={deal.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1.5px solid #F1EBE4',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  width: '100%',
                  maxWidth: '240px',
                }}
              >
                {/* Image du plat avec badge % et cœur favoris */}
                <div style={{ position: 'relative', width: '100%', height: '160px' }}>
                  <img
                    src={deal.image}
                    alt={deal.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Badge % */}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#FFCC00',
                    color: '#000000',
                    fontWeight: '900',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}>
                    {deal.discount}
                  </span>

                  {/* Bouton favoris cœur */}
                  <button
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#0F172A',
                    }}
                  >
                    ♡
                  </button>
                </div>

                {/* Contenu de la carte */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.restaurant_name}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#D97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span>★</span>
                        <span>{deal.rating} ({deal.reviews})</span>
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '8px' }}>
                      📍 {deal.commune}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', lineHeight: '1.3', marginBottom: '14px', minHeight: '34px' }}>
                      {deal.title}
                    </div>
                  </div>

                  <div>
                    {/* Prix & Bouton Voir */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '17px', fontWeight: '900', color: '#D60309' }}>
                          {deal.price_promo.toLocaleString('fr-FR')} F
                        </span>
                        <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>
                          {deal.price_normal.toLocaleString('fr-FR')} F
                        </span>
                      </div>

                      <Link
                        href={deal.id.startsWith('demo') ? (offers[0] ? `/checkout/${offers[0].id}` : '/deals') : `/checkout/${deal.id}`}
                        style={{
                          backgroundColor: '#D60309',
                          color: '#FFFFFF',
                          padding: '7px 18px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          textDecoration: 'none',
                        }}
                      >
                        Voir
                      </Link>
                    </div>

                    {/* Expiration */}
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid #F1EBE4', paddingTop: '8px' }}>
                      <span>⏱</span>
                      <span>Expire dans {deal.expiry}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredDeals.length === 0 && (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                gridColumn: '1 / -1',
                backgroundColor: '#FAF8F5',
                borderRadius: '18px',
                border: '1.5px dashed #E2E8F0',
                width: '100%',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🍽️</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  Aucune offre disponible dans cette catégorie pour le moment
                </div>
                <p style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '16px' }}>
                  Consultez toutes les autres formules exclusives disponibles aujourd'hui.
                </p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Voir toutes les offres
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2 (IMAGE 2) : COMMENT FONCTIONNE BRICK DEAL ?                    */}
        {/* ========================================================================= */}
        <section style={{ backgroundColor: '#FAF8F5', borderTop: '1px solid #F1EBE4', borderBottom: '1px solid #F1EBE4', padding: '64px 20px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
            
            {/* Badge haut : SIMPLE • RAPIDE • SÉCURISÉ */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#FEE2E2', color: '#D60309', padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', marginBottom: '16px', letterSpacing: '0.5px' }}>
              <span>⚙</span>
              <span>SIMPLE • RAPIDE • SÉCURISÉ</span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.8px', marginBottom: '12px' }}>
              Comment fonctionne <span style={{ color: '#D60309' }}>BRICK DEAL</span> ?
            </h2>

            <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '620px', margin: '0 auto 48px auto', lineHeight: '1.5' }}>
              Profitez des meilleures offres en 4 étapes simples et sans attente au restaurant.
            </p>

            {/* 4 ÉTAPES AVEC CHEVRONS ROUGES INTERMÉDIAIRES */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              position: 'relative',
              alignItems: 'stretch',
              marginBottom: '42px',
            }}>
              {/* ÉTAPE 01 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 20px',
                border: '1.5px solid #F1EBE4',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}>
                <div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}>
                    01
                  </div>

                  {/* Illustration Étape 1 */}
                  <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '80px', height: '95px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '2px solid #E2E8F0', padding: '6px', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ width: '100%', height: '24px', backgroundColor: '#FEE2E2', borderRadius: '6px', marginBottom: '4px' }} />
                      <div style={{ width: '100%', height: '24px', backgroundColor: '#FEF3C7', borderRadius: '6px', marginBottom: '4px' }} />
                      <div style={{ width: '100%', height: '24px', backgroundColor: '#E0F2FE', borderRadius: '6px' }} />
                      <span style={{ position: 'absolute', bottom: '-8px', right: '-8px', fontSize: '24px' }}>🔍</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                    Choisissez votre Deal
                  </h3>

                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    Parcourez les offres flash et menus négociés sur les restaurants réputés d'Abidjan.
                  </p>
                </div>

                {/* Badge bas */}
                <div style={{ backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#D60309' }}>🎯</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#D60309' }}>
                    Des centaines d'offres près de chez vous
                  </span>
                </div>
              </div>

              {/* ÉTAPE 02 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 20px',
                border: '1.5px solid #F1EBE4',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}>
                <div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}>
                    02
                  </div>

                  {/* Illustration Étape 2 (Wave, Orange, MTN) */}
                  <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '70px', height: '95px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '2px solid #E2E8F0', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#E0F7FC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                        <img src="/wave-icon.png" alt="Wave" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#1DC4E9' }}>Wave</span>
                      <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#10B981', color: '#FFFFFF', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ backgroundColor: '#FF7900', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px' }}>Orange</span>
                      <span style={{ backgroundColor: '#FFCC00', color: '#000000', fontSize: '9px', fontWeight: '800', padding: '3px 6px', borderRadius: '4px' }}>MTN</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                    Payez par Wave (0%)
                  </h3>

                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    Paiement instantané et sécurisé par Wave, Orange Money ou MTN Mobile Money, sans frais supplémentaires.
                  </p>
                </div>

                {/* Badge bas */}
                <div style={{ backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#D60309' }}>🛡️</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#D60309' }}>
                    Paiement 100% sécurisé
                  </span>
                </div>
              </div>

              {/* ÉTAPE 03 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 20px',
                border: '1.5px solid #F1EBE4',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}>
                <div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}>
                    03
                  </div>

                  {/* Illustration Étape 3 (Smartphone avec Pass QR) */}
                  <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '74px', height: '95px', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '2px solid #E2E8F0', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: '#D60309', marginBottom: '4px' }}>BRICK DEAL</span>
                      <span style={{ fontSize: '32px', lineHeight: '1' }}>🏁</span>
                      <span style={{ backgroundColor: '#D60309', color: '#FFFFFF', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>Mon Pass QR</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                    Obtenez votre Pass QR
                  </h3>

                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    Votre Pass de réservation avec QR Code officiel et reçu PDF est immédiatement généré.
                  </p>
                </div>

                {/* Badge bas */}
                <div style={{ backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#D60309' }}>📲</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#D60309' }}>
                    Reçu par email et dans votre espace
                  </span>
                </div>
              </div>

              {/* ÉTAPE 04 */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 20px',
                border: '1.5px solid #F1EBE4',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}>
                <div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#D60309',
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}>
                    04
                  </div>

                  {/* Illustration Étape 4 (Plat et dégustation) */}
                  <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <img
                      src="https://images.unsplash.com/photo-1544025162-d76694265947?w=150"
                      alt="Dégustation"
                      style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                    />
                    <div style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '18px' }}>🏁</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                    Dégustez sur place
                  </h3>

                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    Présentez votre Pass QR au restaurateur lors de votre venue et savourez votre repas à prix réduit.
                  </p>
                </div>

                {/* Badge bas */}
                <div style={{ backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#D60309' }}>🍴</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#D60309' }}>
                    Bon appétit avec BRICK DEAL !
                  </span>
                </div>
              </div>
            </div>

            {/* Bouton CTA Découvrir les offres */}
            <div>
              <a
                href="#deals"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#D60309',
                  color: '#FFFFFF',
                  padding: '14px 34px',
                  borderRadius: '50px',
                  fontWeight: '800',
                  fontSize: '15.5px',
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(214, 3, 9, 0.32)',
                  marginBottom: '14px',
                }}
              >
                <span>Découvrir les offres</span>
                <span>→</span>
              </a>

              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ color: '#10B981', fontWeight: '800' }}>✔</span>
                <span>Votre satisfaction, notre priorité</span>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3 (IMAGE 3) : ESPACE PROFESSIONNEL                                */}
        {/* ========================================================================= */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '64px 20px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
              
              {/* COLONNE GAUCHE (ARGUMENTAIRE & STATS) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ width: '24px', height: '2px', backgroundColor: '#D60309' }} />
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#D60309', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ESPACE PROFESSIONNEL
                  </span>
                </div>

                <h2 style={{ fontSize: 'clamp(2rem, 3.2vw, 2.8rem)', fontWeight: '900', color: '#0F172A', lineHeight: '1.15', letterSpacing: '-0.8px', marginBottom: '16px' }}>
                  Développez votre activité<br />
                  avec <span style={{ color: '#D60309' }}>BRICK DEAL</span>
                </h2>

                <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '32px' }}>
                  Restaurateur, agent commercial ou partenaire, nos outils vous permettent de gérer vos ventes, d'attirer plus de clients et de suivre vos performances en temps réel.
                </p>

                {/* 3 Blocs avantages avec icônes encadrées */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
                  
                  {/* Point 1 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#D60309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      🏁
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                        Validation instantanée des Pass QR
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        Scan et confirmation en temps réel à la caisse.
                      </div>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#D60309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      🔔
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                        Notifications en direct
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        Alertes sonores et suivi des commandes en temps réel.
                      </div>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#D60309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      📊
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                        Suivi des ventes et commissions
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        Encaissement automatique et calcul transparent de vos commissions.
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3 Statistiques en bas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: '1px solid #F1EBE4', paddingTop: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>👥</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>+ 500</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Restaurants partenaires</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>🏪</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>+ 1 000</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Offres publiées</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', color: '#D60309' }}>📈</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>+ 50 000</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Clients satisfaits</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLONNE DROITE (2 CARTES IMMERSIVES RESTAURATEURS & AGENTS) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* BANNIÈRE 1 : RESTAURATEURS PARTENAIRES */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1.5px solid #F1EBE4',
                  boxShadow: '0 12px 35px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  alignItems: 'center',
                }}>
                  <div style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#D60309', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        🏪
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                        Restaurateurs Partenaires
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '18px' }}>
                      Accédez à votre caisse numérique, suivez les commandes en cuisine, validez les Pass QR et boostez votre visibilité sur BRICK DEAL.
                    </p>

                    <Link
                      href="/resto"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#D60309',
                        color: '#FFFFFF',
                        padding: '11px 22px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(214, 3, 9, 0.28)',
                      }}
                    >
                      Accès Espace Restaurant →
                    </Link>
                  </div>

                  {/* Photo Chef Africain avec Badges Flottants */}
                  <div style={{ position: 'relative', height: '200px', backgroundColor: '#FAF8F5' }}>
                    <img
                      src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop"
                      alt="Chef Cuisinier"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Badge 1 : Pass QR Validé */}
                    <div style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#0F172A',
                    }}>
                      <span>🏁</span>
                      <span>Pass QR Validé !</span>
                      <span style={{ backgroundColor: '#10B981', color: '#FFFFFF', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>✓</span>
                    </div>

                    {/* Badge 2 : Ventes du jour */}
                    <div style={{
                      position: 'absolute',
                      bottom: '14px',
                      right: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700' }}>Ventes du jour</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#D60309' }}>258 000 F 📈</div>
                    </div>
                  </div>
                </div>

                {/* BANNIÈRE 2 : AGENTS COMMERCIAUX */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1.5px solid #F1EBE4',
                  boxShadow: '0 12px 35px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  alignItems: 'center',
                }}>
                  <div style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        👥
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                        Agents Commerciaux
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '18px' }}>
                      Enregistrez de nouveaux restaurants partenaires, suivez vos performances et vos commissions en direct.
                    </p>

                    <Link
                      href="/agent-portal"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        padding: '11px 22px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.28)',
                      }}
                    >
                      Accès Espace Agent Commercial →
                    </Link>
                  </div>

                  {/* Photo Agente Commerciale avec Badges Flottants */}
                  <div style={{ position: 'relative', height: '200px', backgroundColor: '#FAF8F5' }}>
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop"
                      alt="Agente Commerciale"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Badge 1 : Mes restaurants */}
                    <div style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700' }}>Mes restaurants</div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: '#0F172A' }}>24 <span style={{ color: '#10B981', fontSize: '11px' }}>+12% ↗</span></div>
                    </div>

                    {/* Badge 2 : Mes commissions */}
                    <div style={{
                      position: 'absolute',
                      bottom: '14px',
                      right: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700' }}>Mes commissions</div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: '#0F172A' }}>125 000 F <span style={{ color: '#10B981', fontSize: '11px' }}>+18% ↗</span></div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
