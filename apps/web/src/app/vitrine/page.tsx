'use client';

import React from 'react';
import Link from 'next/link';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function VitrinePage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PublicNavbar />

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        padding: '80px 24px 100px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(227, 6, 19, 0.15)',
              border: '1px solid rgba(227, 6, 19, 0.3)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: '#FF4D4D',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '20px',
            }}>
              🔥 L'application gourmande N°1 des bons plans
            </div>
            <h1 style={{ fontSize: '46px', fontWeight: '900', lineHeight: '1.15', marginBottom: '20px', letterSpacing: '-1px' }}>
              Vos offres flash & deals repas au meilleur prix
            </h1>
            <p style={{ fontSize: '18px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '32px' }}>
              Découvrez les promotions exclusives de vos restaurants préférés. Réservez en un clic, payez en toute sécurité via Wave Mobile Money et présentez votre Pass QR instantané.
            </p>

            <div id="download" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <a
                href="#download"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#E30613',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 8px 20px rgba(227, 6, 19, 0.35)',
                }}
              >
                📱 Télécharger sur Android
              </a>
              <a
                href="#download"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                🍏 Télécharger sur iOS
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '36px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#FFFFFF' }}>+10 000</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Clients actifs</span>
              </div>
              <div style={{ height: '30px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#FFFFFF' }}>100%</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Paiement Wave Sécurisé</span>
              </div>
              <div style={{ height: '30px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '22px', fontWeight: '900', color: '#10B981' }}>Pass QR</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Validation instantanée</span>
              </div>
            </div>
          </div>

          {/* App Preview Card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              maxWidth: '380px',
              width: '100%',
            }}>
              <div style={{ backgroundColor: '#0F172A', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#E30613', fontWeight: '900', fontSize: '16px' }}>⚡ BRICK FLASH DU JOUR</span>
                <span style={{ backgroundColor: '#EF4444', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px' }}>-35%</span>
              </div>

              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600"
                alt="Offre gourmande"
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }}
              />

              <h3 style={{ color: '#FFF', fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Menu Duo Gourmet & Boissons</h3>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '14px' }}>🏢 Établissement Partenaire Privilège</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: '12px 16px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', textDecoration: 'line-through', display: 'block' }}>12 000 FCFA</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>7 800 FCFA</span>
                </div>
                <span style={{ backgroundColor: '#10B981', color: '#FFF', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>
                  Pass QR Prêt
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Offres & Fonctionnalités */}
      <section id="offres" style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '16px' }}>Comment ça marche ?</h2>
          <p style={{ color: '#64748B', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Une expérience fluide et 100% numérique pour profiter de vos repas préférés au meilleur prix.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FFEBEB', color: '#E30613', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
              🔍
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>1. Choisissez votre Deal</h3>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
              Parcourez les offres flash éphémères et les deals exclusifs proposés par les meilleurs restaurants partenaires.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
              💳
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>2. Payez via Wave</h3>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
              Réglez en toute sécurité directement sur l'application avec Wave Mobile Money. Validation instantanée par serveur Webhook.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
              🎟️
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>3. Obtenez votre Pass QR</h3>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
              Votre Pass QR officiel est immédiatement généré. Téléchargez votre reçu PDF et suivez la préparation de votre commande en direct.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>
              🍽️
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>4. Savourez sur place</h3>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
              Présentez simplement votre Pass QR ou votre code de réservation au restaurant pour consommer votre formule.
            </p>
          </div>
        </div>
      </section>

      {/* Section Établissements Partenaires */}
      <section id="partenaires" style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>POUR LES RESTAURATEURS</span>
            <h2 style={{ fontSize: '36px', fontWeight: '900', margin: '12px 0 20px 0', lineHeight: '1.2' }}>
              Boostez votre fréquentation et vos ventes quotidiennes
            </h2>
            <p style={{ color: '#64748B', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
              BRICK DEAL vous permet de publier des offres flash durant vos heures creuses, d'attirer de nouveaux clients et de gérer vos réservations en temps réel.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Publication instantanée d'offres flash et de formules réduites
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Validation sécurisée des Pass QR par scan caméra ou code
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>
                <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span> Suivi analytique des ventes et versements automatisés
              </li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '12px' }}>Devenez Établissement Partenaire</h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}> Rejoignez le réseau BRICK DEAL et développez votre chiffre d'affaires dès aujourd'hui.</p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                textDecoration: 'none',
                width: '100%',
              }}
            >
              🏢 Contacter le réseau BRICK DEAL
            </Link>
          </div>
        </div>
      </section>

      {/* Section Agents Commerciaux */}
      <section id="agents" style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ color: '#E30613', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>RÉSEAU COMMERCIAL</span>
          <h2 style={{ fontSize: '36px', fontWeight: '900', marginTop: '12px' }}>Devenez Agent Commercial BRICK DEAL</h2>
          <p style={{ color: '#64748B', fontSize: '16px', maxWidth: '650px', margin: '12px auto 0 auto' }}>
            Raccordez des établissements, proposez des offres et gagnez des commissions automatisées sur chaque commande réalisée.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>👔 Inscription d'Établissements</h4>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.5' }}>Inscrivez et gérez votre portefeuille de restaurants partenaires directement depuis l'application mobile.</p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>💰 Commissions Automatisées</h4>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.5' }}>Percevez un pourcentage automatique sur chaque vente générée par vos établissements raccordés.</p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>📱 Vente Assistée Terrain</h4>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.5' }}>Aidez les clients sur le terrain à réserver leurs packs et générez leur Pass QR en direct.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
