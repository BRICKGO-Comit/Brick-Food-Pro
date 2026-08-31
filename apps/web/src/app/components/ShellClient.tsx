'use client';

import React from 'react';
import SidebarNav from './SidebarNav';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function ShellClient({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();

  // Pages publiques
  const isPublicPage = pathname === '/' || pathname === '/vitrine' || pathname.startsWith('/legal') || pathname === '/login' || pathname.startsWith('/deals') || pathname.startsWith('/checkout') || pathname === '/inscription' || pathname.startsWith('/payment');

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const role = profile?.role;
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/orders') || pathname.startsWith('/proposals') || pathname.startsWith('/restaurants') || pathname.startsWith('/agents') || pathname.startsWith('/statistics') || pathname.startsWith('/settings');
  
  if (role === 'restaurant' && isAdminPath) {
    return <AccessDenied email={user.email || ''} signOut={signOut} />;
  }
  if (role === 'agent' && isAdminPath) {
    return <AccessDenied email={user.email || ''} signOut={signOut} />;
  }
  // Add other access rules if needed

  let title = "Administration Centrale";
  if (role === 'restaurant') title = "Espace Restaurateur";
  if (role === 'agent') title = "Espace Agent Commercial";

  const displayName = profile?.full_name || user.email || 'Utilisateur';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <div className="logo-text">
            BRICK<span>DEAL</span>
          </div>
        </div>
        <SidebarNav role={role || ''} />
      </aside>

      <div className="content-area">
        <header className="top-bar">
          <h2>{title}</h2>
          <div className="user-profile">
            <button
              onClick={() => signOut()}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px',
                fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition)',
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

function AccessDenied({ email, signOut }: { email: string; signOut: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0F10', padding: '24px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', marginBottom: '16px', objectFit: 'contain' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#E30613' }}>Accès Refusé</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Ce portail n'est pas accessible avec votre rôle actuel. Votre compte ({email}) n'est pas autorisé.
        </p>
        <button className="btn btn-primary" onClick={() => signOut()} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#E30613', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
