'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();

  let navItems: { href: string; label: string; icon: string }[] = [];

  if (role === 'admin') {
    navItems = [
      { href: '/admin', label: 'Accueil Admin', icon: '🏠' },
      { href: '/proposals', label: 'Propositions', icon: '📄' },
      { href: '/restaurants', label: 'Restaurants', icon: '🏪' },
      { href: '/agents', label: 'Agents', icon: '👤' },
      { href: '/orders', label: 'Commandes', icon: '🛍️' },
      { href: '/statistics', label: 'Statistiques', icon: '📊' },
      { href: '/settings', label: 'Paramètres', icon: '⚙️' },
    ];
  } else if (role === 'restaurant') {
    navItems = [
      { href: '/resto', label: 'Tableau de Bord', icon: '🏠' },
      { href: '/resto/scanner', label: 'Scanner QR', icon: '📷' },
      { href: '/resto/offres', label: 'Mes Offres', icon: '🏷️' },
      { href: '/resto/ventes', label: 'Historique Ventes', icon: '📈' },
    ];
  } else if (role === 'agent') {
    navItems = [
      { href: '/agent-portal', label: 'Tableau de Bord', icon: '🏠' },
      { href: '/agent-portal/restaurants', label: 'Mes Restaurants', icon: '🏪' },
      { href: '/agent-portal/propositions', label: 'Mes Propositions', icon: '📄' },
    ];
  }

  return (
    <nav className="nav-links">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span> {item.label}
          </a>
        );
      })}
    </nav>
  );
}
