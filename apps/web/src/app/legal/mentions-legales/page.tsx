'use client';

import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

export default function MentionsLegalesPage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '60px 24px', width: '100%' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>Mentions Légales</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px' }}>Dernière mise à jour : 27 août 2026</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>1. Éditeur du Site et de l'Application</h2>
              <p>
                La plateforme et l'application mobile <strong>BRICK DEAL</strong> (développées par <strong>Brick Food Pro</strong>) sont éditées par la société Brick Food Pro SARL, enregistrée sous les lois en vigueur en Côte d'Ivoire.
              </p>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Siège Social :</strong> Abidjan, Côte d'Ivoire</li>
                <li><strong>Email de Contact :</strong> contact@brickdeal.app</li>
                <li><strong>Téléphone :</strong> +225 07 00 00 00 00</li>
                <li><strong>Directeur de la publication :</strong> Direction Générale Brick Food Pro</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>2. Hébergement du Service</h2>
              <p>
                Les services Web, API et bases de données de BRICK DEAL sont hébergés auprès des prestataires certifiés suivants :
              </p>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Application Web (Vercel Inc.) :</strong> 440 N Barranca Ave #4133 Covina, CA 91723, USA.</li>
                <li><strong>Base de données & API (Supabase Inc.) :</strong> 970 Toa Payoh North #07-04, Singapour.</li>
                <li><strong>Paiement Mobile :</strong> Intégration sécurisée via l'API officielle Wave Mobile Money (Wave Digital Finance).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>3. Propriété Intellectuelle</h2>
              <p>
                L'ensemble des éléments figurant sur le site web et l'application mobile BRICK DEAL (marques, logos, textes, graphismes, icônes, images, Pass QR, éléments d'interface et codes sources) sont la propriété exclusive de Brick Food Pro. Toute reproduction, représentation, modification ou adaptation totale ou partielle est strictement interdite sans autorisation écrite préalable.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>4. Limitations de Responsabilité</h2>
              <p>
                Brick Food Pro s'efforce d'assurer la précision et la mise à jour des informations diffusées sur la plateforme. Toutefois, l'éditeur ne saurait être tenu responsable des retards, interruptions ou dysfonctionnements liés au réseau télécom, aux services Wave Mobile Money ou à la non-conformité des prestations fournies directement par les établissements partenaires.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
