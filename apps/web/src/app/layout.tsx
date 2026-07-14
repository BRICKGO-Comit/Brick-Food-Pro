import './globals.css';
import React from 'react';
import { AuthProvider } from './components/AuthProvider';
import ShellClient from './components/ShellClient';

export const metadata = {
  title: 'Brick Food Pro - Administration',
  description: 'Portail d\'administration centrale pour Brick Food Pro',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <ShellClient>{children}</ShellClient>
        </AuthProvider>
      </body>
    </html>
  );
}
