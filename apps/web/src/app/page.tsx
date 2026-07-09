'use client';

import React, { useState, useEffect } from 'react';

// Mock dashboard stats matching the dashboard mockup
const initialStats = {
  totalRestaurants: 256,
  totalAgents: 45,
  totalOrders: 1248,
  totalCA: '24 580 000 FCFA',
  salesDistribution: {
    flash: 52,
    deals: 33,
    classic: 15,
  },
};

const initialOrders = [
  { id: '#BF1258', client: 'Jean K.', restaurant: 'Toni Fast Food', type: 'Brick Flash', amount: '7 500 FCFA', status: 'en_preparation' },
  { id: '#BD1257', client: 'Awa D.', restaurant: 'Le Bateau Ivoire', type: 'Brick Deal', amount: '25 000 FCFA', status: 'validee' },
  { id: '#BF1256', client: 'Marc T.', restaurant: 'Chez Georges', type: 'Brick Flash', amount: '12 000 FCFA', status: 'nouvelle' },
  { id: '#BF1255', client: 'Sophie K.', restaurant: 'Le QG Lounge', type: 'Brick Flash', amount: '15 000 FCFA', status: 'terminee' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(initialStats);
  const [orders, setOrders] = useState(initialOrders);

  // Simulate real-time order arrival
  useEffect(() => {
    const timer = setInterval(() => {
      const names = ['Karim B.', 'Aminata O.', 'David L.', 'Florence M.'];
      const restaurants = ['Le Bateau Ivoire', 'Toni Fast Food', 'Maquis La Joie', 'Chez Georges'];
      const types = ['Brick Flash', 'Brick Deal'];
      const amounts = ['6 000 FCFA', '18 500 FCFA', '25 000 FCFA', '7 500 FCFA'];
      
      const newOrder = {
        id: `#BF${Math.floor(10000 + Math.random() * 90000)}`,
        client: names[Math.floor(Math.random() * names.length)],
        restaurant: restaurants[Math.floor(Math.random() * restaurants.length)],
        type: types[Math.floor(Math.random() * types.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        status: 'nouvelle',
      };

      setOrders(prev => [newOrder, ...prev.slice(0, 5)]);
      setStats(prev => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
      }));
    }, 15000); // New order every 15 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Restaurants partenaires</span>
            <span style={{ fontSize: '18px' }}>🏪</span>
          </div>
          <div className="metric-value">{stats.totalRestaurants}</div>
          <div className="metric-sub">+15 ce mois</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Agents commerciaux</span>
            <span style={{ fontSize: '18px' }}>👤</span>
          </div>
          <div className="metric-value">{stats.totalAgents}</div>
          <div className="metric-sub">+3 ce mois</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Commandes totales</span>
            <span style={{ fontSize: '18px' }}>🛍️</span>
          </div>
          <div className="metric-value">{stats.totalOrders}</div>
          <div className="metric-sub">+28% ce mois</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="metric-header">
            <span>Chiffre d'affaires global</span>
            <span style={{ fontSize: '18px' }}>💰</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{stats.totalCA}</div>
          <div className="metric-sub">+32% vs mois dernier</div>
        </div>
      </div>

      {/* Panels Area */}
      <div className="panels-grid">
        {/* Real-time Orders */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', animation: 'pulse 1.5s infinite' }}></span>
            Commandes en temps réel
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Restaurant</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ transition: 'var(--transition)' }}>
                  <td style={{ fontWeight: '600' }}>{order.id}</td>
                  <td>{order.client}</td>
                  <td>{order.restaurant}</td>
                  <td style={{ fontWeight: '500' }}>{order.type}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: '700' }}>{order.amount}</td>
                  <td>
                    <span className={`badge ${order.status}`}>
                      {order.status === 'nouvelle' && 'Nouvelle'}
                      {order.status === 'en_preparation' && 'En préparation'}
                      {order.status === 'validee' && 'Confirmée'}
                      {order.status === 'terminee' && 'Terminée'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sales distribution */}
        <div className="panel" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="panel-title" style={{ width: '100%', textAlign: 'left' }}>Répartition des ventes</div>
          
          {/* Custom SVG Donut Chart */}
          <div style={{ position: 'relative', width: '180px', height: '180px' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              {/* Classic Circle */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EBEBEB" strokeWidth="3" />
              
              {/* Flash Circle (52%) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" strokeWidth="3" 
                      strokeDasharray="52 48" strokeDashoffset="0" />
              
              {/* Deals Circle (33%) - Offset by 52 */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3" 
                      strokeDasharray="33 67" strokeDashoffset="-52" />
                      
              {/* Classic custom color (15%) - Offset by 52 + 33 = 85 */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3" 
                      strokeDasharray="15 85" strokeDashoffset="-85" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
              <span style={{ fontSize: '24px', fontWeight: '800' }}>{stats.salesDistribution.flash}%</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Brick Flash</span>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
                <span>Brick Flash</span>
              </div>
              <span style={{ fontWeight: '700' }}>{stats.salesDistribution.flash}%</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                <span>Brick Deals</span>
              </div>
              <span style={{ fontWeight: '700' }}>{stats.salesDistribution.deals}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
                <span>Commandes classiques</span>
              </div>
              <span style={{ fontWeight: '700' }}>{stats.salesDistribution.classic}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(227, 6, 19, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(227, 6, 19, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(227, 6, 19, 0); }
        }
      `}</style>
    </>
  );
}
