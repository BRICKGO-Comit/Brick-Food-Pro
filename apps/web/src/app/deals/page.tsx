'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import PublicNavbar from '@/app/components/PublicNavbar';
import PublicFooter from '@/app/components/PublicFooter';
import { useRouter, useSearchParams } from 'next/navigation';

function DealsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filterType, setFilterType] = useState('Tous');
  const [filterPack, setFilterPack] = useState('Tous');
  const [sortBy, setSortBy] = useState('Plus récents');
  const [now, setNow] = useState(new Date().getTime());
  const router = useRouter();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          restaurant:restaurants(name, address)
        `)
        .eq('is_published', true)
        .eq('status', 'validee');

      if (error) throw error;
      
      const validOffers = (data || []).filter(offer => {
        if (offer.type === 'flash') {
          return new Date(offer.end_timestamp).getTime() > new Date().getTime() && offer.quantity_remaining > 0;
        }
        return true;
      });

      setOffers(validOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (offer.restaurant?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Tous' || (filterType === '⚡ Flash' && offer.type === 'flash') || (filterType === '🎁 Deals' && offer.type === 'deal');
    const matchesPack = filterPack === 'Tous' || offer.pack_type === filterPack;
    
    return matchesSearch && matchesType && matchesPack;
  }).sort((a, b) => {
    if (sortBy === 'Plus récents') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'Prix croissant') return (a.price_promo || a.price || 0) - (b.price_promo || b.price || 0);
    if (sortBy === 'Prix décroissant') return (b.price_promo || b.price || 0) - (a.price_promo || a.price || 0);
    if (sortBy === 'Meilleure réduction') {
      const getReduction = (o: any) => o.type === 'flash' ? ((o.price_normal - o.price_promo) / o.price_normal) : 0;
      return getReduction(b) - getReduction(a);
    }
    return 0;
  });

  const formatTimeLeft = (endTime: string) => {
    const distance = new Date(endTime).getTime() - now;
    if (distance <= 0) return "Expiré";
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>🔥 Découvrez nos Bons Plans</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Les meilleures offres de vos restaurants préférés</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
          <input 
            type="text" 
            placeholder="Rechercher une offre ou un restaurant..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: '1 1 300px' }}
          />
          <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ flex: '1 1 150px' }}>
            <option>Tous</option>
            <option>⚡ Flash</option>
            <option>🎁 Deals</option>
          </select>
          <select className="form-input" value={filterPack} onChange={e => setFilterPack(e.target.value)} style={{ flex: '1 1 150px' }}>
            <option>Tous</option>
            <option>Couple</option>
            <option>Famille</option>
            <option>Anniversaire</option>
            <option>VIP</option>
            <option>Business</option>
          </select>
          <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex: '1 1 200px' }}>
            <option>Plus récents</option>
            <option>Prix croissant</option>
            <option>Prix décroissant</option>
            <option>Meilleure réduction</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Chargement...</div>
        ) : filteredOffers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
            <p>Aucune offre ne correspond à vos critères.</p>
          </div>
        ) : (
          <>
            <style dangerouslySetInnerHTML={{__html: `
              .deals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
              @media (max-width: 900px) { .deals-grid { grid-template-columns: repeat(2, 1fr); } }
              @media (max-width: 600px) { .deals-grid { grid-template-columns: 1fr; } }
            `}} />
            <div className="deals-grid">
              {filteredOffers.map(offer => (
                <div key={offer.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', height: '200px', backgroundColor: '#f1f5f9' }}>
                    {offer.photos?.[0] ? (
                      <img src={offer.photos[0]} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #f1f5f9, #e2e8f0)' }} />
                    )}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '4px 10px', borderRadius: 'var(--radius-md)', backgroundColor: offer.type === 'flash' ? 'var(--primary)' : 'var(--info)', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {offer.type === 'flash' ? '⚡ FLASH' : '🎁 DEAL'}
                    </div>
                    {offer.type === 'flash' && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success)', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        -{Math.round(((offer.price_normal - offer.price_promo) / offer.price_normal) * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{offer.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>📍 {offer.restaurant?.name}</p>
                    
                    <div style={{ marginTop: 'auto' }}>
                      {offer.type === 'flash' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{offer.price_normal} FCFA</span>
                            <span style={{ color: 'var(--success)', fontSize: '1.5rem', fontWeight: 'bold' }}>{offer.price_promo} FCFA</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 'bold', marginBottom: '1rem' }}>
                            <span>⏱ {formatTimeLeft(offer.end_timestamp)}</span>
                            <span>{offer.quantity_remaining} restants</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--info)', fontSize: '1.5rem', fontWeight: 'bold' }}>{offer.price} FCFA</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            <span>🏷 {offer.pack_type}</span>
                            <span>👥 {offer.capacity_persons} pers.</span>
                          </div>
                        </>
                      )}
                      
                      <button 
                        onClick={() => router.push(`/deals/${offer.id}`)}
                        style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Voir l'offre
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      
      <PublicFooter />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
        <PublicNavbar />
        <main style={{ flex: 1, padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          Chargement du catalogue...
        </main>
        <PublicFooter />
      </div>
    }>
      <DealsContent />
    </Suspense>
  );
}
