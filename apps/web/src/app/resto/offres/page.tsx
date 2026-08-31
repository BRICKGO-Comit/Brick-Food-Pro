'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function RestoOffres() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('Tous');
  const [filterStatus, setFilterStatus] = useState('Tous');

  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    type: 'flash',
    title: '',
    description: '',
    price_normal: '',
    price_promo: '',
    quantity_initial: '',
    quantity_remaining: '',
    start_timestamp: '',
    end_timestamp: '',
    pack_type: 'couple',
    price: '',
    capacity_persons: '',
    available_date: '',
    available_time: ''
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'restaurant' || !profile?.restaurant_id) {
        router.push('/login');
      } else {
        fetchOffers();
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchOffers = async () => {
    if (!profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_published: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setOffers(offers.map(o => o.id === id ? { ...o, is_published: !currentStatus } : o));
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    }
  };

  const openModal = (offer: any = null) => {
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        type: offer.type || 'flash',
        title: offer.title || '',
        description: offer.description || '',
        price_normal: offer.price_normal?.toString() || '',
        price_promo: offer.price_promo?.toString() || '',
        quantity_initial: offer.quantity_initial?.toString() || '',
        quantity_remaining: offer.quantity_remaining?.toString() || '',
        start_timestamp: offer.start_timestamp ? new Date(offer.start_timestamp).toISOString().slice(0, 16) : '',
        end_timestamp: offer.end_timestamp ? new Date(offer.end_timestamp).toISOString().slice(0, 16) : '',
        pack_type: offer.pack_type || 'couple',
        price: offer.price?.toString() || '',
        capacity_persons: offer.capacity_persons?.toString() || '',
        available_date: offer.available_date || '',
        available_time: offer.available_time || ''
      });
    } else {
      setEditingOffer(null);
      setFormData({
        type: 'flash', title: '', description: '', price_normal: '', price_promo: '',
        quantity_initial: '', quantity_remaining: '', start_timestamp: '', end_timestamp: '',
        pack_type: 'couple', price: '', capacity_persons: '', available_date: '', available_time: ''
      });
    }
    setShowModal(true);
  };

  const saveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      // Get the restaurant's agent_id
      const { data: restoData } = await supabase
        .from('restaurants')
        .select('agent_id')
        .eq('id', profile.restaurant_id)
        .single();

      const offerPayload: any = {
        restaurant_id: profile.restaurant_id,
        agent_id: restoData?.agent_id || null,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        status: 'en_attente', // Reset to pending approval
        is_published: false
      };

      if (formData.type === 'flash') {
        offerPayload.price_normal = parseFloat(formData.price_normal) || 0;
        offerPayload.price_promo = parseFloat(formData.price_promo) || 0;
        offerPayload.quantity_initial = parseInt(formData.quantity_initial) || 0;
        
        // If new offer, remaining = initial
        if (!editingOffer) {
          offerPayload.quantity_remaining = offerPayload.quantity_initial;
        } else {
          offerPayload.quantity_remaining = parseInt(formData.quantity_remaining) || 0;
        }

        if (formData.start_timestamp) offerPayload.start_timestamp = new Date(formData.start_timestamp).toISOString();
        if (formData.end_timestamp) offerPayload.end_timestamp = new Date(formData.end_timestamp).toISOString();
      } else {
        offerPayload.pack_type = formData.pack_type;
        offerPayload.price = parseFloat(formData.price) || 0;
        offerPayload.capacity_persons = parseInt(formData.capacity_persons) || 0;
        offerPayload.available_date = formData.available_date || null;
        offerPayload.available_time = formData.available_time || null;
      }

      if (editingOffer) {
        const { error } = await supabase.from('offers').update(offerPayload).eq('id', editingOffer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('offers').insert(offerPayload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter(o => {
    if (filterType !== 'Tous' && o.type !== filterType.toLowerCase()) return false;
    
    if (filterStatus === 'En ligne') return o.is_published === true;
    if (filterStatus === 'Hors ligne') return o.is_published === false;
    if (filterStatus === 'En attente') return o.status === 'en_attente';
    if (filterStatus === 'Refusée') return o.status === 'refusee';
    
    return true;
  });

  if (authLoading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="main-view" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Gestion des Offres</h1>
        <button 
          onClick={() => openModal()}
          className="btn btn-primary"
          style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Nouvelle Offre
        </button>
      </div>

      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="form-input"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option>Tous</option>
            <option>Flash</option>
            <option>Deal</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option>Tous</option>
            <option>En ligne</option>
            <option>Hors ligne</option>
            <option>En attente</option>
            <option>Refusée</option>
          </select>
        </div>

        {loading && offers.length === 0 ? (
          <p>Chargement des offres...</p>
        ) : filteredOffers.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Aucune offre trouvée.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Titre</th>
                  <th style={{ padding: '12px 8px' }}>Prix</th>
                  <th style={{ padding: '12px 8px' }}>Stock</th>
                  <th style={{ padding: '12px 8px' }}>Statut Admin</th>
                  <th style={{ padding: '12px 8px' }}>En Ligne</th>
                  <th style={{ padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>{offer.type}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{offer.title}</td>
                    <td style={{ padding: '12px 8px' }}>{offer.type === 'flash' ? offer.price_promo : offer.price}€</td>
                    <td style={{ padding: '12px 8px' }}>
                      {offer.type === 'flash' ? `${offer.quantity_remaining} / ${offer.quantity_initial}` : '-'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`badge ${offer.status}`} style={{
                        padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                        backgroundColor: offer.status === 'validee' ? 'var(--success-bg)' : 
                                         offer.status === 'refusee' ? 'var(--primary-light)' : 'var(--warning-bg)',
                        color: offer.status === 'validee' ? 'var(--success)' : 
                               offer.status === 'refusee' ? 'var(--primary)' : 'var(--warning)',
                      }}>
                        {offer.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button 
                        onClick={() => togglePublish(offer.id, offer.is_published)}
                        disabled={offer.status !== 'validee'}
                        style={{
                          padding: '4px 12px', borderRadius: 'var(--radius-lg)', border: 'none', cursor: offer.status !== 'validee' ? 'not-allowed' : 'pointer',
                          backgroundColor: offer.is_published ? 'var(--success)' : 'var(--text-secondary)',
                          color: 'white', opacity: offer.status !== 'validee' ? 0.5 : 1
                        }}
                      >
                        {offer.is_published ? 'OUI' : 'NON'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button 
                        onClick={() => openModal(offer)}
                        style={{ padding: '6px 12px', background: 'var(--info-bg)', color: 'var(--info)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
            </h2>
            
            <form onSubmit={saveOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Type d'offre</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  disabled={!!editingOffer}
                >
                  <option value="flash">Vente Flash</option>
                  <option value="deal">Deal</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Titre</label>
                <input 
                  required type="text" value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  required rows={3} value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              {formData.type === 'flash' ? (
                <>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Prix Normal (€)</label>
                      <input required type="number" step="0.01" value={formData.price_normal} onChange={e => setFormData({...formData, price_normal: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Prix Promo (€)</label>
                      <input required type="number" step="0.01" value={formData.price_promo} onChange={e => setFormData({...formData, price_promo: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Quantité Totale</label>
                      <input required type="number" value={formData.quantity_initial} onChange={e => setFormData({...formData, quantity_initial: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    {editingOffer && (
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Stock Restant</label>
                        <input required type="number" value={formData.quantity_remaining} onChange={e => setFormData({...formData, quantity_remaining: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Début</label>
                      <input type="datetime-local" value={formData.start_timestamp} onChange={e => setFormData({...formData, start_timestamp: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Fin</label>
                      <input type="datetime-local" value={formData.end_timestamp} onChange={e => setFormData({...formData, end_timestamp: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Type de Pack</label>
                    <select value={formData.pack_type} onChange={e => setFormData({...formData, pack_type: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <option value="couple">Couple</option>
                      <option value="famille">Famille</option>
                      <option value="anniversaire">Anniversaire</option>
                      <option value="vip">VIP</option>
                      <option value="business">Business</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Prix (€)</label>
                      <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Capacité (personnes)</label>
                      <input required type="number" value={formData.capacity_persons} onChange={e => setFormData({...formData, capacity_persons: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Date dispo (Optionnel)</label>
                      <input type="date" value={formData.available_date} onChange={e => setFormData({...formData, available_date: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Heure dispo (Optionnel)</label>
                      <input type="time" value={formData.available_time} onChange={e => setFormData({...formData, available_time: e.target.value})} className="form-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                Note : Toute modification repassera l'offre en statut "En attente" pour validation par l'administration.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
