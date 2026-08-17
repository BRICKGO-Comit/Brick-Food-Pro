'use client';

import React, { useEffect } from 'react';

export default function PaymentSuccessPage() {
  const triggerRedirection = () => {
    window.location.href = 'brickdeal://payment/success';
  };

  useEffect(() => {
    // Redirection automatique vers l'application APK mobile BRICK DEAL
    const timer = setTimeout(() => {
      triggerRedirection();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0B0F19',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1E293B',
        borderRadius: '28px',
        padding: '40px 28px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1.5px solid #334155'
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
          onClick={(e) => {
            e.preventDefault();
            triggerRedirection();
          }}
          style={{
            cursor: 'pointer',
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
