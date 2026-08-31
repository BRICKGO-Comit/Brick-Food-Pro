'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';

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
          .select('*, offer:offers(*), restaurant:restaurants(*)')
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

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Chargement...</div>;
  if (!order) return <div style={{ padding: '3rem', textAlign: 'center' }}>Commande introuvable</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @media print {
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 2rem; }
            .no-print { display: none !important; }
          }
        `}} />
        
        <div className="print-section" style={{ backgroundColor: 'var(--bg-card)', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pulse 2s infinite' }}>✅</div>
          <h1 style={{ color: 'var(--success)', fontSize: '2rem', marginBottom: '2rem' }}>Paiement Confirmé !</h1>
          
          <div style={{ textAlign: 'left', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Restaurant: <strong style={{ color: 'var(--text-primary)' }}>{order.restaurant?.name}</strong></p>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Offre: <strong style={{ color: 'var(--text-primary)' }}>{order.offer?.title}</strong></p>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Quantité: <strong style={{ color: 'var(--text-primary)' }}>{order.quantity}</strong></p>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Montant payé: <strong style={{ color: 'var(--text-primary)' }}>{order.total_amount} FCFA</strong></p>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Votre Code de Réservation :</p>
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', fontSize: '2.5rem', letterSpacing: '4px', fontWeight: '900', display: 'inline-block' }}>
              {order.reservation_code}
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Présentez ce code au restaurant pour récupérer votre commande.
            </p>
          </div>
          
          <div className="no-print" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={handlePrint} style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--info)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
              📥 Télécharger le reçu PDF
            </button>
            <button onClick={() => router.push('/deals')} style={{ padding: '1rem 1.5rem', backgroundColor: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
              Retour aux deals
            </button>
          </div>
          
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
