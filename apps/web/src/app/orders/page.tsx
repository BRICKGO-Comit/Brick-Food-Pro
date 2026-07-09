'use client';

import React, { useState } from 'react';

// Mock list of orders
const initialOrders = [
  {
    id: '#BF19339',
    client: 'Aminata O.',
    clientPhone: '+225 07 12 34 56 78',
    restaurant: 'Maquis La Joie',
    type: 'Brick Flash',
    offerTitle: 'Menu Poulet Braisé',
    quantity: 1,
    amount: 7500,
    commission: 750,
    status: 'nouvelle',
    date: '09 Juillet 2026',
    time: '15:40',
    mode: 'retrait',
    history: [
      { action: 'creee', time: '15:40', actor: 'Client (Aminata O.)' }
    ]
  },
  {
    id: '#BF1258',
    client: 'Jean K.',
    clientPhone: '+225 05 58 45 12 36',
    restaurant: 'Toni Fast Food',
    type: 'Brick Flash',
    offerTitle: 'Menu Burger Duo',
    quantity: 1,
    amount: 7500,
    commission: 900,
    status: 'en_preparation',
    date: '09 Juillet 2026',
    time: '14:30',
    mode: 'livraison',
    history: [
      { action: 'creee', time: '14:30', actor: 'Client (Jean K.)' },
      { action: 'acceptee', time: '14:35', actor: 'Restaurant (Toni Fast Food)' }
    ]
  },
  {
    id: '#BD1257',
    client: 'Awa D.',
    clientPhone: '+225 07 06 78 90 12',
    restaurant: 'Le Bateau Ivoire',
    type: 'Brick Deal',
    offerTitle: 'Pack Couple Romantique',
    quantity: 1,
    amount: 25000,
    commission: 2500,
    status: 'validee', // Confirmée/Prête
    date: '09 Juillet 2026',
    time: '14:20',
    mode: 'retrait',
    history: [
      { action: 'creee', time: '14:20', actor: 'Client (Awa D.)' },
      { action: 'acceptee', time: '14:25', actor: 'Restaurant (Le Bateau Ivoire)' },
      { action: 'prete', time: '14:50', actor: 'Restaurant (Le Bateau Ivoire)' }
    ]
  },
  {
    id: '#BF1256',
    client: 'Marc T.',
    clientPhone: '+225 01 02 34 56 78',
    restaurant: 'Chez Georges',
    type: 'Brick Flash',
    offerTitle: 'Poulet Braisé + Attiéké',
    quantity: 2,
    amount: 12000,
    commission: 1200,
    status: 'nouvelle',
    date: '09 Juillet 2026',
    time: '14:10',
    mode: 'retrait',
    history: [
      { action: 'creee', time: '14:10', actor: 'Client (Marc T.)' }
    ]
  },
  {
    id: '#BF1255',
    client: 'Sophie K.',
    clientPhone: '+225 07 89 01 23 45',
    restaurant: 'Le QG Lounge',
    type: 'Brick Flash',
    offerTitle: 'Menu Burger Duo',
    quantity: 2,
    amount: 15000,
    commission: 1500,
    status: 'terminee',
    date: '09 Juillet 2026',
    time: '13:40',
    mode: 'livraison',
    history: [
      { action: 'creee', time: '13:40', actor: 'Client (Sophie K.)' },
      { action: 'acceptee', time: '13:45', actor: 'Restaurant (Le QG Lounge)' },
      { action: 'prete', time: '14:10', actor: 'Restaurant (Le QG Lounge)' },
      { action: 'terminee', time: '14:35', actor: 'Livreur (Moussa K.)' }
    ]
  }
];

export default function OrdersManagement() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return {
          ...o,
          status: newStatus,
          history: [...o.history, { action: newStatus, time: timeStr, actor: 'Administration Centrale' }]
        };
      }
      return o;
    }));
    
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder(prev => {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return {
          ...prev,
          status: newStatus,
          history: [...prev.history, { action: newStatus, time: timeStr, actor: 'Administration Centrale' }]
        };
      });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchType = typeFilter === 'all' || (typeFilter === 'flash' && order.type === 'Brick Flash') || (typeFilter === 'deal' && order.type === 'Brick Deal');
    return matchStatus && matchType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Supervision des Commandes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Visualisez les commandes en temps réel, gérez les litiges et suivez les flux logistiques.</p>
      </div>

      {/* Filter Section */}
      <div className="panel" style={{ flexDirection: 'row', gap: '16px', flexWrap: 'wrap', padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Statut :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Toutes</option>
            <option value="nouvelle">Nouvelles</option>
            <option value="en_preparation">En préparation</option>
            <option value="validee">Prêtes / Confirmées</option>
            <option value="terminee">Terminées</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Type d'offre :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="flash">⚡ Brick Flash</option>
            <option value="deal">❤️ Brick Deal</option>
          </select>
        </div>
      </div>

      {/* Grid container to support sidebar details */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        
        {/* Table Panel */}
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Commande</th>
                <th>Client</th>
                <th>Restaurant</th>
                <th>Offre / Qté</th>
                <th>Montant</th>
                <th>Commission</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{order.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{order.date} {order.time}</div>
                  </td>
                  <td>{order.client}</td>
                  <td>{order.restaurant}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{order.offerTitle}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Qté: {order.quantity} | {order.mode}</div>
                  </td>
                  <td style={{ fontWeight: '700' }}>{order.amount.toLocaleString()} F</td>
                  <td style={{ fontWeight: '700', color: 'var(--success)' }}>+{order.commission.toLocaleString()} F</td>
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

        {/* Details Sidebar panel */}
        {selectedOrder && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ fontSize: '16px' }}>Détail Commande {selectedOrder.id}</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <Text style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Client</Text>
                <Text style={{ display: 'block' }}>Nom : {selectedOrder.client}</Text>
                <Text style={{ display: 'block', color: 'var(--text-secondary)' }}>Tél : {selectedOrder.clientPhone}</Text>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <Text style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Détails Offre</Text>
                <Text style={{ display: 'block', fontWeight: '600' }}>{selectedOrder.offerTitle}</Text>
                <Text style={{ display: 'block' }}>Restaurant : {selectedOrder.restaurant}</Text>
                <Text style={{ display: 'block' }}>Type : {selectedOrder.type}</Text>
                <Text style={{ display: 'block' }}>Qté : {selectedOrder.quantity} | Mode : {selectedOrder.mode}</Text>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <Text style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Finances</Text>
                <Text style={{ display: 'block', fontWeight: '700', color: 'var(--primary)', fontSize: '14px' }}>Montant : {selectedOrder.amount.toLocaleString()} FCFA</Text>
                <Text style={{ display: 'block', fontWeight: '700', color: 'var(--success)' }}>Commission : +{selectedOrder.commission.toLocaleString()} FCFA</Text>
              </div>

              <div>
                <Text style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Historique de Suivi</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginLeft: '6px' }}>
                  {selectedOrder.history.map((h: any, index: number) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: Colors.primary }}></span>
                      <Text style={{ fontWeight: '700', display: 'block' }}>
                        {h.action === 'creee' && 'Commande créée'}
                        {h.action === 'acceptee' && 'Acceptée par le resto'}
                        {h.action === 'en_preparation' && 'En préparation'}
                        {h.action === 'prete' && 'Marquée prête'}
                        {h.action === 'terminee' && 'Marquée terminée'}
                      </Text>
                      <Text style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Par {h.actor} à {h.time}</Text>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action overriding buttons */}
              {selectedOrder.status !== 'terminee' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {selectedOrder.status === 'nouvelle' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'en_preparation')}>
                      Lancer Préparation
                    </button>
                  )}
                  {selectedOrder.status === 'en_preparation' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px', backgroundColor: Colors.success }} onClick={() => handleUpdateStatus(selectedOrder.id, 'prete')}>
                      Marquer Prête
                    </button>
                  )}
                  {selectedOrder.status === 'validee' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px', backgroundColor: 'black' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'terminee')}>
                      Terminer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal placeholder colors mapping inside next component
const Colors = {
  primary: '#E30613',
  success: '#10B981',
};

// Fake Text mapping for Next wrapper
function Text({ children, style }: any) {
  return <span style={style}>{children}</span>;
}
