'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer style={{
      backgroundColor: '#0F172A',
      color: '#94A3B8',
      paddingTop: '64px',
      paddingBottom: '32px',
      borderTop: '1px solid #1E293B',
      fontSize: '14px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Main Footer Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          paddingBottom: '48px',
          borderBottom: '1px solid #1E293B',
        }}>
          {/* Brand Col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="BRICK DEAL Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                BRICK<span style={{ color: '#E30613' }}>DEAL</span>
              </span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94A3B8' }}>
              La plateforme de référence pour découvrir, réserver et déguster les meilleures offres flash et deals gourmands au meilleur prix.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <span style={{ backgroundColor: '#1E293B', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#F8FAFC', fontWeight: '600' }}>
                💳 Wave Payment Compatible
              </span>
            </div>
          </div>

          {/* Nav Col */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
              Plateforme
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/vitrine#offres" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Offres Flash & Deals
                </Link>
              </li>
              <li>
                <Link href="/vitrine#partenaires" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Restaurateurs & Établissements
                </Link>
              </li>
              <li>
                <Link href="/vitrine#agents" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Réseau d'Agents Commerciaux
                </Link>
              </li>
              <li>
                <Link href="/vitrine#download" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Télécharger l'Application Mobile
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Col */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
              Informations Légales
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/legal/mentions-legales" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Mentions Légales
                </Link>
              </li>
              <li>
                <Link href="/legal/politique-de-confidentialite" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Politique de Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/legal/cgu" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Conditions Générales (CGU / CGV)
                </Link>
              </li>
              <li>
                <Link href="/legal/suppression-compte" style={{ color: '#EF4444', fontWeight: '600', textDecoration: 'none', transition: 'color 0.2s' }}>
                  🗑️ Demande de suppression de compte
                </Link>
              </li>
              <li>
                <Link href="/login" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Espace Administration Centrale
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
              Contact & Support
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <p>📍 Abidjan, Côte d'Ivoire</p>
              <p>📧 contact@brickdeal.app</p>
              <p>📞 +225 07 00 00 00 00</p>
              <p style={{ marginTop: '6px', color: '#10B981', fontWeight: '600' }}>
                🟢 Support 7j/7 – 08h à 22h
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div style={{
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '13px',
        }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#FFFFFF' }}>BRICK DEAL</strong> (Brick Food Pro). Tous droits réservés.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/legal/mentions-legales" style={{ color: '#64748B', textDecoration: 'none' }}>Mentions Légales</Link>
            <Link href="/legal/politique-de-confidentialite" style={{ color: '#64748B', textDecoration: 'none' }}>Confidentialité</Link>
            <Link href="/legal/cgu" style={{ color: '#64748B', textDecoration: 'none' }}>CGU / CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
