'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import Link from 'next/link';

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  profiles: { full_name: string; id: string } | null;
  orders: { reservation_code: string; restaurant_id: string; restaurants: { name: string } | null } | null;
}

interface FilterActor {
  id: string;
  full_name: string;
}

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actors, setActors] = useState<FilterActor[]>([]);
  
  // Filters
  const [period, setPeriod] = useState<string>('today');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const itemsPerPage = 30;
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchActors = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (data) setActors(data as FilterActor[]);
    };
    fetchActors();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('order_history')
      .select('id, created_at, action, profiles!actor_id(id, full_name), orders(reservation_code, restaurant_id, restaurants(name))')
      .order('created_at', { ascending: false });

    // Period filter
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      query = query.gte('created_at', startOfDay);
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      query = query.gte('created_at', startOfWeek.toISOString());
    } else if (period === 'month') {
      const startOfMonth = new Date(now);
      startOfMonth.setDate(now.getDate() - 30);
      query = query.gte('created_at', startOfMonth.toISOString());
    }

    // Action filter
    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    // Actor filter
    if (actorFilter !== 'all') {
      query = query.eq('actor_id', actorFilter);
    }

    // Search filter
    if (searchCode.trim() !== '') {
      // Supabase JS doesn't easily do deep ilike on joined tables if not explicitly structured,
      // so we might filter in memory or try nested resource filtering:
      // query = query.ilike('orders.reservation_code', `%${searchCode}%`) 
      // but this requires inner join. Let's do it after fetching if not supported, but we can use inner join:
      query = query.ilike('orders.reservation_code', `%${searchCode}%`);
    }

    const { data } = await query.range(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    if (data) {
      // if searchCode was applied and nested filter didn't strip rows (due to outer join), filter manually:
      let filteredData = data as unknown as AuditLog[];
      if (searchCode.trim() !== '') {
         filteredData = filteredData.filter(log => log.orders?.reservation_code?.toLowerCase().includes(searchCode.toLowerCase()));
      }
      setLogs(filteredData);
      setHasMore(filteredData.length > itemsPerPage);
      if (filteredData.length > itemsPerPage) {
        filteredData.pop();
        setLogs(filteredData);
      }
    } else {
      setLogs([]);
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchLogs();
  }, [user, period, actionFilter, actorFilter, searchCode, page]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getActionBadge = (action: string) => {
    let color = 'gray';
    let bgColor = '#f3f4f6';
    
    if (action === 'commande_creee' || action === 'creee') {
      color = 'var(--info)'; bgColor = 'var(--info-bg)';
    } else if (action === 'statut_modifie' || action === 'en_preparation' || action === 'nouvelle') {
      color = 'var(--warning)'; bgColor = 'var(--warning-bg)';
    } else if (action === 'pass_valide' || action === 'paiement_confirme' || action === 'prete' || action === 'terminee' || action === 'livree') {
      color = 'var(--success)'; bgColor = 'var(--success-bg)';
    }

    return (
      <span style={{ color, backgroundColor: bgColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
        {action}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Link href="/admin" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px', fontWeight: '600' }}>
          ← Retour au dashboard
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Logs d'Audit</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Historique complet des actions effectuées sur la plateforme.</p>
      </div>

      <div className="panel" style={{ flexDirection: 'row', gap: '16px', flexWrap: 'wrap', padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Période :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0); }}>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="all">Tout</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Action :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}>
            <option value="all">Toutes</option>
            <option value="creee">Commande créée</option>
            <option value="en_preparation">En préparation</option>
            <option value="prete">Prête</option>
            <option value="terminee">Terminée</option>
            <option value="livree">Livrée</option>
            <option value="paiement_confirme">Paiement confirmé</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Acteur :</span>
          <select className="form-input" style={{ padding: '6px 12px' }} value={actorFilter} onChange={(e) => { setActorFilter(e.target.value); setPage(0); }}>
            <option value="all">Tous les acteurs</option>
            {actors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Code de commande..." 
            value={searchCode}
            onChange={(e) => { setSearchCode(e.target.value); setPage(0); }}
            style={{ padding: '6px 12px' }}
          />
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Chargement...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun log trouvé</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Commande</th>
                <th>Restaurant</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(log.created_at)}</td>
                  <td style={{ fontWeight: '600' }}>{log.profiles?.full_name ?? 'Système'}</td>
                  <td>{getActionBadge(log.action)}</td>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{log.orders?.reservation_code ?? '—'}</td>
                  <td>{log.orders?.restaurants?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
          <button 
            className="btn btn-outline" 
            disabled={page === 0} 
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            Précédent
          </button>
          <button 
            className="btn btn-outline" 
            disabled={!hasMore} 
            onClick={() => setPage(p => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
