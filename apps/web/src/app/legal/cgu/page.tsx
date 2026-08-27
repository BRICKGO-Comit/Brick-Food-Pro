'use client';

import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

export default function CGUPage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '60px 24px', width: '100%' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>Conditions Générales d'Utilisation et de Vente (CGU / CGV)</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px' }}>Règles d'utilisation du service BRICK DEAL</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>1. Objet du Service</h2>
              <p>
                Les présentes Conditions Générales régissent l'utilisation de l'application mobile et des services BRICK DEAL. BRICK DEAL met en relation des clients avec des établissements de restauration partenaires proposant des offres flash et des tarifs préférentiels.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>2. Réservation et Modalités de Paiement</h2>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li>Toute réservation d'offre flash ou de deal sur BRICK DEAL requiert le paiement préalable et intégral via le service Wave Mobile Money.</li>
                <li>La commande n'est définitivement enregistrée qu'après validation du paiement par le Webhook serveur Wave.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>3. Le Pass QR & Utilisation au Restaurant</h2>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li>Un <strong>Pass QR dynamique unique</strong> est généré pour chaque réservation confirmée.</li>
                <li>Le client s'engage à présenter son Pass QR ou son code de référence officiel (`RES-XXXX`) à l'établissement partenaire pour consommer sa formule.</li>
                <li>Chaque Pass QR est à usage unique et devient définitivement inactif après scan ou validation par l'établissement.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>4. Engagement des Établissements Partenaires & Agents</h2>
              <p>
                Les établissements partenaires garantissent la conformité des formules servies par rapport à la description de l'offre validée par l'administration. Les agents commerciaux s'engagent à respecter les directives de prospection et d'assistance définies par la plateforme.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
