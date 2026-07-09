'use client';

import React, { useState } from 'react';

// Mock charts data
const weeklyRevenue = [
  { day: 'Lun', amount: 320000 },
  { day: 'Mar', amount: 450000 },
  { day: 'Mer', amount: 280000 },
  { day: 'Jeu', amount: 510000 },
  { day: 'Ven', amount: 760000 },
  { day: 'Sam', amount: 890000 },
  { day: 'Dim', amount: 620000 }
];

const topRestaurants = [
  { name: 'Le Bateau Ivoire', sales: '8 450 000 FCFA', orders: 338 },
  { name: 'Le QG Lounge', sales: '6 120 000 FCFA', orders: 408 },
  { name: 'Chez Georges', sales: '4 890 000 FCFA', orders: 245 },
  { name: 'Toni Fast Food', sales: '3 120 000 FCFA', orders: 416 }
];

const topAgents = [
  { name: 'Eric Mba\'s', commission: '1 450 000 FCFA', proposals: 25 },
  { name: 'Alain K.', commission: '980 000 FCFA', proposals: 18 },
  { name: 'Florence M.', commission: '320 000 FCFA', proposals: 8 }
];

export default function StatisticsDashboard() {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');

  const maxAmount = Math.max(...weeklyRevenue.map(d => d.amount));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Analyses & Statistiques</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Suivez l'évolution du volume d'affaires, des commissions et des performances commerciales.</p>
        </div>
        
        {/* Toggle timeframe */}
        <div style={{ display: 'flex', backgroundColor: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'week' ? 'white' : 'transparent', color: timeframe === 'week' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('week')}>
            Cette semaine
          </button>
          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'month' ? 'white' : 'transparent', color: timeframe === 'month' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('month')}>
            Ce mois
          </button>
        </div>
      </div>

      {/* Stats indicators grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Panier Moyen</span>
            <span>🛒</span>
          </div>
          <div className="metric-value">19 695 FCFA</div>
          <div className="metric-sub" style={{ color: 'var(--success)' }}>+4.2% vs mois dernier</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Taux de conversion</span>
            <span>📈</span>
          </div>
          <div className="metric-value">3.8 %</div>
          <div className="metric-sub" style={{ color: 'var(--success)' }}>+0.5% vs mois dernier</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Offres Publiées</span>
            <span>🏷️</span>
          </div>
          <div className="metric-value">48</div>
          <div className="metric-sub">34 active Flashes • 14 active Deals</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Taux de commission moyen</span>
            <span>📊</span>
          </div>
          <div className="metric-value">10.45 %</div>
          <div className="metric-sub" style={{ color: 'var(--info)' }}>Fixé par Brick Food</div>
        </div>
      </div>

      {/* SVG Bar Chart Panel */}
      <div className="panel" style={{ height: '340px' }}>
        <div className="panel-title">Évolution journalière du Chiffre d'Affaires (FCFA)</div>
        
        {/* Simple responsive SVG chart wrapper */}
        <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '16px 20px 0 20px', borderBottom: '1px solid var(--border)' }}>
          {weeklyRevenue.map((d, index) => {
            const barHeightPercentage = (d.amount / maxAmount) * 90; // scale to 90% max height
            return (
              <div key={index} style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                {/* Popover value on hover */}
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>{(d.amount / 1000).toFixed(0)}k</span>
                <div style={{
                  width: '32px',
                  height: `${barHeightPercentage}%`,
                  backgroundColor: 'var(--primary)',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'height 0.5s ease-in-out',
                }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rankings Panels */}
      <div className="panels-grid">
        {/* Top Restaurants */}
        <div className="panel">
          <div className="panel-title">🥇 Top Restaurants Partenaires</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {topRestaurants.map((resto, index) => (
              <div key={index} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: '800', marginRight: '8px', color: 'var(--primary)' }}>#{index + 1}</span>
                  <span style={{ fontWeight: '700' }}>{resto.name}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{resto.orders} commandes passées</div>
                </div>
                <span style={{ fontWeight: '800', color: 'black' }}>{resto.sales}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="panel">
          <div className="panel-title">👤 Top Agents Terrain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {topAgents.map((agent, index) => (
              <div key={index} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: '800', marginRight: '8px', color: 'var(--primary)' }}>#{index + 1}</span>
                  <span style={{ fontWeight: '700' }}>{agent.name}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{agent.proposals} propositions faites</div>
                </div>
                <span style={{ fontWeight: '800', color: 'var(--success)' }}>+{agent.commission}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
