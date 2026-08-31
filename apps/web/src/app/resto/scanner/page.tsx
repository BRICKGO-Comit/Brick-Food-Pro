'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function RestoScanner() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [orderFound, setOrderFound] = useState<any>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [successAnim, setSuccessAnim] = useState(false);
  
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'restaurant' || !profile?.restaurant_id)) {
      router.push('/login');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio not supported", e);
    }
  };

  const checkCode = async (reservationCode: string) => {
    if (!profile?.restaurant_id || !reservationCode) return;
    
    setLoading(true);
    setOrderFound(null);
    setScanMessage('');
    setSuccessAnim(false);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, reservation_code, total_amount, quantity, status, client_id, client_name, client_phone, dining_option, delivery_address, created_at,
          client:profiles!client_id(full_name, phone),
          offer:offers!offer_id(title, type, pack_type)
        `)
        .eq('restaurant_id', profile.restaurant_id)
        .eq('reservation_code', reservationCode)
        .maybeSingle();
      
      if (error || !data) {
        setScanMessage('Code non reconnu');
      } else if (data.status === 'terminee') {
        setScanMessage('Ce pass a déjà été utilisé');
        setOrderFound(data);
      } else {
        setOrderFound(data);
      }
    } catch (err) {
      setScanMessage('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkCode(code.trim());
  };

  const validateOrder = async () => {
    if (!orderFound || !profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'terminee' })
        .eq('id', orderFound.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('order_history')
        .insert({
          order_id: orderFound.id,
          action: 'pass_valide',
          actor_id: profile.id
        });

      if (historyError) throw historyError;

      setSuccessAnim(true);
      playSuccessSound();
      setOrderFound({ ...orderFound, status: 'terminee' });
      setCode('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la validation du pass.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);
      scanVideo();
    } catch (err) {
      console.error("Camera error:", err);
      alert("Impossible d'accéder à la caméra. Veuillez utiliser la saisie manuelle.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const scanVideo = async () => {
    if (!('BarcodeDetector' in window)) {
      alert('Le scan par caméra n\'est pas supporté sur ce navigateur. Saisie manuelle requise.');
      stopCamera();
      return;
    }

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const barcodeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });

    const detect = async () => {
      if (!cameraActive || !videoRef.current) return;
      
      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const qrCode = barcodes[0].rawValue;
          setCode(qrCode);
          stopCamera();
          checkCode(qrCode);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      
      if (cameraActive) {
        requestAnimationFrame(detect);
      }
    };

    detect();
  };

  if (authLoading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="main-view" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>Scanner un Pass</h1>

      <div className="panel" style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>Saisie Manuelle</h2>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Entrez le code BRK-XXXXX" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="form-input"
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              fontSize: '1.5rem', 
              padding: '1rem', 
              textAlign: 'center',
              textTransform: 'uppercase',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-md)'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !code}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '1.1rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Vérification...' : 'Valider le Pass'}
          </button>
        </form>

        {scanMessage && !orderFound && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', textAlign: 'center', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
            {scanMessage}
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem' }}>Scan Caméra</h2>
        {!cameraActive ? (
          <button 
            onClick={startCamera}
            className="btn btn-outline"
            style={{ padding: '10px 20px', border: '2px solid var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer' }}
          >
            Démarrer la caméra
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', height: '300px', overflow: 'hidden', borderRadius: '16px', border: '4px solid var(--primary)' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', border: '2px dashed rgba(255,255,255,0.8)' }}></div>
            </div>
            <button 
              onClick={stopCamera}
              style={{ padding: '10px 20px', backgroundColor: 'var(--text-secondary)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
            >
              Arrêter la caméra
            </button>
          </div>
        )}
      </div>

      {orderFound && (
        <div className="panel" style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          {successAnim ? (
            <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '1rem' }}>Pass Validé !</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Le pass de {Array.isArray(orderFound.client) ? orderFound.client[0]?.full_name : orderFound.client?.full_name} a été enregistré avec succès.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Détails de la Réservation</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left', backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0 }}><strong>Code Pass :</strong> <span style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: '900', letterSpacing: '1px' }}>{orderFound.reservation_code}</span></p>
                <p style={{ margin: 0 }}><strong>Client :</strong> {orderFound.client_name || (Array.isArray(orderFound.client) ? orderFound.client[0]?.full_name : orderFound.client?.full_name) || 'Client'}</p>
                <p style={{ margin: 0 }}><strong>Téléphone :</strong> {orderFound.client_phone || (Array.isArray(orderFound.client) ? orderFound.client[0]?.phone : orderFound.client?.phone) || 'Non renseigné'}</p>
                <p style={{ margin: 0 }}><strong>Formule :</strong> {Array.isArray(orderFound.offer) ? orderFound.offer[0]?.title : orderFound.offer?.title}</p>
                <p style={{ margin: 0 }}><strong>Mode de consommation :</strong> <span style={{ fontWeight: '700', color: '#0F172A' }}>{orderFound.dining_option === 'livraison' ? '📦 À emporter / Livraison' : '🍽️ Sur place (au restaurant)'}</span></p>
                <p style={{ margin: 0 }}><strong>Quantité :</strong> {orderFound.quantity} formule(s)</p>
                <p style={{ margin: 0 }}><strong>Montant Réglé :</strong> <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--success)' }}>{Number(orderFound.total_amount || 0).toLocaleString('fr-FR')} FCFA</span></p>
                
                {orderFound.status === 'terminee' && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FEF2F2', color: '#DC2626', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold', border: '1px solid #FECACA' }}>
                    ⚠️ ATTENTION : Ce Pass a déjà été validé et consommé !
                  </div>
                )}
              </div>

              {orderFound.status !== 'terminee' && (
                <button 
                  onClick={validateOrder}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: 'var(--success)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {loading ? 'Validation en cours...' : '✅ Confirmer et Servir la Commande'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
