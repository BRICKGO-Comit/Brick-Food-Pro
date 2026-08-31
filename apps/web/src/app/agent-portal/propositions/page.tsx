'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AgentPropositions() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRestaurantId = searchParams.get('restaurant_id');
  
  const [offers, setOffers] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const initialFormState = {
    restaurant_id: initialRestaurantId || '',
    type: 'flash' as 'flash' | 'deal',
    title: '',
    description: '',
    price_normal: '',
    price_promo: '',
    quantity_initial: '',
    start_timestamp: '',
    end_timestamp: '',
    pack_type: 'couple',
    price: '',
    capacity_persons: '',
    available_date: '',
    available_time: '',
    observation: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'agent')) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  const loadData = async () => {
    if (!profile?.id) return;
    try {
      setDataLoading(true);
      const [offersRes, restaurantsRes] = await Promise.all([
        supabase.from('offers').select('*, restaurants(name)').eq('agent_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('restaurants').select('id, name').eq('agent_id', profile.id)
      ]);
      
      if (offersRes.error) throw offersRes.error;
      if (restaurantsRes.error) throw restaurantsRes.error;
      
      setOffers(offersRes.data || []);
      setRestaurants(restaurantsRes.data || []);
      
      if (initialRestaurantId && !showModal) {
        setFormData(prev => ({ ...prev, restaurant_id: initialRestaurantId }));
        setShowModal(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const handleEdit = (offer: any) => {
    setEditingOfferId(offer.id);
    setFormData({
      restaurant_id: offer.restaurant_id || '',
      type: offer.type || 'flash',
      title: offer.title || '',
      description: offer.description || '',
      price_normal: offer.price_normal?.toString() || '',
      price_promo: offer.price_promo?.toString() || '',
      quantity_initial: offer.quantity_initial?.toString() || '',
      start_timestamp: offer.start_timestamp ? new Date(offer.start_timestamp).toISOString().slice(0, 16) : '',
      end_timestamp: offer.end_timestamp ? new Date(offer.end_timestamp).toISOString().slice(0, 16) : '',
      pack_type: offer.pack_type || 'couple',
      price: offer.price?.toString() || '',
      capacity_persons: offer.capacity_persons?.toString() || '',
      available_date: offer.available_date || '',
      available_time: offer.available_time || '',
      observation: offer.observation || ''
    });
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingOfferId(null);
    setFormData(initialFormState);
    if (restaurants.length > 0 && !initialFormState.restaurant_id) {
      setFormData(prev => ({ ...prev, restaurant_id: restaurants[0].id }));
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    setFormLoading(true);
    try {
      const payload: any = {
        agent_id: profile.id,
        restaurant_id: formData.restaurant_id,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        status: 'en_attente',
        commission_rate: 20
      };

      if (formData.type === 'flash') {
        payload.price_normal = parseFloat(formData.price_normal);
        payload.price_promo = parseFloat(formData.price_promo);
        payload.quantity_initial = parseInt(formData.quantity_initial, 10);
        payload.quantity_remaining = parseInt(formData.quantity_initial, 10);
        payload.start_timestamp = new Date(formData.start_timestamp).toISOString();
        payload.end_timestamp = new Date(formData.end_timestamp).toISOString();
      } else {
        payload.pack_type = formData.pack_type;
        payload.price = parseFloat(formData.price);
        payload.capacity_persons = parseInt(formData.capacity_persons, 10);
        payload.available_date = formData.available_date;
        payload.available_time = formData.available_time;
      }

      let error;
      if (editingOfferId) {
        const res = await supabase.from('offers').update(payload).eq('id', editingOfferId);
        error = res.error;
      } else {
        const res = await supabase.from('offers').insert(payload);
        error = res.error;
      }

      if (error) throw error;
      
      setNotification({ message: 'Votre proposition a été soumise pour validation', type: 'success' });
      setShowModal(false);
      loadData();
      
      setTimeout(() => setNotification(null), 4000);
    } catch (error: any) {
      setNotification({ message: error.message || 'Erreur lors de la soumission.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredOffers = useMemo(() => {
    if (statusFilter === 'all') return offers;
    return offers.filter(o => o.status === statusFilter);
  }, [offers, statusFilter]);

  const discountPercent = useMemo(() => {
    if (formData.type !== 'flash' || !formData.price_normal || !formData.price_promo) return 0;
    const normal = parseFloat(formData.price_normal);
    const promo = parseFloat(formData.price_promo);
    if (normal <= 0 || promo >= normal) return 0;
    return Math.round(((normal - promo) / normal) * 100);
  }, [formData.price_normal, formData.price_promo, formData.type]);

  if (loading || dataLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Propositions d'Offres</h1>
        <button 
          className="btn btn-primary bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
          onClick={handleOpenNew}
        >
          + Nouvelle Proposition
        </button>
      </div>

      {notification && (
        <div className={`mb-4 p-4 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto">
        <button className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('all')}>Toutes</button>
        <button className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'en_attente' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('en_attente')}>En attente</button>
        <button className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'validee' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('validee')}>Validées</button>
        <button className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'a_modifier' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('a_modifier')}>À modifier</button>
        <button className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'refusee' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('refusee')}>Refusées</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="data-table w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Titre</th>
              <th className="p-4 font-medium text-gray-600">Restaurant</th>
              <th className="p-4 font-medium text-gray-600">Type</th>
              <th className="p-4 font-medium text-gray-600">Statut</th>
              <th className="p-4 font-medium text-gray-600">Date</th>
              <th className="p-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOffers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucune proposition trouvée.</td></tr>
            ) : (
              filteredOffers.map(offer => {
                let badgeClass = 'bg-gray-100 text-gray-800';
                let statusText = offer.status;
                if (offer.status === 'en_attente') { badgeClass = 'bg-yellow-100 text-yellow-800'; statusText = 'En attente'; }
                if (offer.status === 'validee') { badgeClass = 'bg-green-100 text-green-800'; statusText = 'Validée'; }
                if (offer.status === 'refusee') { badgeClass = 'bg-red-100 text-red-800'; statusText = 'Refusée'; }
                if (offer.status === 'a_modifier') { badgeClass = 'bg-orange-100 text-orange-800'; statusText = 'À modifier'; }

                return (
                  <React.Fragment key={offer.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{offer.title}</td>
                      <td className="p-4 text-gray-600">{offer.restaurants?.name}</td>
                      <td className="p-4 uppercase text-xs font-semibold">{offer.type}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>{statusText}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{new Date(offer.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4">
                        {offer.status === 'a_modifier' && (
                          <button onClick={() => handleEdit(offer)} className="text-sm text-blue-600 hover:underline font-medium">Modifier</button>
                        )}
                      </td>
                    </tr>
                    {offer.status === 'a_modifier' && offer.observation && (
                      <tr className="bg-orange-50 border-b">
                        <td colSpan={6} className="p-3 text-sm text-orange-800 pl-8">
                          <span className="font-bold">Remarque modérateur :</span> {offer.observation}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editingOfferId ? 'Modifier la proposition' : 'Nouvelle Proposition'}</h2>
            
            {editingOfferId && formData.observation && (
              <div className="mb-6 p-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-sm">
                <strong>À corriger :</strong> {formData.observation}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant *</label>
                <select required className="w-full p-2 border rounded" value={formData.restaurant_id} onChange={e => setFormData({...formData, restaurant_id: e.target.value})}>
                  <option value="" disabled>Sélectionner un restaurant</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'offre *</label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`border p-4 rounded cursor-pointer transition ${formData.type === 'flash' ? 'border-red-500 bg-red-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setFormData({...formData, type: 'flash'})}
                  >
                    <div className="font-bold mb-1 flex items-center gap-2">
                      <input type="radio" checked={formData.type === 'flash'} readOnly className="accent-red-600" /> Flash
                    </div>
                    <p className="text-xs text-gray-600">Offre à durée limitée avec forte réduction et quantité restreinte.</p>
                  </div>
                  <div 
                    className={`border p-4 rounded cursor-pointer transition ${formData.type === 'deal' ? 'border-red-500 bg-red-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setFormData({...formData, type: 'deal'})}
                  >
                    <div className="font-bold mb-1 flex items-center gap-2">
                      <input type="radio" checked={formData.type === 'deal'} readOnly className="accent-red-600" /> Deal
                    </div>
                    <p className="text-xs text-gray-600">Forfait/Menu spécial pour une date/heure précise.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'offre *</label>
                  <input required type="text" className="w-full p-2 border rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea required rows={3} className="w-full p-2 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
              </div>

              {formData.type === 'flash' ? (
                <div className="bg-gray-50 p-4 rounded border mb-6">
                  <h3 className="font-medium mb-3">Détails Flash</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prix Normal (€) *</label>
                      <input required type="number" step="0.01" min="0" className="w-full p-2 border rounded" value={formData.price_normal} onChange={e => setFormData({...formData, price_normal: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prix Promo (€) *</label>
                      <input required type="number" step="0.01" min="0" className="w-full p-2 border rounded" value={formData.price_promo} onChange={e => setFormData({...formData, price_promo: e.target.value})} />
                    </div>
                  </div>
                  {discountPercent > 0 && (
                    <div className="mb-4 text-sm font-bold text-green-600 bg-green-50 p-2 rounded inline-block">
                      Réduction calculée : -{discountPercent}%
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantité *</label>
                      <input required type="number" min="1" className="w-full p-2 border rounded" value={formData.quantity_initial} onChange={e => setFormData({...formData, quantity_initial: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Début (Date & Heure) *</label>
                      <input required type="datetime-local" className="w-full p-2 border rounded" value={formData.start_timestamp} onChange={e => setFormData({...formData, start_timestamp: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fin (Date & Heure) *</label>
                      <input required type="datetime-local" className="w-full p-2 border rounded" value={formData.end_timestamp} onChange={e => setFormData({...formData, end_timestamp: e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded border mb-6">
                  <h3 className="font-medium mb-3">Détails Deal</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type de Pack *</label>
                      <select required className="w-full p-2 border rounded" value={formData.pack_type} onChange={e => setFormData({...formData, pack_type: e.target.value})}>
                        <option value="couple">Couple</option>
                        <option value="famille">Famille</option>
                        <option value="anniversaire">Anniversaire</option>
                        <option value="vip">VIP</option>
                        <option value="business">Business</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Capacité (personnes) *</label>
                      <input required type="number" min="1" className="w-full p-2 border rounded" value={formData.capacity_persons} onChange={e => setFormData({...formData, capacity_persons: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prix Total (€) *</label>
                      <input required type="number" step="0.01" min="0" className="w-full p-2 border rounded" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date disponible *</label>
                      <input required type="date" className="w-full p-2 border rounded" value={formData.available_date} onChange={e => setFormData({...formData, available_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Heure disponible *</label>
                      <input required type="time" className="w-full p-2 border rounded" value={formData.available_time} onChange={e => setFormData({...formData, available_time: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="px-4 py-2 border rounded hover:bg-gray-50" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                  {formLoading ? 'Soumission...' : 'Soumettre la proposition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
