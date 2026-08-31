'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useParams } from 'next/navigation';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const offerId = params.offerId as string;
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState('sur_place');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/checkout/${offerId}`);
    }
  }, [user, authLoading, router, offerId]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*, restaurant:restaurants(*)')
          .eq('id', offerId)
          .single();
          
        if (error) throw error;
        if (!data || !data.is_published || data.status !== 'validee') {
          throw new Error('Offre indisponible');
        }
        if (data.type === 'flash') {
          if (data.quantity_remaining <= 0 || new Date(data.end_timestamp).getTime() < new Date().getTime()) {
            throw new Error('Offre expirée ou épuisée');
          }
        }
        setOffer(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchOffer();
  }, [offerId, user]);

  const handlePayment = async () => {
    if (!user || !offer) return;
    setProcessing(true);
    
    try {
      // Generate reservation code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'BRK-';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const price = offer.type === 'flash' ? offer.price_promo : offer.price;
      const totalAmount = price * quantity;
      const commissionAmount = totalAmount * (offer.commission_rate / 100);
      
      // Create order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        client_id: user.id,
        restaurant_id: offer.restaurant_id,
        offer_id: offer.id,
        agent_id: offer.agent_id,
        status: 'nouvelle',
        delivery_mode: deliveryMode,
        quantity,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'pending',
        reservation_code: code
      }).select().single();
      
      if (orderError) throw orderError;
      
      // Update inventory if flash
      if (offer.type === 'flash') {
        // Fallback simple since rpc might not exist
        const { error: updateError } = await supabase
          .from('offers')
          .update({ quantity_remaining: offer.quantity_remaining - quantity })
          .eq('id', offer.id);
        if (updateError) console.error("Error updating stock", updateError);
      }
      
      // History
      await supabase.from('order_history').insert({
        order_id: order.id,
        action: 'commande_creee',
        actor_id: user.id
      });
      
      // Simulate Wave payment
      setTimeout(async () => {
        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
        router.push(`/checkout/confirmation/${order.id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du paiement');
      setProcessing(false);
    }
  };

  if (authLoading || loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Chargement...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--primary)' }}>Erreur: {error}</div>;
  if (!offer) return null;

  const unitPrice = offer.type === 'flash' ? offer.price_promo : offer.price;
  const total = unitPrice * quantity;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>Finaliser votre commande</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Récapitulatif de l'offre</h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                {offer.photos?.[0] && <img src={offer.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>{offer.title}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{offer.restaurant?.name}</p>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{unitPrice} FCFA / unité</p>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Quantité</label>
              <select className="form-input" value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
                {Array.from({ length: offer.type === 'flash' ? Math.min(5, offer.quantity_remaining) : 5 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Mode de retrait</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="delivery" value="sur_place" checked={deliveryMode === 'sur_place'} onChange={e => setDeliveryMode(e.target.value)} />
                  Retrait sur place
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="delivery" value="livraison" checked={deliveryMode === 'livraison'} onChange={e => setDeliveryMode(e.target.value)} />
                  Livraison
                </label>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Paiement</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Sous-total ({quantity}x)</span>
              <span>{total} FCFA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              <span>Frais de service</span>
              <span>0 FCFA</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid var(--border)', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
              <span>Total à payer</span>
              <span>{total} FCFA</span>
            </div>
            
            <button 
              onClick={handlePayment} 
              disabled={processing}
              style={{ width: '100%', padding: '1.2rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {processing ? 'Traitement en cours...' : '💳 Payer avec Wave'}
            </button>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
