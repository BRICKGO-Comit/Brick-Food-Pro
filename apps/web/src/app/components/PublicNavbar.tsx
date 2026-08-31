'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function PublicNavbar() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const [selectedCity, setSelectedCity] = useState('Abidjan (Toutes communes)');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const communes = [
    'Abidjan (Toutes communes)',
    'Cocody / Riviera',
    'Marcory / Zone 4',
    'Plateau',
    'Yopougon',
    'Treichville',
    'Koumassi',
    'Deux Plateaux / Angré'
  ];

  // Fermer les dropdowns au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/deals?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/deals');
    }
  };

  const getPortalLink = () => {
    if (!profile) return '/login';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'restaurant') return '/resto';
    if (profile.role === 'agent') return '/agent-portal';
    return '/commandes';
  };

  const getRoleLabel = () => {
    if (!profile) return 'Client';
    if (profile.role === 'admin') return '👑 Super Admin';
    if (profile.role === 'restaurant') return '🍽️ Restaurateur';
    if (profile.role === 'agent') return '👔 Agent Commercial';
    return '🛍️ Client Gourmand';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'BD';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
        height: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        
        {/* --- GAUCHE : LOGO + SÉLECTEUR DE COMMUNE --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="BRICK DEAL" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
              BRICK<span style={{ color: '#E30613' }}>DEAL</span>
            </span>
          </Link>

          {/* Sélecteur de Commune / Zone */}
          <div ref={cityDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '20px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '15px', color: '#E30613' }}>📍</span>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCity}
              </span>
              <span style={{ fontSize: '10px', color: '#64748B' }}>▼</span>
            </button>

            {/* Menu Déroulant Communes */}
            {showCityDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '220px',
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E2E8F0',
                padding: '6px',
                zIndex: 1001,
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', padding: '6px 12px', textTransform: 'uppercase' }}>
                  Communes & Secteurs
                </div>
                {communes.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCity(c);
                      setShowCityDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: selectedCity === c ? '#FFEBEB' : 'transparent',
                      color: selectedCity === c ? '#E30613' : '#0F172A',
                      fontSize: '13px',
                      fontWeight: selectedCity === c ? '700' : '500',
                      cursor: 'pointer',
                    }}
                  >
                    📍 {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- CENTRE : BARRE DE RECHERCHE RAPIDE --- */}
        <form onSubmit={handleSearch} style={{ flex: '1 1 360px', maxWidth: '480px', position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: '24px',
            padding: '4px 8px 4px 16px',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: '15px', color: '#94A3B8', marginRight: '8px' }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher un burger, sushi, grillade, restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '13.5px',
                color: '#0F172A',
                outline: 'none',
                padding: '6px 0',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#E30613',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '20px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Trouver
            </button>
          </div>
        </form>

        {/* --- DROITE : PASS QR & MENU UTILISATEUR --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          
          {/* Bouton Mes Pass QR & Commandes */}
          <Link
            href="/commandes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FFEBEB',
              color: '#E30613',
              padding: '9px 16px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <span>🎟️</span>
            <span>Mes Pass & Suivi</span>
          </Link>

          {!loading && user ? (
            /* Utilisateur Connecté — Avatar & Dropdown */
            <div ref={userDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '30px',
                  padding: '5px 12px 5px 6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                }}>
                  {getInitials(profile?.full_name || user.email)}
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '10px', color: '#E30613', fontWeight: '700' }}>
                    {profile?.role === 'admin' ? 'Admin' : profile?.role === 'restaurant' ? 'Resto' : profile?.role === 'agent' ? 'Agent' : 'Client'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>▼</span>
              </button>

              {/* Menu Déroulant Profil */}
              {showUserDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #E2E8F0',
                  padding: '8px',
                  zIndex: 1001,
                }}>
                  {/* En-tête profil */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                      {profile?.full_name || 'Utilisateur'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                    <div style={{ display: 'inline-block', backgroundColor: '#F1F5F9', color: '#0F172A', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', marginTop: '6px' }}>
                      {getRoleLabel()}
                    </div>
                  </div>

                  {/* Liens selon le rôle */}
                  <Link
                    href={getPortalLink()}
                    onClick={() => setShowUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    <span>🏢</span>
                    <span>Accéder à mon Espace</span>
                  </Link>

                  <Link
                    href="/commandes"
                    onClick={() => setShowUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    <span>🎟️</span>
                    <span>Mes Pass & Suivi</span>
                  </Link>

                  <Link
                    href="/deals"
                    onClick={() => setShowUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    <span>🔥</span>
                    <span>Explorer les Deals</span>
                  </Link>

                  <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '6px 0' }} />

                  {/* Déconnexion */}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      signOut();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#FFF1F2',
                      color: '#E30613',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    <span>🚪</span>
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Utilisateur Déconnecté — Connexion & Inscription */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/login"
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: '700',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(227, 6, 19, 0.25)',
                }}
              >
                S'inscrire
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
