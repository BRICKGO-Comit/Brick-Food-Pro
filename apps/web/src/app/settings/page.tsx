'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../components/AuthProvider';
import type { Profile } from '@/types/database';

const supabaseSignUpClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export default function GeneralSettings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Settings State
  const [commissionRate, setCommissionRate] = useState<string>('10');
  const [agentCommissionShare, setAgentCommissionShare] = useState<string>('20');
  const [appName, setAppName] = useState<string>('BRICK DEAL');
  const [contactEmail, setContactEmail] = useState<string>('contact@brickdeal.ci');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Admin Users State
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState<boolean>(true);
  const [showAddAdminModal, setShowAddAdminModal] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<Profile | null>(null);

  // New Admin Form
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', phone: '' });
  const [adminFormLoading, setAdminFormLoading] = useState<boolean>(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch Settings from database
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) {
        console.warn('[FetchSettings] Error or table missing:', error.message);
        return;
      }
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          if (item.key === 'default_commission_rate') setCommissionRate(item.value);
          if (item.key === 'default_agent_commission_share') setAgentCommissionShare(item.value);
          if (item.key === 'app_name') setAppName(item.value);
          if (item.key === 'contact_email') setContactEmail(item.value);
        });
      }
    } catch (e) {
      console.warn('[FetchSettings] Exception:', e);
    }
  };

  // Fetch Admin profiles
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'admin');
    if (error) {
      console.error('[FetchAdmins] Error:', error.message);
    } else {
      setAdmins((data as Profile[]) ?? []);
    }
    setLoadingAdmins(false);
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchAdmins();
    }
  }, [user]);

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    const settingsToSave = [
      { key: 'default_commission_rate', value: commissionRate, description: 'Taux de commission plateforme par défaut (%)' },
      { key: 'default_agent_commission_share', value: agentCommissionShare, description: 'Part de commission agent (% sur les gains de la plateforme)' },
      { key: 'app_name', value: appName, description: 'Nom officiel de la plateforme' },
      { key: 'contact_email', value: contactEmail, description: 'Email officiel de contact' },
    ];

    let hasError = false;
    for (const item of settingsToSave) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(item, { onConflict: 'key' });
      if (error) {
        console.error(`[SaveSettings] Error saving ${item.key}:`, error.message);
        hasError = true;
      }
    }

    setSavingSettings(false);
    if (hasError) {
      showNotification('⚠️ Erreur lors de la sauvegarde des paramètres dans la table system_settings.');
    } else {
      showNotification('✅ Paramètres généraux enregistrés avec succès !');
    }
  };

  // Add New Admin Account
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormLoading(true);

    try {
      const { data: authData, error: authError } = await supabaseSignUpClient.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: {
            full_name: newAdmin.name,
            role: 'admin',
          },
        },
      });

      if (authError) {
        showNotification(`Erreur d'inscription Auth: ${authError.message}`);
        setAdminFormLoading(false);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          role: 'admin',
          full_name: newAdmin.name,
          email: newAdmin.email,
          phone: newAdmin.phone || null,
        });

        if (profileError) {
          console.warn('[AddAdminProfile] Profile warning:', profileError.message);
        }
      }

      showNotification(`🎉 Nouvel administrateur "${newAdmin.name}" créé avec succès !`);
      setNewAdmin({ name: '', email: '', password: '', phone: '' });
      setShowAddAdminModal(false);
      fetchAdmins();
    } catch (err: any) {
      showNotification(`Erreur: ${err.message}`);
    } finally {
      setAdminFormLoading(false);
    }
  };

  // Save Edit Admin Profile
  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editingAdmin.full_name,
        phone: editingAdmin.phone,
        email: editingAdmin.email,
      })
      .eq('id', editingAdmin.id);

    if (error) {
      showNotification(`Erreur: ${error.message}`);
      return;
    }

    showNotification(`✅ Profil administrateur "${editingAdmin.full_name}" mis à jour.`);
    setEditingAdmin(null);
    fetchAdmins();
  };

  // Revoke/Delete Admin Account
  const confirmDeleteAdmin = async () => {
    if (!deleteConfirmAdmin) return;
    const target = deleteConfirmAdmin;
    setDeleteConfirmAdmin(null);

    const { error } = await supabase.from('profiles').delete().eq('id', target.id);
    if (error) {
      showNotification(`Erreur lors de la révocation: ${error.message}`);
      return;
    }

    showNotification(`🗑️ Accès Administrateur de "${target.full_name}" révoqué.`);
    fetchAdmins();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '60px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#111827', margin: 0 }}>⚙️ Paramètres Généraux</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Configurez le taux de pourcentage sur les offres et gérez les accès des utilisateurs administrateurs.
          </p>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '14px 20px',
          borderRadius: '14px',
          fontWeight: '700',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span>✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* SECTION 1: GLOBAL COMMISSION & PLATFORM SETTINGS */}
      <div className="panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '28px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
            📊
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Taux de Commission & Paramètres Plateforme</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Définissez le taux de pourcentage prélevé par défaut sur chaque vente d'offre BRICK DEAL.</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Default Platform Commission Percentage Rate Input */}
          <div className="form-group" style={{ backgroundColor: '#F9FAFB', padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <label className="form-label" style={{ fontWeight: '800', color: '#111827', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💰 Taux de Commission Plateforme (%)</span>
            </label>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', marginBottom: '12px' }}>
              Pourcentage prélevé par la plateforme sur chaque vente d'offre.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="form-input"
                style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '16px', fontWeight: '800', color: '#059669', width: '120px' }}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                required
              />
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>%</span>
            </div>
          </div>

          {/* Default Agent Share Percentage Input */}
          <div className="form-group" style={{ backgroundColor: '#F0FDF4', padding: '18px', borderRadius: '16px', border: '1px solid #BBF7D0' }}>
            <label className="form-label" style={{ fontWeight: '800', color: '#065F46', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤝 Part / Rétrocession Agent (%)</span>
            </label>
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '2px', marginBottom: '12px' }}>
              Pourcentage des gains de la plateforme reversé à l'agent commercial.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="form-input"
                style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '16px', fontWeight: '800', color: '#047857', width: '120px', borderColor: '#86EFAC' }}
                value={agentCommissionShare}
                onChange={(e) => setAgentCommissionShare(e.target.value)}
                required
              />
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#047857' }}>% des gains</span>
            </div>
          </div>

          {/* Platform App Name */}
          <div className="form-group" style={{ backgroundColor: '#F9FAFB', padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <label className="form-label" style={{ fontWeight: '800', color: '#111827', fontSize: '14px' }}>🏢 Nom de la Plateforme</label>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', marginBottom: '12px' }}>Intitulé officiel affiché sur l'application et les reçus PDF.</p>
            <input
              type="text"
              className="form-input"
              style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: '700' }}
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              required
            />
          </div>

          {/* Contact Support Email */}
          <div className="form-group" style={{ backgroundColor: '#F9FAFB', padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <label className="form-label" style={{ fontWeight: '800', color: '#111827', fontSize: '14px' }}>✉️ Email Support Client</label>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', marginBottom: '12px' }}>Adresse de réception des alertes et notifications système.</p>
            <input
              type="email"
              className="form-input"
              style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: '700' }}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingSettings}
              style={{
                padding: '14px 28px',
                borderRadius: '14px',
                fontWeight: '800',
                fontSize: '14px',
                backgroundColor: '#059669',
                borderColor: '#059669',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                cursor: 'pointer'
              }}
            >
              {savingSettings ? 'Enregistrement en cours...' : '💾 Enregistrer les Paramètres'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: ADMIN USER MANAGEMENT */}
      <div className="panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '28px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              👑
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Comptes Utilisateurs Administrateurs</h2>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Gérez les privilèges d'accès complet au Dashboard Web Admin.</p>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '12px 20px', borderRadius: '14px', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowAddAdminModal(true)}
          >
            <span>➕</span> Ajouter un Administrateur
          </button>
        </div>

        {/* Admins Table */}
        {loadingAdmins ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Chargement des administrateurs...</div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Aucun compte administrateur trouvé.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ color: '#6B7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Administrateur</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact / Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Téléphone</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rôle / Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} style={{ backgroundColor: '#F9FAFB', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#E11D48', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' }}>
                          {admin.full_name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: '#111827', fontSize: '14px' }}>{admin.full_name || 'Administrateur'}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>ID: {admin.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>
                      {admin.email || '—'}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>
                      {admin.phone || '—'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                        👑 SUPER ADMIN
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px', borderColor: '#2563EB', color: '#2563EB', fontWeight: '700' }}
                          onClick={() => setEditingAdmin(admin)}
                        >
                          ✏️ Éditer
                        </button>
                        {user?.id !== admin.id && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px', borderColor: '#FCA5A5', color: '#DC2626', backgroundColor: '#FEF2F2', fontWeight: '700' }}
                            onClick={() => setDeleteConfirmAdmin(admin)}
                          >
                            🗑️ Révoquer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD ADMIN MODAL */}
      {showAddAdminModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setShowAddAdminModal(false)}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E5E7EB'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #F3F4F6',
              backgroundColor: '#F9FAFB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>Créer un Administrateur</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6B7280' }}
                onClick={() => setShowAddAdminModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Nom et Prénom</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: Eric Admin"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Adresse Email (Identifiant)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@brickdeal.ci"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Mot de passe temporaire</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 6 caractères"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Numéro de Téléphone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: +225 07 00 00 00 00"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adminFormLoading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', backgroundColor: '#E11D48', borderColor: '#E11D48' }}
                >
                  {adminFormLoading ? 'Création...' : 'Créer le Compte Admin'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                  onClick={() => setShowAddAdminModal(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setEditingAdmin(null)}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E5E7EB'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #F3F4F6',
              backgroundColor: '#F9FAFB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✏️</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>Modifier l'Administrateur</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6B7280' }}
                onClick={() => setEditingAdmin(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Nom et Prénom</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={editingAdmin.full_name ?? ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Adresse Email</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={editingAdmin.email ?? ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#374151' }}>Numéro de Téléphone</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ borderRadius: '12px', padding: '12px 14px' }}
                  value={editingAdmin.phone ?? ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px' }}
                >
                  Enregistrer les modifications
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                  onClick={() => setEditingAdmin(null)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE/REVOKE ADMIN CONFIRMATION MODAL */}
      {deleteConfirmAdmin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setDeleteConfirmAdmin(null)}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E5E7EB',
            padding: '28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '32px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px'
            }}>
              👑
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 8px 0' }}>
              Révoquer cet Administrateur ?
            </h3>
            
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Êtes-vous sûr de vouloir révoquer les privilèges d'accès admin de :
            </p>

            <div style={{
              width: '100%',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '12px 16px',
              fontWeight: '800',
              color: '#E11D48',
              fontSize: '14px',
              marginBottom: '24px',
              wordBreak: 'break-word'
            }}>
              "{deleteConfirmAdmin.full_name}" ({deleteConfirmAdmin.email})
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                className="btn btn-outline"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderColor: '#D1D5DB',
                  color: '#374151'
                }}
                onClick={() => setDeleteConfirmAdmin(null)}
              >
                Annuler
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  backgroundColor: '#DC2626',
                  borderColor: '#DC2626',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
                onClick={confirmDeleteAdmin}
              >
                Oui, Révoquer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
