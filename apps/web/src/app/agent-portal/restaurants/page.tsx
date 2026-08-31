'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function AgentRestaurants() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', address: '', phone: '', description: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [restaurantDetails, setRestaurantDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'agent')) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  const loadRestaurants = async () => {
    if (!profile?.id) return;
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          offers(id, is_published, status),
          orders(id, total_amount, commission_amount)
        `)
        .eq('agent_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadRestaurants();
    }
  }, [profile?.id]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    setAddLoading(true);
    try {
      const { error } = await supabase.from('restaurants').insert({
        name: addForm.name,
        address: addForm.address,
        phone: addForm.phone,
        description: addForm.description,
        agent_id: profile.id
      });
      
      if (error) throw error;
      
      setNotification({ message: 'Restaurant ajouté avec succès.', type: 'success' });
      setShowAddModal(false);
      setAddForm({ name: '', address: '', phone: '', description: '' });
      loadRestaurants();
      
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ message: error.message || "Erreur lors de l'ajout.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setAddLoading(false);
    }
  };

  const openDetails = async (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setDetailsLoading(true);
    try {
      // Calculate stats based on pre-fetched data or fetch more specifics if needed
      const offers = restaurant.offers || [];
      const orders = restaurant.orders || [];
      
      const totalOrders = orders.length;
      const totalCA = orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const totalCommissions = orders.reduce((sum: number, o: any) => sum + (Number(o.commission_amount) || 0), 0);
      
      setRestaurantDetails({
        ...restaurant,
        offersList: offers,
        stats: { totalOrders, totalCA, totalCommissions }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || dataLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mon Portefeuille Restaurants</h1>
        <button 
          className="btn btn-primary bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
          onClick={() => setShowAddModal(true)}
        >
          + Ajouter un restaurant
        </button>
      </div>

      {notification && (
        <div className={`mb-4 p-4 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <input 
          type="text"
          placeholder="Rechercher un restaurant par nom..."
          className="w-full max-w-md p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredRestaurants.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow">
          Aucun restaurant trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map(restaurant => {
            const hasActiveOffers = (restaurant.offers || []).some((o: any) => o.is_published && o.status === 'validee');
            const totalOrders = (restaurant.orders || []).length;
            const caTotal = (restaurant.orders || []).reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

            return (
              <div 
                key={restaurant.id} 
                className="bg-white p-5 rounded-lg shadow border border-gray-100 cursor-pointer hover:shadow-md transition"
                onClick={() => openDetails(restaurant)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{restaurant.name}</h3>
                  {hasActiveOffers && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">Actif</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  <p>📍 {restaurant.address}</p>
                  <p>📞 {restaurant.phone}</p>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Offres</div>
                    <div className="font-semibold">{restaurant.offers?.length || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Commandes</div>
                    <div className="font-semibold">{totalOrders}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">CA Généré</div>
                    <div className="font-semibold text-green-600">{caTotal.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Ajouter un nouveau restaurant</h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group mb-4">
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Nom du restaurant *</label>
                <input required type="text" className="form-input w-full p-2 border rounded" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                <input required type="text" className="form-input w-full p-2 border rounded" value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input required type="tel" className="form-input w-full p-2 border rounded" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} />
              </div>
              <div className="form-group mb-6">
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="form-input w-full p-2 border rounded" rows={3} value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-outline px-4 py-2 border rounded hover:bg-gray-50" onClick={() => setShowAddModal(false)}>Annuler</button>
                <button type="submit" disabled={addLoading} className="btn btn-primary px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                  {addLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedRestaurant.name}</h2>
                <p className="text-gray-600">{selectedRestaurant.address} • {selectedRestaurant.phone}</p>
              </div>
              <button className="text-gray-500 hover:text-black font-bold text-xl" onClick={() => setSelectedRestaurant(null)}>×</button>
            </div>
            
            {detailsLoading ? (
              <div className="py-10 text-center">Chargement des détails...</div>
            ) : (
              restaurantDetails && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded text-center border">
                      <div className="text-sm text-gray-500">Commandes</div>
                      <div className="text-2xl font-bold">{restaurantDetails.stats.totalOrders}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded text-center border">
                      <div className="text-sm text-gray-500">CA Total</div>
                      <div className="text-2xl font-bold">{restaurantDetails.stats.totalCA.toFixed(2)} €</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded text-center border border-green-100">
                      <div className="text-sm text-green-700">Commissions générées</div>
                      <div className="text-2xl font-bold text-green-700">{restaurantDetails.stats.totalCommissions.toFixed(2)} €</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-lg">Offres ({restaurantDetails.offersList.length})</h3>
                    </div>
                    {restaurantDetails.offersList.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune offre pour ce restaurant.</p>
                    ) : (
                      <div className="border rounded divide-y">
                        {restaurantDetails.offersList.map((offer: any) => (
                          <div key={offer.id} className="p-3 flex justify-between items-center bg-white">
                            <div>
                              <span className="font-medium text-sm">Offre #{offer.id.substring(0,6)}</span>
                            </div>
                            <div>
                              <span className={`px-2 py-1 rounded text-xs ${offer.status === 'validee' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {offer.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button 
                      className="btn btn-primary bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      onClick={() => router.push(`/agent-portal/propositions?restaurant_id=${selectedRestaurant.id}`)}
                    >
                      Créer une offre pour ce restaurant
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
