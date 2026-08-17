'use client';

import React, { useEffect } from 'react';

export default function PaymentSuccessPage() {
  useEffect(() => {
    // Redirection automatique vers l'application APK mobile BRICK DEAL
    const timer = setTimeout(() => {
      window.location.href = 'brickdeal://payment/success';
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: 'white',
      padding: '20px',
      margin: 0
    }}>
      <div style={{
        backgroundColor: '#1E293B',
        borderRadius: '24px',
        padding: '36px 24px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
        border: '1px solid #334155'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', margin: '0 0 10px 0' }}>
          Paiement Confirmé !
        </h1>
        <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '28px', lineHeight: '1.5' }}>
          Votre réservation BRICK DEAL a été validée avec succès. Redirection vers l&apos;application...
        </p>
        <a
          href="brickdeal://payment/success"
          style={{
            display: 'block',
            backgroundColor: '#D60309',
            color: 'white',
            fontWeight: 800,
            padding: '16px 20px',
            borderRadius: '16px',
            textDecoration: 'none',
            fontSize: '16px',
            boxShadow: '0 6px 16px rgba(214, 3, 9, 0.4)'
          }}
        >
          Ouvrir l&apos;application BRICK DEAL
        </a>
      </div>
    </div>
  );
}
