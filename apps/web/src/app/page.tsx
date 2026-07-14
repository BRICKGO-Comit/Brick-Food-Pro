'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './components/AuthProvider';
import type { OrderWithRelations } from '@/types/database';

interface DashboardStats {
  totalRestaurants: number;
  totalAgents: number;
  totalOrders: number;
  totalCA: number;
  salesDistribution: { flash: number; deals: number; classic: number };
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRestaurants: 0,
    totalAgents: 0,
    totalOrders: 0,
    totalCA: 0,
    salesDistribution: { flash: 0, deals: 0, classic: 0 },
  });
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);

  // Redirige vers /login si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Charge les statistiques depuis la base
  const fetchStats = async () => {
    const [{ count: totalRestaurants }, { count: totalAgents }, { count: totalOrders }] = await Promise.all([
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ]);

    // CA total
    const { data: caData } = await supabase.from('orders').select('total_amount');

    // Répartition flash / deal via jointure offers
    const { data: distData } = await supabase
      .from('orders')
      .select('offers(type)');

    let flash = 0;
    let deals = 0;
    let classic = 0;
    (distData ?? []).forEach((row: any) => {
      const t = row.offers?.type;
      if (t === 'flash') flash++;
      else if (t === 'deal') deals++;
      else classic++;
    });
    const total = flash + deals + classic || 1;

    const totalCA = (caData ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    setStats({
      totalRestaurants: totalRestaurants ?? 0,
      totalAgents: totalAgents ?? 0,
      totalOrders: totalOrders ?? 0,
      totalCA,
      salesDistribution: {
        flash: Math.round((flash / total) * 100),
        deals: Math.round((deals / total) * 100),
        classic: Math.round((classic / total) * 100),
      },
    });
  };

  // Charge les commandes récentes
  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, profiles!client_id(*), restaurants(*), offers(*)')
      .order('created_at', { ascending: false })
      .limit(6);
    setOrders((data ?? []) as unknown as OrderWithRelations[]);
  };

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchOrders();

    // Realtime : nouvelles commandes
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  const dist = stats.salesDistribution;

  return (
    <>
      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Restaurants partenaires</span>
            <span style={{ fontSize: '18px' }}>🏪</span>
          </div>
          <div className="metric-value">{stats.totalRestaurants}</div>
          <div className="metric-sub">Données en direct</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Agents commerciaux</span>
            <span style={{ fontSize: '18px' }}>👤</span>
          </div>
          <div className="metric-value">{stats.totalAgents}</div>
          <div className="metric-sub">Données en direct</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Commandes totales</span>
            <span style={{ fontSize: '18px' }}>🛍️</span>
          </div>
          <div className="metric-value">{stats.totalOrders}</div>
          <div className="metric-sub">Données en direct</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="metric-header">
            <span>Chiffre d'affaires global</span>
            <span style={{ fontSize: '18px' }}>💰</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{formatFCFA(stats.totalCA)}</div>
          <div className="metric-sub">Données en direct</div>
        </div>
      </div>

      {/* Panels Area */}
      <div className="panels-grid">
        {/* Real-time Orders */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', animation: 'pulse 1.5s infinite' }}></span>
            Commandes en temps réel
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune commande pour le moment
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Client</th>
                  <th>Restaurant</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ transition: 'var(--transition)' }}>
                    <td style={{ fontWeight: '600' }}>{order.reservation_code}</td>
                    <td>{order.profiles?.full_name ?? '—'}</td>
                    <td>{order.restaurants?.name ?? '—'}</td>
                    <td style={{ fontWeight: '500' }}>
                      {order.offers?.type === 'flash' ? 'Brick Flash' : 'Brick Deal'}
                    </td>
                    <td style={{ color: 'var(--primary)', fontWeight: '700' }}>{formatFCFA(Number(order.total_amount))}</td>
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

        {/* Sales distribution */}
        <div className="panel" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="panel-title" style={{ width: '100%', textAlign: 'left' }}>Répartition des ventes</div>

          {/* Custom SVG Donut Chart */}
          <div style={{ position: 'relative', width: '180px', height: '180px' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EBEBEB" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" strokeWidth="3"
                      strokeDasharray={`${dist.flash} ${100 - dist.flash}`} strokeDashoffset="0" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3"
                      strokeDasharray={`${dist.deals} ${100 - dist.deals}`} strokeDashoffset={`-${dist.flash}`} />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3"
                      strokeDasharray={`${dist.classic} ${100 - dist.classic}`} strokeDashoffset={`-${dist.flash + dist.deals}`} />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
              <span style={{ fontSize: '24px', fontWeight: '800' }}>{dist.flash}%</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Brick Flash</span>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
                <span>Brick Flash</span>
              </div>
              <span style={{ fontWeight: '700' }}>{dist.flash}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                <span>Brick Deals</span>
              </div>
              <span style={{ fontWeight: '700' }}>{dist.deals}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
                <span>Autres</span>
              </div>
              <span style={{ fontWeight: '700' }}>{dist.classic}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(227, 6, 19, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(227, 6, 19, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(227, 6, 19, 0); }
        }
      `}</style>
    </>
  );
}
