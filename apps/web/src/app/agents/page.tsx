'use client';

import React, { useState } from 'react';

// Mock commercial agents data
const initialAgents = [
  { id: 'agent_001', name: 'Eric Mba\'s', email: 'agent.eric@brickfood.com', phone: '07 45 89 12 36', restaurantsCount: 18, proposalsCount: 25, commissions: '1 450 000 FCFA' },
  { id: 'agent_002', name: 'Alain K.', email: 'agent.alain@brickfood.com', phone: '05 12 34 56 78', restaurantsCount: 12, proposalsCount: 18, commissions: '980 000 FCFA' },
  { id: 'agent_003', name: 'Florence M.', email: 'agent.florence@brickfood.com', phone: '01 98 76 54 32', restaurantsCount: 6, proposalsCount: 8, commissions: '320 000 FCFA' }
];

export default function AgentsManagement() {
  const [agents, setAgents] = useState(initialAgents);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form state
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `agent_00${agents.length + 1}`,
      name: newAgent.name,
      email: newAgent.email,
      phone: newAgent.phone,
      restaurantsCount: 0,
      proposalsCount: 0,
      commissions: '0 FCFA',
    };

    setAgents(prev => [...prev, created]);
    showNotification(`Agent "${newAgent.name}" recruté avec succès !`);
    setNewAgent({ name: '', email: '', phone: '' });
    setShowAddModal(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setAgents(prev => prev.map(a => a.id === editingAgent.id ? { ...editingAgent } : a));
    showNotification(`Profil de "${editingAgent.name}" mis à jour.`);
    setEditingAgent(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Voulez-vous révoquer l'accès de l'agent commercial ${name} ?`)) {
      setAgents(prev => prev.filter(a => a.id !== id));
      showNotification(`Accès de l'agent "${name}" révoqué.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Gestion des Agents Commerciaux</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Supervisez la performance commerciale et gérez les comptes de vos agents sur le terrain.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Recruter un Agent
        </button>
      </div>

      {notification && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '14px' }}>
          ✨ {notification}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: editingAgent ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        
        {/* Table List */}
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Contact</th>
                <th>Restaurants attribués</th>
                <th>Propositions soumises</th>
                <th>Commissions générées</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td>
                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{agent.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {agent.id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>✉️ {agent.email}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📞 {agent.phone}</div>
                  </td>
                  <td style={{ fontWeight: '700', paddingLeft: '24px' }}>{agent.restaurantsCount}</td>
                  <td style={{ fontWeight: '700', paddingLeft: '24px' }}>{agent.proposalsCount}</td>
                  <td style={{ fontWeight: '800', color: 'var(--success)' }}>{agent.commissions}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingAgent(agent)}>
                        Modifier
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(agent.id, agent.name)}>
                        Révoquer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Panel (if active) */}
        {editingAgent && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Modifier Profil Agent</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setEditingAgent(null)}>✕</button>
            </div>
            
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input type="text" className="form-input" value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input type="email" className="form-input" value={editingAgent.email} onChange={e => setEditingAgent({ ...editingAgent, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" value={editingAgent.phone} onChange={e => setEditingAgent({ ...editingAgent, phone: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Enregistrer</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setEditingAgent(null)}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add Agent Modal Popup */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '400px', animation: 'scaleUp 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Recruter un nouvel agent</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input type="text" className="form-input" placeholder="ex: Eric Mba's" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input type="email" className="form-input" placeholder="ex: agent@brickfood.com" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" placeholder="ex: 07 45 89 12 36" value={newAgent.phone} onChange={e => setNewAgent({ ...newAgent, phone: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Ajouter</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setShowAddModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
