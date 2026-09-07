'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

export interface NotificationItem {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  playNotificationSound: () => void;
  requestBrowserPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Générateur de son d'alerte Web Audio API (100% autonome, zéro dépendance externe)
function playChimeSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    
    // Deux notes mélodieuses élégantes (Fa# -> La)
    osc.frequency.setValueAtTime(739.99, now); // F#5
    osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    // Les navigateurs bloquent parfois l'audio si aucune interaction utilisateur préalable n'a eu lieu
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; id: number } | null>(null);

  const playNotificationSound = useCallback(() => {
    playChimeSound();
  }, []);

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const showWebAlert = useCallback((title: string, body: string) => {
    playNotificationSound();
    setActiveToast({ title, body, id: Date.now() });
    setTimeout(() => setActiveToast(null), 5000);

    // Notification système navigateur si autorisée
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo.png',
        });
      } catch (e) {}
    }
  }, [playNotificationSound]);

  // Charger les notifications depuis Supabase
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
      }
    } catch (err) {
      console.warn('[NotificationProvider] Erreur chargement notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Écoute Realtime sur la table notifications ET la table orders (comme sur mobile)
  useEffect(() => {
    if (!user) return;

    // 1. Écoute directe de la table notifications
    const notifChannel = supabase
      .channel(`user-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);
          showWebAlert(newNotif.title, newNotif.body);
        }
      )
      .subscribe();

    // 2. Écoute directe des commandes (pour restaurants, agents et clients)
    const role = profile?.role || 'client';
    const ordersChannel = supabase
      .channel(`live-order-alerts-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          const updatedOrder = payload.new;
          if (!updatedOrder) return;

          // Restaurant : Nouvelle commande reçue
          if (payload.eventType === 'INSERT' && role === 'restaurant') {
            if (!profile?.restaurant_id || updatedOrder.restaurant_id === profile.restaurant_id) {
              const code = updatedOrder.reservation_code ? ` (${updatedOrder.reservation_code})` : '';
              showWebAlert(
                '🔔 Nouvelle Commande Restaurant !',
                `Une nouvelle réservation a été passée${code}. Préparez la formule !`
              );
            }
          }

          // Agent : Nouvelle commande
          if (payload.eventType === 'INSERT' && role === 'agent') {
            if (updatedOrder.agent_id === user.id) {
              const code = updatedOrder.reservation_code ? ` (${updatedOrder.reservation_code})` : '';
              showWebAlert(
                '💰 Nouvelle Vente & Commission !',
                `Une réservation a été validée pour votre compte${code}.`
              );
            }
          }

          // Client : Changement de statut de sa commande
          if (payload.eventType === 'UPDATE' && updatedOrder.client_id === user.id) {
            const status = updatedOrder.status;
            const code = updatedOrder.reservation_code ? ` (${updatedOrder.reservation_code})` : '';
            if (status === 'en_preparation') {
              showWebAlert('👨‍🍳 Commande en préparation', `Votre commande${code} est en cuisine !`);
            } else if (status === 'prete') {
              showWebAlert('🎉 Commande prête !', `Votre commande${code} est prête pour dégustation ou retrait !`);
            } else if (status === 'terminee' || status === 'livree') {
              showWebAlert('✅ Commande servie', `Votre commande${code} a été validée. Bon appétit !`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user, profile, showWebAlert]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        playNotificationSound,
        requestBrowserPermission,
      }}
    >
      {children}

      {/* Bannière Toast Flottante Supérieure avec Son */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
          border: '1.5px solid #334155',
          maxWidth: '380px',
          width: '100%',
          display: 'flex',
          alignItems: 'start',
          gap: '12px',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <span style={{ fontSize: '24px' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#FFFFFF' }}>
              {activeToast.title}
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '3px', lineHeight: '1.4' }}>
              {activeToast.body}
            </div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
