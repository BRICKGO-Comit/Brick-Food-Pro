'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function PublicNavbar() {
  const { user, profile, loading, signOut } = useAuth();

  const getPortalLink = () => {
    if (!profile) return '/login';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'restaurant') return '/resto';
    if (profile.role === 'agent') return '/agent-portal';
    return '/deals';
  };

  const getPortalLabel = () => {
    if (!profile) return 'Mon Espace';
    if (profile.role === 'admin') return '👑 Administration';
    if (profile.role === 'restaurant') return '🍽️ Espace Restaurateur';
    if (profile.role === 'agent') return '👔 Espace Agent';
    return '🛍️ Mes Deals';
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #F1F5F9',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="BRICK DEAL Logo" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
            BRICK<span style={{ color: '#E30613' }}>DEAL</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link href="/#deals" style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔥</span> Offres & Deals
          </Link>
          <Link href="/#comment-ca-marche" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Comment ça marche
          </Link>
          <Link href="/#partenaires" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Partenaires & Agents
          </Link>
          <Link href="/#download" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Application Mobile
          </Link>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!loading && user ? (
            <>
              <Link
                href={getPortalLink()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {getPortalLabel()}
              </Link>
              <button
                onClick={() => signOut()}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: '700',
                  fontSize: '13px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(227, 6, 19, 0.25)',
                  transition: 'all 0.2s',
                }}
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
