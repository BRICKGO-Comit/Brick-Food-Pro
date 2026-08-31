import { supabase } from '@/lib/supabase';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data: offer } = await supabase.from('offers').select('title, description, photos').eq('id', params.id).single();
  if (!offer) return { title: 'Offre introuvable' };
  
  return {
    title: `${offer.title} | BRICK DEAL`,
    description: offer.description?.substring(0, 150) + '...',
    openGraph: {
      title: `${offer.title} | BRICK DEAL`,
      description: offer.description?.substring(0, 150) + '...',
      url: `https://www.brickdeal.store/deals/${params.id}`,
      images: offer.photos?.[0] ? [offer.photos[0]] : [],
    },
  };
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const { data: offer, error } = await supabase
    .from('offers')
    .select('*, restaurant:restaurants(*)')
    .eq('id', params.id)
    .single();

  if (error || !offer) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Offre introuvable</div>;
  }

  const isFlash = offer.type === 'flash';
  const discount = isFlash ? Math.round(((offer.price_normal - offer.price_promo) / offer.price_normal) * 100) : 0;
  const stockPercent = isFlash ? Math.max(0, Math.min(100, (offer.quantity_remaining / offer.quantity_initial) * 100)) : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          {/* Left: Photos */}
          <div>
            <div style={{ width: '100%', height: '400px', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1rem' }}>
              {offer.photos?.[0] ? (
                <img src={offer.photos[0]} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #f1f5f9, #e2e8f0)' }}>
                  Pas d'image
                </div>
              )}
            </div>
            {offer.photos?.length > 1 && (
              <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                {offer.photos.slice(1).map((photo: string, idx: number) => (
                  <img key={idx} src={photo} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Details */}
          <div>
            <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 'var(--radius-md)', backgroundColor: isFlash ? 'var(--primary)' : 'var(--info)', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {isFlash ? '⚡ FLASH' : '🎁 DEAL'}
            </div>
            
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.2 }}>{offer.title}</h1>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', whiteSpace: 'pre-line' }}>{offer.description}</p>
            
            {isFlash ? (
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{offer.price_normal} FCFA</span>
                  <span style={{ fontSize: '2.5rem', color: 'var(--success)', fontWeight: 'bold' }}>{offer.price_promo} FCFA</span>
                  <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>-{discount}%</span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Stock restant</span>
                    <span style={{ fontWeight: 'bold' }}>{offer.quantity_remaining} / {offer.quantity_initial}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${stockPercent}%`, height: '100%', backgroundColor: stockPercent > 20 ? 'var(--success)' : 'var(--primary)' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                  <span>⏱ Fin dans:</span>
                  <span id="countdown-timer" data-end={offer.end_timestamp}>Calcul...</span>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--info)', fontWeight: 'bold', marginBottom: '1.5rem' }}>{offer.price} FCFA</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: 'var(--text-secondary)' }}>
                  <div>🏷 Pack: <strong style={{ color: 'var(--text-primary)' }}>{offer.pack_type}</strong></div>
                  <div>👥 Capacité: <strong style={{ color: 'var(--text-primary)' }}>{offer.capacity_persons} pers.</strong></div>
                  <div>📅 Date dispo: <strong style={{ color: 'var(--text-primary)' }}>{offer.available_date || 'Tous les jours'}</strong></div>
                  <div>⏰ Heure dispo: <strong style={{ color: 'var(--text-primary)' }}>{offer.available_time || 'Toute la journée'}</strong></div>
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📍 Restaurant</h3>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{offer.restaurant?.name}</p>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{offer.restaurant?.address}</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{offer.restaurant?.phone}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href={`/checkout/${offer.id}`} style={{ flex: 1, padding: '1.2rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', textDecoration: 'none' }}>
                Commander maintenant
              </Link>
              
              <button id="share-btn" data-title={offer.title} data-url={`https://www.brickdeal.store/deals/${offer.id}`} style={{ width: '60px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🔗
              </button>
            </div>
            
          </div>
        </div>
      </main>
      
      <PublicFooter />
      
      <script dangerouslySetInnerHTML={{__html: `
        // Timer script
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) {
          const endTime = new Date(timerEl.getAttribute('data-end')).getTime();
          setInterval(() => {
            const now = new Date().getTime();
            const distance = endTime - now;
            if (distance <= 0) {
              timerEl.innerHTML = "Expiré";
              return;
            }
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            timerEl.innerHTML = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
          }, 1000);
        }
        
        // Share script
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => {
            const title = shareBtn.getAttribute('data-title') || document.title;
            const url = window.location.href || shareBtn.getAttribute('data-url') || 'https://www.brickdeal.store';
            if (navigator.share) {
              navigator.share({ title, url }).catch(console.error);
            } else {
              window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(title + ' ' + url), '_blank');
            }
          });
        }
      `}} />
    </div>
  );
}
