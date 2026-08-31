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
  const [panierMoyenDiff, setPanierMoyenDiff] = useState(0);
  const [publishedOffers, setPublishedOffers] = useState(0);
  const [avgCommission, setAvgCommission] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; amount: number }[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<{ name: string; orders: number; sales: number }[]>([]);
  const [topAgents, setTopAgents] = useState<{ name: string; proposals: number; commission: number }[]>([]);
  
  // Nouveaux states
  const [salesDist, setSalesDist] = useState({ flash: 0, deals: 0 });
  const [topOffers, setTopOffers] = useState<{ title: string; count: number }[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const now = new Date();
      const isWeek = timeframe === 'week';
      const days = isWeek ? 7 : 30;
      
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);

      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      // Fetch active orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, commission_amount, agent_id, restaurant_id, offer_id, created_at, offers(type, title)')
        .gte('created_at', previousStartDate.toISOString());

      const allOrders = ordersData ?? [];
      
      // Split into current and previous period
      const currentOrders = allOrders.filter((o: any) => new Date(o.created_at) >= startDate);
      const previousOrders = allOrders.filter((o: any) => new Date(o.created_at) < startDate);

      setOrdersCount(currentOrders.length);

      // Panier moyen
      const currentTotalAmount = currentOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const currentPanierMoyen = currentOrders.length > 0 ? currentTotalAmount / currentOrders.length : 0;
      setPanierMoyen(currentPanierMoyen);

      const previousTotalAmount = previousOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const previousPanierMoyen = previousOrders.length > 0 ? previousTotalAmount / previousOrders.length : 0;
      
      if (previousPanierMoyen === 0) {
        setPanierMoyenDiff(currentPanierMoyen > 0 ? 100 : 0);
      } else {
        setPanierMoyenDiff(((currentPanierMoyen - previousPanierMoyen) / previousPanierMoyen) * 100);
      }

      // Sales distribution (Flash vs Deals)
      let flash = 0; let deals = 0;
      currentOrders.forEach((o: any) => {
        if (o.offers?.type === 'flash') flash++;
        if (o.offers?.type === 'deal') deals++;
      });
      const totalDist = flash + deals || 1;
      setSalesDist({ flash: Math.round((flash/totalDist)*100), deals: Math.round((deals/totalDist)*100) });

      // Top Offers
      const offerMap: Record<string, { count: number, title: string }> = {};
      currentOrders.forEach((o: any) => {
        const title = o.offers?.title || 'Offre inconnue';
        if (!offerMap[title]) offerMap[title] = { count: 0, title };
        offerMap[title].count++;
      });
      const topOffersArr = Object.values(offerMap).sort((a, b) => b.count - a.count).slice(0, 5);
      setTopOffers(topOffersArr);

      // CA journalier (7 derniers jours toujours pour le graph)
      const revenueByDay: Record<number, number> = {};
      const labelByDay: Record<number, string> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        revenueByDay[d.getDay()] = 0;
        labelByDay[d.getDay()] = DAY_LABELS[d.getDay()];
      }
      currentOrders.filter((o:any) => {
        const d = new Date(o.created_at);
        return (new Date().getTime() - d.getTime()) <= 7 * 24 * 3600 * 1000;
      }).forEach((o: any) => {
        const dow = new Date(o.created_at).getDay();
        if (dow in revenueByDay) revenueByDay[dow] += Number(o.total_amount || 0);
      });
      const orderedDays: { day: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
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
      currentOrders.forEach((o: any) => {
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
      currentOrders.forEach((o: any) => {
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

  const handleExport = () => {
    setExporting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const csvLines = [
        "Rapport Complet des Statistiques",
        `Periode;${timeframe === 'week' ? '7 derniers jours' : '30 derniers jours'}`,
        "",
        "Metriques Globales",
        `Panier Moyen;${panierMoyen.toFixed(2)} FCFA`,
        `Evolution Panier Moyen;${panierMoyenDiff.toFixed(2)}%`,
        `Offres Publiees;${publishedOffers}`,
        `Commandes;${ordersCount}`,
        `Taux de commission moyen;${avgCommission.toFixed(2)}%`,
        `Taux de conversion approximatif;${publishedOffers > 0 ? ((ordersCount/publishedOffers)*100).toFixed(2) : 0}%`,
        "",
        "Repartition Ventes",
        `Brick Flash;${salesDist.flash}%`,
        `Brick Deals;${salesDist.deals}%`,
        "",
        "Revenu Journalier (7 derniers jours)",
        "Jour;Montant (FCFA)",
        ...dailyRevenue.map(d => `${d.day};${d.amount}`),
        "",
        "Top Restaurants",
        "Nom;Commandes;Chiffre d'Affaires (FCFA)",
        ...topRestaurants.map(r => `"${r.name}";${r.orders};${r.sales}`),
        "",
        "Top Offres",
        "Titre;Ventes",
        ...topOffers.map(o => `"${o.title}";${o.count}`),
        "",
        "Top Agents",
        "Nom;Propositions;Commissions Generees (FCFA)",
        ...topAgents.map(a => `"${a.name}";${a.proposals};${a.commission}`)
      ];

      const csvContent = "\uFEFF" + csvLines.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statistiques_brickdeal_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  const maxAmount = Math.max(...dailyRevenue.map((d) => d.amount), 1);
  const conversionRate = publishedOffers > 0 ? (ordersCount / publishedOffers) * 100 : 0;

  // Function to mix colors for the chart
  const getGradientColor = (percentage: number) => {
    // Red (#E30613) to Green (#10B981)
    return `linear-gradient(to top, #E30613, #10B981 ${percentage}%)`; // simple approximation, better to use CSS variables if needed, or specific gradient
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Analyses & Statistiques</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Suivez l'évolution du volume d'affaires, des commissions et des performances commerciales.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
            <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'week' ? 'white' : 'transparent', color: timeframe === 'week' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('week')}>
              Cette semaine
            </button>
            <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: timeframe === 'month' ? 'white' : 'transparent', color: timeframe === 'month' ? 'black' : 'var(--text-secondary)' }} onClick={() => setTimeframe('month')}>
              Ce mois
            </button>
          </div>
          <button className="btn btn-outline" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {exporting ? <span className="spinner"></span> : '📥'} Rapport Complet
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div className="metric-value">{formatFCFA(panierMoyen)}</div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: panierMoyenDiff >= 0 ? 'var(--success)' : 'var(--primary)' }}>
              {panierMoyenDiff >= 0 ? '↑' : '↓'} {Math.abs(panierMoyenDiff).toFixed(1)}%
            </span>
          </div>
          <div className="metric-sub">vs période précédente</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Taux de conversion</span>
            <span>🎯</span>
          </div>
          <div className="metric-value">{conversionRate.toFixed(1)} %</div>
          <div className="metric-sub">Commandes / Offres publiées</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Commandes (période)</span>
            <span>📦</span>
          </div>
          <div className="metric-value">{ordersCount}</div>
          <div className="metric-sub">{timeframe === 'week' ? '7 derniers jours' : '30 derniers jours'}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Taux de commission moyen</span>
            <span>📊</span>
          </div>
          <div className="metric-value">{avgCommission.toFixed(2)} %</div>
          <div className="metric-sub" style={{ color: 'var(--info)' }}>Fixé par BRICK DEAL</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Animated CSS Bar Chart Panel */}
        <div className="panel" style={{ height: '340px' }}>
          <div className="panel-title">Évolution journalière du Chiffre d'Affaires (FCFA)</div>

          <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '16px 20px 0 20px', borderBottom: '1px solid var(--border)' }}>
            {dailyRevenue.map((d, index) => {
              const barHeightPercentage = (d.amount / maxAmount) * 90;
              // Mix color based on percentage
              const r = Math.round(227 - (227 - 16) * (barHeightPercentage / 100));
              const g = Math.round(6 + (185 - 6) * (barHeightPercentage / 100));
              const b = Math.round(19 + (129 - 19) * (barHeightPercentage / 100));
              const barColor = `rgb(${r}, ${g}, ${b})`;

              return (
                <div key={index} className="chart-bar-container" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <span className="chart-tooltip" style={{ fontSize: '11px', fontWeight: '700', color: barColor }}>{formatFCFA(d.amount)}</span>
                  <div className="chart-bar" style={{
                    width: '32px',
                    '--target-height': `${barHeightPercentage}%`,
                    backgroundColor: barColor,
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  } as any} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Circular Chart Panel */}
        <div className="panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="panel-title" style={{ width: '100%', textAlign: 'left', marginBottom: '24px' }}>Répartition des offres</div>
          <div className="donut-container" style={{
             '--flash-perc': `${salesDist.flash}%`,
             '--deals-perc': `${salesDist.deals}%`
          } as any}>
            <div className="donut-hole">
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{ordersCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Commandes</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#E30613' }}></span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Flash ({salesDist.flash}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Deals ({salesDist.deals}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings Panels */}
      <div className="panels-grid">
        <div className="panel">
          <div className="panel-title">🔥 Top 5 Offres</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {topOffers.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune donnée</div>
            ) : (
              topOffers.map((offer, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '800', marginRight: '8px', color: 'var(--primary)' }}>#{index + 1}</span>
                    <span style={{ fontWeight: '700' }}>{offer.title}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: 'black' }}>{offer.count} ventes</span>
                </div>
              ))
            )}
          </div>
        </div>

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

      <style jsx global>{`
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0,0,0,0.1);
          border-left-color: currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .chart-bar {
          height: 0;
          animation: growUp 1s ease-out forwards;
        }
        @keyframes growUp {
          from { height: 0; }
          to { height: var(--target-height); }
        }
        
        .chart-bar-container {
          position: relative;
        }
        .chart-tooltip {
          opacity: 0;
          transition: opacity 0.2s;
          position: absolute;
          top: -24px;
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          pointer-events: none;
          white-space: nowrap;
        }
        .chart-bar-container:hover .chart-tooltip {
          opacity: 1;
        }

        .donut-container {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: conic-gradient(
            #E30613 0% var(--flash-perc),
            #3B82F6 var(--flash-perc) 100%
          );
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .donut-hole {
          width: 110px;
          height: 110px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
