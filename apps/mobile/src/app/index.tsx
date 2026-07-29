import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './_layout';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import OnboardingScreen from '../components/OnboardingScreen';

const supabaseSignUpClient = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

import type { OfferWithRelations, OrderWithRelations } from '../types/database';

// Helper functions for dynamic French dates
const getFrenchDate = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];
  return `${dayNum} ${monthName}`;
};

const getTodayFormatted = () => {
  const date = new Date();
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getFutureFormatted = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getTodayYMD = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextDays = (count: number) => {
  const list = [];
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? "Auj." : i === 1 ? "Dem." : `${daysOfWeek[d.getDay()]}.`;
    const dateStr = `${d.getDate()} ${months[d.getMonth()].substring(0, 4)}.`;
    const fullStr = i === 0 ? `Aujourd'hui ${d.getDate()} ${months[d.getMonth()]}` : i === 1 ? `Demain ${d.getDate()} ${months[d.getMonth()]}` : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    list.push({ label, dateStr, fullStr });
  }
  return list;
};

// Placeholder image par défaut
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60';

// Service client BRICK DEAL
const BRICKDEAL_SERVICE_PHONE = '+2250100000000';
const BRICKDEAL_WHATSAPP = '2250100000000';

export default function MobileApp() {
  const { user, profile, role, isLoggedIn, refreshProfile } = useAuth();

  // Live ticker for countdown timers (updates every second)
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLiveCountdown = (endIsoStr?: string) => {
    if (!endIsoStr) return '02h : 45m : 30s';
    const end = new Date(endIsoStr).getTime();
    const diffMs = Math.max(0, end - Date.now());
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
  };

  // Navigation tabs states for each role
  const [clientTab, setClientTab] = useState<'home' | 'reservations' | 'profile'>('home');
  const [agentTab, setAgentTab] = useState<'home' | 'restaurants' | 'proposals' | 'orders' | 'profile'>('home');
  const [restaurantTab, setRestaurantTab] = useState<'home' | 'orders' | 'proposals' | 'profile'>('home');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'toutes' | 'en_cours' | 'terminees'>('toutes');

  // Data states (chargés depuis Supabase)
  const [flashOffers, setFlashOffers] = useState<any[]>([]);
  const [dealOffers, setDealOffers] = useState<any[]>([]);
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [agentRestaurants, setAgentRestaurants] = useState<any[]>([]);
  const [agentOrders, setAgentOrders] = useState<any[]>([]);
  const [selectedAgentOrder, setSelectedAgentOrder] = useState<any | null>(null);
  const [selectedClientOrder, setSelectedClientOrder] = useState<any | null>(null);
  const [pendingOfferAfterAuth, setPendingOfferAfterAuth] = useState<{ type: 'flash' | 'deal'; offer: any; step: number } | null>(null);
  const [showCalendarFilterModal, setShowCalendarFilterModal] = useState<boolean>(false);
  const [calendarDateFilter, setCalendarDateFilter] = useState<string | null>(null);
  const [agentStats, setAgentStats] = useState({ commission: 0, ordersCount: 0 });
  const [restaurantOrders, setRestaurantOrders] = useState<any[]>([]);
  const [restaurantProposals, setRestaurantProposals] = useState<any[]>([]);
  const [restoPropType, setRestoPropType] = useState<'flash' | 'deal'>('flash');
  const [newRestoProp, setNewRestoProp] = useState({
    title: '',
    description: '',
    price_normal: '',
    price_promo: '',
    quantity: '10',
    pack_type: 'couple',
    persons: '2',
    prestations: '',
    imageUrl: '',
    startDate: getTodayYMD(),
    endDate: getTodayYMD(),
    startTime: '18:00',
    endTime: '23:59',
  });
  const [showAddRestoPropModal, setShowAddRestoPropModal] = useState(false);

  // Image Upload states
  const [restoImageUri, setRestoImageUri] = useState<string | null>(null);
  const [agentImageUri, setAgentImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Pick Image from Gallery
  const pickImage = async (type: 'agent' | 'resto') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder aux photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (type === 'agent') {
        setAgentImageUri(uri);
      } else {
        setRestoImageUri(uri);
      }
    }
  };

  // Upload picked image to Supabase Storage Bucket 'offer-images'
  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `proposals/${fileName}`;

      const { error } = await supabase.storage
        .from('offer-images')
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('offer-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error('[UploadImage] Error:', err.message);
      throw err;
    }
  };

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Order tracking state (client)
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Checkout modal states
  const [selectedFlash, setSelectedFlash] = useState<any | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Auth flow states
  const [showClientAuthModal, setShowClientAuthModal] = useState(false);
  const [showProLoginModal, setShowProLoginModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Client info state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Pro info state
  const [proEmail, setProEmail] = useState('');
  const [proPassword, setProPassword] = useState('');

  const [showAddRestoModal, setShowAddRestoModal] = useState(false);
  const [newRestoName, setNewRestoName] = useState('');
  const [newRestoAddress, setNewRestoAddress] = useState('');
  const [newRestoPhone, setNewRestoPhone] = useState('');
  const [newRestoDesc, setNewRestoDesc] = useState('');
  const [newRestoOwnerEmail, setNewRestoOwnerEmail] = useState('');
  const [newRestoOwnerPassword, setNewRestoOwnerPassword] = useState('');
  const [newRestoLat, setNewRestoLat] = useState('');
  const [newRestoLng, setNewRestoLng] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la géolocalisation pour capturer les coordonnées GPS du restaurant.');
        setIsLocating(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setNewRestoLat(location.coords.latitude.toString());
      setNewRestoLng(location.coords.longitude.toString());
      Alert.alert('Géolocalisation réussie 📍', `Coordonnées GPS capturées :\nLatitude : ${location.coords.latitude.toFixed(6)}\nLongitude : ${location.coords.longitude.toFixed(6)}`);
    } catch (err: any) {
      Alert.alert('Erreur GPS', err.message || 'Impossible de récupérer la position GPS actuelle.');
    } finally {
      setIsLocating(false);
    }
  };

  // Form booking selections
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(14);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [deliveryMode, setDeliveryMode] = useState<'retrait' | 'livraison'>('retrait');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'mtn' | 'cb'>('wave');

  // Real-time details state variables
  const [reservationId, setReservationId] = useState<string>('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Agent proposal state
  const [proposalType, setProposalType] = useState<'flash' | 'deal'>('flash');
  const [newProp, setNewProp] = useState({
    restaurant: '',
    restaurantId: '',
    title: '',
    description: '',
    price_normal: '',
    price_promo: '',
    quantity: '10',
    pack_type: 'couple',
    persons: '2',
    prestations: '',
    imageUrl: '',
    startDate: getTodayYMD(),
    endDate: getTodayYMD(),
    startTime: '18:00',
    endTime: '23:59',
  });

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Restaurant details & edit states (for restaurant owners)
  const [restaurantDetail, setRestaurantDetail] = useState<any | null>(null);
  const [isEditingResto, setIsEditingResto] = useState(false);
  const [editRestoName, setEditRestoName] = useState('');
  const [editRestoAddress, setEditRestoAddress] = useState('');
  const [editRestoPhone, setEditRestoPhone] = useState('');
  const [editRestoDesc, setEditRestoDesc] = useState('');

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (restaurantDetail) {
      setEditRestoName(restaurantDetail.name || '');
      setEditRestoAddress(restaurantDetail.address || '');
      setEditRestoPhone(restaurantDetail.phone || '');
      setEditRestoDesc(restaurantDetail.description || '');
    }
  }, [restaurantDetail]);

  // --- CHARGEMENT DES DONNÉES DEPUIS SUPABASE ---

  // Charge les offres publiées (page d'accueil client)
  useEffect(() => {
    const loadOffers = async () => {
      const { data } = await supabase
        .from('offers')
        .select('*, restaurants(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const now = new Date();
      const flash: any[] = [];
      const deals: any[] = [];

      (data ?? []).forEach((o: any) => {
        const restoName = o.restaurants?.name ?? 'Restaurant';
        if (o.type === 'flash') {
          // Calcule le countdown depuis end_timestamp
          const end = o.end_timestamp ? new Date(o.end_timestamp) : null;
          const diffMs = end ? Math.max(0, end.getTime() - now.getTime()) : 0;
          const hours = Math.floor(diffMs / 3600000);
          const minutes = Math.floor((diffMs % 3600000) / 60000);
          const seconds = Math.floor((diffMs % 60000) / 1000);
          const oldP = Number(o.price_normal ?? 0);
          const newP = Number(o.price_promo ?? 0);
          const discount = oldP > 0 ? `-${Math.round((1 - newP / oldP) * 100)}%` : '';
          flash.push({
            id: o.id,
            title: o.title,
            restaurant: restoName,
            restaurantId: o.restaurant_id,
            agentId: o.agent_id,
            rating: '4.5',
            priceOld: oldP,
            priceNew: newP,
            quantityInitial: Number(o.quantity_initial ?? 10),
            quantityRemaining: Number(o.quantity_remaining ?? 0),
            endTimestamp: o.end_timestamp,
            image: o.photos?.[0] || DEFAULT_IMG,
            discount,
            description: o.description,
            startHour: o.start_timestamp ? new Date(o.start_timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            endHour: end ? end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            countdownHours: hours,
            countdownMinutes: minutes,
            countdownSeconds: seconds,
            commissionRate: Number(o.commission_rate ?? 10),
          });
        } else if (o.type === 'deal') {
          const oldP = Number(o.price ?? 0) * 1.3; // estimation
          const newP = Number(o.price ?? 0);
          const discount = `-${Math.round((1 - newP / oldP) * 100)}%`;
          deals.push({
            id: o.id,
            title: o.title,
            restaurant: restoName,
            restaurantId: o.restaurant_id,
            agentId: o.agent_id,
            rating: '4.8',
            priceOld: Math.round(oldP),
            priceNew: newP,
            validity: o.available_date ? `Disponible le ${new Date(o.available_date).toLocaleDateString('fr-FR')}` : '',
            persons: o.capacity_persons ?? 2,
            image: o.photos?.[0] || DEFAULT_IMG,
            discount,
            inclusions: o.description ? o.description.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            commissionRate: Number(o.commission_rate ?? 10),
          });
        }
      });

      setFlashOffers(flash);
      setDealOffers(deals);
    };
    loadOffers();
  }, []);

  // Charge les restaurants (page d'accueil client + agent)
  useEffect(() => {
    const loadRestaurants = async () => {
      const { data } = await supabase.from('restaurants').select('*').order('name');
      setRestaurantsList((data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        phone: r.phone,
        description: r.description ?? '',
        ownerEmail: '',
      })));
    };
    loadRestaurants();
  }, []);

  // Charge les réservations du client connecté
  useEffect(() => {
    if (!isLoggedIn || role !== 'client' || !user) {
      setClientOrders([]);
      return;
    }
    const loadClientOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, offers(*), restaurants(*)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      setClientOrders(data ?? []);
    };
    loadClientOrders();
  }, [isLoggedIn, role, user]);

  // Charge les données de l'agent
  useEffect(() => {
    if (!isLoggedIn || role !== 'agent' || !user) return;
    const loadAgentData = async () => {
      const { data: restos } = await supabase
        .from('restaurants')
        .select('*')
        .eq('agent_id', user.id)
        .order('name');
      setAgentRestaurants(restos ?? []);

      const { data: orders } = await supabase
        .from('orders')
        .select('*, restaurants(name, address, phone), offers(title, type), profiles!client_id(full_name, phone)')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });
      setAgentOrders(orders ?? []);
      const commission = (orders ?? []).reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0);
      setAgentStats({ commission, ordersCount: orders?.length ?? 0 });

      // Pré-remplit le restaurant par défaut pour les propositions
      if (restos && restos.length > 0) {
        setNewProp((prev) => ({ ...prev, restaurant: restos[0].name, restaurantId: restos[0].id }));
      }
    };
    loadAgentData();
  }, [isLoggedIn, role, user]);

  // Charge les commandes du restaurant
  useEffect(() => {
    if (!isLoggedIn || role !== 'restaurant' || !profile?.restaurant_id) {
      setRestaurantOrders([]);
      return;
    }
    const loadRestaurantOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, profiles!client_id(full_name, phone), offers(title)')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });
      setRestaurantOrders(data ?? []);
    };
    loadRestaurantOrders();
  }, [isLoggedIn, role, profile]);

  // Charge les détails du restaurant (pour le propriétaire connecté)
  useEffect(() => {
    if (!isLoggedIn || role !== 'restaurant' || !profile?.restaurant_id) {
      setRestaurantDetail(null);
      return;
    }
    const loadRestaurantDetail = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single();
      if (error) {
        console.error('[loadRestaurantDetail] Error:', error.message);
      } else {
        setRestaurantDetail(data);
      }
    };
    loadRestaurantDetail();
  }, [isLoggedIn, role, profile]);

  // Charge les propositions du restaurant
  useEffect(() => {
    if (!isLoggedIn || role !== 'restaurant' || !profile?.restaurant_id) {
      setRestaurantProposals([]);
      return;
    }
    const loadRestaurantProposals = async () => {
      const { data } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });
      setRestaurantProposals(data ?? []);
    };
    loadRestaurantProposals();
  }, [isLoggedIn, role, profile]);

  // --- REALTIME SUBSCRIPTIONS ---

  // Listen for notifications (all roles)
  useEffect(() => {
    if (!isLoggedIn || !user) return;
    // Load initial notifications
    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter((n: any) => !n.is_read).length);
    };
    loadNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('notifications-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Show alert for restaurant/agent
        if (role === 'restaurant' || role === 'agent') {
          Alert.alert(payload.new.title, payload.new.body);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn, user, role]);

  // Realtime tracking for a specific order (client side)
  useEffect(() => {
    if (!trackedOrder) return;
    const channel = supabase
      .channel('order-track-' + trackedOrder.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${trackedOrder.id}`,
      }, (payload: any) => {
        setTrackedOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
        // Also update in clientOrders list
        setClientOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    // Load order history
    const loadHistory = async () => {
      const { data } = await supabase
        .from('order_history')
        .select('*, profiles!actor_id(full_name)')
        .eq('order_id', trackedOrder.id)
        .order('created_at', { ascending: true });
      setOrderHistory(data ?? []);
    };
    loadHistory();

    // Also listen for history changes
    const histChannel = supabase
      .channel('order-history-' + trackedOrder.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_history',
        filter: `order_id=eq.${trackedOrder.id}`,
      }, (payload: any) => {
        setOrderHistory(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(histChannel);
    };
  }, [trackedOrder?.id]);

  // Helper: open WhatsApp
  const openWhatsApp = (orderId?: string) => {
    const message = orderId
      ? `Bonjour BRICK DEAL, j'ai besoin d'aide pour ma commande ${orderId}. Merci !`
      : `Bonjour BRICK DEAL, j'ai besoin d'aide. Merci !`;
    Linking.openURL(`https://wa.me/${BRICKDEAL_WHATSAPP}?text=${encodeURIComponent(message)}`);
  };

  // Helper: call service client
  const callServiceClient = () => {
    Linking.openURL(`tel:${BRICKDEAL_SERVICE_PHONE}`);
  };

  // Mark notifications as read
  const markNotificationsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Ticking countdown timer for Flash offers
  useEffect(() => {
    let timer: any;
    if (selectedFlash) {
      setCountdown({
        hours: selectedFlash.countdownHours || 0,
        minutes: selectedFlash.countdownMinutes || 0,
        seconds: selectedFlash.countdownSeconds || 0,
      });

      timer = setInterval(() => {
        setCountdown(prev => {
          let { hours, minutes, seconds } = prev;
          if (seconds > 0) {
            seconds--;
          } else {
            seconds = 59;
            if (minutes > 0) {
              minutes--;
            } else {
              minutes = 59;
              if (hours > 0) {
                hours--;
              } else {
                clearInterval(timer);
              }
            }
          }
          return { hours, minutes, seconds };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedFlash]);

  // --- HANDLERS ---

  const handleSelectFlash = (item: any) => {
    setSelectedFlash(item);
    setBookingStep(0);
    setBookingDate('Demain ' + getFrenchDate(1));
    setBookingTime(item.startHour);
    setBookingQty(1);
    setDeliveryMode('retrait');
    setReservationId('BF' + Math.floor(100000 + Math.random() * 900000));
  };

  const handleSelectDeal = (item: any) => {
    setSelectedDeal(item);
    setBookingStep(0);
    setBookingDate('Demain ' + getFrenchDate(1));
    setBookingTime('19h00');
    setBookingQty(1);
    setDeliveryMode('retrait');
    setReservationId('BD' + Math.floor(100000 + Math.random() * 900000));
  };

  // Crée une commande en base (checkout final)
  const handleCreateOrder = async () => {
    if (!user) return;
    const offer = selectedFlash || selectedDeal;
    if (!offer) return;

    const unitPrice = selectedFlash ? selectedFlash.priceNew : selectedDeal.priceNew;
    const totalAmount = unitPrice * bookingQty;
    const commissionAmount = Math.round((totalAmount * (offer.commissionRate || 10)) / 100);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        client_id: user.id,
        restaurant_id: offer.restaurantId,
        offer_id: offer.id,
        agent_id: offer.agentId,
        status: 'nouvelle',
        delivery_mode: deliveryMode,
        quantity: bookingQty,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'paid',
        reservation_code: reservationId,
      })
      .select('id')
      .single();

    if (error) {
      Alert.alert('Erreur', `Impossible de créer la commande: ${error.message}`);
      return;
    }

    // Historique initial
    if (data) {
      await supabase.from('order_history').insert({
        order_id: data.id,
        action: 'creee',
        actor_id: user.id,
      });

      // --- NOTIFICATIONS ---
      const offerType = selectedFlash ? 'Flash ⚡' : 'Deal ❤️';
      const notifTitle = `Nouvelle commande ${offerType}`;
      const notifBody = `${offer.title} — ${totalAmount.toLocaleString('fr-FR')} FCFA (${bookingQty} pers.) par ${profile?.full_name || 'Client'}`;
      const notificationsToInsert: any[] = [];

      // 1. Notify restaurant owner
      const { data: restoOwner } = await supabase
        .from('profiles')
        .select('id')
        .eq('restaurant_id', offer.restaurantId)
        .single();
      if (restoOwner) {
        notificationsToInsert.push({
          user_id: restoOwner.id,
          order_id: data.id,
          title: '🍽️ ' + notifTitle,
          body: notifBody + ' — Préparez la commande !',
          type: 'new_order',
        });
      }

      // 2. Notify agent
      if (offer.agentId) {
        notificationsToInsert.push({
          user_id: offer.agentId,
          order_id: data.id,
          title: '💰 ' + notifTitle,
          body: notifBody + ` — Commission: ${commissionAmount.toLocaleString('fr-FR')} FCFA`,
          type: 'new_order',
        });
      }

      // 3. Notify all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      (admins ?? []).forEach((admin: any) => {
        notificationsToInsert.push({
          user_id: admin.id,
          order_id: data.id,
          title: '📊 ' + notifTitle,
          body: notifBody,
          type: 'new_order',
        });
      });

      if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert);
      }
    }

    // Recharge les commandes client
    const { data: updatedOrders } = await supabase
      .from('orders')
      .select('*, offers(*), restaurants(*)')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });
    setClientOrders(updatedOrders ?? []);

    // Passe à l'écran de succès
    setBookingStep(4);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    if (user) {
      await supabase.from('order_history').insert({
        order_id: orderId,
        action: nextStatus,
        actor_id: user.id,
      });
    }
    // Recharge
    if (profile?.restaurant_id) {
      const { data } = await supabase
        .from('orders')
        .select('*, profiles!client_id(full_name, phone), offers(title)')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });
      setRestaurantOrders(data ?? []);
    }
    Alert.alert('Succès', `Commande mise à jour : ${nextStatus}`);
  };

  // Auth client (signup / login)
  const handleClientAuth = async () => {
    if (!clientEmail || !clientPassword || (isSignup && !clientName)) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs nécessaires.');
      return;
    }
    setAuthLoading(true);
    try {
      if (isSignup) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: clientEmail.trim(),
          password: clientPassword,
          options: { data: { full_name: clientName, phone: clientPhone, role: 'client' } },
        });
        if (error) throw error;

        // Explicitly update profiles table with phone and full_name
        if (signUpData?.user?.id) {
          await supabase.from('profiles').update({
            phone: clientPhone ? clientPhone.trim() : null,
            full_name: clientName ? clientName.trim() : null,
          }).eq('id', signUpData.user.id);
          await refreshProfile(signUpData.user.id);
        }
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: clientEmail.trim(),
          password: clientPassword,
        });
        if (error) throw error;

        if (signInData?.user?.id) {
          await refreshProfile(signInData.user.id);
        }
      }
      setShowClientAuthModal(false);
      if (pendingOfferAfterAuth) {
        if (pendingOfferAfterAuth.type === 'flash') {
          setSelectedFlash(pendingOfferAfterAuth.offer);
        } else {
          setSelectedDeal(pendingOfferAfterAuth.offer);
        }
        setBookingStep(pendingOfferAfterAuth.step || 1);
        setPendingOfferAfterAuth(null);
      } else if (selectedFlash || selectedDeal) {
        setBookingStep(3);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de l\'authentification');
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth pro (agent / restaurant)
  const handleProLogin = async () => {
    if (!proEmail || !proPassword) {
      Alert.alert('Erreur', 'Veuillez saisir votre email et votre mot de passe.');
      return;
    }
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: proEmail.trim(),
        password: proPassword,
      });
      if (error) throw error;

      // 1) Vérifie le rôle via user_metadata (disponible immédiatement, pas de RLS)
      const metaRole = data.user?.user_metadata?.role as string | undefined;

      // 2) Fallback : requête profiles avec retry (le trigger handle_new_user peut avoir un léger délai)
      let role = metaRole;
      if (!role) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: prof, error: profError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          if (prof?.role) {
            role = prof.role;
            break;
          }
          console.log(`[ProLogin] Tentative ${attempt + 1}/3 — profil introuvable, retry dans 1s…`, profError?.message || '');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('[ProLogin] Résultat rôle — metadata:', metaRole, 'profil:', role);

      if (!role || (role !== 'agent' && role !== 'restaurant')) {
        console.warn('[ProLogin] ACCÈS REFUSÉ — metaRole:', metaRole, 'profileRole:', role, 'userId:', data.user.id);
        Alert.alert(
          'Accès refusé',
          'Ce compte n\'est pas un compte professionnel. Vérifiez que votre profil a le rôle "agent" ou "restaurant".',
        );
        await supabase.auth.signOut();
        return;
      }

      setShowProLoginModal(false);
      if (role === 'agent') {
        setAgentTab('home');
      } else {
        setRestaurantTab('home');
      }
      await refreshProfile(data.user.id);
      Alert.alert('Connexion Réussie', `Bienvenue dans votre espace ${role === 'agent' ? 'Agent Commercial' : 'Restaurant Partenaire'}.`);
    } catch (err: any) {
      console.error('[ProLogin] Erreur:', err.message);
      Alert.alert('Erreur de connexion', err.message || 'Identifiants incorrects');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClientTab('home');
  };

  // Crée une proposition d'offre (restaurant)
  const handleCreateRestoProposal = async () => {
    if (!user || !profile?.restaurant_id) {
      Alert.alert('Erreur', 'Non authentifié ou restaurant non associé.');
      return;
    }

    // --- FORM VALIDATION ---
    if (!newRestoProp.title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le titre de l\'offre (ex: Menu Burger Duo).');
      return;
    }

    const descText = restoPropType === 'flash' ? newRestoProp.description : newRestoProp.prestations;
    if (!descText.trim()) {
      Alert.alert('Champ requis', 'Veuillez fournir une description ou la liste des prestations de l\'offre.');
      return;
    }

    if (restoPropType === 'flash') {
      const priceNormalNum = Number(newRestoProp.price_normal);
      const pricePromoNum = Number(newRestoProp.price_promo);
      const quantityNum = Number(newRestoProp.quantity);

      if (!newRestoProp.price_normal || isNaN(priceNormalNum) || priceNormalNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix normal (barré) de l\'offre (ex: 12000).');
        return;
      }

      if (!newRestoProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix promo de l\'offre (ex: 6000).');
        return;
      }

      if (pricePromoNum >= priceNormalNum) {
        Alert.alert('Prix invalide', 'Le prix promo doit être strictement inférieur au prix normal barré.');
        return;
      }

      if (!newRestoProp.quantity || isNaN(quantityNum) || quantityNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer une quantité d\'offres disponible valide (ex: 10).');
        return;
      }
    } else {
      const pricePromoNum = Number(newRestoProp.price_promo);
      if (!newRestoProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix du pack Deal (ex: 15000).');
        return;
      }
    }

    const insertData: any = {
      restaurant_id: profile.restaurant_id,
      agent_id: restaurantDetail?.agent_id || null, // Associe l'agent attribué au restaurant s'il existe
      type: restoPropType,
      title: newRestoProp.title.trim(),
      description: descText.trim(),
      status: 'en_attente',
      is_confirmed: true, // Confirmé d'office car soumis par le restaurant
      commission_rate: 10.00, // Taux par défaut
    };

    let uploadedUrl = null;
    if (restoImageUri) {
      setUploadingImage(true);
      try {
        uploadedUrl = await uploadImage(restoImageUri);
      } catch (err: any) {
        Alert.alert('Erreur Image', "Impossible d'enregistrer l'image. L'offre sera créée sans image.");
      } finally {
        setUploadingImage(false);
      }
    }

    insertData.photos = uploadedUrl ? [uploadedUrl] : (newRestoProp.imageUrl ? [newRestoProp.imageUrl] : []);

    if (restoPropType === 'flash') {
      insertData.price_normal = Number(newRestoProp.price_normal) || null;
      insertData.price_promo = Number(newRestoProp.price_promo) || null;
      insertData.quantity_initial = Number(newRestoProp.quantity) || null;
      insertData.quantity_remaining = Number(newRestoProp.quantity) || null;

      const startDateVal = newRestoProp.startDate || getTodayYMD();
      const startTimeVal = newRestoProp.startTime || '18:00';
      const endDateVal = newRestoProp.endDate || startDateVal;
      const endTimeVal = newRestoProp.endTime || '23:59';

      try {
        insertData.start_timestamp = new Date(`${startDateVal}T${startTimeVal}:00`).toISOString();
      } catch {
        insertData.start_timestamp = new Date().toISOString();
      }

      try {
        insertData.end_timestamp = new Date(`${endDateVal}T${endTimeVal}:00`).toISOString();
      } catch {
        const fallbackEnd = new Date();
        fallbackEnd.setHours(fallbackEnd.getHours() + 4);
        insertData.end_timestamp = fallbackEnd.toISOString();
      }
    } else {
      insertData.pack_type = newRestoProp.pack_type;
      insertData.price = Number(newRestoProp.price_promo) || null;
      insertData.capacity_persons = Number(newRestoProp.persons) || null;
    }

    const { error } = await supabase.from('offers').insert(insertData);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    // Send notification to Admin Dashboard
    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const adminNotifs = admins.map((a) => ({
          user_id: a.id,
          title: '📩 Nouvelle proposition d\'offre',
          body: `Le restaurant a soumis l'offre "${insertData.title}" pour validation.`,
          is_read: false,
        }));
        await supabase.from('notifications').insert(adminNotifs);
      }
    } catch (e) {
      console.warn('[AdminNotif] Error:', e);
    }

    Alert.alert('Proposition soumise', `Votre proposition "${newRestoProp.title}" a été envoyée pour validation par l'administration.`);
    
    // Reset form
    setNewRestoProp({
      title: '',
      description: '',
      price_normal: '',
      price_promo: '',
      quantity: '10',
      pack_type: 'couple',
      persons: '2',
      prestations: '',
      imageUrl: '',
      startDate: getTodayYMD(),
      endDate: getTodayYMD(),
      startTime: '18:00',
      endTime: '23:59',
    });
    setRestoImageUri(null);
    setShowAddRestoPropModal(false);

    // Refresh proposals list
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false });
    setRestaurantProposals(data ?? []);
  };

  // Crée une proposition d'offre (agent)
  const handleCreateProposal = async () => {
    if (!user || !newProp.restaurantId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un restaurant rattaché.');
      return;
    }

    // --- FORM VALIDATION ---
    if (!newProp.title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le titre de l\'offre (ex: Formule Grillade Duo).');
      return;
    }

    const descText = proposalType === 'flash' ? newProp.description : newProp.prestations;
    if (!descText.trim()) {
      Alert.alert('Champ requis', 'Veuillez fournir une description ou la liste des prestations de l\'offre.');
      return;
    }

    if (proposalType === 'flash') {
      const priceNormalNum = Number(newProp.price_normal);
      const pricePromoNum = Number(newProp.price_promo);
      const quantityNum = Number(newProp.quantity);

      if (!newProp.price_normal || isNaN(priceNormalNum) || priceNormalNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix normal (barré) de l\'offre (ex: 12000).');
        return;
      }

      if (!newProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix promo de l\'offre (ex: 6000).');
        return;
      }

      if (pricePromoNum >= priceNormalNum) {
        Alert.alert('Prix invalide', 'Le prix promo doit être strictement inférieur au prix normal barré.');
        return;
      }

      if (!newProp.quantity || isNaN(quantityNum) || quantityNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer une quantité d\'offres disponible valide (ex: 10).');
        return;
      }
    } else {
      const pricePromoNum = Number(newProp.price_promo);
      if (!newProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix du pack Deal (ex: 15000).');
        return;
      }
    }

    const insertData: any = {
      agent_id: user.id,
      restaurant_id: newProp.restaurantId,
      type: proposalType,
      title: newProp.title.trim(),
      description: descText.trim(),
      status: 'en_attente',
    };

    // Gère l'upload de l'image si sélectionnée
    let uploadedUrl = null;
    if (agentImageUri) {
      setUploadingImage(true);
      try {
        uploadedUrl = await uploadImage(agentImageUri);
      } catch (err: any) {
        Alert.alert('Erreur Image', "Impossible d'enregistrer l'image. L'offre sera créée sans image.");
      } finally {
        setUploadingImage(false);
      }
    }

    insertData.photos = uploadedUrl ? [uploadedUrl] : (newProp.imageUrl ? [newProp.imageUrl] : []);

    if (proposalType === 'flash') {
      insertData.price_normal = Number(newProp.price_normal) || null;
      insertData.price_promo = Number(newProp.price_promo) || null;
      insertData.quantity_initial = Number(newProp.quantity) || null;
      insertData.quantity_remaining = Number(newProp.quantity) || null;

      const startDateVal = newProp.startDate || getTodayYMD();
      const startTimeVal = newProp.startTime || '18:00';
      const endDateVal = newProp.endDate || startDateVal;
      const endTimeVal = newProp.endTime || '23:59';

      try {
        insertData.start_timestamp = new Date(`${startDateVal}T${startTimeVal}:00`).toISOString();
      } catch {
        insertData.start_timestamp = new Date().toISOString();
      }

      try {
        insertData.end_timestamp = new Date(`${endDateVal}T${endTimeVal}:00`).toISOString();
      } catch {
        const fallbackEnd = new Date();
        fallbackEnd.setHours(fallbackEnd.getHours() + 4);
        insertData.end_timestamp = fallbackEnd.toISOString();
      }
    } else {
      insertData.pack_type = newProp.pack_type;
      insertData.price = Number(newProp.price_promo) || null;
      insertData.capacity_persons = Number(newProp.persons) || null;
    }

    const { error } = await supabase.from('offers').insert(insertData);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    // Send notification to Admin Dashboard
    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const adminNotifs = admins.map((a) => ({
          user_id: a.id,
          title: '📩 Nouvelle proposition d\'offre',
          body: `L'agent commercial a soumis l'offre "${insertData.title}" pour validation.`,
          is_read: false,
        }));
        await supabase.from('notifications').insert(adminNotifs);
      }
    } catch (e) {
      console.warn('[AdminNotif] Error:', e);
    }

    Alert.alert('Proposition soumise', `Votre proposition "${newProp.title}" a été envoyée en statut EN ATTENTE.`);
    setNewProp({
      restaurant: newProp.restaurant,
      restaurantId: newProp.restaurantId,
      title: '',
      description: '',
      price_normal: '',
      price_promo: '',
      quantity: '10',
      pack_type: 'couple',
      persons: '2',
      prestations: '',
      imageUrl: '',
      startDate: getTodayYMD(),
      endDate: getTodayYMD(),
      startTime: '18:00',
      endTime: '23:59',
    });
    setAgentImageUri(null);
  };

  const handleAddRestaurant = async () => {
    if (!user) return;

    if (!newRestoName.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom de l\'établissement.');
      return;
    }
    if (!newRestoAddress.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir l\'adresse de l\'établissement.');
      return;
    }
    if (!newRestoPhone.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le numéro de téléphone de contact.');
      return;
    }
    if (!newRestoOwnerEmail.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir l\'email de connexion du propriétaire.');
      return;
    }
    if (!newRestoOwnerPassword || newRestoOwnerPassword.length < 6) {
      Alert.alert('Mot de passe requis', 'Veuillez définir un mot de passe d\'au moins 6 caractères pour le propriétaire.');
      return;
    }
    const { data: restoData, error } = await supabase.from('restaurants').insert({
      name: newRestoName,
      address: newRestoAddress,
      phone: newRestoPhone,
      description: newRestoDesc,
      latitude: newRestoLat ? parseFloat(newRestoLat) : null,
      longitude: newRestoLng ? parseFloat(newRestoLng) : null,
      agent_id: user.id,
    }).select('id').single();
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    const restaurantId = restoData?.id;

    // Crée le compte propriétaire avec restaurant_id dans les metadata
    if (newRestoOwnerEmail && newRestoOwnerPassword && restaurantId) {
      await supabaseSignUpClient.auth.signUp({
        email: newRestoOwnerEmail.trim(),
        password: newRestoOwnerPassword,
        options: { data: { full_name: newRestoName, role: 'restaurant', restaurant_id: restaurantId } },
      });
    }
    Alert.alert(
      'Établissement enregistré !',
      `Le restaurant "${newRestoName}" a été créé.\n\nVeuillez transmettre ces coordonnées au propriétaire pour se connecter sur l'app :\n\nEmail : ${newRestoOwnerEmail}\nMot de passe : ${newRestoOwnerPassword}`
    );
    setShowAddRestoModal(false);
    setNewRestoName(''); setNewRestoAddress(''); setNewRestoPhone(''); setNewRestoDesc('');
    setNewRestoOwnerEmail(''); setNewRestoOwnerPassword('');
    setNewRestoLat(''); setNewRestoLng('');
    // Recharge
    const { data: restos } = await supabase.from('restaurants').select('*').eq('agent_id', user.id).order('name');
    setAgentRestaurants(restos ?? []);
  };

  // Met à jour le profil de l'utilisateur (client, agent ou restaurateur)
  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        phone: editPhone,
      })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Votre profil a été mis à jour.');
      setIsEditingProfile(false);
      await refreshProfile(user.id);
    }
  };

  // Met à jour la fiche du restaurant (pour les restaurateurs)
  const handleUpdateRestaurant = async () => {
    if (!profile?.restaurant_id) return;
    if (!editRestoName.trim() || !editRestoAddress.trim() || !editRestoPhone.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom, l\'adresse et le téléphone.');
      return;
    }
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: editRestoName,
        address: editRestoAddress,
        phone: editRestoPhone,
        description: editRestoDesc,
      })
      .eq('id', profile.restaurant_id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Les informations du restaurant ont été mises à jour.');
      setIsEditingResto(false);
      // Recharger les données du restaurant
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single();
      if (data) setRestaurantDetail(data);
    }
  };

  // --- VIEW 1: AUTH LOGIN GATEWAY REMOVED ---
  // Guest Client is shown by default at startup

  // --- VIEW 2: CLIENT PORTAL ---
  if (role === 'client') {
    if (selectedFlash || selectedDeal) {
      return (
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* STEP 0: DETAILS VIEW (REDESIGNED ULTRA PREMIUM) */}
          {bookingStep === 0 && (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                {/* Hero Image Header with Translucent Controls */}
                <View style={{ position: 'relative', width: '100%', height: 280 }}>
                  <Image
                    source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />

                  {/* Gradient Back overlay buttons */}
                  <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => { setSelectedDeal(null); setSelectedFlash(null); }}
                    >
                      <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => openWhatsApp(selectedFlash?.id || selectedDeal?.id)}
                      >
                        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="heart-outline" size={22} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Floating Discount & Offer Badge */}
                  <View style={{ position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: '900' }}>
                        {selectedFlash ? selectedFlash.discount : selectedDeal?.discount}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: 'rgba(17, 24, 39, 0.85)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name={selectedFlash ? 'flash' : 'flame'} size={12} color={selectedFlash ? '#F5A623' : Colors.primary} />
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                        {selectedFlash ? 'OFFRE FLASH ⚡' : 'DEAL SPÉCIAL ❤️'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Main Content Body */}
                <View style={{ padding: 20, gap: 16 }}>
                  {/* Title & Rating */}
                  <View>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', lineHeight: 30 }}>
                      {selectedFlash ? selectedFlash.title : selectedDeal?.title}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="restaurant" size={16} color={Colors.primary} />
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                          {selectedFlash ? selectedFlash.restaurant : selectedDeal?.restaurant}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 }}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#D97706' }}>
                          {selectedFlash ? '4.7 (128 avis)' : '4.9 (256 avis)'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Pricing Box */}
                  <View style={{ backgroundColor: '#FFF5F5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBEB', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                      <Text style={{ fontSize: 26, fontWeight: '900', color: Colors.primary }}>
                        {(selectedFlash ? selectedFlash.priceNew : selectedDeal?.priceNew)?.toLocaleString()} FCFA
                      </Text>
                      <Text style={{ fontSize: 15, color: '#9CA3AF', textDecorationLine: 'line-through' }}>
                        {(selectedFlash ? selectedFlash.priceOld : selectedDeal?.priceOld)?.toLocaleString()} FCFA
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="gift" size={16} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                        Vous économisez {((selectedFlash ? selectedFlash.priceOld - selectedFlash.priceNew : (selectedDeal?.priceOld || 0) - (selectedDeal?.priceNew || 0)))?.toLocaleString()} FCFA !
                      </Text>
                    </View>
                  </View>

                  {/* Live Urgency Countdown Ticker & Stock Progress */}
                  <View style={{ backgroundColor: '#111827', padding: 16, borderRadius: 16, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="time-outline" size={16} color={Colors.primary} />
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Temps restant</Text>
                      </View>

                      <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
                        {selectedFlash ? formatLiveCountdown(selectedFlash.endTimestamp) : '04h : 12m : 45s'}
                      </Text>
                    </View>

                    {/* Stock Counter Bar */}
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                          🔥 {selectedFlash ? (selectedFlash.quantityInitial - selectedFlash.quantityRemaining) : 7} réservation(s) effectuée(s)
                        </Text>
                        <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '800' }}>
                          Plus que {selectedFlash ? selectedFlash.quantityRemaining : 3} dispo !
                        </Text>
                      </View>

                      <View style={{ height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' }}>
                        <View
                          style={{
                            height: '100%',
                            backgroundColor: Colors.primary,
                            width: `${selectedFlash ? Math.min(100, Math.max(20, ((selectedFlash.quantityInitial - selectedFlash.quantityRemaining) / selectedFlash.quantityInitial) * 100)) : 70}%`
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Offer Characteristics / Details */}
                  <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>Détails de l'offre</Text>

                    <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20 }}>
                      {selectedFlash ? selectedFlash.description : (selectedDeal?.inclusions?.join(' • ') || 'Formule complète spéciale gastronome.')}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
                        <Ionicons name="people-outline" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>
                          {selectedFlash ? 'Pour 1 Personne' : `Pour ${selectedDeal?.persons || 2} Personnes`}
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary }}
                        onPress={() => {
                          if (!isLoggedIn) {
                            setPendingOfferAfterAuth({
                              type: selectedFlash ? 'flash' : 'deal',
                              offer: selectedFlash || selectedDeal,
                              step: 1
                            });
                            setIsSignup(false);
                            setShowClientAuthModal(true);
                          } else {
                            setBookingStep(1);
                          }
                        }}
                      >
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>
                          Aujourd'hui & Demain 📅
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Guaranteed Pillars */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }}>
                      <Ionicons name="flash-outline" size={20} color={Colors.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#111827', marginTop: 4 }}>Instantané</Text>
                      <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>Pass QR direct</Text>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#111827', marginTop: 4 }}>Garanti</Text>
                      <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>Resto vérifié</Text>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }}>
                      <Ionicons name="headset-outline" size={20} color="#9333EA" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#111827', marginTop: 4 }}>Support</Text>
                      <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>WhatsApp 24/7</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Sticky Fixed Bottom Bar */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6 }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>Prix avec réduction</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primary }}>
                    {(selectedFlash ? selectedFlash.priceNew : selectedDeal?.priceNew)?.toLocaleString()} FCFA
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
                  onPress={() => {
                    if (!isLoggedIn) {
                      setPendingOfferAfterAuth({
                        type: selectedFlash ? 'flash' : 'deal',
                        offer: selectedFlash || selectedDeal,
                        step: 1
                      });
                      setIsSignup(false);
                      setShowClientAuthModal(true);
                    } else {
                      setBookingStep(1);
                    }
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '900' }}>
                    {selectedFlash ? '⚡ J\'en profite' : '❤️ Je réserve'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 1: OPTIONS / DATE & TIME */}
          {bookingStep === 1 && (
            <View style={{ flex: 1 }}>
              {/* Header for Step 1 */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setBookingStep(0)}>
                  <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>{selectedFlash ? "J'en profite" : "Je réserve"}</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.formTitle}>1. Choisissez votre date</Text>
                
                {/* Horizontal scrollable date cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateCardScroll} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                  {getNextDays(8).map((day, idx) => {
                    const isSelected = bookingDate === day.fullStr;
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.dateCardOption, isSelected && styles.dateCardOptionActive]} 
                        onPress={() => setBookingDate(day.fullStr)}
                      >
                        <Text style={[styles.dateCardLabel, isSelected && { color: 'white', fontWeight: '700' }]}>{day.label}</Text>
                        <Text style={[styles.dateCardNumber, isSelected && { color: 'white', fontWeight: '900' }]}>{day.dateStr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Manual input for custom date selection */}
                <View style={styles.customDateInputContainer}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.customDateInput}
                    placeholder="Saisir manuellement (ex: 20 Décembre)..."
                    placeholderTextColor="#9CA3AF"
                    value={bookingDate}
                    onChangeText={(text) => setBookingDate(text)}
                  />
                  {bookingDate.length > 0 && (
                    <TouchableOpacity onPress={() => setBookingDate('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.formTitle}>2. Choisissez l'heure</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: bookingTime ? Colors.primary : '#E5E7EB',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginTop: 8,
                    marginBottom: 4,
                  }}
                  onPress={() => {
                    if (bookingTime) {
                      const parts = bookingTime.replace('h', ':').split(':');
                      setPickerHour(parseInt(parts[0]) || 14);
                      setPickerMinute(parseInt(parts[1]) || 0);
                    }
                    setShowTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color={bookingTime ? Colors.primary : Colors.textSecondary} style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, fontSize: 15, color: bookingTime ? Colors.textPrimary : '#9CA3AF', fontWeight: bookingTime ? '600' : '400' }}>
                    {bookingTime || 'Appuyez pour choisir l\'heure'}
                  </Text>
                  {bookingTime ? (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setBookingTime(''); }}>
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  )}
                </TouchableOpacity>

                {/* Time Picker Modal */}
                <Modal visible={showTimePicker} transparent animationType="slide">
                  <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
                      {/* Header */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 }}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={{ fontSize: 15, color: Colors.textSecondary }}>Annuler</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.textPrimary }}>Choisir l'heure</Text>
                        <TouchableOpacity onPress={() => {
                          const h = String(pickerHour).padStart(2, '0');
                          const m = String(pickerMinute).padStart(2, '0');
                          setBookingTime(`${h}h${m}`);
                          setShowTimePicker(false);
                        }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>Confirmer</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

                      {/* Picker Wheels */}
                      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }}>
                        {/* Hours wheel */}
                        <View style={{ width: 100, height: 180 }}>
                          <Text style={{ textAlign: 'center', fontSize: 11, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>HEURES</Text>
                          <ScrollView
                            showsVerticalScrollIndicator={false}
                            snapToInterval={44}
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingVertical: 44 }}
                            onMomentumScrollEnd={(e) => {
                              const idx = Math.round(e.nativeEvent.contentOffset.y / 44);
                              setPickerHour(Math.min(23, Math.max(0, idx)));
                            }}
                            contentOffset={{ x: 0, y: pickerHour * 44 }}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <TouchableOpacity key={i} onPress={() => setPickerHour(i)} style={{ height: 44, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: pickerHour === i ? 28 : 18, fontWeight: pickerHour === i ? '800' : '400', color: pickerHour === i ? Colors.primary : '#CCC' }}>
                                  {String(i).padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          {/* Selection indicator */}
                          <View pointerEvents="none" style={{ position: 'absolute', top: 44 + 17, left: 10, right: 10, height: 44, borderTopWidth: 2, borderBottomWidth: 2, borderColor: Colors.primary + '30', borderRadius: 8 }} />
                        </View>

                        <Text style={{ fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 8 }}>:</Text>

                        {/* Minutes wheel */}
                        <View style={{ width: 100, height: 180 }}>
                          <Text style={{ textAlign: 'center', fontSize: 11, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>MINUTES</Text>
                          <ScrollView
                            showsVerticalScrollIndicator={false}
                            snapToInterval={44}
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingVertical: 44 }}
                            onMomentumScrollEnd={(e) => {
                              const idx = Math.round(e.nativeEvent.contentOffset.y / 44);
                              const mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
                              setPickerMinute(mins[Math.min(mins.length - 1, Math.max(0, idx))]);
                            }}
                            contentOffset={{ x: 0, y: ([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].indexOf(pickerMinute) || 0) * 44 }}
                          >
                            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                              <TouchableOpacity key={m} onPress={() => setPickerMinute(m)} style={{ height: 44, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: pickerMinute === m ? 28 : 18, fontWeight: pickerMinute === m ? '800' : '400', color: pickerMinute === m ? Colors.primary : '#CCC' }}>
                                  {String(m).padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          {/* Selection indicator */}
                          <View pointerEvents="none" style={{ position: 'absolute', top: 44 + 17, left: 10, right: 10, height: 44, borderTopWidth: 2, borderBottomWidth: 2, borderColor: Colors.primary + '30', borderRadius: 8 }} />
                        </View>
                      </View>

                      {/* Preview */}
                      <View style={{ alignItems: 'center', paddingBottom: 8 }}>
                        <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Heure sélectionnée</Text>
                        <Text style={{ fontSize: 36, fontWeight: '900', color: Colors.primary, marginTop: 4 }}>
                          {String(pickerHour).padStart(2, '0')}h{String(pickerMinute).padStart(2, '0')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Modal>

                {/* Quantity and comment récupérer for Flash */}
                {selectedFlash && (
                  <>
                    <Text style={styles.formTitle}>3. Quantité</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setBookingQty(q => Math.max(1, q - 1))}><Text>-</Text></TouchableOpacity>
                      <Text style={styles.qtyVal}>{bookingQty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setBookingQty(q => q + 1)}><Text>+</Text></TouchableOpacity>
                    </View>
                    
                    <Text style={styles.formTitle}>4. Comment récupérer ?</Text>
                    <View style={{ marginVertical: 8 }}>
                      <TouchableOpacity style={[styles.deliveryOptionRow, deliveryMode === 'retrait' && styles.deliveryOptionActive]} onPress={() => setDeliveryMode('retrait')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.radioOutlineSmall}>
                            {deliveryMode === 'retrait' && <View style={styles.radioDotSmall} />}
                          </View>
                          <Text style={styles.deliveryOptionLabel}>Je récupère au restaurant</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deliveryOptionRow, deliveryMode === 'livraison' && styles.deliveryOptionActive]} onPress={() => setDeliveryMode('livraison')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.radioOutlineSmall}>
                            {deliveryMode === 'livraison' && <View style={styles.radioDotSmall} />}
                          </View>
                          <Text style={styles.deliveryOptionLabel}>Livraison à domicile</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Selected Pack Card Summary */}
                <Text style={styles.formTitle}>Pack sélectionné</Text>
                <View style={styles.selectedPackCard}>
                  <Image source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }} style={styles.selectedPackImg as any} />
                  <View style={styles.selectedPackInfo}>
                    <Text style={styles.selectedPackTitle}>{selectedFlash ? selectedFlash.title : selectedDeal?.title}</Text>
                    <Text style={styles.selectedPackResto}>{selectedFlash ? selectedFlash.restaurant : selectedDeal?.restaurant}</Text>
                    <Text style={styles.selectedPackPeople}>{selectedFlash ? 'Pour 1 personne' : 'Pour 2 personnes'}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 16 }}>
                  Disponibilités restantes : <Text style={{ fontWeight: '700', color: Colors.primary }}>{selectedFlash ? selectedFlash.quantityRemaining : 23}</Text>
                </Text>

                <TouchableOpacity style={styles.actionBtn} onPress={() => setBookingStep(2)}>
                  <Text style={styles.actionBtnText}>Continuer</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* STEP 2: RESUME */}
          {bookingStep === 2 && (
            <View style={{ flex: 1 }}>
              {/* Header for Step 2 */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setBookingStep(1)}>
                  <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Résumé</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View style={styles.selectedPackCard}>
                  <Image source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }} style={styles.selectedPackImg as any} />
                  <View style={styles.selectedPackInfo}>
                    <Text style={styles.selectedPackTitle}>{selectedFlash ? selectedFlash.title : selectedDeal?.title}</Text>
                    <Text style={styles.selectedPackResto}>{selectedFlash ? selectedFlash.restaurant : selectedDeal?.restaurant}</Text>
                    <Text style={styles.selectedPackPeople}>{selectedFlash ? 'Pour 1 personne' : 'Pour 2 personnes'}</Text>
                  </View>
                </View>

                {/* Summary Details */}
                <View style={styles.resumeDetailsContainer}>
                  <View style={styles.resumeRow}>
                    <Text style={styles.resumeLabel}>Date</Text>
                    <Text style={styles.resumeVal}>{bookingDate}</Text>
                  </View>
                  <View style={styles.resumeRow}>
                    <Text style={styles.resumeLabel}>Heure</Text>
                    <Text style={styles.resumeVal}>{bookingTime}</Text>
                  </View>
                  {selectedFlash ? (
                    <>
                      <View style={styles.resumeRow}>
                        <Text style={styles.resumeLabel}>Quantité</Text>
                        <Text style={styles.resumeVal}>{bookingQty}</Text>
                      </View>
                      <View style={styles.resumeRow}>
                        <Text style={styles.resumeLabel}>Mode</Text>
                        <Text style={styles.resumeVal}>
                          {deliveryMode === 'retrait' ? 'Je récupère au restaurant' : 'Livraison à domicile'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.resumeRow}>
                      <Text style={styles.resumeLabel}>Nombre de personnes</Text>
                      <Text style={styles.resumeVal}>2 personnes</Text>
                    </View>
                  )}

                  {!selectedFlash && (
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 }}>
                      <Text style={[styles.inclusionsTitle, { fontSize: 13, marginBottom: 8 }]}>Inclus dans le pack</Text>
                      {selectedDeal?.inclusions?.map((inc: string, idx: number) => (
                        <View key={idx} style={styles.inclusionRow}>
                          <Text style={styles.checkIcon}>✓</Text>
                          <Text style={styles.inclusionText}>{inc}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalVal}>
                      {selectedFlash ? (selectedFlash.priceNew * bookingQty).toLocaleString() : selectedDeal?.priceNew?.toLocaleString()} FCFA
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  if (!isLoggedIn) {
                    setIsSignup(false);
                    setShowClientAuthModal(true);
                  } else {
                    setBookingStep(3);
                  }
                }}>
                  <Text style={styles.actionBtnText}>
                    {selectedFlash ? 'Je bloque mon avantage' : 'Je confirme ma réservation'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* STEP 3: PAYMENT */}
          {bookingStep === 3 && (
            <View style={{ flex: 1 }}>
              {/* Header for Step 3 */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setBookingStep(2)}>
                  <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="lock-closed" size={18} color={Colors.textPrimary} />
                  <Text style={styles.detailHeaderTitle}>Paiement sécurisé</Text>
                </View>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Montant à payer</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: Colors.primary, marginTop: 4 }}>
                    {selectedFlash ? (selectedFlash.priceNew * bookingQty).toLocaleString() : selectedDeal?.priceNew?.toLocaleString()} FCFA
                  </Text>
                </View>

                <Text style={styles.formTitle}>Choisissez votre moyen de paiement</Text>
                
                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'wave' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('wave')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.paymentIconBox, { backgroundColor: '#3B82F6' }]}><Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>W</Text></View>
                    <Text style={styles.paymentRadioLabel}>Wave</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'wave' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'orange' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('orange')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.paymentIconBox, { backgroundColor: '#F97316' }]}><Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>OM</Text></View>
                    <Text style={styles.paymentRadioLabel}>Orange Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'orange' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'mtn' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('mtn')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.paymentIconBox, { backgroundColor: '#EAB308' }]}><Text style={{ color: 'black', fontWeight: '900', fontSize: 12 }}>MoMo</Text></View>
                    <Text style={styles.paymentRadioLabel}>MTN Mobile Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'mtn' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'cb' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('cb')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.paymentIconBox, { backgroundColor: '#6B7280' }]}><Ionicons name="card-outline" size={16} color="white" /></View>
                    <Text style={styles.paymentRadioLabel}>Carte bancaire  <Text style={{ fontSize: 10, color: Colors.textSecondary }}>VISA / MC</Text></Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'cb' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { marginTop: 32 }]} onPress={() => setBookingStep(4)}>
                  <Text style={styles.actionBtnText}>Payer maintenant</Text>
                </TouchableOpacity>

                <View style={styles.securePaymentFooter}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                  <Text style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: '500' }}>Paiement 100% sécurisé</Text>
                </View>
              </ScrollView>
            </View>
          )}

          {/* STEP 4: SUCCESS */}
          {bookingStep === 4 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 40, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                <View style={styles.successCheckContainer}>
                  <Ionicons name="checkmark" size={40} color="white" />
                </View>
                <Text style={styles.successTitle}>Réservation confirmée !</Text>
                <Text style={styles.successSubtitle}>
                  {selectedFlash ? 'Votre Flash est réservé.' : 'Votre Deal est réservé.'}
                </Text>
                
                {/* Detailed Receipt Card */}
                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Offre</Text>
                    <Text style={styles.receiptVal}>{selectedFlash ? selectedFlash.title : selectedDeal?.title}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Restaurant</Text>
                    <Text style={styles.receiptVal}>{selectedFlash ? selectedFlash.restaurant : selectedDeal?.restaurant}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date</Text>
                    <Text style={styles.receiptVal}>{bookingDate}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Heure</Text>
                    <Text style={styles.receiptVal}>{bookingTime}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nombre de personnes</Text>
                    <Text style={styles.receiptVal}>{selectedFlash ? `${bookingQty} personne(s)` : '2 personnes'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Montant payé</Text>
                    <Text style={[styles.receiptVal, { color: Colors.primary, fontWeight: '700' }]}>
                      {selectedFlash ? (selectedFlash.priceNew * bookingQty).toLocaleString() : selectedDeal?.priceNew?.toLocaleString()} FCFA
                    </Text>
                  </View>
                  <View style={[styles.receiptRow, { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, marginTop: 10 }]}>
                    <Text style={styles.receiptLabel}>N° Réservation</Text>
                    <Text style={[styles.receiptVal, { fontWeight: '700' }]}>{reservationId}</Text>
                  </View>
                </View>

                {/* QR Code premium mock box */}
                <View style={styles.qrCodeBox}>
                  <View style={{ width: 140, height: 140, padding: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', width: 120, height: 120 }}>
                      <View style={{ width: 30, height: 30, borderWidth: 4, borderColor: 'black', backgroundColor: 'transparent' }} />
                      <View style={{ width: 30, height: 30, backgroundColor: 'black' }} />
                      <View style={{ width: 30, height: 30, borderWidth: 4, borderColor: 'black', backgroundColor: 'transparent' }} />
                      <View style={{ width: 30, height: 30, backgroundColor: 'black' }} />
                      <View style={{ width: 30, height: 30, borderWidth: 4, borderColor: 'black', backgroundColor: 'transparent' }} />
                      <View style={{ width: 30, height: 30, backgroundColor: 'black' }} />
                      <View style={{ width: 30, height: 30, backgroundColor: 'black' }} />
                      <View style={{ width: 30, height: 30, backgroundColor: 'black' }} />
                      <View style={{ width: 30, height: 30, borderWidth: 4, borderColor: 'black', backgroundColor: 'transparent' }} />
                    </View>
                  </View>
                  <Text style={[styles.qrCodeVal, { fontSize: 13, letterSpacing: 1, marginTop: 12, color: Colors.textSecondary }]}>{reservationId}</Text>
                </View>

                {/* Action Buttons for Receipt Download and Order Tracking */}
                <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: Colors.primary, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} 
                    onPress={() => {
                      Alert.alert(
                        '📥 Reçu PDF Généré & Téléchargé !',
                        `Le reçu officiel de paiement (Réf: ${reservationId}) a été téléchargé.\n\nPrésentez simplement votre Pass QR Code lors de votre arrivée au restaurant.`,
                        [{ text: 'Super !' }]
                      );
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color="white" />
                    <Text style={styles.actionBtnText}>Télécharger le Reçu PDF / Ticket</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#10B981', width: '100%', marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} 
                    onPress={() => { setSelectedFlash(null); setSelectedDeal(null); setClientTab('reservations'); }}
                  >
                    <Ionicons name="time" size={18} color="white" />
                    <Text style={styles.actionBtnText}>⚡ Voir mes réservations & suivi en direct</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {/* CLIENT AUTHENTICATION MODAL (Inside Offer Details View) */}
          <Modal visible={showClientAuthModal} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
              <View style={[styles.modalHeader, { paddingBottom: 12 }]}>
                <Text style={styles.modalTitle}>{isSignup ? 'Créer un compte Client' : 'Connexion Client'}</Text>
                <TouchableOpacity onPress={() => setShowClientAuthModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {pendingOfferAfterAuth && (
                  <View style={{ backgroundColor: '#FFF5F5', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBEB', marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="lock-closed" size={18} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>Connexion requise pour réserver</Text>
                      <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 2, lineHeight: 15 }}>
                        Connectez-vous ou créez un compte pour réserver "{pendingOfferAfterAuth.offer?.title || 'votre formule'}" et accéder au paiement.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Image source={require('../../assets/Icone.png')} style={{ width: 60, height: 60, borderRadius: 14, marginBottom: 8, resizeMode: 'cover' }} />
                  <Text style={{ fontSize: 20, fontWeight: '900' }}>BRICK<Text style={{ color: Colors.primary }}>DEAL</Text></Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>{isSignup ? 'Inscrivez-vous pour valider votre commande' : 'Connectez-vous pour valider votre commande'}</Text>
                </View>

                {isSignup && (
                  <>
                    <Text style={styles.inputLabel}>Nom complet</Text>
                    <TextInput style={styles.input} placeholder="ex: Eric Kouassi" value={clientName} onChangeText={setClientName} />
                    
                    <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                    <TextInput style={styles.input} placeholder="ex: +225 07 45 89 12 36" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
                  </>
                )}

                <Text style={styles.inputLabel}>Adresse Email</Text>
                <TextInput style={styles.input} placeholder="client@email.com" value={clientEmail} onChangeText={setClientEmail} keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.inputLabel}>Mot de passe</Text>
                <TextInput style={styles.input} placeholder="Mot de passe" value={clientPassword} onChangeText={setClientPassword} secureTextEntry />

                <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={handleClientAuth} disabled={authLoading}>
                  <Text style={styles.actionBtnText}>{authLoading ? 'Veuillez patienter...' : isSignup ? 'Créer mon compte' : 'Se connecter'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => setIsSignup(!isSignup)}>
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                    {isSignup ? 'Déjà un compte ? Connectez-vous' : 'Nouveau sur BRICK DEAL ? Inscrivez-vous'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      );
    }

    // Dynamic metrics calculation for client
    const totalReservationsCount = clientOrders.length;
    const completedOrdersCount = clientOrders.filter(o => o.status === 'terminee' || o.status === 'livree').length;
    const pendingOrdersCount = clientOrders.filter(o => o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee').length;
    const totalSavingsAmount = clientOrders.reduce((sum, order) => {
      const normalP = Number(order.offers?.price_normal ?? (Number(order.offers?.price ?? 0) * 1.3));
      const promoP = Number(order.offers?.price_promo ?? order.offers?.price ?? 0);
      const diff = Math.max(0, normalP - promoP);
      return sum + (diff * (order.quantity || 1));
    }, 0);

    // Search filters
    const searchLow = searchQuery.toLowerCase().trim();

    const filteredFlashOffers = flashOffers.filter(item => {
      if (!searchLow) return true;
      return (
        (item.title && item.title.toLowerCase().includes(searchLow)) ||
        (item.restaurant && item.restaurant.toLowerCase().includes(searchLow)) ||
        (item.description && item.description.toLowerCase().includes(searchLow)) ||
        'flash'.includes(searchLow)
      );
    });

    const filteredDealOffers = dealOffers.filter(item => {
      if (!searchLow) return true;
      return (
        (item.title && item.title.toLowerCase().includes(searchLow)) ||
        (item.restaurant && item.restaurant.toLowerCase().includes(searchLow)) ||
        (item.description && item.description.toLowerCase().includes(searchLow)) ||
        (item.inclusions && item.inclusions.some((inc: string) => inc.toLowerCase().includes(searchLow))) ||
        'deal'.includes(searchLow)
      );
    });

    const filteredRestaurants = restaurantsList.filter(resto => {
      if (!searchLow) return true;
      return (
        (resto.name && resto.name.toLowerCase().includes(searchLow)) ||
        (resto.address && resto.address.toLowerCase().includes(searchLow)) ||
        (resto.description && resto.description.toLowerCase().includes(searchLow))
      );
    });

    return (
      <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => setShowProLoginModal(true)}
            delayLongPress={2000}
          >
            <Text style={styles.greetingText}>
              Bonjour <Text style={{ fontWeight: '800', color: Colors.primary }}>{profile?.full_name || 'Invité 👋'}</Text>
            </Text>
            <Text style={styles.locationText}>📍 Cocody, Abidjan ▾</Text>
          </TouchableOpacity>
        </View>

        {clientTab === 'home' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput 
                placeholder="Rechercher un plat, un resto, un deal..." 
                placeholderTextColor={Colors.textSecondary}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* Interactive Calendar Filter Button */}
              <TouchableOpacity 
                style={[
                  styles.filterBtn, 
                  calendarDateFilter ? { backgroundColor: Colors.primary } : null
                ]}
                onPress={() => setShowCalendarFilterModal(true)}
              >
                <Ionicons 
                  name="calendar" 
                  size={18} 
                  color={calendarDateFilter ? 'white' : Colors.primary} 
                />
              </TouchableOpacity>
            </View>

            {/* Active Calendar Filter Pill Banner */}
            {calendarDateFilter && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF5F5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFEBEB', marginBottom: 12, marginTop: -4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary }}>
                    Filtre date : {calendarDateFilter === 'aujourdhui' ? "Aujourd'hui" : calendarDateFilter === 'demain' ? 'Demain' : calendarDateFilter === 'weekend' ? 'Ce Week-End' : calendarDateFilter}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCalendarDateFilter(null)}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.primary }}>✕ Effacer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Metrics */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
              <TouchableOpacity 
                style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}
                onPress={() => { setOrderFilter('toutes'); setClientTab('reservations'); }}
              >
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#6B21A8' }]}>{totalReservationsCount}</Text>
                  <Ionicons name="calendar-outline" size={18} color="#6B21A8" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#6B21A8' }]}>Réservations</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { backgroundColor: '#E6F8F3' }]}
                onPress={() => { setOrderFilter('terminees'); setClientTab('reservations'); }}
              >
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#047857' }]}>{completedOrdersCount}</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#047857' }]}>Terminées</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { backgroundColor: '#FFF7ED' }]}
                onPress={() => { setOrderFilter('en_cours'); setClientTab('reservations'); }}
              >
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#C2410C' }]}>{pendingOrdersCount}</Text>
                  <Ionicons name="time-outline" size={18} color="#C2410C" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#C2410C' }]}>En cours</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { backgroundColor: '#FFEBEB' }]}
                onPress={() => {
                  Alert.alert(
                    '💰 Vos Économies BRICK DEAL',
                    `Grâce aux promos exclusives FLASH et DEAL, vous avez déjà économisé un total cumulé de ${totalSavingsAmount.toLocaleString('fr-FR')} FCFA sur vos réservations !`
                  );
                }}
              >
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: Colors.primary }]}>{totalSavingsAmount.toLocaleString('fr-FR')} F</Text>
                  <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={[styles.metricCardTitle, { color: Colors.primary }]}>Économies</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* FLASH Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleText}>⚡ FLASH</Text>
                <Text style={styles.sectionSubtitleText}>Offres exclusives de dernière minute</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            
            {filteredFlashOffers.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Aucun offre Flash ne correspond à la recherche.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {filteredFlashOffers.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.dealCard} onPress={() => handleSelectFlash(item)}>
                    <Image source={{ uri: item.image }} style={styles.cardImage as any} />
                    <View style={styles.cardBadge}>
                      <Text style={styles.badgeText}>{item.discount}</Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardCategory}>FLASH ⚡</Text>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.restoRow}>
                        <Text style={styles.cardResto}>{item.restaurant}</Text>
                        <View style={styles.starBadge}>
                          <Ionicons name="star" size={10} color="#F5A623" />
                          <Text style={styles.starText}>{item.rating}</Text>
                        </View>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceOld}>{item.priceOld.toLocaleString()} F</Text>
                        <Text style={styles.priceNew}>{item.priceNew.toLocaleString()} FCFA</Text>
                      </View>

                      {/* Live Urgency Countdown & Stock Bar */}
                      <View style={{ marginTop: 6, backgroundColor: '#FFF5F5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FFEBEB' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.primary }}>
                          ⏳ Fin dans : {formatLiveCountdown(item.endTimestamp)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
                            🔥 {item.quantityInitial - item.quantityRemaining} réservé(s)
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#D10000' }}>
                            {item.quantityRemaining} restant(s) !
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <View 
                            style={{ 
                              height: '100%', 
                              backgroundColor: Colors.primary, 
                              width: `${Math.min(100, Math.max(15, ((item.quantityInitial - item.quantityRemaining) / (item.quantityInitial || 1)) * 100))}%` 
                            }} 
                          />
                        </View>
                      </View>

                      <View style={[styles.cardBtn, { marginTop: 8 }]}>
                        <Text style={styles.cardBtnText}>⚡ J'en profite</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* DEAL Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleText}>❤️ DEAL</Text>
                <Text style={styles.sectionSubtitleText}>Expériences et formules de groupe</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {filteredDealOffers.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Aucun Deal ne correspond à la recherche.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {filteredDealOffers.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.dealCard} onPress={() => handleSelectDeal(item)}>
                    <Image source={{ uri: item.image }} style={styles.cardImage as any} />
                    <View style={[styles.cardBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.badgeText}>{item.discount}</Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardCategory, { color: '#F59E0B' }]}>DEAL</Text>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.restoRow}>
                        <Text style={styles.cardResto}>{item.restaurant}</Text>
                        <View style={styles.starBadge}>
                          <Ionicons name="star" size={10} color="#F5A623" />
                          <Text style={styles.starText}>{item.rating}</Text>
                        </View>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceOld}>{item.priceOld.toLocaleString()} F</Text>
                        <Text style={styles.priceNew}>{item.priceNew.toLocaleString()} FCFA</Text>
                      </View>
                      <Text style={styles.cardMeta}>👥 Pour {item.persons} pers  •  📅 {item.validity}</Text>
                      <View style={[styles.cardBtn, { backgroundColor: Colors.primary }]}>
                        <Text style={styles.cardBtnText}>❤️ Je réserve</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Partners */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleText}>🏪 Restaurants Partenaires</Text>
                <Text style={styles.sectionSubtitleText}>Commandez directement auprès de nos partenaires</Text>
              </View>
            </View>

            <View style={styles.partnersContainer}>
              {restaurantsList.map((resto) => (
                <TouchableOpacity key={resto.id} style={styles.partnerCard}>
                  <View style={styles.partnerLeft}>
                    <View style={styles.partnerLogoContainer}>
                      <Ionicons name="restaurant" size={18} color="white" />
                    </View>
                    <View style={styles.partnerInfo}>
                      <Text style={styles.partnerCardName}>{resto.name}</Text>
                      <Text style={styles.partnerCardDesc} numberOfLines={1}>{resto.description || 'Spécialités culinaires.'}</Text>
                      <Text style={styles.partnerCardSub}>📍 {resto.address}</Text>
                    </View>
                  </View>
                  <View style={styles.partnerRight}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#F5A623" />
                      <Text style={styles.ratingText}>4.7</Text>
                    </View>
                    <Text style={styles.partnerCardPhone}>{resto.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {clientTab === 'reservations' && (
          isLoggedIn ? (
            <ScrollView style={styles.scrollArea}>
              <Text style={styles.sectionTitle}>Mes Réservations</Text>

              {/* Filter Pills */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 4 }}>
                <TouchableOpacity 
                  style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' }, orderFilter === 'toutes' && { backgroundColor: Colors.primary }]}
                  onPress={() => setOrderFilter('toutes')}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary }, orderFilter === 'toutes' && { color: 'white' }]}>
                    Toutes ({clientOrders.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF7ED' }, orderFilter === 'en_cours' && { backgroundColor: '#C2410C' }]}
                  onPress={() => setOrderFilter('en_cours')}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '700', color: '#C2410C' }, orderFilter === 'en_cours' && { color: 'white' }]}>
                    En cours ({clientOrders.filter(o => o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee').length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E6F8F3' }, orderFilter === 'terminees' && { backgroundColor: '#047857' }]}
                  onPress={() => setOrderFilter('terminees')}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '700', color: '#047857' }, orderFilter === 'terminees' && { color: 'white' }]}>
                    Terminées ({clientOrders.filter(o => o.status === 'terminee' || o.status === 'livree').length})
                  </Text>
                </TouchableOpacity>
              </View>

              {clientOrders.filter(o => {
                if (orderFilter === 'terminees') return o.status === 'terminee' || o.status === 'livree';
                if (orderFilter === 'en_cours') return o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee';
                return true;
              }).length === 0 && (
                <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Aucune réservation trouvée dans cette catégorie.</Text>
              )}

              {clientOrders.filter(o => {
                if (orderFilter === 'terminees') return o.status === 'terminee' || o.status === 'livree';
                if (orderFilter === 'en_cours') return o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'refusee';
                return true;
              }).map((order) => (
                <View key={order.id} style={[styles.orderListItem, { gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }]}>
                  <View style={styles.orderListHeader}>
                    <Text style={styles.orderListResto}>{order.restaurants?.name ?? 'Restaurant'}</Text>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          order.status === 'terminee' || order.status === 'livree' ? '#ECFDF5' :
                          order.status === 'prete' ? '#EFF6FF' :
                          order.status === 'en_preparation' ? '#FFF7ED' : '#F3F4F6'
                      }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        {
                          color:
                            order.status === 'terminee' || order.status === 'livree' ? '#047857' :
                            order.status === 'prete' ? '#1D4ED8' :
                            order.status === 'en_preparation' ? '#C2410C' : '#4B5563'
                        }
                      ]}>
                        {order.status === 'nouvelle' ? '🟢 Nouvelle' : order.status === 'en_preparation' ? '🍳 En préparation' : order.status === 'prete' ? '🛍️ Prête' : order.status === 'terminee' ? '✅ Terminée' : order.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.orderListDetail}>{order.offers?.title ?? 'Offre'} • {new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.orderListTotal}>Montant payé : {Number(order.total_amount).toLocaleString('fr-FR')} FCFA (Pass: {order.reservation_code})</Text>

                  {/* Direct Tracking Button */}
                  <TouchableOpacity
                    style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}
                    onPress={() => setSelectedClientOrder(order)}
                  >
                    <Ionicons name="time" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>⚡ Suivre la commande en direct</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.scrollArea, { alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1, paddingVertical: 80 }]}>
              <Ionicons name="lock-closed-outline" size={60} color={Colors.textSecondary} />
              <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: Colors.textPrimary }}>Connexion requise</Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>
                Connectez-vous pour visualiser et présenter vos QR codes de réservation au restaurant.
              </Text>
              <TouchableOpacity style={[styles.loginBtn, { width: '80%', marginTop: 12 }]} onPress={() => { setIsSignup(false); setShowClientAuthModal(true); }}>
                <Text style={styles.loginBtnText}>Se connecter / S'inscrire</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {clientTab === 'profile' && (
          isLoggedIn ? (
            <View style={styles.scrollArea}>
              <Text style={styles.sectionTitle}>Mon Profil</Text>
              
              {/* Stats Card */}
              <View style={[styles.agentStatsCard, { backgroundColor: '#FFFDF9', borderColor: '#FDF2E2', borderWidth: 1, marginBottom: 16 }]}>
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Total des réservations</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.primary, marginTop: 4 }}>{clientOrders.length} Réservation(s)</Text>
              </View>

              {isEditingProfile ? (
                <View style={styles.profileCard}>
                  <Text style={styles.inputLabel}>Nom complet</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nom complet"
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <Text style={styles.inputLabel}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Numéro de téléphone"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#EBEBEB' }]} onPress={() => setIsEditingProfile(false)}>
                      <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleUpdateProfile}>
                      <Text style={styles.actionBtnText}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.profileCard}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>NOM</Text>
                  <Text style={styles.profileName}>{profile?.full_name ?? 'Client'}</Text>
                  
                  <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>EMAIL</Text>
                  <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
                  
                  <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>TÉLÉPHONE</Text>
                  <Text style={styles.profilePhone}>{profile?.phone ?? 'Non renseigné'}</Text>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, { marginTop: 16, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.textPrimary }]} 
                    onPress={() => {
                      setEditName(profile?.full_name || '');
                      setEditPhone(profile?.phone || '');
                      setIsEditingProfile(true);
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Modifier mon profil</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={[styles.logoutBtn, { marginTop: 8 }]} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.scrollArea, { justifyContent: 'center', paddingBottom: 24, flex: 1 }]}>
              <View style={{ gap: 24 }}>
                <Text style={styles.sectionTitle}>Mon Profil</Text>
                <View style={[styles.profileCard, { alignItems: 'center', paddingVertical: 32, gap: 12 }]}>
                  <Ionicons name="person-circle-outline" size={80} color="#CCC" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textSecondary }}>Vous êtes en mode invité</Text>
                  <TouchableOpacity style={[styles.loginBtn, { width: '90%' }]} onPress={() => { setIsSignup(false); setShowClientAuthModal(true); }}>
                    <Text style={styles.loginBtnText}>Créer un compte / Se connecter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        )}

        {/* Client Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('home')}>
            <Ionicons name={clientTab === 'home' ? 'home' : 'home-outline'} size={22} color={clientTab === 'home' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, clientTab === 'home' && styles.activeNavText]}>Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('reservations')}>
            <Ionicons name={clientTab === 'reservations' ? 'calendar' : 'calendar-outline'} size={22} color={clientTab === 'reservations' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, clientTab === 'reservations' && styles.activeNavText]}>Réservations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('profile')}>
            <Ionicons name={clientTab === 'profile' ? 'person' : 'person-outline'} size={22} color={clientTab === 'profile' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, clientTab === 'profile' && styles.activeNavText]}>Profil</Text>
          </TouchableOpacity>
        </View>



        {/* PRO LOGIN MODAL (Agents & Restaurants) */}
        <Modal visible={showProLoginModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F10', padding: 20 }}>
            <View style={[styles.modalHeader, { borderBottomColor: '#222', paddingBottom: 12 }]}>
              <Text style={[styles.modalTitle, { color: 'white' }]}>Connexion Professionnelle</Text>
              <TouchableOpacity onPress={() => setShowProLoginModal(false)}>
                <Text style={[styles.closeBtn, { color: 'white' }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Image source={require('../../assets/Icone.png')} style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12, resizeMode: 'cover' }} />
                <Text style={{ color: 'white', fontSize: 24, fontWeight: '900' }}>BRICK<Text style={{ color: Colors.primary }}>DEAL STAFF</Text></Text>
                <Text style={{ color: '#7D7D7D', fontSize: 13, textAlign: 'center', marginTop: 4 }}>Connectez-vous à votre espace commercial ou partenaire</Text>
              </View>

              <Text style={{ color: 'white', fontWeight: '600' }}>Adresse email professionnelle</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#222', color: 'white', borderColor: '#444', height: 48, borderRadius: 8, paddingHorizontal: 12 }]} 
                placeholder="agent@brickdeal.com ou owner@resto.com" 
                placeholderTextColor="#777"
                value={proEmail} 
                onChangeText={setProEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={{ color: 'white', fontWeight: '600' }}>Mot de passe</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#222', color: 'white', borderColor: '#444', height: 48, borderRadius: 8, paddingHorizontal: 12 }]} 
                placeholder="Mot de passe" 
                placeholderTextColor="#777"
                value={proPassword} 
                onChangeText={setProPassword} 
                secureTextEntry 
              />

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 24 }]} onPress={handleProLogin} disabled={authLoading}>
                <Text style={styles.actionBtnText}>{authLoading ? 'Connexion...' : 'Se connecter au Staff'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* CLIENT AUTHENTICATION MODAL (Checkout / Profile Connection) */}
        <Modal visible={showClientAuthModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
            <View style={[styles.modalHeader, { paddingBottom: 12 }]}>
              <Text style={styles.modalTitle}>{isSignup ? 'Créer un compte Client' : 'Connexion Client'}</Text>
              <TouchableOpacity onPress={() => setShowClientAuthModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {pendingOfferAfterAuth && (
                <View style={{ backgroundColor: '#FFF5F5', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBEB', marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="lock-closed" size={18} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>Connexion requise pour réserver</Text>
                    <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 2, lineHeight: 15 }}>
                      Connectez-vous ou créez un compte pour réserver "{pendingOfferAfterAuth.offer?.title || 'votre formule'}" et accéder au paiement.
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={require('../../assets/Icone.png')} style={{ width: 60, height: 60, borderRadius: 14, marginBottom: 8, resizeMode: 'cover' }} />
                <Text style={{ fontSize: 20, fontWeight: '900' }}>BRICK<Text style={{ color: Colors.primary }}>DEAL</Text></Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>{isSignup ? 'Inscrivez-vous pour valider votre commande' : 'Connectez-vous pour valider votre commande'}</Text>
              </View>

              {isSignup && (
                <>
                  <Text style={styles.inputLabel}>Nom complet</Text>
                  <TextInput style={styles.input} placeholder="ex: Eric Kouassi" value={clientName} onChangeText={setClientName} />
                  
                  <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                  <TextInput style={styles.input} placeholder="ex: +225 07 45 89 12 36" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
                </>
              )}

              <Text style={styles.inputLabel}>Adresse Email</Text>
              <TextInput style={styles.input} placeholder="client@email.com" value={clientEmail} onChangeText={setClientEmail} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.inputLabel}>Mot de passe</Text>
              <TextInput style={styles.input} placeholder="Mot de passe" value={clientPassword} onChangeText={setClientPassword} secureTextEntry />

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={handleClientAuth} disabled={authLoading}>
                <Text style={styles.actionBtnText}>{authLoading ? 'Veuillez patienter...' : isSignup ? 'Créer mon compte' : 'Se connecter'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => setIsSignup(!isSignup)}>
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                  {isSignup ? 'Déjà un compte ? Connectez-vous' : 'Nouveau sur BRICK DEAL ? Inscrivez-vous'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- VIEW 3: AGENT PORTAL ---
  if (role === 'agent') {
    return (
      <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Espace Agent Commercial</Text>
            <Text style={styles.locationText}>{profile?.full_name ?? 'Eric Agent'} (Responsable {agentRestaurants.length} Restos)</Text>
          </View>
        </View>

        {agentTab === 'home' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Agent Hero Banner */}
            <View style={{ backgroundColor: '#1E1E24', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="briefcase" size={22} color="white" />
                  </View>
                  <View>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>{profile?.full_name ?? 'Agent Commercial'}</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Supervision Terrain • Abidjan</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: 'rgba(209, 0, 0, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary }}>
                  <Text style={{ color: '#FF4D4D', fontSize: 11, fontWeight: '700' }}>AGENT PRO</Text>
                </View>
              </View>

              {/* Commission Stats */}
              <View style={{ backgroundColor: '#2D2D35', borderRadius: 12, padding: 16 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Commissions cumulées</Text>
                <Text style={{ color: '#10B981', fontSize: 28, fontWeight: '900', marginTop: 4 }}>
                  {agentStats.commission.toLocaleString('fr-FR')} <Text style={{ fontSize: 16, color: '#10B981' }}>FCFA</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="trending-up" size={16} color="#10B981" />
                  <Text style={{ color: '#D1D5DB', fontSize: 12 }}>{agentStats.ordersCount} commande(s) générée(s)</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Row */}
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>🚀 Actions Rapides</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={() => {
                  setNewRestoName('');
                  setNewRestoAddress('');
                  setNewRestoPhone('');
                  setNewRestoDesc('');
                  setNewRestoOwnerEmail('');
                  setNewRestoOwnerPassword('');
                  setShowAddRestoModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Inscrire Resto</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#374151', borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={() => setAgentTab('proposals')}
              >
                <Ionicons name="flash-outline" size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Créer Offre</Text>
              </TouchableOpacity>
            </View>

            {/* Managed Restaurants Section */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>🏢 Établissements Rattachés ({agentRestaurants.length})</Text>
              <TouchableOpacity onPress={() => setAgentTab('restaurants')}>
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>Voir tout ➔</Text>
              </TouchableOpacity>
            </View>

            {agentRestaurants.length === 0 ? (
              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Ionicons name="business-outline" size={44} color={Colors.textSecondary} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>Aucun restaurant inscrit</Text>
                <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center' }}>
                  Commencez la prospection terrain et inscrivez votre premier partenaire.
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 4 }}
                  onPress={() => setShowAddRestoModal(true)}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>➕ Inscrire un établissement</Text>
                </TouchableOpacity>
              </View>
            ) : (
              agentRestaurants.map((resto) => (
                <View key={resto.id} style={[styles.partnerCard, { marginBottom: 12, padding: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFEBEB', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="restaurant" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.textPrimary }}>{resto.name}</Text>
                      <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>📍 {resto.address}</Text>
                      <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>📞 {resto.phone}</Text>
                    </View>
                    <TouchableOpacity 
                      style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      onPress={() => {
                        setNewProp(prev => ({ ...prev, restaurant: resto.name, restaurantId: resto.id }));
                        setAgentTab('proposals');
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>⚡ Offre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {agentTab === 'restaurants' && (
          <ScrollView style={styles.scrollArea}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Inscriptions Terrain</Text>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => {
                setNewRestoName('');
                setNewRestoAddress('');
                setNewRestoPhone('');
                setNewRestoDesc('');
                setNewRestoOwnerEmail('');
                setNewRestoOwnerPassword('');
                setShowAddRestoModal(true);
              }}>
                <Text style={styles.headerActionBtnText}>➕ Inscrire un resto</Text>
              </TouchableOpacity>
            </View>

            {agentRestaurants.map((resto) => (
              <View key={resto.id} style={styles.partnerItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>{resto.name}</Text>
                    <Text style={styles.partnerSub}>{resto.address} • {resto.phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }} 
                    onPress={() => {
                      setNewProp(prev => ({ ...prev, restaurant: resto.name, restaurantId: resto.id }));
                      setAgentTab('proposals');
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>⚡ Proposer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {agentTab === 'proposals' && (
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Nouvelle Proposition d'Offre</Text>
            
            <View style={styles.tabSelector}>
              <TouchableOpacity style={[styles.tabSelectorBtn, proposalType === 'flash' && styles.tabSelectorActive]} onPress={() => setProposalType('flash')}>
                <Text style={[styles.tabSelectorText, proposalType === 'flash' && { color: 'white' }]}>⚡ Flash</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabSelectorBtn, proposalType === 'deal' && styles.tabSelectorActive]} onPress={() => setProposalType('deal')}>
                <Text style={[styles.tabSelectorText, proposalType === 'deal' && { color: 'white' }]}>❤️ Deal</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Sélectionner un restaurant</Text>
            {agentRestaurants.length === 0 ? (
              <Text style={{ color: Colors.textSecondary, fontSize: 12, marginBottom: 12 }}>Aucun restaurant disponible. Veuillez en inscrire un d'abord.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {agentRestaurants.map((resto) => (
                  <TouchableOpacity
                    key={resto.id}
                    style={[
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: '#F3F4F6',
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: '#E5E7EB'
                      },
                      newProp.restaurantId === resto.id && {
                        backgroundColor: Colors.primary,
                        borderColor: Colors.primary
                      }
                    ]}
                    onPress={() => setNewProp(prev => ({ ...prev, restaurant: resto.name, restaurantId: resto.id }))}
                  >
                    <Text style={[{ color: Colors.textPrimary, fontSize: 12, fontWeight: '600' }, newProp.restaurantId === resto.id && { color: 'white' }]}>
                      {resto.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.inputLabel}>Titre de l'offre</Text>
            <TextInput style={styles.input} placeholder="ex: Menu Burger Duo" value={newProp.title} onChangeText={t => setNewProp({ ...newProp, title: t })} />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Détails de l'offre" value={newProp.description} onChangeText={t => setNewProp({ ...newProp, description: t })} />

            <Text style={styles.inputLabel}>URL de l'image / photo de l'offre</Text>
            <TextInput style={styles.input} placeholder="ex: https://images.unsplash.com/..." value={newProp.imageUrl} onChangeText={t => setNewProp({ ...newProp, imageUrl: t })} />

            <Text style={styles.inputLabel}>Image de l'offre (Recommandé)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity style={[styles.headerActionBtn, { backgroundColor: '#4B5563', height: 40 }]} onPress={() => pickImage('agent')}>
                <Text style={styles.headerActionBtnText}>🖼️ Choisir une photo</Text>
              </TouchableOpacity>
              {agentImageUri ? (
                <View style={{ position: 'relative' }}>
                  <Image source={{ uri: agentImageUri }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                  <TouchableOpacity onPress={() => setAgentImageUri(null)} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Aucune photo sélectionnée</Text>
              )}
            </View>

            {proposalType === 'flash' ? (
              <>
                <Text style={styles.inputLabel}>Prix normal barré (FCFA)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="12000" value={newProp.price_normal} onChangeText={t => setNewProp({ ...newProp, price_normal: t })} />
                
                <Text style={styles.inputLabel}>Prix Brick Flash proposé (FCFA)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="7500" value={newProp.price_promo} onChangeText={t => setNewProp({ ...newProp, price_promo: t })} />

                <Text style={styles.inputLabel}>Quantité disponible</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="20" value={newProp.quantity} onChangeText={t => setNewProp({ ...newProp, quantity: t })} />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Type de Pack</Text>
                <TextInput style={styles.input} placeholder="Couple, Famille, Business..." value={newProp.pack_type} onChangeText={t => setNewProp({ ...newProp, pack_type: t })} />
                
                <Text style={styles.inputLabel}>Nombre de personnes</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="2" value={newProp.persons} onChangeText={t => setNewProp({ ...newProp, persons: t })} />

                <Text style={styles.inputLabel}>Prix fixe du pack (FCFA)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="25000" value={newProp.price_promo} onChangeText={t => setNewProp({ ...newProp, price_promo: t })} />

                <Text style={styles.inputLabel}>Prestations incluses</Text>
              </>
            )}

            {/* Horaires & Dates de Début / Fin de l'offre */}
            <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 12, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>
                  Dates & Horaires de l'offre
                </Text>
              </View>

              {/* Start Date & Time Row */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.primary }}>🟢 DÉBUT DE L'OFFRE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                      Date Début (AAAA-MM-JJ)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                      placeholder={getTodayYMD()}
                      value={newProp.startDate}
                      onChangeText={t => setNewProp({ ...newProp, startDate: t })}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                      Heure Début (18:00)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                      placeholder="18:00"
                      value={newProp.startTime}
                      onChangeText={t => setNewProp({ ...newProp, startTime: t })}
                    />
                  </View>
                </View>
              </View>

              {/* End Date & Time Row */}
              <View style={{ gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>🔴 FIN DE L'OFFRE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                      Date Fin (AAAA-MM-JJ)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                      placeholder={getTodayYMD()}
                      value={newProp.endDate}
                      onChangeText={t => setNewProp({ ...newProp, endDate: t })}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                      Heure Fin (23:59)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                      placeholder="23:59"
                      value={newProp.endTime}
                      onChangeText={t => setNewProp({ ...newProp, endTime: t })}
                    />
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleCreateProposal}>
              <Text style={styles.actionBtnText}>Envoyer la proposition</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {agentTab === 'orders' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>📦 Commandes Restos Inscrits ({agentOrders.length})</Text>

            {/* Agent Read Only Info Banner */}
            <View style={{ backgroundColor: '#F0FDF4', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="eye" size={18} color="#059669" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>Mode Suivi Commercial (Lecture seule)</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#15803D', lineHeight: 16 }}>
                Consultez le statut en direct de toutes les commandes de vos restaurants affiliés. Le changement de statut est réservé aux restaurateurs.
              </Text>
            </View>

            {/* Stats Summary */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Total Commandes</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 2 }}>{agentOrders.length}</Text>
              </View>

              <View style={{ flex: 1, backgroundColor: '#FFF5F5', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FFEBEB', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: Colors.primary }}>Total Commissions</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: 2 }}>
                  {agentStats.commission.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>

            {agentOrders.length === 0 ? (
              <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 30, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textSecondary} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>Aucune commande enregistrée</Text>
                <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
                  Les commandes passées sur les offres de vos restaurants rattachés apparaîtront automatiquement ici.
                </Text>
              </View>
            ) : (
              agentOrders.map((order) => (
                <View key={order.id} style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.textPrimary }}>
                      🏢 {order.restaurants?.name ?? 'Restaurant'}
                    </Text>

                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          order.status === 'terminee' || order.status === 'livree' ? '#ECFDF5' :
                          order.status === 'prete' ? '#EFF6FF' :
                          order.status === 'en_preparation' ? '#FFF7ED' : '#F3F4F6'
                      }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        {
                          color:
                            order.status === 'terminee' || order.status === 'livree' ? '#047857' :
                            order.status === 'prete' ? '#1D4ED8' :
                            order.status === 'en_preparation' ? '#C2410C' : '#4B5563'
                        }
                      ]}>
                        {order.status === 'nouvelle' ? '🟢 Nouvelle' : order.status === 'en_preparation' ? '🍳 En préparation' : order.status === 'prete' ? '🛍️ Prête' : order.status === 'terminee' ? '✅ Terminée' : order.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>
                    {order.offers?.title ?? 'Offre'}
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10 }}>
                    <View>
                      <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Client : {order.profiles?.full_name || 'Gourmand'}</Text>
                      <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Tél : {order.profiles?.phone || 'Non renseigné'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.textPrimary }}>
                        {Number(order.total_amount || 0).toLocaleString('fr-FR')} FCFA
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.success }}>
                        + {Number(order.commission_amount || 0).toLocaleString('fr-FR')} F Com.
                      </Text>
                    </View>
                  </View>

                  {/* Read Only Details Button */}
                  <TouchableOpacity
                    style={{ backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onPress={() => setSelectedAgentOrder(order)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#374151" />
                    <Text style={{ color: '#374151', fontWeight: '800', fontSize: 12 }}>🔍 Voir le suivi détaillé (Lecture Seule)</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {agentTab === 'profile' && (
          <View style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Profil Agent</Text>

            {/* Agent Stats Summary Card */}
            <View style={[styles.agentStatsCard, { backgroundColor: '#FFFDF9', borderColor: '#FDF2E2', borderWidth: 1, marginBottom: 16 }]}>
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Mes Statistiques Commerciales</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Restos gérés</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 }}>{agentRestaurants.length}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#EBEBEB' }}>
                  <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Ventes</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 }}>{agentStats.ordersCount}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#EBEBEB' }}>
                  <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Commissions</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.success, marginTop: 2 }}>{agentStats.commission.toLocaleString('fr-FR')} F</Text>
                </View>
              </View>
            </View>

            <View style={styles.profileCard}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>NOM DE L'AGENT</Text>
              <Text style={styles.profileName}>{profile?.full_name ?? 'Eric Agent'}</Text>
              
              <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>EMAIL</Text>
              <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
              
              <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>TÉLÉPHONE</Text>
              <Text style={styles.profilePhone}>{profile?.phone ?? 'Non renseigné'}</Text>

              <View style={{ marginTop: 16, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textSecondary} />
                <Text style={{ fontSize: 12, color: Colors.textSecondary, flex: 1 }}>Vos informations sont gérées par l'administrateur. Contactez le support pour toute modification.</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.logoutBtn, { marginTop: 8 }]} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Agent Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('home')}>
            <Ionicons name={agentTab === 'home' ? 'home' : 'home-outline'} size={22} color={agentTab === 'home' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, agentTab === 'home' && styles.activeNavText]}>Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('restaurants')}>
            <Ionicons name={agentTab === 'restaurants' ? 'business' : 'business-outline'} size={22} color={agentTab === 'restaurants' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, agentTab === 'restaurants' && styles.activeNavText]}>Restaurants</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('proposals')}>
            <Ionicons name={agentTab === 'proposals' ? 'document-text' : 'document-text-outline'} size={22} color={agentTab === 'proposals' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, agentTab === 'proposals' && styles.activeNavText]}>Proposition</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('orders')}>
            <Ionicons name={agentTab === 'orders' ? 'receipt' : 'receipt-outline'} size={22} color={agentTab === 'orders' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, agentTab === 'orders' && styles.activeNavText]}>Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('profile')}>
            <Ionicons name={agentTab === 'profile' ? 'person' : 'person-outline'} size={22} color={agentTab === 'profile' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, agentTab === 'profile' && styles.activeNavText]}>Profil</Text>
          </TouchableOpacity>
        </View>

        {/* ADD RESTAURANT MODAL (Agent exclusive) */}
        <Modal visible={showAddRestoModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inscrire un Établissement</Text>
              <TouchableOpacity onPress={() => setShowAddRestoModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 10 }}>
              <Text style={styles.inputLabel}>Nom de l'établissement</Text>
              <TextInput style={styles.input} placeholder="ex: Chez Georges" value={newRestoName} onChangeText={setNewRestoName} />

              <Text style={styles.inputLabel}>Adresse complète</Text>
              <TextInput style={styles.input} placeholder="ex: Zone 4, Rue des Jardins" value={newRestoAddress} onChangeText={setNewRestoAddress} />

              {/* GPS Localization Button & Field */}
              <View style={{ backgroundColor: '#F0FDF4', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0', marginVertical: 8, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="location" size={18} color="#059669" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>Coordonnées GPS</Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={handleGetLocation}
                    disabled={isLocating}
                  >
                    <Ionicons name="navigate" size={14} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                      {isLocating ? 'Patienter...' : '📍 Me localiser'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {newRestoLat && newRestoLng ? (
                  <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>Position GPS capturée :</Text>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#047857', marginTop: 2 }}>
                        LAT: {Number(newRestoLat).toFixed(6)} | LNG: {Number(newRestoLng).toFixed(6)}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: '#15803D' }}>
                    Cliquez sur "Me localiser" pour enregistrer la position géographique exacte sur la carte.
                  </Text>
                )}
              </View>

              <Text style={styles.inputLabel}>Téléphone de contact</Text>
              <TextInput style={styles.input} placeholder="ex: +225 07 01 02 03" value={newRestoPhone} onChangeText={setNewRestoPhone} keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Description / Spécialités</Text>
              <TextInput style={styles.input} placeholder="ex: Poulet braisé, allocos, cuisine locale" value={newRestoDesc} onChangeText={setNewRestoDesc} />

              <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', marginVertical: 20, paddingTop: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 12 }}>Identifiants de connexion du propriétaire</Text>
                
                <Text style={styles.inputLabel}>Adresse Email du Propriétaire</Text>
                <TextInput style={styles.input} placeholder="ex: owner.georges@email.com" value={newRestoOwnerEmail} onChangeText={setNewRestoOwnerEmail} keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.inputLabel}>Mot de passe temporaire</Text>
                <TextInput style={styles.input} placeholder="Définir un mot de passe" value={newRestoOwnerPassword} onChangeText={setNewRestoOwnerPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 10 }]} onPress={handleAddRestaurant}>
                <Text style={styles.actionBtnText}>Créer le compte et le restaurant</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- VIEW 4: RESTAURANT PORTAL ---
  if (role === 'restaurant') {
    return (
      <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Restaurant Partenaire</Text>
            <Text style={styles.locationText}>{restaurantDetail?.name ?? 'Chargement...'}</Text>
          </View>
        </View>

        {restaurantTab === 'home' && (
          <ScrollView style={styles.scrollArea}>
            <View style={[styles.agentStatsCard, { backgroundColor: Colors.primary }]}>
              <Text style={[styles.agentStatsLabel, { color: 'white' }]}>Chiffre d'affaires total (Validé)</Text>
              <Text style={[styles.agentStatsVal, { color: 'white' }]}>
                {restaurantOrders
                  .filter(o => o.status === 'terminee' || o.status === 'livree')
                  .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
                  .toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={[styles.agentStatsSub, { color: '#FFEBEB' }]}>
                {restaurantOrders.length} commande(s) reçue(s) • {restaurantOrders.filter(o => o.status === 'nouvelle' || o.status === 'en_preparation' || o.status === 'prete').length} en cours
              </Text>
            </View>

            <Text style={styles.sectionTitle}>📦 Commandes à traiter</Text>
            {restaurantOrders.filter(o => o.status === 'nouvelle' || o.status === 'en_preparation' || o.status === 'prete').length === 0 ? (
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Aucune commande à traiter.</Text>
            ) : (
              restaurantOrders.filter(o => o.status === 'nouvelle' || o.status === 'en_preparation' || o.status === 'prete').map(order => (
                <View key={order.id} style={styles.orderListItem}>
                  <View style={styles.orderListHeader}>
                    <Text style={styles.orderListResto}>{order.profiles?.full_name ?? 'Client'} (Réf: {order.reservation_code})</Text>
                    <View style={[styles.statusBadge, order.status === 'nouvelle' ? { backgroundColor: Colors.primaryLight } : order.status === 'prete' ? { backgroundColor: Colors.successLight } : { backgroundColor: Colors.warningLight }]}>
                      <Text style={[styles.statusText, order.status === 'nouvelle' ? { color: Colors.primary } : order.status === 'prete' ? { color: Colors.success } : { color: Colors.warning }]}>
                        {order.status === 'nouvelle' ? 'Nouvelle' : order.status === 'prete' ? 'Prête' : 'En préparation'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderListDetail}>{order.offers?.title ?? 'Offre'} (x{order.quantity})</Text>
                  <Text style={styles.orderListTotal}>Total : {Number(order.total_amount).toLocaleString('fr-FR')} FCFA ({order.delivery_mode === 'retrait' ? 'Retrait' : 'Livraison'})</Text>
                  
                  <View style={styles.actionRow}>
                    {order.status === 'nouvelle' && (
                      <TouchableOpacity style={styles.actionBadgeBtn} onPress={() => handleUpdateOrderStatus(order.id, 'en_preparation')}>
                        <Text style={styles.actionBadgeText}>Accepter</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'en_preparation' && (
                      <TouchableOpacity style={[styles.actionBadgeBtn, { backgroundColor: Colors.success }]} onPress={() => handleUpdateOrderStatus(order.id, 'prete')}>
                        <Text style={styles.actionBadgeText}>Marquer Prête</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {restaurantTab === 'orders' && (
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Historique des commandes</Text>
            {restaurantOrders.filter(o => o.status === 'terminee' || o.status === 'livree').length === 0 ? (
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Aucune commande terminée.</Text>
            ) : (
              restaurantOrders.filter(o => o.status === 'terminee' || o.status === 'livree').map(order => (
                <View key={order.id} style={styles.partnerItem}>
                  <Text style={styles.partnerName}>{order.profiles?.full_name ?? 'Client'} (Réf: {order.reservation_code})</Text>
                  <Text style={styles.partnerSub}>
                    {order.status === 'terminee' ? 'Terminée' : 'Livrée'} • {Number(order.total_amount).toLocaleString('fr-FR')} FCFA • {order.delivery_mode === 'retrait' ? 'Retrait' : 'Livraison'}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {restaurantTab === 'proposals' && (
          <ScrollView style={styles.scrollArea}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Mes Propositions</Text>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => {
                setNewRestoProp({
                  title: '',
                  description: '',
                  price_normal: '',
                  price_promo: '',
                  quantity: '10',
                  pack_type: 'couple',
                  persons: '2',
                  prestations: '',
                  imageUrl: '',
                  startDate: getTodayYMD(),
                  endDate: getTodayYMD(),
                  startTime: '18:00',
                  endTime: '23:59',
                });
                setShowAddRestoPropModal(true);
              }}>
                <Text style={styles.headerActionBtnText}>➕ Proposer une offre</Text>
              </TouchableOpacity>
            </View>

            {restaurantProposals.length === 0 ? (
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Aucune proposition soumise pour le moment.</Text>
            ) : (
              restaurantProposals.map((prop) => (
                <View key={prop.id} style={styles.partnerItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerName}>{prop.title}</Text>
                      <Text style={styles.partnerSub}>
                        {prop.type === 'flash' ? '⚡ Flash' : '❤️ Deal'} • {prop.type === 'flash' ? `${Number(prop.price_promo).toLocaleString('fr-FR')} F (Promo)` : `${Number(prop.price).toLocaleString('fr-FR')} F`}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      prop.status === 'validee' ? { backgroundColor: Colors.successLight } :
                      prop.status === 'refusee' ? { backgroundColor: Colors.primaryLight } :
                      prop.status === 'a_modifier' ? { backgroundColor: Colors.warningLight } :
                      { backgroundColor: '#F3F4F6' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        prop.status === 'validee' ? { color: Colors.success } :
                        prop.status === 'refusee' ? { color: Colors.primary } :
                        prop.status === 'a_modifier' ? { color: Colors.warning } :
                        { color: '#6B7280' }
                      ]}>
                        {prop.status === 'validee' ? 'Validée' :
                         prop.status === 'refusee' ? 'Refusée' :
                         prop.status === 'a_modifier' ? 'À modifier' : 'En attente'}
                      </Text>
                    </View>
                  </View>
                  {prop.observation && (
                    <Text style={{ fontSize: 11, color: '#D97706', marginTop: 6, fontStyle: 'italic' }}>
                      💡 Note Admin: {prop.observation}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {restaurantTab === 'profile' && (
          <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Profil & Établissement</Text>

            {/* SECTION 1: PERSONAL PROFILE */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: 4 }}>👤 Profil Gérant</Text>
            
            {isEditingProfile ? (
              <View style={styles.profileCard}>
                <Text style={styles.inputLabel}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom complet"
                  value={editName}
                  onChangeText={setEditName}
                />
                <Text style={styles.inputLabel}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Numéro de téléphone"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#EBEBEB' }]} onPress={() => setIsEditingProfile(false)}>
                    <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleUpdateProfile}>
                    <Text style={styles.actionBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileCard}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>NOM</Text>
                <Text style={styles.profileName}>{profile?.full_name ?? 'Propriétaire'}</Text>
                
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>EMAIL</Text>
                <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
                
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>TÉLÉPHONE</Text>
                <Text style={styles.profilePhone}>{profile?.phone ?? 'Non renseigné'}</Text>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, { marginTop: 16, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.textPrimary }]} 
                  onPress={() => {
                    setEditName(profile?.full_name || '');
                    setEditPhone(profile?.phone || '');
                    setIsEditingProfile(true);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Modifier mon profil</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SECTION 2: RESTAURANT PROFILE */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 }}>🏢 Fiche Restaurant</Text>

            {isEditingResto ? (
              <View style={styles.profileCard}>
                <Text style={styles.inputLabel}>Nom de l'établissement</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom de l'établissement"
                  value={editRestoName}
                  onChangeText={setEditRestoName}
                />
                <Text style={styles.inputLabel}>Adresse complète</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adresse"
                  value={editRestoAddress}
                  onChangeText={setEditRestoAddress}
                />
                <Text style={styles.inputLabel}>Téléphone de contact</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Téléphone"
                  value={editRestoPhone}
                  onChangeText={setEditRestoPhone}
                  keyboardType="phone-pad"
                />
                <Text style={styles.inputLabel}>Description / Spécialités</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  value={editRestoDesc}
                  onChangeText={setEditRestoDesc}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#EBEBEB' }]} onPress={() => setIsEditingResto(false)}>
                    <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleUpdateRestaurant}>
                    <Text style={styles.actionBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileCard}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>NOM DU RESTAURANT</Text>
                <Text style={styles.profileName}>{restaurantDetail?.name ?? 'Non chargé'}</Text>
                
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>ADRESSE</Text>
                <Text style={styles.profileEmail}>{restaurantDetail?.address ?? ''}</Text>
                
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>TÉLÉPHONE DE CONTACT</Text>
                <Text style={styles.profilePhone}>{restaurantDetail?.phone ?? ''}</Text>

                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 12 }}>DESCRIPTION / SPÉCIALITÉS</Text>
                <Text style={[styles.profilePhone, { fontStyle: 'italic' }]}>{restaurantDetail?.description || 'Aucune description.'}</Text>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, { marginTop: 16, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.textPrimary }]} 
                  onPress={() => {
                    setEditRestoName(restaurantDetail?.name || '');
                    setEditRestoAddress(restaurantDetail?.address || '');
                    setEditRestoPhone(restaurantDetail?.phone || '');
                    setEditRestoDesc(restaurantDetail?.description || '');
                    setIsEditingResto(true);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Modifier la fiche resto</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[styles.logoutBtn, { marginTop: 8 }]} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Restaurant Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('home')}>
            <Ionicons name={restaurantTab === 'home' ? 'home' : 'home-outline'} size={22} color={restaurantTab === 'home' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, restaurantTab === 'home' && styles.activeNavText]}>Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('orders')}>
            <Ionicons name={restaurantTab === 'orders' ? 'receipt' : 'receipt-outline'} size={22} color={restaurantTab === 'orders' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, restaurantTab === 'orders' && styles.activeNavText]}>Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('proposals')}>
            <Ionicons name={restaurantTab === 'proposals' ? 'document-text' : 'document-text-outline'} size={22} color={restaurantTab === 'proposals' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, restaurantTab === 'proposals' && styles.activeNavText]}>Propositions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('profile')}>
            <Ionicons name={restaurantTab === 'profile' ? 'person' : 'person-outline'} size={22} color={restaurantTab === 'profile' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, restaurantTab === 'profile' && styles.activeNavText]}>Profil</Text>
          </TouchableOpacity>
        </View>

        {/* RESTAURANT ADD PROPOSAL MODAL */}
        <Modal visible={showAddRestoPropModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
            <View style={[styles.modalHeader, { paddingBottom: 12 }]}>
              <Text style={styles.modalTitle}>Nouvelle Proposition d'Offre</Text>
              <TouchableOpacity onPress={() => setShowAddRestoPropModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.tabSelector}>
                <TouchableOpacity style={[styles.tabSelectorBtn, restoPropType === 'flash' && styles.tabSelectorActive]} onPress={() => setRestoPropType('flash')}>
                  <Text style={[styles.tabSelectorText, restoPropType === 'flash' && { color: 'white' }]}>⚡ Flash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabSelectorBtn, restoPropType === 'deal' && styles.tabSelectorActive]} onPress={() => setRestoPropType('deal')}>
                  <Text style={[styles.tabSelectorText, restoPropType === 'deal' && { color: 'white' }]}>❤️ Deal</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Titre de l'offre</Text>
              <TextInput style={styles.input} placeholder="ex: Menu Burger Duo" value={newRestoProp.title} onChangeText={t => setNewRestoProp({ ...newRestoProp, title: t })} />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Détails de l'offre" value={newRestoProp.description} onChangeText={t => setNewRestoProp({ ...newRestoProp, description: t })} />

              <Text style={styles.inputLabel}>URL de l'image / photo de l'offre</Text>
              <TextInput style={styles.input} placeholder="ex: https://images.unsplash.com/..." value={newRestoProp.imageUrl} onChangeText={t => setNewRestoProp({ ...newRestoProp, imageUrl: t })} />

              <Text style={styles.inputLabel}>Image de l'offre (Recommandé)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <TouchableOpacity style={[styles.headerActionBtn, { backgroundColor: '#4B5563', height: 40 }]} onPress={() => pickImage('resto')}>
                  <Text style={styles.headerActionBtnText}>🖼️ Choisir une photo</Text>
                </TouchableOpacity>
                {restoImageUri ? (
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: restoImageUri }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                    <TouchableOpacity onPress={() => setRestoImageUri(null)} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Aucune photo sélectionnée</Text>
                )}
              </View>

              {restoPropType === 'flash' ? (
                <>
                  <Text style={styles.inputLabel}>Prix normal barré (FCFA)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="12000" value={newRestoProp.price_normal} onChangeText={t => setNewRestoProp({ ...newRestoProp, price_normal: t })} />
                  
                  <Text style={styles.inputLabel}>Prix Flash proposé (FCFA)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="7500" value={newRestoProp.price_promo} onChangeText={t => setNewRestoProp({ ...newRestoProp, price_promo: t })} />

                  <Text style={styles.inputLabel}>Quantité disponible</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="20" value={newRestoProp.quantity} onChangeText={t => setNewRestoProp({ ...newRestoProp, quantity: t })} />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Type de Pack</Text>
                  <TextInput style={styles.input} placeholder="Couple, Famille, Business..." value={newRestoProp.pack_type} onChangeText={t => setNewRestoProp({ ...newRestoProp, pack_type: t })} />
                  
                  <Text style={styles.inputLabel}>Nombre de personnes</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="2" value={newRestoProp.persons} onChangeText={t => setNewRestoProp({ ...newRestoProp, persons: t })} />

                  <Text style={styles.inputLabel}>Prix fixe du pack (FCFA)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="25000" value={newRestoProp.price_promo} onChangeText={t => setNewRestoProp({ ...newRestoProp, price_promo: t })} />

                  <Text style={styles.inputLabel}>Prestations incluses</Text>
                </>
              )}

              {/* Horaires & Dates de Début / Fin de l'offre */}
              <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 8, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>
                    Dates & Horaires de l'offre
                  </Text>
                </View>

                {/* Start Date & Time Row */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.primary }}>🟢 DÉBUT DE L'OFFRE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Date Début (AAAA-MM-JJ)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                        placeholder={getTodayYMD()}
                        value={newRestoProp.startDate}
                        onChangeText={t => setNewRestoProp({ ...newRestoProp, startDate: t })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Heure Début (18:00)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                        placeholder="18:00"
                        value={newRestoProp.startTime}
                        onChangeText={t => setNewRestoProp({ ...newRestoProp, startTime: t })}
                      />
                    </View>
                  </View>
                </View>

                {/* End Date & Time Row */}
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>🔴 FIN DE L'OFFRE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Date Fin (AAAA-MM-JJ)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                        placeholder={getTodayYMD()}
                        value={newRestoProp.endDate}
                        onChangeText={t => setNewRestoProp({ ...newRestoProp, endDate: t })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Heure Fin (23:59)
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0 }]}
                        placeholder="23:59"
                        value={newRestoProp.endTime}
                        onChangeText={t => setNewRestoProp({ ...newRestoProp, endTime: t })}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleCreateRestoProposal}>
                <Text style={styles.actionBtnText}>Envoyer la proposition</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* CLIENT ORDER LIVE TRACKING MODAL */}
      <Modal visible={!!selectedClientOrder} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
          {selectedClientOrder && (
            <View style={{ flex: 1 }}>
              <View style={[styles.modalHeader, { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
                <View>
                  <Text style={styles.modalTitle}>Suivi de la Commande</Text>
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Pass : {selectedClientOrder.reservation_code}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedClientOrder(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                {/* Restaurant Info Header */}
                <View style={{ backgroundColor: '#FFF5F5', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBEB', gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: Colors.primary }}>
                    🏢 {selectedClientOrder.restaurants?.name || 'Restaurant Partenaire'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#4B5563' }}>📍 {selectedClientOrder.restaurants?.address}</Text>
                  <Text style={{ fontSize: 12, color: '#4B5563' }}>📞 {selectedClientOrder.restaurants?.phone}</Text>
                </View>

                {/* Real-time Order Progress Stepper */}
                <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 14 }}>
                    ⚡ Évolution du statut en direct
                  </Text>

                  {/* Stepper Timeline 4 steps */}
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={18} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>1. Commande Enregistrée</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Paiement et réservation confirmés</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        selectedClientOrder.status === 'en_preparation' || selectedClientOrder.status === 'prete' || selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree' ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {selectedClientOrder.status === 'en_preparation' ? (
                          <Ionicons name="time" size={16} color="white" />
                        ) : (selectedClientOrder.status === 'prete' || selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>2</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedClientOrder.status === 'en_preparation' || selectedClientOrder.status === 'prete' || selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          2. En préparation par le restaurant
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Le chef prépare votre formule gourmande</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        selectedClientOrder.status === 'prete' || selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree' ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {(selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : selectedClientOrder.status === 'prete' ? (
                          <Ionicons name="restaurant" size={16} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>3</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedClientOrder.status === 'prete' || selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          3. Prête pour dégustation / retrait
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Présentez votre pass lors de votre arrivée</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        (selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {(selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>4</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedClientOrder.status === 'terminee' || selectedClientOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          4. Commande Servie & Terminée
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Bon appétit ! Merci pour votre confiance.</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* QR Code Pass Widget */}
                <View style={{ backgroundColor: '#111827', borderRadius: 16, padding: 16, alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>PASS DE RÉSERVATION ACCUEIL</Text>
                  <View style={{ width: 110, height: 110, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="qr-code-outline" size={90} color="#111827" />
                  </View>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>{selectedClientOrder.reservation_code}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center' }}>Montrez cet écran à la caisse du restaurant.</Text>
                </View>

                {/* Contact Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginVertical: 16 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#25D366', height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onPress={() => openWhatsApp(selectedClientOrder.id)}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Contact Resto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#374151', height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onPress={callServiceClient}
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Service Client</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* AGENT READ-ONLY ORDER TRACKING MODAL */}
      <Modal visible={!!selectedAgentOrder} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
          {selectedAgentOrder && (
            <View style={{ flex: 1 }}>
              <View style={[styles.modalHeader, { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
                <View>
                  <Text style={styles.modalTitle}>Suivi Agent (Lecture Seule)</Text>
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Réf : {selectedAgentOrder.reservation_code}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedAgentOrder(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                {/* Read only Notice */}
                <View style={{ backgroundColor: '#FFFBEB', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Ionicons name="eye" size={20} color="#D97706" />
                  <Text style={{ fontSize: 11, color: '#92400E', flex: 1, fontWeight: '700', lineHeight: 16 }}>
                    👁️ Mode Suivi Commercial (Lecture seule) : Vous observez le déroulement de la commande en temps réel sans modification possible.
                  </Text>
                </View>

                {/* Restaurant & Client Details */}
                <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10, marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                    🏢 {selectedAgentOrder.restaurants?.name || 'Restaurant Partenaire'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#4B5563' }}>📍 {selectedAgentOrder.restaurants?.address}</Text>
                  <Text style={{ fontSize: 12, color: '#4B5563' }}>📞 {selectedAgentOrder.restaurants?.phone}</Text>
                  
                  <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 }} />

                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary }}>
                    👤 Client : {selectedAgentOrder.profiles?.full_name || 'Gourmand'} ({selectedAgentOrder.profiles?.phone || 'Pas de tél'})
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>
                    📦 Offre : {selectedAgentOrder.offers?.title || 'Offre Spéciale'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.success }}>
                    💰 Commission Agent : {Number(selectedAgentOrder.commission_amount || 0).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>

                {/* Real-time Order Progress Stepper */}
                <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 14 }}>
                    ⚡ Évolution du statut en direct
                  </Text>

                  {/* Stepper Timeline 4 steps */}
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={18} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>1. Commande Enregistrée</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Paiement et réservation confirmés</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        selectedAgentOrder.status === 'en_preparation' || selectedAgentOrder.status === 'prete' || selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree' ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {selectedAgentOrder.status === 'en_preparation' ? (
                          <Ionicons name="time" size={16} color="white" />
                        ) : (selectedAgentOrder.status === 'prete' || selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>2</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedAgentOrder.status === 'en_preparation' || selectedAgentOrder.status === 'prete' || selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          2. En préparation par le restaurant
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Le chef prépare la formule</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        selectedAgentOrder.status === 'prete' || selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree' ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {(selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : selectedAgentOrder.status === 'prete' ? (
                          <Ionicons name="restaurant" size={16} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>3</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedAgentOrder.status === 'prete' || selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          3. Prête pour dégustation / retrait
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Prête en salle ou comptoir</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[
                        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
                        (selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') ? { backgroundColor: '#059669' } : { backgroundColor: '#E5E7EB' }
                      ]}>
                        {(selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') ? (
                          <Ionicons name="checkmark" size={18} color="white" />
                        ) : (
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700' }}>4</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, (selectedAgentOrder.status === 'terminee' || selectedAgentOrder.status === 'livree') && { color: '#111827', fontWeight: '800' }]}>
                          4. Commande Servie & Terminée
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Commande terminée</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* CALENDAR FILTER MODAL */}
      <Modal visible={showCalendarFilterModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={22} color={Colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary }}>Filtrer les offres par date</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
              Sélectionnez une période pour filtrer les offres disponibles :
            </Text>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[{ padding: 14, borderRadius: 14, backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendarDateFilter === null && { backgroundColor: Colors.primary }]}
                onPress={() => { setCalendarDateFilter(null); setShowCalendarFilterModal(false); }}
              >
                <Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }, calendarDateFilter === null && { color: 'white' }]}>
                  ⚡ Toutes les dates (Toutes les offres)
                </Text>
                {calendarDateFilter === null && <Ionicons name="checkmark" size={18} color="white" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[{ padding: 14, borderRadius: 14, backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendarDateFilter === 'aujourdhui' && { backgroundColor: Colors.primary }]}
                onPress={() => { setCalendarDateFilter('aujourdhui'); setShowCalendarFilterModal(false); }}
              >
                <Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }, calendarDateFilter === 'aujourdhui' && { color: 'white' }]}>
                  📅 Aujourd'hui ({getTodayYMD()})
                </Text>
                {calendarDateFilter === 'aujourdhui' && <Ionicons name="checkmark" size={18} color="white" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[{ padding: 14, borderRadius: 14, backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendarDateFilter === 'demain' && { backgroundColor: Colors.primary }]}
                onPress={() => { setCalendarDateFilter('demain'); setShowCalendarFilterModal(false); }}
              >
                <Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }, calendarDateFilter === 'demain' && { color: 'white' }]}>
                  ☀️ Demain
                </Text>
                {calendarDateFilter === 'demain' && <Ionicons name="checkmark" size={18} color="white" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[{ padding: 14, borderRadius: 14, backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendarDateFilter === 'weekend' && { backgroundColor: Colors.primary }]}
                onPress={() => { setCalendarDateFilter('weekend'); setShowCalendarFilterModal(false); }}
              >
                <Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary }, calendarDateFilter === 'weekend' && { color: 'white' }]}>
                  🥳 Ce Week-End (Vendredi au Dimanche)
                </Text>
                {calendarDateFilter === 'weekend' && <Ionicons name="checkmark" size={18} color="white" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#111827', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
              onPress={() => setShowCalendarFilterModal(false)}
            >
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Authentication styles
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0F0F10',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  logoMark: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  authSubtitle: {
    color: '#7D7D7D',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  loginForm: {
    width: '100%',
    gap: 16,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loginBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  headerActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },

  // Main UI Shell
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoutBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  logoutText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  
  // Dashboard Metrics Grid
  metricsScroll: {
    marginBottom: 24,
  },
  miniCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderLeftWidth: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  miniCardVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  miniCardTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Typography & Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  horizontalScroll: {
    marginBottom: 24,
  },

  // Deal / Item Cards
  dealCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 280,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 125,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    padding: 14,
  },
  cardBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  restoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardResto: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  starText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 10,
  },
  priceOld: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  cardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  cardBtn: {
    backgroundColor: '#0F0F10',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },

  // Partners list
  partnerItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  partnerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Orders list Client/Restaurant
  orderListItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  orderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderListResto: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  orderListDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginVertical: 4,
  },
  orderListTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Bottom Navigation Bar
  bottomNav: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeNavText: {
    color: Colors.primary,
  },
  scanBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    bottom: 5,
  },
  scanBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },

  // Profile space
  profileCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    gap: 8,
    marginBottom: 24,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    borderColor: Colors.primary,
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Modal Flow (Checkout)
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  modalBody: {
    padding: 24,
    flex: 1,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  radioItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginVertical: 8,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  resumeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resumeText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  payOption: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  payOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  payOptionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  successCheck: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheckText: {
    color: Colors.success,
    fontSize: 32,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrCodeBox: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    marginBottom: 32,
    backgroundColor: '#FAF9F6',
  },
  qrCodeTitle: {
    fontWeight: '800',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  qrCodeVal: {
    fontWeight: '900',
    fontSize: 24,
    marginTop: 8,
    letterSpacing: 2,
  },

  // Premium details screen styles
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: 'white',
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  bellIconContainer: {
    position: 'relative',
    padding: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E30613',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '800',
  },
  detailImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  bestDealBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#E30613',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestDealBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'white',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  detailContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  discountLabel: {
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountLabelText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  detailSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  ratingTextSecondary: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  priceBold: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  peopleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  peopleBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  inclusionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 16,
    marginBottom: 16,
  },
  inclusionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 13,
  },
  inclusionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  restoLogoCard: {
    width: 110,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  restoLogoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  restoLogoText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  restoLogoSub: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  availabilityBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#F3E8DF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  availabilityHalf: {
    flex: 1,
    justifyContent: 'center',
  },
  availabilityLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  availabilityVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  separatorLine: {
    width: 1,
    backgroundColor: '#E6DCD2',
    marginHorizontal: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Choice grid step 1
  radioItemText: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
  },
  timeItem: {
    width: '30%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeActive: {
    backgroundColor: Colors.primary,
  },
  timeItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  selectedPackCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    borderRadius: 12,
    padding: 10,
    gap: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  selectedPackImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  selectedPackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  selectedPackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  selectedPackResto: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  selectedPackPeople: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },

  // Resume details container step 2
  resumeDetailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginVertical: 16,
    gap: 10,
  },
  resumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resumeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  resumeVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  dateCardScroll: {
    marginVertical: 8,
  },
  dateCardOption: {
    width: 82,
    height: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateCardOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dateCardNumber: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '800',
  },
  customDateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 16,
  },
  customDateInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    paddingVertical: 8,
  },

  // Payment Radio Step 3
  paymentRadioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    backgroundColor: 'white',
  },
  paymentRadioActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F5',
  },
  paymentRadioLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paymentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  securePaymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },

  // Success step 4
  successCheckContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  receiptCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    width: '100%',
    marginVertical: 16,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Agent Space Specifics
  agentStatsCard: {
    backgroundColor: 'black',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  agentStatsLabel: {
    color: '#7D7D7D',
    fontSize: 13,
    fontWeight: '600',
  },
  agentStatsVal: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 4,
  },
  agentStatsSub: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tabSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabSelectorActive: {
    backgroundColor: Colors.primary,
  },
  tabSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    fontSize: 14,
  },

  // Restaurant action buttons inside cards
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBadgeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  // Search Bar styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#1A1A1A',
    fontSize: 13,
    padding: 0,
  },
  filterBtn: {
    padding: 4,
  },

  // Premium Metric Cards
  metricCard: {
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    width: 110,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricCardVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricCardTitle: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSubtitleText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  seeAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Partners Premium Card
  partnersContainer: {
    gap: 10,
  },
  partnerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  partnerLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  partnerCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  partnerCardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  partnerCardSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  partnerRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  partnerCardPhone: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailHeaderSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginVertical: 6,
    lineHeight: 16,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
  },
  savingsBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  flashAvailabilityBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  verticalRadioGroup: {
    width: '100%',
    marginVertical: 8,
  },
  verticalRadioItem: {
    width: '100%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalRadioActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  verticalRadioItemText: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  deliveryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: 'white',
  },
  deliveryOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F5',
  },
  deliveryOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  radioOutlineSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  countdownBox: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  countdownValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  countdownValText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  countdownLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  countdownLabelText: {
    fontSize: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
