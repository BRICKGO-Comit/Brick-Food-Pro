import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Brick Food Pro - Administration',
  description: 'Portail d\'administration centrale pour Brick Food Pro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="admin-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="logo-container">
              <div className="logo-mark">B</div>
              <div className="logo-text">
                BRICK<span>FOOD</span>
              </div>
            </div>
            
            <nav className="nav-links">
              <a href="/" className="nav-item active">
                <span style={{ fontSize: '18px' }}>🏠</span> Accueil
              </a>
              <a href="/proposals" className="nav-item">
                <span style={{ fontSize: '18px' }}>📄</span> Propositions
              </a>
              <a href="#" className="nav-item">
                <span style={{ fontSize: '18px' }}>🏪</span> Restaurants
              </a>
              <a href="#" className="nav-item">
                <span style={{ fontSize: '18px' }}>👤</span> Agents
              </a>
              <a href="#" className="nav-item">
                <span style={{ fontSize: '18px' }}>🛍️</span> Commandes
              </a>
              <a href="#" className="nav-item">
                <span style={{ fontSize: '18px' }}>📊</span> Statistiques
              </a>
            </nav>
          </aside>

          {/* Main Area */}
          <div className="content-area">
            <header className="top-bar">
              <h2>Administration Centrale</h2>
              <div className="user-profile">
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Eric Admin</span>
                <div className="user-avatar" style={{ backgroundColor: '#FFEBEB', color: '#E30613' }}>
                  EA
                </div>
              </div>
            </header>

            <main className="main-view">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
