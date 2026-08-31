'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import Link from 'next/link';

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, offer:offers(*), restaurant:restaurants(*), client:profiles!client_id(full_name, phone)')
          .eq('id', orderId)
          .single();
          
        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          Génération de votre Pass...
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center' }}>
          <h2>Commande introuvable</h2>
          <Link href="/deals" style={{ color: '#E30613', fontWeight: 'bold' }}>Retour au catalogue</Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const code = order.reservation_code || 'BRK-7892';
    const total = Number(order.total_amount || 0).toLocaleString('fr-FR');
    const restoName = order.restaurant?.name || 'Restaurant Partenaire';
    const restoAddress = order.restaurant?.address || 'Abidjan';
    const offerTitle = order.offer?.title || 'Formule Repas';
    const clientName = order.client?.full_name || order.profiles?.full_name || 'Client';
    const clientPhone = order.client?.phone || order.profiles?.phone || 'Non renseigné';
    const diningText = order.delivery_mode === 'livraison' ? '📦 À emporter / Livraison' : '🍽️ Sur place (au restaurant)';
    const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pass Réservation - BRICK DEAL</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1E293B; background: #F8FAFC; text-align: center; }
          .card { background: #FFFFFF; border-radius: 20px; padding: 28px; border: 2px solid #E30613; max-width: 440px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .logo { font-size: 26px; font-weight: 900; color: #0F172A; }
          .logo span { color: #E30613; }
          .sublogo { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-top: 4px; }
          .badge { background: #FEE2E2; color: #E30613; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin: 12px 0; }
          .code-box { background: #0F172A; color: #10B981; border-radius: 16px; padding: 18px; text-align: center; margin: 16px 0; }
          .code-title { font-size: 11px; color: #94A3B8; font-weight: 700; text-transform: uppercase; }
          .code-val { font-size: 32px; font-weight: 900; letter-spacing: 3px; margin-top: 4px; }
          .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; text-align: left; }
          .label { font-weight: 700; color: #64748B; }
          .val { font-weight: 800; color: #0F172A; text-align: right; }
          .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 20px; line-height: 1.4; }
          @media print {
            body { background: #FFFFFF; padding: 0; }
            .card { box-shadow: none; border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">BRICK<span>DEAL</span></div>
          <div class="sublogo">PASS RÉSERVATION OFFICIEL • BON DE CONSOMMATION</div>
          <div class="badge">PAIEMENT CONFIRMÉ VIA WAVE</div>

          <div class="code-box">
            <div class="code-title">CODE DU PASS RÉSERVATION</div>
            <div class="code-val">${code}</div>
          </div>

          <div class="details-row">
            <span class="label">Établissement :</span>
            <span class="val">${restoName}</span>
          </div>
          <div class="details-row">
            <span class="label">Adresse :</span>
            <span class="val">${restoAddress}</span>
          </div>
          <div class="details-row">
            <span class="label">Formule :</span>
            <span class="val">${offerTitle}</span>
          </div>
          <div class="details-row">
            <span class="label">Bénéficiaire :</span>
            <span class="val">${clientName}</span>
          </div>
          <div class="details-row">
            <span class="label">Téléphone :</span>
            <span class="val">${clientPhone}</span>
          </div>
          <div class="details-row">
            <span class="label">Option :</span>
            <span class="val">${diningText}</span>
          </div>
          <div class="details-row">
            <span class="label">Quantité :</span>
            <span class="val">${order.quantity} formule(s)</span>
          </div>
          <div class="details-row">
            <span class="label">Montant Payé :</span>
            <span class="val" style="color: #10B981; font-size: 15px;">${total} FCFA</span>
          </div>
          <div class="details-row">
            <span class="label">Date d'émission :</span>
            <span class="val">${dateStr}</span>
          </div>

          <div class="footer">
            Présentez ce Pass au restaurant pour récupérer ou déguster votre formule.<br>
            <strong>BRICK DEAL • Tous droits réservés.</strong>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '2px solid #E30613',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          maxWidth: '520px',
          width: '100%',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          
          <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>✅</div>
          <h1 style={{ color: '#0F172A', fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0' }}>
            Paiement Confirmé !
          </h1>
          <p style={{ color: '#10B981', fontSize: '14px', fontWeight: '800', margin: '0 0 1.5rem 0' }}>
            Votre Pass de réservation est prêt
          </p>

          {/* Cadre Code Réservation Géant */}
          <div style={{ backgroundColor: '#0F172A', borderRadius: '18px', padding: '20px', marginBottom: '1.5rem', color: '#10B981' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              CODE DU PASS RÉSERVATION
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '3px', marginTop: '6px' }}>
              {order.reservation_code}
            </div>
          </div>

          {/* Récapitulatif */}
          <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '13px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Restaurant :</span>
              <strong style={{ color: '#0F172A' }}>{order.restaurant?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Adresse :</span>
              <span style={{ color: '#0F172A' }}>{order.restaurant?.address}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Offre :</span>
              <strong style={{ color: '#0F172A' }}>{order.offer?.title}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Bénéficiaire :</span>
              <strong style={{ color: '#0F172A' }}>{order.client?.full_name || order.profiles?.full_name || 'Client'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Option :</span>
              <span style={{ fontWeight: '700', color: '#0F172A' }}>
                {order.delivery_mode === 'livraison' ? '📦 Livraison' : '🍽️ Sur place (au restaurant)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748B' }}>Quantité :</span>
              <strong style={{ color: '#0F172A' }}>{order.quantity} formule(s)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Montant Réglé :</span>
              <span style={{ fontSize: '15px', fontWeight: '900', color: '#10B981' }}>
                {Number(order.total_amount || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Présentez ce Pass au restaurant ou donnez le code <strong>{order.reservation_code}</strong> au serveur pour déguster votre repas.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              onClick={handlePrint}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              }}
            >
              <span>📥</span>
              <span>Télécharger / Imprimer le Pass (PDF)</span>
            </button>

            <Link
              href="/deals"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                color: '#E30613',
                border: '1.5px solid #E30613',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              Explorer d'autres offres
            </Link>
          </div>

        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
