'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../components/AuthProvider';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function StatisticsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');

  const [panierMoyen, setPanierMoyen] = useState(0);
  const [publishedOffers, setPublishedOffers] = useState(0);
  const [avgCommission, setAvgCommission] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; amount: number }[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<{ name: string; orders: number; sales: number }[]>([]);
  const [topAgents, setTopAgents] = useState<{ name: string; proposals: number; commission: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const now = new Date();
      const isWeek = timeframe === 'week';

      // Plage de dates
      const days = isWeek ? 7 : 30;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);

      // Toutes les commandes dans la plage
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, commission_amount, agent_id, restaurant_id, created_at, offers(type)')
        .gte('created_at', startDate.toISOString());

      const orders = ordersData ?? [];

      // Panier moyen
      const totalAmount = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      setPanierMoyen(orders.length > 0 ? totalAmount / orders.length : 0);

      // CA journalier (7 derniers jours)
      const revenueByDay: Record<number, number> = {};
      const labelByDay: Record<number, string> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        revenueByDay[d.getDay()] = 0;
        labelByDay[d.getDay()] = DAY_LABELS[d.getDay()];
      }
      orders.forEach((o: any) => {
        const d = new Date(o.created_at);
        const dow = d.getDay();
        if (dow in revenueByDay) {
          revenueByDay[dow] += Number(o.total_amount || 0);
        }
      });
      // Reconstruit dans l'ordre chronologique (du plus ancien au plus récent)
      const orderedDays: { day: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dow = d.getDay();
        orderedDays.push({ day: labelByDay[dow], amount: revenueByDay[dow] ?? 0 });
      }
      setDailyRevenue(orderedDays);

      // Offres publiées + commission moyenne
      const { data: offersData } = await supabase.from('offers').select('commission_rate, is_published');
      const published = (offersData ?? []).filter((o: any) => o.is_published).length;
      setPublishedOffers(published);
      const avgComm = offersData && offersData.length > 0
        ? offersData.reduce((sum, o: any) => sum + Number(o.commission_rate || 0), 0) / offersData.length
        : 0;
      setAvgCommission(avgComm);

      // Top restaurants (par CA)
      const restoMap: Record<string, { orders: number; sales: number }> = {};
      orders.forEach((o: any) => {
        const id = o.restaurant_id;
        if (!restoMap[id]) restoMap[id] = { orders: 0, sales: 0 };
        restoMap[id].orders++;
        restoMap[id].sales += Number(o.total_amount || 0);
      });
      const restoIds = Object.keys(restoMap);
      const { data: restos } = await supabase.from('restaurants').select('id, name').in('id', restoIds);
      const restoTop = (restos ?? []).map((r: any) => ({
        name: r.name,
        orders: restoMap[r.id]?.orders ?? 0,
        sales: restoMap[r.id]?.sales ?? 0,
      })).sort((a, b) => b.sales - a.sales).slice(0, 5);
      setTopRestaurants(restoTop);

      // Top agents (par commissions)
      const agentMap: Record<string, { commission: number }> = {};
      orders.forEach((o: any) => {
        const id = o.agent_id;
        if (!agentMap[id]) agentMap[id] = { commission: 0 };
        agentMap[id].commission += Number(o.commission_amount || 0);
      });
      const agentIds = Object.keys(agentMap);
      const { data: agentProfiles } = await supabase.from('profiles').select('id, full_name').in('id', agentIds);
      const { data: offersCount } = await supabase.from('offers').select('agent_id').in('agent_id', agentIds);
      const proposalCounts: Record<string, number> = {};
      (offersCount ?? []).forEach((o: any) => {
        proposalCounts[o.agent_id] = (proposalCounts[o.agent_id] || 0) + 1;
      });
      const agentTop = (agentProfiles ?? []).map((a: any) => ({
        name: a.full_name,
        proposals: proposalCounts[a.id] ?? 0,
        commission: agentMap[a.id]?.commission ?? 0,
      })).sort((a, b) => b.commission - a.commission).slice(0, 5);
      setTopAgents(agentTop);
    };

    fetchStats();
  }, [user, timeframe]);

  const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  const maxAmount = Math.max(...dailyRevenue.map((d) => d.amount), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Analyses & Statistiques</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Suivez l'évolution du volume d'affaires, des commissions et des performances commerciales.</p>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'week' ? 'white' : 'transparent', color: timeframe === 'week' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('week')}>
            Cette semaine
          </button>
          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'month' ? 'white' : 'transparent', color: timeframe === 'month' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('month')}>
            Ce mois
          </button>
        </div>
      </div>

      {/* Stats indicators grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Panier Moyen</span>
            <span>🛒</span>
          </div>
          <div className="metric-value">{formatFCFA(panierMoyen)}</div>
          <div className="metric-sub">Données en direct</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Offres Publiées</span>
            <span>🏷️</span>
          </div>
          <div className="metric-value">{publishedOffers}</div>
          <div className="metric-sub">Offres actives</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Commandes (période)</span>
            <span>📦</span>
          </div>
          <div className="metric-value">{dailyRevenue.reduce((s, d) => s + 0, 0)}</div>
          <div className="metric-sub">{timeframe === 'week' ? '7 derniers jours' : '30 derniers jours'}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Taux de commission moyen</span>
            <span>📊</span>
          </div>
          <div className="metric-value">{avgCommission.toFixed(2)} %</div>
          <div className="metric-sub" style={{ color: 'var(--info)' }}>Fixé par Brick Food</div>
        </div>
      </div>

      {/* SVG Bar Chart Panel */}
      <div className="panel" style={{ height: '340px' }}>
        <div className="panel-title">Évolution journalière du Chiffre d'Affaires (FCFA)</div>

        <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '16px 20px 0 20px', borderBottom: '1px solid var(--border)' }}>
          {dailyRevenue.map((d, index) => {
            const barHeightPercentage = (d.amount / maxAmount) * 90;
            return (
              <div key={index} style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>{(d.amount / 1000).toFixed(0)}k</span>
                <div style={{
                  width: '32px',
                  height: `${barHeightPercentage}%`,
                  backgroundColor: 'var(--primary)',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'height 0.5s ease-in-out',
                }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rankings Panels */}
      <div className="panels-grid">
        <div className="panel">
          <div className="panel-title">🥇 Top Restaurants Partenaires</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {topRestaurants.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune donnée</div>
            ) : (
              topRestaurants.map((resto, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '800', marginRight: '8px', color: 'var(--primary)' }}>#{index + 1}</span>
                    <span style={{ fontWeight: '700' }}>{resto.name}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{resto.orders} commandes</div>
                  </div>
                  <span style={{ fontWeight: '800', color: 'black' }}>{formatFCFA(resto.sales)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">👤 Top Agents Terrain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {topAgents.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune donnée</div>
            ) : (
              topAgents.map((agent, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '800', marginRight: '8px', color: 'var(--primary)' }}>#{index + 1}</span>
                    <span style={{ fontWeight: '700' }}>{agent.name}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{agent.proposals} propositions</div>
                  </div>
                  <span style={{ fontWeight: '800', color: 'var(--success)' }}>+{formatFCFA(agent.commission)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
