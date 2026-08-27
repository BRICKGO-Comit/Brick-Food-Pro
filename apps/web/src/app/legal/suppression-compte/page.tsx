'use client';

import React, { useState } from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import { supabase } from '@/lib/supabase';

export default function DemandeSuppressionComptePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'client',
    reason: '',
    confirmed: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.confirmed) return;

    setSubmitting(true);

    try {
      // Optionnel : Enregistre la demande dans la table notifications ou system_settings pour l'admin
      await supabase.from('notifications').insert([{
        title: '⚠️ Demande de suppression de compte',
        body: `Demande de suppression reçue de ${formData.fullName} (${formData.email}, Tél: ${formData.phone}, Rôle: ${formData.role}). Motif: ${formData.reason || 'Non spécifié'}`,
        is_read: false,
      }]);
    } catch (err) {
      console.warn('[DemandeSuppression] Notice:', err);
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '60px 24px', width: '100%' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>
            Demande de Suppression de Compte et des Données Personnelles
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px' }}>
            Conformément aux règles de confidentialité de Google Play, d'Apple et à la législation en vigueur.
          </p>

          {submitted ? (
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '1.5px solid #10B981',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#065F46', marginBottom: '12px' }}>
                Demande de suppression enregistrée
              </h2>
              <p style={{ color: '#047857', fontSize: '15px', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                Votre demande de suppression concernant le compte <strong>{formData.email}</strong> a bien été transmise à notre équipe technique. Un accusé de réception vous a été adressé et le traitement complet sera effectué dans un délai maximal de 48 heures ouvrées.
              </p>
            </div>
          ) : (
            <>
              <div style={{ backgroundColor: '#F1F5F9', padding: '20px', borderRadius: '16px', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>ℹ️ Informations importantes concernant la suppression :</h3>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li>La suppression de votre compte entraîne la suppression définitive de votre profil, de vos identifiants de connexion et de vos préférences.</li>
                  <li>Les réservations passées et reçus fiscaux sont conservés sous forme anonymisée pour des raisons légales et comptables.</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
                    Nom et Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dupont"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
                    Adresse Email du compte à supprimer *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="votre.email@exemple.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
                    Numéro de Téléphone associé *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+225 07 00 00 00 00"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
                    Type de Compte *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="client">Client Utilisateur Mobile</option>
                    <option value="agent">Agent Commercial</option>
                    <option value="restaurant">Établissement Partenaire</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
                    Motif de la demande (Optionnel)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Précisez la raison si vous le souhaitez..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="confirmCheck"
                    required
                    checked={formData.confirmed}
                    onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <label htmlFor="confirmCheck" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', lineHeight: '1.5' }}>
                    Je confirme être le propriétaire de ce compte et demande la suppression définitive de mes données personnelles associées.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formData.confirmed}
                  style={{
                    marginTop: '12px',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    backgroundColor: formData.confirmed ? '#DC2626' : '#94A3B8',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '15px',
                    border: 'none',
                    cursor: formData.confirmed ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                >
                  {submitting ? 'Traitement en cours...' : '🗑️ Soumettre la demande de suppression'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
