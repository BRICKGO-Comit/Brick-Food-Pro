'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function RestoVentes() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState('Tout');
  const [filterPayment, setFilterPayment] = useState('Tous');

  // Stats
  const [totalVentes, setTotalVentes] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  
  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'restaurant' || !profile?.restaurant_id) {
        router.push('/login');
      } else {
        fetchOrders();
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchOrders = async () => {
    if (!profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, reservation_code, total_amount, commission_amount, status, payment_status, created_at, quantity,
          client:profiles!client_id(full_name),
          offer:offers!offer_id(title, type)
        `)
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      
    } catch (err) {
      console.error(err);
      alert('Erreur lors du chargement des ventes');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    // Period filter
    const orderDate = new Date(o.created_at);
    const today = new Date();
    
    if (filterPeriod === 'Aujourd\'hui') {
      if (orderDate.toDateString() !== today.toDateString()) return false;
    } else if (filterPeriod === 'Cette semaine') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      if (orderDate < firstDay) return false;
    } else if (filterPeriod === 'Ce mois') {
      if (orderDate.getMonth() !== today.getMonth() || orderDate.getFullYear() !== today.getFullYear()) return false;
    }

    // Payment filter
    if (filterPayment !== 'Tous' && o.payment_status !== filterPayment.toLowerCase()) return false;
    
    return true;
  });

  // Calculate totals based on filtered results
  useEffect(() => {
    let ventes = 0;
    let comms = 0;
    
    filteredOrders.forEach(o => {
      ventes += (o.total_amount || 0);
      comms += (o.commission_amount || 0);
    });
    
    setTotalVentes(ventes);
    setTotalCommissions(comms);
  }, [filteredOrders]);

  const netAPercevoir = totalVentes - totalCommissions;

  if (authLoading || (loading && orders.length === 0)) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="main-view" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Historique des Ventes</h1>
      
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total des Ventes (Brut)</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalVentes.toFixed(2)}€</div>
        </div>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Commissions BRICK</div>
          <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>- {totalCommissions.toFixed(2)}€</div>
        </div>
        <div className="metric-card panel" style={{ padding: '1.5rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div className="metric-header" style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Net à Percevoir</div>
          <div className="metric-value" style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{netAPercevoir.toFixed(2)}€</div>
        </div>
      </div>

      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="form-input"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option>Tout</option>
            <option>Aujourd'hui</option>
            <option>Cette semaine</option>
            <option>Ce mois</option>
          </select>
          <select 
            value={filterPayment} 
            onChange={(e) => setFilterPayment(e.target.value)}
            className="form-input"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option>Tous</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Aucune vente trouvée pour ces filtres.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Code</th>
                  <th style={{ padding: '12px 8px' }}>Client</th>
                  <th style={{ padding: '12px 8px' }}>Offre (Type)</th>
                  <th style={{ padding: '12px 8px' }}>Qté</th>
                  <th style={{ padding: '12px 8px' }}>Total</th>
                  <th style={{ padding: '12px 8px' }}>Commission</th>
                  <th style={{ padding: '12px 8px' }}>Net</th>
                  <th style={{ padding: '12px 8px' }}>Paiement</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const clientName = Array.isArray(order.client) ? order.client[0]?.full_name : order.client?.full_name;
                  const offerTitle = Array.isArray(order.offer) ? order.offer[0]?.title : order.offer?.title;
                  const offerType = Array.isArray(order.offer) ? order.offer[0]?.type : order.offer?.type;
                  
                  const net = (order.total_amount || 0) - (order.commission_amount || 0);

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>{new Date(order.created_at).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{order.reservation_code}</td>
                      <td style={{ padding: '12px 8px' }}>{clientName || '-'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        {offerTitle} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>({offerType})</span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>{order.quantity}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{order.total_amount?.toFixed(2)}€</td>
                      <td style={{ padding: '12px 8px', color: 'var(--warning)' }}>{order.commission_amount?.toFixed(2)}€</td>
                      <td style={{ padding: '12px 8px', color: 'var(--success)', fontWeight: 'bold' }}>{net.toFixed(2)}€</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`badge`} style={{
                          padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                          backgroundColor: order.payment_status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: order.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {order.payment_status === 'paid' ? 'Payé' : order.payment_status}
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
