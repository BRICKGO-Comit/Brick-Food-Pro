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
  const [previewProp, setPreviewProp] = useState<OfferWithRelations | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchProposals = async () => {
    const { data: offersData, error: offersErr } = await supabase
      .from('offers')
      .select('*, restaurants!left(name, address, phone)')
      .order('created_at', { ascending: false });

    if (offersErr) {
      console.error('[FetchProposals] Error fetching offers:', offersErr.message);
      return;
    }

    if (!offersData || offersData.length === 0) {
      setProposals([]);
      return;
    }

    const agentIds = Array.from(new Set(offersData.map((o: any) => o.agent_id).filter(Boolean)));
    let agentMap: Record<string, string> = {};

    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);

      (profilesData ?? []).forEach((p: any) => {
        agentMap[p.id] = p.full_name;
      });
    }

    const enrichedProposals = offersData.map((o: any) => ({
      ...o,
      profiles: { full_name: agentMap[o.agent_id] || 'Agent Commercial' },
    }));

    setProposals(enrichedProposals as unknown as OfferWithRelations[]);
  };

  useEffect(() => {
    if (!user) return;
    fetchProposals();

    // Realtime subscription for live proposals updates from mobile app
    const channel = supabase
      .channel('admin-offers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            showNotification(`⚡ NOUVELLE PROPOSITION SOUMISE : "${payload.new.title || 'Sans titre'}" !`);
          }
          fetchProposals();
        }
      )
      .subscribe();

    // Add polling backup every 4 seconds
    const interval = setInterval(() => {
      fetchProposals();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const handleAction = async (id: string, newStatus: OfferStatus) => {
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'validee') {
      updatePayload.is_confirmed = true;
    }
    const { error } = await supabase.from('offers').update(updatePayload).eq('id', id);
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
    if (previewProp && previewProp.id === id) {
      setPreviewProp({ ...previewProp, status: newStatus });
    }
    fetchProposals();
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleDeleteProposal = async (id: string, title: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'offre "${title}" ?`)) {
      return;
    }

    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) {
      showNotification(`Erreur lors de la suppression: ${error.message}`);
      return;
    }

    showNotification(`🗑️ Offre "${title}" supprimée avec succès.`);
    if (previewProp?.id === id) setPreviewProp(null);
    if (editingProp?.id === id) setEditingProp(null);
    fetchProposals();
  };

  const startEdit = (prop: OfferWithRelations) => {
    setEditingProp({ ...prop });
    setPreviewProp(null);
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

  const filteredProposals = proposals.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Validation des propositions d'offres</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Inspectez, vérifiez les photos et modérez les formules Flash et Deals soumises par les agents et établissements.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: `Toutes (${proposals.length})` },
            { id: 'en_attente', label: `En attente (${proposals.filter(p => p.status === 'en_attente').length})` },
            { id: 'validee', label: `Validées (${proposals.filter(p => p.status === 'validee').length})` },
            { id: 'refusee', label: `Refusées (${proposals.filter(p => p.status === 'refusee').length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: '1px solid #E5E7EB',
                backgroundColor: filterStatus === f.id ? '#E11D48' : '#F9FAFB',
                color: filterStatus === f.id ? '#FFFFFF' : '#374151',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => fetchProposals()}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid var(--primary)',
              backgroundColor: '#FFF1F2',
              color: 'var(--primary)',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {notification && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '14px', animation: 'fadeIn 0.3s' }}>
          ✨ {notification}
        </div>
      )}

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: editingProp || previewProp ? '1fr 420px' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>

        {/* Table list */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Propositions d'Offres ({filteredProposals.length})</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>💡 Cliquez sur une ligne pour inspecter l'image et la fiche complète</span>
          </div>

          {filteredProposals.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune proposition correspondant à ce filtre.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aperçu</th>
                  <th>Offre / Formule</th>
                  <th>Établissement</th>
                  <th>Agent</th>
                  <th>Prix Proposé</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((prop) => {
                  const agentName = (prop as any).profiles?.full_name ?? 'Direct Établissement';
                  const restoName = (prop as any).restaurants?.name ?? '—';
                  const displayPrice = prop.type === 'flash' ? prop.price_promo : prop.price;
                  const photoUrl = prop.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';

                  return (
                    <tr
                      key={prop.id}
                      style={{ cursor: 'pointer', backgroundColor: previewProp?.id === prop.id ? '#FFF5F5' : undefined }}
                      onClick={() => setPreviewProp(prop)}
                    >
                      <td style={{ width: '60px' }}>
                        <img
                          src={photoUrl}
                          alt={prop.title}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E5E7EB' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{prop.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span className={`badge ${prop.type}`} style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: prop.type === 'flash' ? '#FFF1F2' : '#FFFBEB', color: prop.type === 'flash' ? '#E11D48' : '#D97706', fontWeight: '800' }}>
                            {prop.type === 'flash' ? '⚡ Brick Flash' : '❤️ Brick Deal'}
                          </span>
                          <span>• {new Date(prop.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{restoName}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#4B5563' }}>{agentName}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '800', color: '#E11D48', fontSize: '15px' }}>
                          {Number(displayPrice ?? 0).toLocaleString('fr-FR')} FCFA
                        </div>
                        {prop.type === 'flash' && prop.price_normal && (
                          <div style={{ textDecoration: 'line-through', fontSize: '11px', color: '#9CA3AF' }}>
                            {Number(prop.price_normal).toLocaleString('fr-FR')} FCFA
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${prop.status}`}>
                          {prop.status === 'en_attente' && '⏳ En attente'}
                          {prop.status === 'validee' && '✅ Validée'}
                          {prop.status === 'refusee' && '❌ Refusée'}
                          {prop.status === 'a_modifier' && '✏️ À modifier'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: '#E11D48', color: '#E11D48' }}
                            onClick={() => setPreviewProp(prop)}
                          >
                            👁️ Aperçu
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: '#2563EB', color: '#2563EB' }}
                            onClick={() => startEdit(prop)}
                          >
                            ✏️ Éditer
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: '#DC2626', color: '#DC2626' }}
                            onClick={() => handleDeleteProposal(prop.id, prop.title)}
                          >
                            🗑️ Supprimer
                          </button>
                          {prop.status === 'en_attente' && (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#059669', borderColor: '#059669' }}
                                onClick={() => handleAction(prop.id, 'validee')}
                              >
                                Valider
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#DC2626' }}
                                onClick={() => handleAction(prop.id, 'refusee')}
                              >
                                Refuser
                              </button>
                            </>
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

        {/* Inspection / Preview Modal Panel */}
        {previewProp && !editingProp && (
          <div className="panel" style={{ animation: 'slideIn 0.3s', position: 'sticky', top: '20px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '16px' }}>
              <div className="panel-title" style={{ margin: 0 }}>🔍 Inspection de la proposition</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280' }} onClick={() => setPreviewProp(null)}>✕</button>
            </div>

            {/* High Res Image Preview */}
            <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#111827', marginBottom: '16px' }}>
              <img
                src={previewProp.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                alt={previewProp.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                {previewProp.type === 'flash' ? '⚡ OFFRE FLASH' : '❤️ BRICK DEAL'}
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', margin: '0 0 4px 0' }}>{previewProp.title}</h3>
            <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              {previewProp.description || 'Aucune description fournie.'}
            </p>

            <div style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontWeight: '600' }}>Établissement :</span>
                <span style={{ fontWeight: '800', color: '#111827' }}>{(previewProp as any).restaurants?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontWeight: '600' }}>Soumis par (Agent) :</span>
                <span style={{ fontWeight: '700', color: '#111827' }}>{(previewProp as any).profiles?.full_name || 'Direct Établissement'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontWeight: '600' }}>Prix Normal Barré :</span>
                <span style={{ fontWeight: '700', color: '#6B7280', textDecoration: 'line-through' }}>
                  {previewProp.price_normal ? `${Number(previewProp.price_normal).toLocaleString('fr-FR')} FCFA` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontWeight: '600' }}>Prix Client Proposé :</span>
                <span style={{ fontWeight: '900', color: '#E11D48', fontSize: '16px' }}>
                  {Number(previewProp.type === 'flash' ? previewProp.price_promo : previewProp.price).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontWeight: '600' }}>Taux de Commission :</span>
                <span style={{ fontWeight: '800', color: '#059669' }}>{previewProp.commission_rate}%</span>
              </div>
              {previewProp.start_timestamp && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280', fontWeight: '600' }}>Période de Validité :</span>
                  <span style={{ fontWeight: '700', color: '#111827', fontSize: '12px' }}>
                    {new Date(previewProp.start_timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} ➔ {new Date(previewProp.end_timestamp || previewProp.start_timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Validation Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {previewProp.status !== 'validee' && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: '800', backgroundColor: '#059669', borderColor: '#059669', fontSize: '14px' }}
                  onClick={() => handleAction(previewProp.id, 'validee')}
                >
                  ✅ Valider et Publier la proposition
                </button>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: '1', padding: '10px', fontSize: '13px' }}
                  onClick={() => startEdit(previewProp)}
                >
                  ✏️ Modifier
                </button>
                {previewProp.status !== 'refusee' && (
                  <button
                    className="btn btn-secondary"
                    style={{ flex: '1', padding: '10px', fontSize: '13px', backgroundColor: '#DC2626' }}
                    onClick={() => handleAction(previewProp.id, 'refusee')}
                  >
                    ❌ Refuser
                  </button>
                )}
              </div>
              <button
                className="btn btn-outline"
                style={{ width: '100%', padding: '10px', fontSize: '13px', borderColor: '#DC2626', color: '#DC2626', marginTop: '8px' }}
                onClick={() => handleDeleteProposal(previewProp.id, previewProp.title)}
              >
                🗑️ Supprimer définitivement l'offre
              </button>
            </div>
          </div>
        )}

        {/* Edit Panel (if active) */}
        {editingProp && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '16px' }}>
              <div className="panel-title" style={{ margin: 0 }}>Modifier la proposition</div>
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
