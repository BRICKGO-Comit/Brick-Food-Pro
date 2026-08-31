'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function RestoDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [activeOffers, setActiveOffers] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'restaurant' || !profile?.restaurant_id) {
        router.push('/login');
      } else {
        fetchDashboardData(profile.restaurant_id);
        const unsubscribe = setupRealtime(profile.restaurant_id);
        return () => {
          unsubscribe();
        };
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchDashboardData = async (restaurantId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Today's orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayStr);
      
      if (todayError) throw todayError;

      setOrdersToday(todayOrders.length);
      setRevenueToday(todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0));

      // Active offers
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_published', true);
      
      if (offersError) throw offersError;
      setActiveOffers(offersData.length);

      // Pending orders
      const { data: pendingData, error: pendingError } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .in('status', ['nouvelle', 'en_preparation']);
      
      if (pendingError) throw pendingError;
      setPendingOrders(pendingData.length);

      // Recent 10 orders
      const { data: recentData, error: recentError } = await supabase
        .from('orders')
        .select(`
          id, reservation_code, total_amount, status, created_at, quantity,
          client:profiles!client_id(full_name),
          offer:offers!offer_id(title)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentError) throw recentError;
      setRecentOrders(recentData || []);

    } catch (err: any) {
      console.error(err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = (restaurantId: string) => {
    const channel = supabase
      .channel('resto-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          fetchDashboardData(restaurantId);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (authLoading || loading) return <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Chargement du tableau de bord...</div>;
  if (error) return <div className="p-8 text-center" style={{ color: 'var(--primary)' }}>{error}</div>;

  return (
    <div className="main-view" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Tableau de Bord</h1>
      
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Commandes du jour</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{ordersToday}</div>
        </div>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Chiffre d'affaires (jour)</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{revenueToday.toFixed(2)}€</div>
        </div>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Offres en ligne</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{activeOffers}</div>
        </div>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Commandes en attente</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{pendingOrders}</div>
        </div>
      </div>

      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 className="panel-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>Dernières Commandes</h2>
        {recentOrders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Aucune commande récente.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Code</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Client</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Offre</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Montant</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  let badgeBg = 'var(--bg-app)';
                  let badgeColor = 'var(--text-primary)';
                  
                  if (order.status === 'terminee') { badgeBg = 'var(--success-bg)'; badgeColor = 'var(--success)'; }
                  else if (order.status === 'nouvelle') { badgeBg = 'var(--info-bg)'; badgeColor = 'var(--info)'; }
                  else if (order.status === 'en_preparation') { badgeBg = 'var(--warning-bg)'; badgeColor = 'var(--warning)'; }

                  const clientName = Array.isArray(order.client) ? order.client[0]?.full_name : order.client?.full_name;
                  const offerTitle = Array.isArray(order.offer) ? order.offer[0]?.title : order.offer?.title;

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{new Date(order.created_at).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{order.reservation_code}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{clientName || 'Client inconnu'}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{offerTitle || 'Offre inconnue'}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{order.total_amount?.toFixed(2)}€</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`badge ${order.status}`} style={{
                          padding: '4px 8px', 
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {order.status === 'terminee' ? 'Terminée' : order.status === 'nouvelle' ? 'Nouvelle' : order.status === 'en_preparation' ? 'En préparation' : order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
