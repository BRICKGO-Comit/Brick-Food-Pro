'use client';

import React from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="metric-card" style={{ borderTop: color ? `3px solid ${color}` : undefined }}>
      <div className="metric-header">
        <span>{label}</span>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
