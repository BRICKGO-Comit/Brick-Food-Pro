'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../components/AuthProvider';
import type { OfferWithRelations, OfferStatus } from '@/types/database';

export default function ProposalsModerator() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<OfferWithRelations[]>([]);
  const [editingProp, setEditingProp] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchProposals = async () => {
    const { data } = await supabase
      .from('offers')
      .select('*, profiles!agent_id(full_name), restaurants(name)')
      .order('created_at', { ascending: false });
    setProposals((data ?? []) as unknown as OfferWithRelations[]);
  };

  useEffect(() => {
    if (!user) return;
    fetchProposals();
  }, [user]);

  const handleAction = async (id: string, newStatus: OfferStatus) => {
    const { error } = await supabase.from('offers').update({ status: newStatus }).eq('id', id);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    const prop = proposals.find((p) => p.id === id);
    if (prop) {
      if (newStatus === 'validee') {
        showNotification(`Proposition "${prop.title}" VALIDÉE !`);
      } else if (newStatus === 'refusee') {
        showNotification(`Proposition "${prop.title}" REFUSÉE.`);
      } else {
        showNotification(`Proposition "${prop.title}" renvoyée pour MODIFICATION.`);
      }
    }
    fetchProposals();
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4500);
  };

  const startEdit = (prop: OfferWithRelations) => {
    setEditingProp({ ...prop });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProp) return;

    const updates: Record<string, unknown> = {
      title: editingProp.title,
      description: editingProp.description,
      commission_rate: editingProp.commission_rate,
    };

    if (editingProp.type === 'flash') {
      updates.price_promo = Number(editingProp.price_promo);
      updates.price_normal = Number(editingProp.price_normal);
      updates.quantity_initial = Number(editingProp.quantity_initial);
    } else {
      updates.price = Number(editingProp.price);
    }

    const { error } = await supabase.from('offers').update(updates).eq('id', editingProp.id);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    showNotification(`Modifications enregistrées pour "${editingProp.title}"`);
    setEditingProp(null);
    fetchProposals();
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
          <div className="panel-title">Propositions</div>

          {proposals.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune proposition pour le moment
            </div>
          ) : (
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
                {proposals.map((prop) => {
                  const agentName = (prop as any).profiles?.full_name ?? '—';
                  const restoName = (prop as any).restaurants?.name ?? '—';
                  const displayPrice = prop.type === 'flash' ? prop.price_promo : prop.price;
                  return (
                    <tr key={prop.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{agentName}</div>
                      </td>
                      <td>{restoName}</td>
                      <td>
                        <div style={{ fontWeight: '700' }}>{prop.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <span className={`badge ${prop.type}`} style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: prop.type === 'flash' ? 'var(--primary-light)' : 'var(--warning-bg)', color: prop.type === 'flash' ? 'var(--primary)' : 'var(--warning)' }}>
                            {prop.type === 'flash' ? '⚡ Brick Flash' : '❤️ Brick Deal'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                          {Number(displayPrice ?? 0).toLocaleString('fr-FR')} FCFA
                        </div>
                        {prop.type === 'flash' && prop.price_normal && (
                          <div style={{ textDecoration: 'line-through', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {Number(prop.price_normal).toLocaleString('fr-FR')} FCFA
                          </div>
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
                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleAction(prop.id, 'en_attente')}>
                              Réinitialiser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
                <input type="text" className="form-input" value={editingProp.title} onChange={(e) => setEditingProp({ ...editingProp, title: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ minHeight: '80px', fontFamily: 'inherit' }} value={editingProp.description} onChange={(e) => setEditingProp({ ...editingProp, description: e.target.value })} required />
              </div>

              {editingProp.type === 'flash' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Prix Promo (FCFA)</label>
                    <input type="number" className="form-input" value={editingProp.price_promo ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price_promo: Number(e.target.value) })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prix Normal Barré (FCFA)</label>
                    <input type="number" className="form-input" value={editingProp.price_normal ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price_normal: Number(e.target.value) })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité Initiale</label>
                    <input type="number" className="form-input" value={editingProp.quantity_initial ?? ''} onChange={(e) => setEditingProp({ ...editingProp, quantity_initial: Number(e.target.value) })} required />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Prix du Pack (FCFA)</label>
                  <input type="number" className="form-input" value={editingProp.price ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price: Number(e.target.value) })} required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Taux de Commission (%)</label>
                <input type="number" step="0.01" className="form-input" value={editingProp.commission_rate} onChange={(e) => setEditingProp({ ...editingProp, commission_rate: Number(e.target.value) })} required />
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
