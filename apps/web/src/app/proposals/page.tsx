'use client';

import React, { useState } from 'react';

// Mock initial proposals submitted by agents
const initialProposals = [
  {
    id: 'prop_001',
    agent: 'Eric Mba\'s',
    restaurant: 'Le Bateau Ivoire',
    type: 'deal',
    title: 'Pack Couple Romantique',
    description: 'Une expérience gastronomique inoubliable pour 2 personnes.',
    price: 25000,
    price_normal: null,
    commission_rate: 10.00,
    quantity_initial: null,
    details: '2 Plats au choix + 2 Boissons + 1 Dessert + Décoration de table',
    pack_type: 'couple',
    capacity: 2,
    status: 'en_attente',
  },
  {
    id: 'prop_002',
    agent: 'Alain K.',
    restaurant: 'Toni Fast Food',
    type: 'flash',
    title: 'Menu Burger Duo',
    description: 'Deux burgers gourmands avec frites croustillantes et canettes de soda.',
    price: 7500,
    price_normal: 12000,
    commission_rate: 12.00,
    quantity_initial: 20,
    details: '2 Burgers + Frites + 2 Sodas',
    pack_type: null,
    capacity: null,
    status: 'en_attente',
  },
  {
    id: 'prop_003',
    agent: 'Eric Mba\'s',
    restaurant: 'Chez Georges',
    type: 'flash',
    title: 'Poulet Braisé + Attiéké',
    description: 'Poulet braisé entier servi chaud avec attiéké frais.',
    price: 6000,
    price_normal: 10000,
    commission_rate: 10.00,
    quantity_initial: 15,
    details: '1 Poulet entier + Attiéké',
    pack_type: null,
    capacity: null,
    status: 'a_modifier',
  }
];

export default function ProposalsModerator() {
  const [proposals, setProposals] = useState(initialProposals);
  const [editingProp, setEditingProp] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleAction = (id: string, newStatus: 'validee' | 'refusee' | 'a_modifier') => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    const prop = proposals.find(p => p.id === id);
    if (prop) {
      if (newStatus === 'validee') {
        showNotification(`Proposition "${prop.title}" VALIDÉE ! Le restaurant "${prop.restaurant}" a reçu une notification de confirmation.`);
      } else if (newStatus === 'refusee') {
        showNotification(`Proposition "${prop.title}" REFUSÉE.`);
      } else {
        showNotification(`Proposition "${prop.title}" renvoyée à l'agent pour MODIFICATION.`);
      }
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const startEdit = (prop: any) => {
    setEditingProp({ ...prop });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProp) return;

    setProposals(prev => prev.map(p => p.id === editingProp.id ? { ...editingProp } : p));
    showNotification(`Modifications enregistrées pour "${editingProp.title}"`);
    setEditingProp(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Validation des propositions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gérez et approuvez les offres Brick Flash et Brick Deal soumises par les agents.</p>
        </div>
      </div>

      {notification && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '14px', animation: 'fadeIn 0.3s' }}>
          ✨ {notification}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: editingProp ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        
        {/* Table list */}
        <div className="panel">
          <div className="panel-title">Propositions en attente</div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Restaurant</th>
                <th>Offre / Type</th>
                <th>Prix proposé</th>
                <th>Com.</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(prop => (
                <tr key={prop.id}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{prop.agent}</div>
                  </td>
                  <td>{prop.restaurant}</td>
                  <td>
                    <div style={{ fontWeight: '700' }}>{prop.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <span className={`badge ${prop.type}`} style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: prop.type === 'flash' ? 'var(--primary-light)' : 'var(--warning-bg)', color: prop.type === 'flash' ? 'var(--primary)' : 'var(--warning)' }}>
                        {prop.type === 'flash' ? '⚡ Brick Flash' : '❤️ Brick Deal'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{prop.price.toLocaleString()} FCFA</div>
                    {prop.price_normal && (
                      <div style={{ textDecoration: 'line-through', fontSize: '11px', color: 'var(--text-secondary)' }}>{prop.price_normal.toLocaleString()} FCFA</div>
                    )}
                  </td>
                  <td style={{ fontWeight: '600' }}>{prop.commission_rate}%</td>
                  <td>
                    <span className={`badge ${prop.status}`}>
                      {prop.status === 'en_attente' && 'En attente'}
                      {prop.status === 'validee' && 'Validée'}
                      {prop.status === 'refusee' && 'Refusée'}
                      {prop.status === 'a_modifier' && 'À modifier'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {prop.status === 'en_attente' && (
                        <>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleAction(prop.id, 'validee')}>
                            Valider
                          </button>
                          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => startEdit(prop)}>
                            Modifier
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleAction(prop.id, 'refusee')}>
                            Refuser
                          </button>
                        </>
                      )}
                      {prop.status !== 'en_attente' && (
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setProposals(prev => prev.map(p => p.id === prop.id ? { ...p, status: 'en_attente' } : p))}>
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Panel (if active) */}
        {editingProp && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Modifier la proposition</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setEditingProp(null)}>✕</button>
            </div>
            
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Titre de l'offre</label>
                <input type="text" className="form-input" value={editingProp.title} onChange={e => setEditingProp({ ...editingProp, title: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '80px', fontFamily: 'inherit' }} value={editingProp.description} onChange={e => setEditingProp({ ...editingProp, description: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Prix Proposé (FCFA)</label>
                <input type="number" className="form-input" value={editingProp.price} onChange={e => setEditingProp({ ...editingProp, price: Number(e.target.value) })} required />
              </div>

              {editingProp.type === 'flash' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Prix Normal Barré (FCFA)</label>
                    <input type="number" className="form-input" value={editingProp.price_normal || ''} onChange={e => setEditingProp({ ...editingProp, price_normal: Number(e.target.value) })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité Initiale</label>
                    <input type="number" className="form-input" value={editingProp.quantity_initial || ''} onChange={e => setEditingProp({ ...editingProp, quantity_initial: Number(e.target.value) })} required />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Taux de Commission (%)</label>
                <input type="number" step="0.01" className="form-input" value={editingProp.commission_rate} onChange={e => setEditingProp({ ...editingProp, commission_rate: Number(e.target.value) })} required />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Enregistrer</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setEditingProp(null)}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
