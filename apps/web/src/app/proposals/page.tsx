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

      // Send notification to agent and/or restaurant owner
      try {
        const notifTitle = newStatus === 'validee'
          ? '🎉 Proposition Validée !'
          : newStatus === 'refusee'
          ? '❌ Proposition Refusée'
          : '✏️ Modification Demandée';
        const notifBody = newStatus === 'validee'
          ? `Votre offre "${prop.title}" a été approuvée par l'admin et est maintenant en ligne sur l'application.`
          : newStatus === 'refusee'
          ? `Votre proposition d'offre "${prop.title}" a été refusée par le comité d'administration.`
          : `L'administrateur a demandé des ajustements pour votre offre "${prop.title}".`;

        const notifsToInsert: any[] = [];
        if (prop.agent_id) {
          notifsToInsert.push({
            user_id: prop.agent_id,
            title: notifTitle,
            body: notifBody,
            is_read: false,
          });
        }
        if (prop.restaurant_id) {
          const { data: resto } = await supabase.from('restaurants').select('agent_id, name').eq('id', prop.restaurant_id).maybeSingle();
          if (resto?.agent_id && resto.agent_id !== prop.agent_id) {
            notifsToInsert.push({
              user_id: resto.agent_id,
              title: notifTitle,
              body: notifBody,
              is_read: false,
            });
          }
        }
        if (notifsToInsert.length > 0) {
          await supabase.from('notifications').insert(notifsToInsert);
        }
      } catch (e) {
        console.warn('[ProposalNotification] Error sending notification:', e);
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

  const [deleteConfirmProp, setDeleteConfirmProp] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteProposal = (id: string, title: string) => {
    setDeleteConfirmProp({ id, title });
  };

  const confirmDeleteProposal = async () => {
    if (!deleteConfirmProp) return;
    const { id, title } = deleteConfirmProp;
    setDeleteConfirmProp(null);

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

  const [showImageEditPrompt, setShowImageEditPrompt] = useState<boolean>(false);
  const [newImageInputUrl, setNewImageInputUrl] = useState<string>('');

  const handleOpenImageEdit = () => {
    if (previewProp) {
      setNewImageInputUrl(previewProp.photos?.[0] || '');
      setShowImageEditPrompt(true);
    }
  };

  const handleSaveInspectionImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewProp) return;

    const updatedPhotos = [newImageInputUrl.trim()];
    const { error } = await supabase
      .from('offers')
      .update({ photos: updatedPhotos })
      .eq('id', previewProp.id);

    if (error) {
      showNotification(`Erreur lors de la mise à jour de l'image: ${error.message}`);
      return;
    }

    showNotification(`📸 Photo de l'offre "${previewProp.title}" mise à jour avec succès !`);
    setPreviewProp({ ...previewProp, photos: updatedPhotos });
    setShowImageEditPrompt(false);
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
      photos: editingProp.photos || [],
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

        {/* Inspection / Preview Modal Popup */}
        {previewProp && !editingProp && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={() => setPreviewProp(null)}>
            <div style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E5E7EB',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: '#F9FAFB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🔍</span>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>Inspection de la Proposition</span>
                </div>
                <button
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setPreviewProp(null)}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {/* High Res Image Preview */}
                <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#111827', marginBottom: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img
                    src={previewProp.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                    alt={previewProp.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px' }}>
                    {previewProp.type === 'flash' ? '⚡ OFFRE FLASH' : '❤️ BRICK DEAL'}
                  </div>

                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      border: '1px solid #CBD5E1',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={handleOpenImageEdit}
                  >
                    📷 Modifier l'image
                  </button>

                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#111827', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>
                    {(previewProp as any).restaurants?.category ? `🏷️ ${(previewProp as any).restaurants.category.toUpperCase()}` : '🍽️ ÉTABLISSEMENT'}
                  </div>
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 6px 0', lineHeight: '1.3' }}>{previewProp.title}</h3>
                <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                  {previewProp.description || 'Aucune description fournie.'}
                </p>

                <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Établissement :</span>
                    <span style={{ fontWeight: '800', color: '#111827' }}>{(previewProp as any).restaurants?.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Adresse / Localisation :</span>
                    <span style={{ fontWeight: '700', color: '#2563EB' }}>📍 {(previewProp as any).restaurants?.address || 'Non spécifiée'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Soumis par (Agent) :</span>
                    <span style={{ fontWeight: '700', color: '#111827' }}>{(previewProp as any).profiles?.full_name || 'Direct Établissement'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Prix Normal Barré :</span>
                    <span style={{ fontWeight: '700', color: '#9CA3AF', textDecoration: 'line-through' }}>
                      {previewProp.price_normal ? `${Number(previewProp.price_normal).toLocaleString('fr-FR')} FCFA` : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Prix Client Proposé :</span>
                    <span style={{ fontWeight: '900', color: '#E11D48', fontSize: '18px' }}>
                      {Number(previewProp.type === 'flash' ? previewProp.price_promo : previewProp.price).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontWeight: '600' }}>Taux de Commission :</span>
                    <span style={{ fontWeight: '800', color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '10px' }}>{previewProp.commission_rate}%</span>
                  </div>
                  {previewProp.start_timestamp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontWeight: '600' }}>Période de Validité :</span>
                      <span style={{ fontWeight: '700', color: '#111827', fontSize: '12px' }}>
                        {new Date(previewProp.start_timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} ➔ {new Date(previewProp.end_timestamp || previewProp.start_timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Validation Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {previewProp.status !== 'validee' && (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', fontWeight: '800', backgroundColor: '#059669', borderColor: '#059669', fontSize: '14px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}
                      onClick={() => {
                        handleAction(previewProp.id, 'validee');
                        setPreviewProp(null);
                      }}
                    >
                      ✅ Valider et Publier la proposition
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ flex: '1', padding: '12px', fontSize: '13px', borderRadius: '12px', fontWeight: '700', borderColor: '#2563EB', color: '#2563EB' }}
                      onClick={() => startEdit(previewProp)}
                    >
                      ✏️ Modifier
                    </button>
                    {previewProp.status !== 'refusee' && (
                      <button
                        className="btn btn-secondary"
                        style={{ flex: '1', padding: '12px', fontSize: '13px', borderRadius: '12px', fontWeight: '700', backgroundColor: '#DC2626' }}
                        onClick={() => {
                          handleAction(previewProp.id, 'refusee');
                          setPreviewProp(null);
                        }}
                      >
                        ❌ Refuser
                      </button>
                    )}
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '12px', borderColor: '#FCA5A5', color: '#DC2626', backgroundColor: '#FEF2F2', fontWeight: '700', marginTop: '4px' }}
                    onClick={() => {
                      handleDeleteProposal(previewProp.id, previewProp.title);
                      setPreviewProp(null);
                    }}
                  >
                    🗑️ Supprimer définitivement l'offre
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal Popup */}
        {editingProp && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={() => setEditingProp(null)}>
            <div style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E5E7EB',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: '#F9FAFB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>✏️</span>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>Modifier la Proposition</span>
                </div>
                <button
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setEditingProp(null)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={saveEdit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Titre de l'offre</label>
                  <input type="text" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.title} onChange={(e) => setEditingProp({ ...editingProp, title: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Photo de l'offre (URL Image)</label>
                  <input type="text" className="form-input" placeholder="https://..." style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.photos?.[0] || ''} onChange={(e) => setEditingProp({ ...editingProp, photos: [e.target.value] })} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Description</label>
                  <textarea className="form-input" style={{ minHeight: '90px', borderRadius: '10px', padding: '10px 14px', fontFamily: 'inherit' }} value={editingProp.description} onChange={(e) => setEditingProp({ ...editingProp, description: e.target.value })} required />
                </div>

                {editingProp.type === 'flash' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Prix Promo (FCFA)</label>
                      <input type="number" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.price_promo ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price_promo: Number(e.target.value) })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Prix Normal Barré (FCFA)</label>
                      <input type="number" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.price_normal ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price_normal: Number(e.target.value) })} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Quantité Initiale</label>
                      <input type="number" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.quantity_initial ?? ''} onChange={(e) => setEditingProp({ ...editingProp, quantity_initial: Number(e.target.value) })} required />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Prix du Pack (FCFA)</label>
                    <input type="number" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.price ?? ''} onChange={(e) => setEditingProp({ ...editingProp, price: Number(e.target.value) })} required />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Taux de Commission (%)</label>
                  <input type="number" step="0.01" className="form-input" style={{ borderRadius: '10px', padding: '10px 14px' }} value={editingProp.commission_rate} onChange={(e) => setEditingProp({ ...editingProp, commission_rate: Number(e.target.value) })} required />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: '1', padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px' }}>Enregistrer les modifications</button>
                  <button type="button" className="btn btn-outline" style={{ flex: '1', padding: '12px', borderRadius: '12px', fontWeight: '700' }} onClick={() => setEditingProp(null)}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Ultra-Modern Delete Confirmation Modal */}
        {deleteConfirmProp && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={() => setDeleteConfirmProp(null)}>
            <div style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E5E7EB',
              padding: '28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Warning Icon Badge */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '32px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '16px'
              }}>
                🗑️
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 8px 0' }}>
                Supprimer cette offre ?
              </h3>
              
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir supprimer définitivement l'offre :
              </p>

              <div style={{
                width: '100%',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '12px 16px',
                fontWeight: '800',
                color: '#E11D48',
                fontSize: '14px',
                marginBottom: '24px',
                wordBreak: 'break-word'
              }}>
                "{deleteConfirmProp.title}"
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                  className="btn btn-outline"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '14px',
                    borderColor: '#D1D5DB',
                    color: '#374151'
                  }}
                  onClick={() => setDeleteConfirmProp(null)}
                >
                  Annuler
                </button>

                <button
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    backgroundColor: '#DC2626',
                    borderColor: '#DC2626',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                  onClick={confirmDeleteProposal}
                >
                  Oui, Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Edit Modal Prompt (Inspection View) */}
        {showImageEditPrompt && previewProp && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={() => setShowImageEditPrompt(false)}>
            <div style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column'
            }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: '#F9FAFB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📷</span>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>Modifier l'image de l'offre</span>
                </div>
                <button
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setShowImageEditPrompt(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInspectionImage} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Live Image Preview */}
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#111827', border: '1px solid #E5E7EB' }}>
                  <img
                    src={newImageInputUrl.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                    alt="Aperçu"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                    Aperçu en direct
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Saisir ou coller l'URL de l'image</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/photo-..."
                    style={{ borderRadius: '10px', padding: '12px 14px', fontSize: '13px' }}
                    value={newImageInputUrl}
                    onChange={(e) => setNewImageInputUrl(e.target.value)}
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '8px' }}>Exemples d'images haute définition :</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer', fontWeight: '700' }}
                      onClick={() => setNewImageInputUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800')}
                    >
                      🍔 Burger Gourmet
                    </button>
                    <button
                      type="button"
                      style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer', fontWeight: '700' }}
                      onClick={() => setNewImageInputUrl('https://images.unsplash.com/photo-1544025162-d76694265947?w=800')}
                    >
                      🍖 Grillades & Viande
                    </button>
                    <button
                      type="button"
                      style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer', fontWeight: '700' }}
                      onClick={() => setNewImageInputUrl('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800')}
                    >
                      🥂 Resto & Lounge
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', backgroundColor: '#059669', borderColor: '#059669' }}>
                    💾 Enregistrer la photo
                  </button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }} onClick={() => setShowImageEditPrompt(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
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
