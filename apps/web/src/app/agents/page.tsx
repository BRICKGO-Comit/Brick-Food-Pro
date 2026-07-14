'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../components/AuthProvider';
import type { Profile } from '@/types/database';

interface AgentRow extends Profile {
  restaurantsCount: number;
  proposalsCount: number;
  commissions: number;
}

export default function AgentsManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchAgents = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'agent');
    const profiles = (data ?? []) as Profile[];

    const rows: AgentRow[] = [];
    for (const p of profiles) {
      const [{ count: restaurantsCount }, { count: proposalsCount }] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('agent_id', p.id),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('agent_id', p.id),
      ]);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('commission_amount')
        .eq('agent_id', p.id);
      const commissions = (ordersData ?? []).reduce((sum, r: any) => sum + Number(r.commission_amount || 0), 0);

      rows.push({ ...p, restaurantsCount: restaurantsCount ?? 0, proposalsCount: proposalsCount ?? 0, commissions });
    }

    setAgents(rows);
  };

  useEffect(() => {
    if (user) fetchAgents();
  }, [user]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  // La création d'un agent auth user nécessite le service role.
  // Ici on crée le profil via signUp côté client (l'utilisateur recevra un email de confirmation),
  // puis on bascule son rôle via un update du profil (l'admin est authentifié et la RLS l'autorise).
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email: newAgent.email.trim(),
      password: newAgent.password,
      options: { data: { full_name: newAgent.name, role: 'agent', phone: newAgent.phone } },
    });
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    showNotification(`Agent "${newAgent.name}" recruté ! Un email de confirmation a été envoyé.`);
    setNewAgent({ name: '', email: '', password: '', phone: '' });
    setShowAddModal(false);
    fetchAgents();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editingAgent.full_name, phone: editingAgent.phone })
      .eq('id', editingAgent.id);
    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }
    showNotification(`Profil de "${editingAgent.full_name}" mis à jour.`);
    setEditingAgent(null);
    fetchAgents();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Voulez-vous révoquer l'accès de l'agent commercial ${name} ?`)) {
      // On passe le rôle à 'client' au lieu de supprimer (la suppression de l'auth user nécessite le service role)
      const { error } = await supabase.from('profiles').update({ role: 'client' }).eq('id', id);
      if (error) {
        showNotification(`Erreur: ${error.message}`);
        return;
      }
      showNotification(`Accès de l'agent "${name}" révoqué.`);
      fetchAgents();
    }
  };

  const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Gestion des Agents Commerciaux</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Supervisez la performance commerciale et gérez les comptes de vos agents sur le terrain.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Recruter un Agent
        </button>
      </div>

      {notification && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '14px' }}>
          ✨ {notification}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: editingAgent ? '2fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition)' }}>
        <div className="panel">
          {agents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucun agent commercial enregistré
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Contact</th>
                  <th>Restaurants attribués</th>
                  <th>Propositions soumises</th>
                  <th>Commissions générées</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ fontWeight: '800', fontSize: '15px' }}>{agent.full_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>✉️ {agent.email}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📞 {agent.phone ?? '—'}</div>
                    </td>
                    <td style={{ fontWeight: '700', paddingLeft: '24px' }}>{agent.restaurantsCount}</td>
                    <td style={{ fontWeight: '700', paddingLeft: '24px' }}>{agent.proposalsCount}</td>
                    <td style={{ fontWeight: '800', color: 'var(--success)' }}>{formatFCFA(agent.commissions)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingAgent({ ...agent })}>
                          Modifier
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(agent.id, agent.full_name)}>
                          Révoquer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editingAgent && (
          <div className="panel" style={{ animation: 'slideIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Modifier Profil Agent</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setEditingAgent(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input type="text" className="form-input" value={editingAgent.full_name} onChange={(e) => setEditingAgent({ ...editingAgent, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input type="email" className="form-input" value={editingAgent.email} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" value={editingAgent.phone ?? ''} onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Enregistrer</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setEditingAgent(null)}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '400px', animation: 'scaleUp 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">Recruter un nouvel agent</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input type="text" className="form-input" placeholder="ex: Eric Mba's" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input type="email" className="form-input" placeholder="ex: agent@brickfood.com" value={newAgent.email} onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input type="password" className="form-input" placeholder="••••••••" value={newAgent.password} onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input type="text" className="form-input" placeholder="ex: 07 45 89 12 36" value={newAgent.phone} onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: '1' }}>Ajouter</button>
                <button type="button" className="btn btn-outline" style={{ flex: '1' }} onClick={() => setShowAddModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
