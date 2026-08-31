'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicNavbar() {
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
          <Link href="/deals" style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔥</span> Tous les Deals
          </Link>
          <Link href="/#offres" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Comment ça marche
          </Link>
          <Link href="/resto" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Espace Restaurateurs
          </Link>
          <Link href="/agent-portal" style={{ color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}>
            Espace Agents
          </Link>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            🔐 Connexion Pro
          </Link>
          <Link
            href="/deals"
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
            🔥 Commander en Ligne
          </Link>
        </div>
      </div>
    </header>
  );
}
