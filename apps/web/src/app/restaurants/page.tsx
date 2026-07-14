'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../components/AuthProvider';
import type { Profile, Restaurant } from '@/types/database';

interface RestoRow extends Restaurant {
  agentName?: string;
  agentId?: string | null;
  offersCount?: number;
}

export default function RestaurantsManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestoRow[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [editingResto, setEditingResto] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [newResto, setNewResto] = useState({
    name: '',
    address: '',
    phone: '',
    agentId: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Charge les agents pour le dropdown
  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agent')
      .then(({ data }) => {
        setAgents(data as Profile[] ?? []);
        if (data && data.length > 0) {
          setNewResto((prev) => ({ ...prev, agentId: (data[0] as Profile).id }));
        }
      });
  }, []);

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*, profiles!agent_id(full_name, id)');
    const rows: RestoRow[] = ((data ?? []) as any[]).map((r) => ({
      ...r,
      agentName: r.profiles?.full_name,
      agentId: r.agent_id,
    }));

    // Compte des offres par restaurant
    for (const row of rows) {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', row.id);
      row.offersCount = count ?? 0;
    }

    setRestaurants(rows);
  };

  useEffect(() => {
    if (user) fetchRestaurants();
  }, [user]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('restaurants').insert({
      name: newResto.name,
      address: newResto.address,
      phone: newResto.phone,
      description: newResto.description,
      agent_id: newResto.agentId || null,
    });
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    showNotification(`Restaurant "${newResto.name}" ajouté avec succès !`);
    setNewResto({ name: '', address: '', phone: '', agentId: agents[0]?.id ?? '', description: '' });
    setShowAddModal(false);
    fetchRestaurants();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResto) return;
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: editingResto.name,
        address: editingResto.address,
        phone: editingResto.phone,
        description: editingResto.description,
        agent_id: editingResto.agentId || null,
      })
      .eq('id', editingResto.id);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    showNotification(`Restaurant "${editingResto.name}" modifié avec succès !`);
    setEditingResto(null);
    fetchRestaurants();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le restaurant ${name} ?`)) {
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) {
        showNotification(`Erreur: ${error.message}`);
        return;
      }
      showNotification(`Restaurant "${name}" supprimé.`);
      fetchRestaurants();
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

      <div style={{ display: 'grid', gridTemplateColumns: editingResto ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>

        <div className="panel">
          {restaurants.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucun restaurant enregistré
            </div>
          ) : (
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
                {restaurants.map((resto) => (
                  <tr key={resto.id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{resto.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {(resto.description ?? '').slice(0, 45)}
                        {(resto.description ?? '').length > 45 ? '...' : ''}
                      </div>
                    </td>
                    <td>{resto.address}</td>
                    <td style={{ fontWeight: '600' }}>{resto.phone}</td>
                    <td>
                      <span className="badge a_modifier" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
                        👤 {resto.agentName ?? 'Non assigné'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{resto.offersCount ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingResto({ ...resto })}>
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
          )}
        </div>

        {editingResto && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Modifier Restaurant</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setEditingResto(null)}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'établissement</label>
                <input type="text" className="form-input" value={editingResto.name} onChange={(e) => setEditingResto({ ...editingResto, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input type="text" className="form-input" value={editingResto.address} onChange={(e) => setEditingResto({ ...editingResto, address: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" value={editingResto.phone} onChange={(e) => setEditingResto({ ...editingResto, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '80px', fontFamily: 'inherit' }} value={editingResto.description ?? ''} onChange={(e) => setEditingResto({ ...editingResto, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Agent commercial attribué</label>
                <select className="form-input" value={editingResto.agentId ?? ''} onChange={(e) => setEditingResto({ ...editingResto, agentId: e.target.value })} required>
                  <option value="">— Non assigné —</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
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
                <input type="text" className="form-input" placeholder="ex: Le Bateau Ivoire" value={newResto.name} onChange={(e) => setNewResto({ ...newResto, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse complète</label>
                <input type="text" className="form-input" placeholder="ex: Cocody 2 Plateaux, Abidjan" value={newResto.address} onChange={(e) => setNewResto({ ...newResto, address: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" placeholder="ex: 07 58 45 12 36" value={newResto.phone} onChange={(e) => setNewResto({ ...newResto, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '60px', fontFamily: 'inherit' }} placeholder="Spécialités culinaires..." value={newResto.description} onChange={(e) => setNewResto({ ...newResto, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Agent commercial attribué</label>
                <select className="form-input" value={newResto.agentId} onChange={(e) => setNewResto({ ...newResto, agentId: e.target.value })} required>
                  <option value="">— Sélectionner —</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
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
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
