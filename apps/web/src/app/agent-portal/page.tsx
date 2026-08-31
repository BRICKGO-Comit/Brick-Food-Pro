'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function AgentDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [metrics, setMetrics] = useState({
    restaurantsCount: 0,
    offersCount: 0,
    commissions: 0,
    ordersCount: 0,
  });
  
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentOffers, setRecentOffers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'agent')) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;
    
    try {
      setDataLoading(true);
      const agentId = profile.id;
      
      const [
        { count: restaurantsCount },
        { count: offersCount },
        { data: ordersData, count: ordersCount },
        { data: offersData }
      ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
        supabase.from('orders').select('*, restaurants(name), offers(title)', { count: 'exact' }).eq('agent_id', agentId).order('created_at', { ascending: false }).limit(10),
        supabase.from('offers').select('*, restaurants(name)').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(5)
      ]);
      
      let commissions = 0;
      if (ordersData) {
        commissions = ordersData
          .filter(o => o.payment_status === 'paid')
          .reduce((sum, o) => sum + (Number(o.commission_amount) || 0), 0);
        setRecentOrders(ordersData);
      }
      
      if (offersData) {
        setRecentOffers(offersData);
      }
      
      setMetrics({
        restaurantsCount: restaurantsCount || 0,
        offersCount: offersCount || 0,
        commissions: commissions,
        ordersCount: ordersCount || 0
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData();
      
      const ordersSubscription = supabase
        .channel('agent-orders-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `agent_id=eq.${profile.id}`
          },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(ordersSubscription);
      };
    }
  }, [profile?.id]);

  if (loading || dataLoading) {
    return <div className="p-8 text-center">Chargement de votre espace...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord Agent</h1>
      
      <div className="metrics-grid mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="metric-header text-sm text-gray-500 mb-2">Restaurants affiliés</div>
          <div className="metric-value text-3xl font-bold">{metrics.restaurantsCount}</div>
        </div>
        <div className="metric-card bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="metric-header text-sm text-gray-500 mb-2">Offres soumises</div>
          <div className="metric-value text-3xl font-bold">{metrics.offersCount}</div>
        </div>
        <div className="metric-card bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="metric-header text-sm text-gray-500 mb-2">Commissions gagnées</div>
          <div className="metric-value text-3xl font-bold text-green-600">{metrics.commissions.toFixed(2)} €</div>
        </div>
        <div className="metric-card bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="metric-header text-sm text-gray-500 mb-2">Commandes générées</div>
          <div className="metric-value text-3xl font-bold">{metrics.ordersCount}</div>
        </div>
      </div>
      
      <div className="panels-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="panel-title text-xl font-semibold mb-4">Mes Dernières Commissions</h2>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune commande récente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="py-2 font-medium">Date</th>
                    <th className="font-medium">Restaurant</th>
                    <th className="font-medium">Total</th>
                    <th className="font-medium">Commission</th>
                    <th className="font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b last:border-0 py-2">
                      <td className="py-3">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>{order.restaurants?.name}</td>
                      <td>{order.total_amount} €</td>
                      <td className="font-semibold text-green-600">{order.commission_amount} €</td>
                      <td>
                        <span className={`badge ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded text-xs`}>
                          {order.payment_status === 'paid' ? 'Payée' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="panel bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="panel-title text-xl font-semibold mb-4">Mes Propositions Récentes</h2>
          {recentOffers.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune proposition récente.</p>
          ) : (
            <div className="space-y-4">
              {recentOffers.map(offer => {
                let badgeClass = 'bg-gray-100 text-gray-800';
                let statusText = offer.status;
                if (offer.status === 'en_attente') { badgeClass = 'bg-yellow-100 text-yellow-800'; statusText = 'En attente'; }
                if (offer.status === 'validee') { badgeClass = 'bg-green-100 text-green-800'; statusText = 'Validée'; }
                if (offer.status === 'refusee') { badgeClass = 'bg-red-100 text-red-800'; statusText = 'Refusée'; }
                if (offer.status === 'a_modifier') { badgeClass = 'bg-orange-100 text-orange-800'; statusText = 'À modifier'; }

                return (
                  <div key={offer.id} className="border border-gray-100 p-4 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{offer.title}</h3>
                        <p className="text-sm text-gray-600">{offer.restaurants?.name}</p>
                      </div>
                      <span className={`badge ${badgeClass} px-2 py-1 rounded text-xs font-medium`}>
                        {statusText}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Type: <span className="uppercase">{offer.type}</span> | Soumis le: {offer.created_at ? new Date(offer.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                    {offer.status === 'a_modifier' && offer.observation && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                        <strong>Observation admin:</strong> {offer.observation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
