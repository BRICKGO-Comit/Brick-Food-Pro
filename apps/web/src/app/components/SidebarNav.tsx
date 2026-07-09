'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Accueil', icon: '🏠' },
    { href: '/proposals', label: 'Propositions', icon: '📄' },
    { href: '/restaurants', label: 'Restaurants', icon: '🏪' },
    { href: '/agents', label: 'Agents', icon: '👤' },
    { href: '/orders', label: 'Commandes', icon: '🛍️' },
    { href: '/statistics', label: 'Statistiques', icon: '📊' },
  ];

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
