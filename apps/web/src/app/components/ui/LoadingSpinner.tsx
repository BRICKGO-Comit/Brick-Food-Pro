'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizes = { sm: '24px', md: '40px', lg: '64px' };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        width: sizes[size], height: sizes[size], border: '3px solid var(--border)',
        borderTop: '3px solid var(--primary)', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {message && <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{message}</div>}
      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
