'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../components/AuthProvider';
import type { OrderWithRelations, OrderHistoryWithActor } from '@/types/database';

const Colors = {
  primary: '#E30613',
  success: '#10B981',
};

export default function OrdersManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, OrderHistoryWithActor[]>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, profiles!client_id(*), restaurants(*), offers(*)')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as unknown as OrderWithRelations[]);
  }, []);

  // Charge l'historique d'une commande
  const fetchHistory = useCallback(async (orderId: string) => {
    const { data } = await supabase
      .from('order_history')
      .select('*, profiles!actor_id(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setHistoryMap((prev) => ({ ...prev, [orderId]: (data ?? []) as unknown as OrderHistoryWithActor[] }));
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  useEffect(() => {
    if (selectedOrder) fetchHistory(selectedOrder.id);
  }, [selectedOrder, fetchHistory]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error: updateError } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (updateError) {
      alert(`Erreur: ${updateError.message}`);
      return;
    }

    // Insère dans l'historique
    if (user) {
      await supabase.from('order_history').insert({
        order_id: id,
        action: newStatus,
        actor_id: user.id,
      });
    }

    fetchOrders();
    if (selectedOrder?.id === id) {
      fetchHistory(id);
      // Refresh selected order locally
      setSelectedOrder((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    const offerType = order.offers?.type;
    const matchType = typeFilter === 'all' || (typeFilter === 'flash' && offerType === 'flash') || (typeFilter === 'deal' && offerType === 'deal');
    return matchStatus && matchType;
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Supervision des Commandes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Visualisez les commandes en temps réel, gérez les litiges et suivez les flux logistiques.</p>
      </div>

      {/* Filter Section */}
      <div className="panel" style={{ flexDirection: 'row', gap: '16px', flexWrap: 'wrap', padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Statut :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Toutes</option>
            <option value="nouvelle">Nouvelles</option>
            <option value="en_preparation">En préparation</option>
            <option value="prete">Prêtes</option>
            <option value="terminee">Terminées</option>
            <option value="livree">Livrées</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Type d'offre :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="flash">⚡ Brick Flash</option>
            <option value="deal">❤️ Brick Deal</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        <div className="panel">
          {filteredOrders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune commande trouvée
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Commande</th>
                  <th>Client</th>
                  <th>Restaurant</th>
                  <th>Offre / Qté</th>
                  <th>Montant</th>
                  <th>Commission</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{order.reservation_code}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(order.created_at)}</div>
                    </td>
                    <td>{order.profiles?.full_name ?? '—'}</td>
                    <td>{order.restaurants?.name ?? '—'}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{order.offers?.title ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Qté: {order.quantity} | {order.delivery_mode}</div>
                    </td>
                    <td style={{ fontWeight: '700' }}>{Number(order.total_amount).toLocaleString('fr-FR')} F</td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>+{Number(order.commission_amount).toLocaleString('fr-FR')} F</td>
                    <td>
                      <span className={`badge ${order.status}`}>
                        {order.status === 'nouvelle' && 'Nouvelle'}
                        {order.status === 'en_preparation' && 'En préparation'}
                        {order.status === 'prete' && 'Prête'}
                        {order.status === 'terminee' && 'Terminée'}
                        {order.status === 'livree' && 'Livrée'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedOrder && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ fontSize: '16px' }}>Détail {selectedOrder.reservation_code}</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Client</span>
                <span style={{ display: 'block' }}>Nom : {selectedOrder.profiles?.full_name ?? '—'}</span>
                <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Tél : {selectedOrder.profiles?.phone ?? '—'}</span>
                <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Email : {selectedOrder.profiles?.email ?? '—'}</span>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Détails Offre</span>
                <span style={{ display: 'block', fontWeight: '600' }}>{selectedOrder.offers?.title ?? '—'}</span>
                <span style={{ display: 'block' }}>Restaurant : {selectedOrder.restaurants?.name ?? '—'}</span>
                <span style={{ display: 'block' }}>Type : {selectedOrder.offers?.type === 'flash' ? 'Brick Flash' : 'Brick Deal'}</span>
                <span style={{ display: 'block' }}>Qté : {selectedOrder.quantity} | Mode : {selectedOrder.delivery_mode}</span>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Finances</span>
                <span style={{ display: 'block', fontWeight: '700', color: 'var(--primary)', fontSize: '14px' }}>Montant : {Number(selectedOrder.total_amount).toLocaleString('fr-FR')} FCFA</span>
                <span style={{ display: 'block', fontWeight: '700', color: 'var(--success)' }}>Commission : +{Number(selectedOrder.commission_amount).toLocaleString('fr-FR')} FCFA</span>
                <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Paiement : {selectedOrder.payment_status}</span>
              </div>

              <div>
                <span style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Historique de Suivi</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginLeft: '6px' }}>
                  {(historyMap[selectedOrder.id] ?? []).map((h) => (
                    <div key={h.id} style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: Colors.primary }}></span>
                      <span style={{ fontWeight: '700', display: 'block' }}>
                        {h.action === 'creee' && 'Commande créée'}
                        {h.action === 'en_preparation' && 'En préparation'}
                        {h.action === 'prete' && 'Marquée prête'}
                        {h.action === 'terminee' && 'Marquée terminée'}
                        {h.action === 'livree' && 'Livrée'}
                        {!['creee', 'en_preparation', 'prete', 'terminee', 'livree'].includes(h.action) && h.action}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                        Par {h.profiles?.full_name ?? 'Système'} · {formatDate(h.created_at)}
                      </span>
                    </div>
                  ))}
                  {(historyMap[selectedOrder.id] ?? []).length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chargement de l'historique...</span>
                  )}
                </div>
              </div>

              {selectedOrder.status !== 'terminee' && selectedOrder.status !== 'livree' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {selectedOrder.status === 'nouvelle' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'en_preparation')}>
                      Lancer Préparation
                    </button>
                  )}
                  {selectedOrder.status === 'en_preparation' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px', backgroundColor: Colors.success }} onClick={() => handleUpdateStatus(selectedOrder.id, 'prete')}>
                      Marquer Prête
                    </button>
                  )}
                  {selectedOrder.status === 'prete' && (
                    <button className="btn btn-primary" style={{ flex: '1', fontSize: '12px', backgroundColor: 'black' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'terminee')}>
                      Terminer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
