import './globals.css';
import React from 'react';
import { AuthProvider } from './components/AuthProvider';
import { NotificationProvider } from './components/NotificationProvider';
import ShellClient from './components/ShellClient';

export const metadata = {
  title: 'BRICK DEAL - Offres Flash & Bons Plans Gastronomiques',
  description: 'Portail officiel et administration centrale pour BRICK DEAL',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
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
          <NotificationProvider>
            <ShellClient>{children}</ShellClient>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
