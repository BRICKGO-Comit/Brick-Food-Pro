'use client';

import React, { useState } from 'react';

// Mock initial restaurants
const initialRestaurants = [
  { id: 'resto_001', name: 'Le Bateau Ivoire', address: 'Cocody 2 Plateaux, Abidjan', phone: '07 58 45 12 36', agent: 'Eric Mba\'s', offersCount: 12, description: 'Spécialités ivoiriennes et européennes.' },
  { id: 'resto_002', name: 'Toni Fast Food', address: 'Riviera Bonoumin, Abidjan', phone: '05 06 78 90 12', agent: 'Alain K.', offersCount: 8, description: 'Fast food rapide, burgers de qualité.' },
  { id: 'resto_003', name: 'Le QG Lounge', address: 'Riviera Palmeraie, Abidjan', phone: '07 01 02 03 04', agent: 'Alain K.', offersCount: 5, description: 'Lounge chic, grillades et cocktails.' },
  { id: 'resto_004', name: 'Chez Georges', address: 'Marcory Zone 4, Abidjan', phone: '01 02 03 04 05', agent: 'Eric Mba\'s', offersCount: 6, description: 'Cuisine traditionnelle braisée.' }
];

const mockAgents = ['Eric Mba\'s', 'Alain K.', 'Florence M.'];

export default function RestaurantsManagement() {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [editingResto, setEditingResto] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [newResto, setNewResto] = useState({
    name: '',
    address: '',
    phone: '',
    agent: mockAgents[0],
    description: '',
  });

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `resto_00${restaurants.length + 1}`,
      name: newResto.name,
      address: newResto.address,
      phone: newResto.phone,
      agent: newResto.agent,
      offersCount: 0,
      description: newResto.description,
    };

    setRestaurants(prev => [...prev, created]);
    showNotification(`Restaurant "${newResto.name}" ajouté avec succès !`);
    setNewResto({ name: '', address: '', phone: '', agent: mockAgents[0], description: '' });
    setShowAddModal(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResto) return;

    setRestaurants(prev => prev.map(r => r.id === editingResto.id ? { ...editingResto } : r));
    showNotification(`Restaurant "${editingResto.name}" modifié avec succès !`);
    setEditingResto(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le restaurant ${name} ?`)) {
      setRestaurants(prev => prev.filter(r => r.id !== id));
      showNotification(`Restaurant "${name}" supprimé.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Gestion des Restaurants</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gérez les fiches établissements de vos restaurants partenaires.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Ajouter un Restaurant
        </button>
      </div>

      {notification && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '14px' }}>
          ✨ {notification}
        </div>
      )}

      {/* Grid container to support sidebar edit */}
      <div style={{ display: 'grid', gridTemplateColumns: editingResto ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        
        {/* Table panel */}
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Téléphone</th>
                <th>Agent Attribué</th>
                <th>Offres actives</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map(resto => (
                <tr key={resto.id}>
                  <td>
                    <div style={{ fontWeight: '700' }}>{resto.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{resto.description.slice(0, 45)}...</div>
                  </td>
                  <td>{resto.address}</td>
                  <td style={{ fontWeight: '600' }}>{resto.phone}</td>
                  <td>
                    <span className="badge a_modifier" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
                      👤 {resto.agent}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{resto.offersCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingResto(resto)}>
                        Modifier
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(resto.id, resto.name)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Panel (if active) */}
        {editingResto && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Modifier Restaurant</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setEditingResto(null)}>✕</button>
            </div>
            
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'établissement</label>
                <input type="text" className="form-input" value={editingResto.name} onChange={e => setEditingResto({ ...editingResto, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input type="text" className="form-input" value={editingResto.address} onChange={e => setEditingResto({ ...editingResto, address: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" value={editingResto.phone} onChange={e => setEditingResto({ ...editingResto, phone: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '80px', fontFamily: 'inherit' }} value={editingResto.description} onChange={e => setEditingResto({ ...editingResto, description: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Agent commercial attribué</label>
                <select className="form-input" value={editingResto.agent} onChange={e => setEditingResto({ ...editingResto, agent: e.target.value })} required>
                  {mockAgents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Enregistrer</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setEditingResto(null)}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add Restaurant Modal Popup */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '480px', animation: 'scaleUp 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Ajouter un nouveau restaurant</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'établissement</label>
                <input type="text" className="form-input" placeholder="ex: Le Bateau Ivoire" value={newResto.name} onChange={e => setNewResto({ ...newResto, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse complète</label>
                <input type="text" className="form-input" placeholder="ex: Cocody 2 Plateaux, Abidjan" value={newResto.address} onChange={e => setNewResto({ ...newResto, address: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" placeholder="ex: 07 58 45 12 36" value={newResto.phone} onChange={e => setNewResto({ ...newResto, phone: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '60px', fontFamily: 'inherit' }} placeholder="Spécialités culinaires..." value={newResto.description} onChange={e => setNewResto({ ...newResto, description: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Agent commercial attribué</label>
                <select className="form-input" value={newResto.agent} onChange={e => setNewResto({ ...newResto, agent: e.target.value })} required>
                  {mockAgents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Ajouter</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setShowAddModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
