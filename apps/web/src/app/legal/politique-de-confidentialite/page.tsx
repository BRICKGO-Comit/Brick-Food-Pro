'use client';

import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

export default function PolitiqueConfidentialitePage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '60px 24px', width: '100%' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}>Politique de Confidentialité</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px' }}>Protection de vos données personnelles sur BRICK DEAL</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>1. Collecte des Données Personnelles</h2>
              <p>
                Dans le cadre de l'utilisation de l'application mobile et des services BRICK DEAL, nous pouvons collecter les données suivantes :
              </p>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li><strong>Informations de Compte :</strong> Nom, prénom, adresse email, numéro de téléphone.</li>
                <li><strong>Données de Transaction :</strong> Historique de vos réservations, références des Pass QR et montants réglés.</li>
                <li><strong>Données de Géolocalisation :</strong> Utilisées uniquement avec votre accord explicite pour vous afficher les offres des restaurants à proximité.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>2. Utilisation des Données</h2>
              <p>Vos données sont traitées pour les finalités suivantes :</p>
              <ul style={{ listStyle: 'square', paddingLeft: '20px', marginTop: '8px' }}>
                <li>Validation de vos commandes et génération de votre Pass QR officiel.</li>
                <li>Paiement sécurisé via le système Wave Mobile Money.</li>
                <li>Envoi des notifications de suivi de vos réservations (ex: <em>Commande prête</em>, <em>Proposition validée</em>).</li>
                <li>Calcul des commissions attribuées aux agents commerciaux rattachés.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>3. Protection & Sécurité des Transactions</h2>
              <p>
                Les paiements effectués sur BRICK DEAL sont entièrement traités par l'infrastructure sécurisée de <strong>Wave Mobile Money</strong>. Aucune donnée bancaire ni code confidentiel de paiement n'est stocké sur nos serveurs. La confirmation est effectuée via Webhooks chiffrés et vérifiés.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>4. Vos Droits & Suppression de Compte</h2>
              <p>
                Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
              </p>
              <p style={{ marginTop: '8px' }}>
                Pour effectuer une demande officielle de suppression de votre compte et de vos données personnelles, vous pouvez utiliser notre formulaire en ligne dédié :
                <br />
                🔗 <a href="/legal/suppression-compte" style={{ color: '#E30613', fontWeight: '700' }}>Formulaire de demande de suppression de compte</a>
              </p>
              <p style={{ marginTop: '8px' }}>
                Ou nous contacter par email : 📧 <strong>privacy@brickdeal.app</strong>
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
