'use client';

import React from 'react';
import SidebarNav from './SidebarNav';
import { useAuth } from './AuthProvider';

export default function ShellClient({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();

  // Pendant le chargement de la session
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Chargement...</div>
      </div>
    );
  }

  // Si non connecté, on affiche la page de login
  if (!user) {
    return <>{children}</>;
  }

  // Utilisateur connecté — afficher le shell admin
  const displayName = profile?.full_name || user.email || 'Admin';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <div className="logo-text">
            BRICK<span>FOOD</span>
          </div>
        </div>

        <SidebarNav />
      </aside>

      {/* Main Area */}
      <div className="content-area">
        <header className="top-bar">
          <h2>Administration Centrale</h2>
          <div className="user-profile">
            <button
              onClick={() => signOut()}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'var(--transition)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              Déconnexion
            </button>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{displayName}</span>
            <div className="user-avatar" style={{ backgroundColor: '#FFEBEB', color: '#E30613' }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="main-view">
          {children}
        </main>
      </div>
    </div>
  );
}
