import './globals.css';
import React from 'react';
import SidebarNav from './components/SidebarNav';

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
              <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
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
