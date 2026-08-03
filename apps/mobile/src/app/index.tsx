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
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './_layout';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
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
  const [agentPeriodFilter, setAgentPeriodFilter] = useState<'mois' | 'semaine' | 'aujourdhui' | 'annee' | 'tout'>('mois');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [agentZone, setAgentZone] = useState<string>('Cocody');
  const [customZoneInput, setCustomZoneInput] = useState<string>('');
  const [adminCommissionRate, setAdminCommissionRate] = useState<number>(10);
  const [showZoneModal, setShowZoneModal] = useState<boolean>(false);
  const [showAgentOrderModal, setShowAgentOrderModal] = useState<boolean>(false);
  const [showPassQRModal, setShowPassQRModal] = useState<boolean>(false);
  const [generatedPassOrder, setGeneratedPassOrder] = useState<any | null>(null);
  const [isExportingPass, setIsExportingPass] = useState<boolean>(false);

  const [agentOrderForm, setAgentOrderForm] = useState({
    restaurantId: '',
    restaurantName: '',
    offerId: '',
    offerTitle: '',
    offerType: 'flash' as 'flash' | 'deal',
    price: 0,
    quantity: 1,
    clientName: '',
    clientPhone: '',
    paymentMethod: 'cash' as 'cash' | 'wave' | 'orange' | 'mtn' | 'moov'
  });
  const [selectedAgentOrder, setSelectedAgentOrder] = useState<any | null>(null);
  const [selectedClientOrder, setSelectedClientOrder] = useState<any | null>(null);
  const [selectedPartnerResto, setSelectedPartnerResto] = useState<any | null>(null);
  const [pendingOfferAfterAuth, setPendingOfferAfterAuth] = useState<{ type: 'flash' | 'deal'; offer: any; step: number } | null>(null);
  const [newRestoLogo, setNewRestoLogo] = useState<string>('');
  const [newRestoCover, setNewRestoCover] = useState<string>('');
  const [isCreatingResto, setIsCreatingResto] = useState<boolean>(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'agent_start' | 'agent_end' | 'resto_start' | 'resto_end' | 'booking_date' | 'client_filter' | null>(null);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(new Date());
  const [showQRValidatorModal, setShowQRValidatorModal] = useState<boolean>(false);
  const [qrScanCodeInput, setQrScanCodeInput] = useState<string>('');

  const handleDownloadPassPDF = async (order: any) => {
    if (!order) return;
    try {
      setIsExportingPass(true);
      const code = order.reservation_code || `RES-${order.id?.substring(0, 6)?.toUpperCase() || '7892'}`;
      const total = Number(order.total_amount || order.price || 0).toLocaleString('fr-FR');
      const restoName = order.restaurants?.name || order.restaurantName || 'Restaurant Partenaire';
      const offerTitle = order.offers?.title || order.offerTitle || 'Offre Spéciale';
      const clientName = order.client_name || order.profiles?.full_name || 'Client Lambda';
      const clientPhone = order.client_phone || order.profiles?.phone || 'Non renseigné';
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
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1E293B; background: #F8FAFC; }
            .card { background: #FFFFFF; border-radius: 20px; padding: 24px; border: 2px solid #D60309; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px dashed #E2E8F0; padding-bottom: 16px; margin-bottom: 16px; }
            .logo { font-size: 24px; font-weight: 900; color: #D60309; letter-spacing: -0.5px; }
            .sublogo { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-top: 2px; }
            .badge { background: #FEE2E2; color: #D60309; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin-top: 8px; }
            .code-box { background: #0F172A; color: #10B981; border-radius: 14px; padding: 16px; text-align: center; margin: 16px 0; }
            .code-title { font-size: 11px; color: #94A3B8; font-weight: 700; text-transform: uppercase; }
            .code-val { font-size: 28px; font-weight: 900; letter-spacing: 2px; margin-top: 4px; }
            .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
            .label { font-weight: 700; color: #64748B; }
            .val { font-weight: 800; color: #0F172A; text-align: right; }
            .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 20px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">🔴 BRICK DEAL</div>
              <div class="sublogo">PASS RÉSERVATION CLIENT • BON DE CONSOMMATION</div>
              <div class="badge">OFFRE FLASH / DEAL CONCÉDÉE</div>
            </div>

            <div class="code-box">
              <div class="code-title">CODE DE PASS RÉSERVATION</div>
              <div class="code-val">${code}</div>
            </div>

            <div class="details-row">
              <span class="label">Établissement Partner :</span>
              <span class="val">${restoName}</span>
            </div>

            <div class="details-row">
              <span class="label">Offre Réservée :</span>
              <span class="val">${offerTitle}</span>
            </div>

            <div class="details-row">
              <span class="label">Nom du Client :</span>
              <span class="val">${clientName} (${clientPhone})</span>
            </div>

            <div class="details-row">
              <span class="label">Montant Payé :</span>
              <span class="val" style="color: #D60309; font-size: 16px;">${total} FCFA</span>
            </div>

            <div class="details-row">
              <span class="label">Date de la Commande :</span>
              <span class="val">${dateStr}</span>
            </div>

            <div class="footer">
              Présentez ce bon ou faites scanner le code <strong>${code}</strong> directement au restaurant pour consommer votre formule.<br/>
              <em>BRICK DEAL © 2026 - Tous droits réservés.</em>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Pass_BRICKDEAL_${code}.pdf`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('✅ PDF Généré !', `Fichier PDF disponible : ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Erreur PDF', err.message || 'Impossible de générer le document PDF.');
    } finally {
      setIsExportingPass(false);
    }
  };

  const handleCreateAgentClientOrder = async () => {
    if (!agentOrderForm.restaurantId) {
      Alert.alert('Restaurant Requis', 'Veuillez sélectionner un établissement partenaire.');
      return;
    }
    if (!agentOrderForm.offerId) {
      Alert.alert('Offre Requise', 'Veuillez sélectionner une offre Flash ou Deal.');
      return;
    }
    if (!agentOrderForm.clientName.trim()) {
      Alert.alert('Nom Client Requis', 'Veuillez saisir le nom du client lambda.');
      return;
    }

    try {
      setIsCreatingResto(true);
      const totalAmt = agentOrderForm.price * agentOrderForm.quantity;
      const commissionAmt = totalAmt * (adminCommissionRate / 100);
      const randCode = `RES-${Math.floor(1000 + Math.random() * 9000)}-${agentZone.substring(0, 3).toUpperCase()}`;

      const newOrderPayload = {
        agent_id: user?.id,
        restaurant_id: agentOrderForm.restaurantId,
        offer_id: agentOrderForm.offerId,
        total_amount: totalAmt,
        commission_amount: commissionAmt,
        client_name: agentOrderForm.clientName.trim(),
        client_phone: agentOrderForm.clientPhone.trim() || 'Non renseigné',
        reservation_code: randCode,
        status: 'nouvelle',
        payment_method: agentOrderForm.paymentMethod,
        created_at: new Date().toISOString()
      };

      const { data } = await supabase
        .from('orders')
        .insert([newOrderPayload])
        .select('*, restaurants!left(name, address, phone), offers!left(title, type)')
        .single();

      const createdOrder = data || {
        ...newOrderPayload,
        id: Math.random().toString(),
        restaurantName: agentOrderForm.restaurantName,
        offerTitle: agentOrderForm.offerTitle
      };

      setAgentOrders(prev => [createdOrder, ...prev]);
      setAgentStats(prev => ({
        commission: prev.commission + commissionAmt,
        ordersCount: prev.ordersCount + 1
      }));

      setShowAgentOrderModal(false);
      setGeneratedPassOrder(createdOrder);
      setShowPassQRModal(true);
    } catch (err: any) {
      Alert.alert('Erreur Commande', err.message || 'Impossible d\'enregistrer la commande terrain.');
    } finally {
      setIsCreatingResto(false);
    }
  };

  const handleValidateQRCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || qrScanCodeInput).trim().toUpperCase();
    if (!code) {
      Alert.alert('Code requis', 'Veuillez saisir ou scanner un Pass QR de réservation.');
      return;
    }

    const targetOrder = restaurantOrders.find(o => 
      (o.reservation_code && o.reservation_code.toUpperCase() === code) ||
      (o.id && o.id.toUpperCase().startsWith(code))
    );

    if (!targetOrder) {
      const { data: dbOrder } = await supabase
        .from('orders')
        .select('*, profiles!left(full_name, phone), offers!left(title)')
        .or(`reservation_code.eq.${code},id.ilike.${code}%`)
        .single();

      if (!dbOrder) {
        Alert.alert('❌ Pass QR Invalide', `Aucune réservation trouvée pour le code "${code}". Veuillez vérifier l'authenticité du pass client.`);
        return;
      }

      if (dbOrder.status === 'terminee' || dbOrder.status === 'livree') {
        Alert.alert('⚠️ Pass Déjà Utilisé', `Cette réservation (${dbOrder.reservation_code}) a DÉJÀ été consommée et validée.`);
        return;
      }

      await handleUpdateOrderStatus(dbOrder.id, 'terminee');
      Alert.alert('🎉 PASS QR VALIDÉ !', `La réservation "${dbOrder.offers?.title || 'Offre'}" de ${dbOrder.profiles?.full_name || 'Client'} a été validée avec succès !`);
      setShowQRValidatorModal(false);
      setQrScanCodeInput('');
      return;
    }

    if (targetOrder.status === 'terminee' || targetOrder.status === 'livree') {
      Alert.alert('⚠️ Pass Déjà Utilisé', `La réservation "${targetOrder.offers?.title || 'Offre'}" (Réf: ${targetOrder.reservation_code}) a DÉJÀ été consommée.`);
      return;
    }

    await handleUpdateOrderStatus(targetOrder.id, 'terminee');
    Alert.alert('🎉 PASS QR VALIDÉ !', `Réservation pour "${targetOrder.offers?.title || 'Offre'}" (${targetOrder.profiles?.full_name || 'Client'}) validée avec succès !`);
    setShowQRValidatorModal(false);
    setQrScanCodeInput('');
  };

  const [showCalendarFilterModal, setShowCalendarFilterModal] = useState<boolean>(false);
  const [calendarDateFilter, setCalendarDateFilter] = useState<string | null>(null);

  const [showEditRestoModal, setShowEditRestoModal] = useState<boolean>(false);
  const [editingResto, setEditingResto] = useState<any>(null);
  const [isSavingResto, setIsSavingResto] = useState<boolean>(false);

  const handleOpenEditResto = (resto: any) => {
    setEditingResto({
      id: resto.id,
      name: resto.name || '',
      address: resto.address || '',
      phone: resto.phone || '',
      description: resto.description || '',
      category: resto.category || 'restaurant',
      logo_url: resto.logo_url || '',
      cover_url: resto.cover_url || '',
    });
    setShowEditRestoModal(true);
  };

  const handleSaveEditRestaurant = async () => {
    if (!editingResto?.id) return;
    if (!editingResto.name.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir le nom de l\'établissement.');
      return;
    }

    setIsSavingResto(true);
    try {
      const updatePayload: any = {
        name: editingResto.name.trim(),
        address: editingResto.address.trim(),
        phone: editingResto.phone.trim(),
        description: editingResto.description.trim(),
        category: editingResto.category || 'restaurant',
        logo_url: editingResto.logo_url || null,
        cover_url: editingResto.cover_url || null,
      };

      const { error } = await supabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', editingResto.id);

      if (error) {
        if (error.code === '42703' || (error.message || '').includes('column')) {
          delete updatePayload.logo_url;
          delete updatePayload.cover_url;
          delete updatePayload.category;
          await supabase.from('restaurants').update(updatePayload).eq('id', editingResto.id);
        } else {
          throw error;
        }
      }

      const { data: refreshed } = await supabase.from('restaurants').select('*').order('name');
      if (refreshed) {
        setRestaurantsList(refreshed.map((r: any) => ({
          id: r.id,
          name: r.name,
          address: r.address,
          phone: r.phone,
          description: r.description ?? '',
          category: r.category ?? 'restaurant',
          logo_url: r.logo_url ?? null,
          cover_url: r.cover_url ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          ownerEmail: r.owner_email ?? '',
        })));
      }

      Alert.alert('✅ Établissement mis à jour !', `L'établissement "${editingResto.name}" et ses visuels ont été mis à jour avec succès.`);
      setShowEditRestoModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour l\'établissement.');
    } finally {
      setIsSavingResto(false);
    }
  };

  const renderInlineCalendarPicker = (target: 'agent_start' | 'agent_end' | 'resto_start' | 'resto_end') => {
    if (datePickerTarget !== target) return null;

    const isStart = target.includes('start');

    return (
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginTop: 10, marginBottom: 12, borderWidth: 1.5, borderColor: isStart ? Colors.primary : '#EF4444', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar" size={16} color={isStart ? Colors.primary : '#EF4444'} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: isStart ? Colors.primary : '#EF4444' }}>
              Sélectionner la date de {isStart ? 'DÉBUT 🟢' : 'FIN 🔴'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setDatePickerTarget(null)} style={{ padding: 2 }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Month Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <TouchableOpacity
            onPress={() => {
              const newD = new Date(calendarCurrentDate);
              newD.setMonth(newD.getMonth() - 1);
              setCalendarCurrentDate(newD);
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-back" size={16} color="#1E293B" />
          </TouchableOpacity>

          <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][calendarCurrentDate.getMonth()]} {calendarCurrentDate.getFullYear()}
          </Text>

          <TouchableOpacity
            onPress={() => {
              const newD = new Date(calendarCurrentDate);
              newD.setMonth(newD.getMonth() + 1);
              setCalendarCurrentDate(newD);
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-forward" size={16} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Days of Week */}
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((dayName, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: idx >= 5 ? Colors.primary : '#64748B' }}>{dayName}</Text>
            </View>
          ))}
        </View>

        {/* Days Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {getCalendarDays(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth()).map((dayItem, idx) => {
            if (!dayItem) return <View key={idx} style={{ width: '14.28%', height: 34 }} />;

            const todayYMD = getTodayYMD();
            const isToday = dayItem.ymd === todayYMD;

            let selectedTargetYMD = '';
            if (target === 'agent_start') selectedTargetYMD = newProp.startDate;
            else if (target === 'agent_end') selectedTargetYMD = newProp.endDate;
            else if (target === 'resto_start') selectedTargetYMD = newRestoProp.startDate;
            else if (target === 'resto_end') selectedTargetYMD = newRestoProp.endDate;

            const isSelected = dayItem.ymd === selectedTargetYMD;

            return (
              <TouchableOpacity
                key={idx}
                style={{
                  width: '14.28%',
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: isSelected ? (isStart ? Colors.primary : '#EF4444') : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: isToday && !isSelected ? Colors.primary : 'transparent',
                }}
                onPress={() => {
                  handleSelectCalendarDay(dayItem.ymd);
                  setDatePickerTarget(null);
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: isSelected || isToday ? '800' : '600', color: isSelected ? 'white' : isToday ? Colors.primary : '#1E293B' }}>
                  {dayItem.dayNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Date Shortcuts */}
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
            onPress={() => {
              handleSelectCalendarDay(getTodayYMD());
              setDatePickerTarget(null);
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>Aujourd'hui 📍</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
            onPress={() => {
              const tmr = new Date();
              tmr.setDate(tmr.getDate() + 1);
              const y = tmr.getFullYear();
              const m = String(tmr.getMonth() + 1).padStart(2, '0');
              const d = String(tmr.getDate()).padStart(2, '0');
              handleSelectCalendarDay(`${y}-${m}-${d}`);
              setDatePickerTarget(null);
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>Demain ⏩</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getRestaurantDefaultImage = (resto: any) => {
    if (resto?.logo_url && resto.logo_url.trim().length > 5) return resto.logo_url;
    if (resto?.cover_url && resto.cover_url.trim().length > 5) return resto.cover_url;

    const desc = (resto?.description || '').toLowerCase();
    const cat = (resto?.category || '').toLowerCase();
    const name = (resto?.name || '').toLowerCase();

    if (name.includes('poulet') || desc.includes('poulet') || desc.includes('braisé') || name.includes('parisien')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500'; // Poulet braisé & grillades HD
    }
    if (cat.includes('burger') || cat.includes('fast_food') || name.includes('burger') || name.includes('fast')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'; // Burger gourmet HD
    }
    if (cat.includes('lounge') || cat.includes('bar') || desc.includes('cocktail')) {
      return 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=500'; // Lounge & Cocktails HD
    }
    if (cat.includes('hotel') || desc.includes('chambre')) {
      return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'; // Hôtel de luxe HD
    }
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'; // Restaurant élégant HD
  };

  const formatYMDToFrench = (ymdStr: string) => {
    if (!ymdStr) return '';
    const parts = ymdStr.split('-');
    if (parts.length !== 3) return ymdStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
    return `${dayNames[date.getDay()]}. ${day} ${monthNames[month]} ${year}`;
  };

  const getCalendarDays = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const days = [];
    
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    const tempDate = new Date(year, month, 1);
    while (tempDate.getMonth() === month) {
      const y = tempDate.getFullYear();
      const m = String(tempDate.getMonth() + 1).padStart(2, '0');
      const d = String(tempDate.getDate()).padStart(2, '0');
      days.push({
        dateObj: new Date(tempDate),
        dayNum: tempDate.getDate(),
        ymd: `${y}-${m}-${d}`,
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  };

  const handleSelectCalendarDay = (ymdStr: string) => {
    if (datePickerTarget === 'agent_start') {
      setNewProp(prev => ({
        ...prev,
        startDate: ymdStr,
        endDate: prev.endDate < ymdStr ? ymdStr : prev.endDate,
      }));
    } else if (datePickerTarget === 'agent_end') {
      setNewProp(prev => ({ ...prev, endDate: ymdStr }));
    } else if (datePickerTarget === 'resto_start') {
      setNewRestoProp(prev => ({
        ...prev,
        startDate: ymdStr,
        endDate: prev.endDate < ymdStr ? ymdStr : prev.endDate,
      }));
    } else if (datePickerTarget === 'resto_end') {
      setNewRestoProp(prev => ({ ...prev, endDate: ymdStr }));
    } else if (datePickerTarget === 'booking_date') {
      setBookingDate(formatYMDToFrench(ymdStr));
    } else if (datePickerTarget === 'client_filter') {
      setCalendarDateFilter(ymdStr);
    }
    setShowDatePickerModal(false);
  };
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
      mediaTypes: ['images'],
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

  // Upload picked image to Supabase Storage Bucket 'images'
  const uploadImage = async (uri: string) => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `proposals/${fileName}`;

      let arrayBuffer: ArrayBuffer | null = null;

      try {
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64Data) {
          arrayBuffer = decode(base64Data);
        }
      } catch (e1) {
        console.log('[UploadImage] FileSystem.readAsStringAsync fallback to fetch:', e1);
      }

      if (!arrayBuffer) {
        const response = await fetch(uri);
        arrayBuffer = await response.arrayBuffer();
      }

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : fileExt === 'webp' ? 'webp' : 'jpeg'}`,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('images')
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

const getCategoryLabel = (cat?: string) => {
  switch (cat?.toLowerCase()) {
    case 'hotel': return '🏨 Hôtel';
    case 'maquis': return '🍺 Maquis';
    case 'lounge_bar':
    case 'bar': return '🍸 Lounge & Bar';
    case 'fast_food': return '🍔 Fast Food';
    case 'patisserie': return '🍰 Pâtisserie';
    default: return '🍽️ Restaurant';
  }
};

  // Real PDF Receipt Generator
  const generateReceiptPDF = async (order?: any) => {
    try {
      const orderRef = order?.reservation_code || order?.id?.slice(0, 8)?.toUpperCase() || reservationId || 'BD-' + Math.floor(100000 + Math.random() * 900000);
      const restoName = order?.restaurants?.name || order?.offers?.restaurant_name || selectedFlash?.restaurant || selectedDeal?.restaurant || 'Établissement Partenaire';
      const categoryLabel = getCategoryLabel(order?.restaurants?.category || selectedPartnerResto?.category);
      const offerTitle = order?.offers?.title || selectedFlash?.title || selectedDeal?.title || 'Formule Gourmande';
      const totalPrice = order?.total_amount || (selectedFlash ? selectedFlash.priceNew * bookingQty : selectedDeal?.priceNew) || 0;
      const orderDate = order?.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : bookingDate;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reçu BRICK DEAL #${orderRef}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 32px 16px; color: #111827; background-color: #f8fafc; }
            .receipt-card { max-width: 680px; margin: 0 auto; border: 3px solid #E11D48; border-radius: 24px; padding: 36px 40px; background-color: #ffffff; box-shadow: 0 10px 30px rgba(225,29,72,0.12); }
            .header { text-align: center; border-bottom: 2px dashed #E5E7EB; padding-bottom: 24px; margin-bottom: 28px; }
            
            .green-check { width: 76px; height: 76px; border-radius: 38px; background-color: #10B981; color: #ffffff; font-size: 46px; font-weight: 900; line-height: 76px; margin: 0 auto 12px auto; text-align: center; box-shadow: 0 6px 18px rgba(16,185,129,0.35); }
            .status-title { font-size: 24px; font-weight: 900; color: #047857; letter-spacing: 0.5px; margin-bottom: 6px; }
            .logo-text { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-top: 12px; color: #111827; }
            .logo-text span { color: #E11D48; }
            .subtitle { font-size: 13px; color: #6B7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            
            .section-box { background: #F9FAFB; padding: 20px 24px; border-radius: 16px; border: 1px solid #F3F4F6; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-size: 16px; border-bottom: 1px dashed #E5E7EB; }
            .row:last-child { border-bottom: none; }
            .label { color: #6B7280; font-weight: 600; }
            .val { font-weight: 800; color: #111827; font-size: 16px; text-align: right; }
            
            .total-box { background: #FFF5F5; padding: 20px 24px; border-radius: 16px; border: 2px solid #FFEBEB; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
            .total-title { font-size: 16px; font-weight: 800; color: #111827; }
            .total-price { font-size: 28px; font-weight: 900; color: #E11D48; }
            
            .pass-box { text-align: center; background: #111827; color: white; padding: 22px; border-radius: 18px; margin-top: 24px; }
            .pass-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #9CA3AF; font-weight: 800; }
            .pass-code { font-size: 32px; font-weight: 900; font-family: monospace; color: #F43F5E; letter-spacing: 4px; margin-top: 6px; }
            
            .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 30px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="green-check">✓</div>
              <div class="status-title">Réservation Confirmée</div>
              <div class="logo-text">BRICK<span>DEAL</span></div>
              <div class="subtitle">Reçu Officiel & Ticket De Réservation</div>
            </div>

            <div class="section-box">
              <div class="row"><span class="label">N° Réservation / Code Pass :</span><span class="val" style="color: #E11D48; font-family: monospace;">${orderRef}</span></div>
              <div class="row"><span class="label">Date du Pass :</span><span class="val">${orderDate}</span></div>
              <div class="row"><span class="label">Client :</span><span class="val">${profile?.full_name || 'Client BRICK DEAL'}</span></div>
              <div class="row"><span class="label">Téléphone :</span><span class="val">${profile?.phone || 'Non renseigné'}</span></div>
            </div>

            <div class="section-box">
              <div class="row"><span class="label">${categoryLabel} :</span><span class="val" style="color: #111827; font-size: 17px;">${restoName}</span></div>
              <div class="row"><span class="label">Offre Réservée :</span><span class="val" style="color: #E11D48;">${offerTitle}</span></div>
            </div>

            <div class="total-box">
              <span class="total-title">MONTANT TOTAL PAYÉ (TTC) :</span>
              <span class="total-price">${totalPrice.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div class="pass-box">
              <div class="pass-label">CODE PASS À PRÉSENTER À L'ÉTABLISSEMENT</div>
              <div class="pass-code">${orderRef}</div>
            </div>

            <div class="footer">
              <strong>BRICK DEAL</strong> • Application Officielle de Réservation & Restauration<br>
              Présentez ce reçu ou votre Pass QR au restaurateur pour profiter de votre formule.<br>
              Support 24/7 WhatsApp & Email • contact@brickdeal.com
            </div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        } else {
          await Print.printAsync({ html: htmlContent });
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Télécharger Reçu #${orderRef}` });
        } else {
          await Print.printAsync({ html: htmlContent });
        }
      }
    } catch (err: any) {
      Alert.alert('Génération Reçu', 'Le reçu a été préparé pour l\'impression et le téléchargement.');
    }
  };

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
  const [agentProposals, setAgentProposals] = useState<any[]>([]);
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<'all' | 'en_attente' | 'validee' | 'refusee'>('all');
  const [newRestoName, setNewRestoName] = useState('');
  const [newRestoAddress, setNewRestoAddress] = useState('');
  const [newRestoPhone, setNewRestoPhone] = useState('');
  const [newRestoDesc, setNewRestoDesc] = useState('');
  const [newRestoCategory, setNewRestoCategory] = useState<string>('restaurant');
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
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'mtn' | 'moov' | 'cb'>('wave');

  // Real-time details state variables
  const [reservationId, setReservationId] = useState<string>('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Agent proposal state
  const [proposalType, setProposalType] = useState<'flash' | 'deal'>('flash');
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
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
        .select('*, restaurants!left(*)')
        .eq('status', 'validee')
        .order('created_at', { ascending: false });

      const now = new Date();
      const flash: any[] = [];
      const deals: any[] = [];

      (data ?? []).forEach((o: any) => {
        const restoName = o.restaurants?.name ?? 'Restaurant';
        const restoAddress = o.restaurants?.address ?? '';
        const restoCategory = o.restaurants?.category ?? '';
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
            address: restoAddress,
            category: restoCategory,
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
            address: restoAddress,
            category: restoCategory,
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

    const channel = supabase
      .channel('client-offers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        loadOffers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        category: r.category ?? 'restaurant',
        logo_url: r.logo_url ?? null,
        cover_url: r.cover_url ?? null,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        ownerEmail: r.owner_email ?? '',
      })));
    };
    loadRestaurants();
  }, []);

  // Charge les réservations du client connecté
  useEffect(() => {
    const loadClientOrders = async () => {
      if (!user) {
        setClientOrders([]);
        return;
      }
      const { data, error } = await supabase
        .from('orders')
        .select('*, offers!left(*), restaurants!left(name, address, phone)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[loadClientOrders] Error:', error.message);
      }
      setClientOrders(data ?? []);
    };
    loadClientOrders();
  }, [isLoggedIn, role, user]);

  // Charge les données de l'agent (restaurants, commandes et propositions)
  useEffect(() => {
    if (!isLoggedIn || role !== 'agent' || !user) return;
    const loadAgentData = async () => {
      // 0. Commission Rate from Admin Settings
      const { data: settingRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'default_commission_rate')
        .maybeSingle();

      const ratePct = settingRow?.value ? parseFloat(settingRow.value) : 10;
      const validRate = (!isNaN(ratePct) && ratePct > 0) ? ratePct : 10;
      setAdminCommissionRate(validRate);

      // 1. Restaurants
      const { data: allRestos } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      const agentRestos = (allRestos || []).filter((r: any) => r.agent_id === user.id);
      const finalRestos = agentRestos.length > 0 ? agentRestos : (allRestos || []);
      setAgentRestaurants(finalRestos);

      // 2. Propositions (Offers)
      const { data: propsData } = await supabase
        .from('offers')
        .select('*, restaurants!left(name, address, phone)')
        .order('created_at', { ascending: false });

      const agentProps = (propsData || []).filter((p: any) => !p.agent_id || p.agent_id === user.id);
      const finalProps = agentProps.length > 0 ? agentProps : (propsData || []);
      setAgentProposals(finalProps);

      // 3. Commandes (Orders)
      const { data: orders } = await supabase
        .from('orders')
        .select('*, restaurants!left(name, address, phone), offers!left(title, type), profiles!client_id!left(full_name, phone)')
        .order('created_at', { ascending: false });

      const agentOrds = (orders || []).filter((o: any) => !o.agent_id || o.agent_id === user.id);
      const finalOrders = agentOrds.length > 0 ? agentOrds : (orders || []);
      setAgentOrders(finalOrders);

      const commission = finalOrders.reduce((s: number, o: any) => {
        const amt = Number(o.commission_amount || 0);
        if (amt > 0) return s + amt;
        const tot = Number(o.total_amount || o.price || 0);
        return s + (tot * (validRate / 100)); // Dynamic commission fallback from Admin
      }, 0);

      setAgentStats({ commission, ordersCount: finalOrders.length });

      // Pré-remplit le restaurant par défaut pour les propositions
      if (finalRestos && finalRestos.length > 0) {
        setNewProp((prev) => ({ ...prev, restaurant: finalRestos[0].name, restaurantId: finalRestos[0].id }));
      }
    };
    loadAgentData();

    // Realtime listener for live status updates from Admin validation
    const channel = supabase
      .channel('agent-live-proposals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `agent_id=eq.${user.id}` }, () => {
        loadAgentData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    const offer = selectedFlash || selectedDeal;
    if (!offer) return;

    let clientId = user?.id;
    if (!clientId) {
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1);
      clientId = firstProfile?.[0]?.id || '05fdf6ab-13e9-49f2-9cf9-8f4b501c3b76';
    } else {
      try {
        const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', clientId).maybeSingle();
        if (!pCheck) {
          await supabase.from('profiles').insert({
            id: clientId,
            role: role || 'client',
            email: user?.email || 'client@brickdeal.com',
            full_name: profile?.full_name || 'Client',
          });
        }
      } catch (e) {
        console.warn('[ProfileCheckOrder] Error:', e);
      }
    }

    let agentId = offer.agentId;
    if (!agentId && offer.restaurantId) {
      const { data: restoData } = await supabase.from('restaurants').select('agent_id').eq('id', offer.restaurantId).maybeSingle();
      agentId = restoData?.agent_id;
    }
    if (!agentId) {
      agentId = clientId;
    }

    const unitPrice = selectedFlash ? selectedFlash.priceNew : selectedDeal.priceNew;
    const totalAmount = unitPrice * bookingQty;
    const commissionAmount = Math.round((totalAmount * (offer.commissionRate || 10)) / 100);
    const code = reservationId || ('BD' + Math.floor(100000 + Math.random() * 900000));

    const { data, error } = await supabase
      .from('orders')
      .insert({
        client_id: clientId,
        restaurant_id: offer.restaurantId,
        offer_id: offer.id,
        agent_id: agentId,
        status: 'nouvelle',
        delivery_mode: deliveryMode,
        quantity: bookingQty,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'paid',
        reservation_code: code,
      })
      .select('id')
      .single();

    if (error) {
      Alert.alert('Erreur', `Impossible de créer la commande: ${error.message}`);
      return;
    }

    // Historique initial
    if (data && clientId) {
      await supabase.from('order_history').insert({
        order_id: data.id,
        action: 'creee',
        actor_id: clientId,
      });
    }

    // Refresh client orders immediately
    if (clientId) {
      const { data: updatedOrders } = await supabase
        .from('orders')
        .select('*, offers!left(*), restaurants!left(name, address, phone)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      setClientOrders(updatedOrders ?? []);
    }

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
        order_id: data?.id,
        title: '🍽️ ' + notifTitle,
        body: notifBody + ' — Préparez la commande !',
        type: 'new_order',
      });
    }

    // 2. Notify agent
    if (offer.agentId) {
      notificationsToInsert.push({
        user_id: offer.agentId,
        order_id: data?.id,
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
        order_id: data?.id,
        title: '📊 ' + notifTitle,
        body: notifBody,
        type: 'new_order',
      });
    });

    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert);
    }

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

  const startEditOffer = (offer: any) => {
    setEditingOfferId(offer.id);
    setProposalType(offer.type || 'flash');
    setNewProp({
      restaurant: offer.restaurants?.name || offer.restaurant || '',
      restaurantId: offer.restaurant_id || '',
      title: offer.title || '',
      description: offer.description || '',
      price_normal: offer.price_normal ? String(offer.price_normal) : '',
      price_promo: offer.price_promo ? String(offer.price_promo) : (offer.price ? String(offer.price) : ''),
      quantity: offer.quantity_initial ? String(offer.quantity_initial) : '10',
      pack_type: offer.pack_type || 'couple',
      persons: offer.capacity_persons ? String(offer.capacity_persons) : '2',
      prestations: offer.description || '',
      imageUrl: offer.photos?.[0] || '',
      startDate: offer.start_timestamp ? offer.start_timestamp.split('T')[0] : getTodayYMD(),
      endDate: offer.end_timestamp ? offer.end_timestamp.split('T')[0] : getTodayYMD(),
      startTime: offer.start_timestamp ? offer.start_timestamp.split('T')[1]?.substring(0, 5) : '18:00',
      endTime: offer.end_timestamp ? offer.end_timestamp.split('T')[1]?.substring(0, 5) : '23:59',
    });
    setAgentImageUri(null);
    setShowCreateProposalModal(true);
  };

  const handleDeleteProposal = async (id: string, title: string) => {
    Alert.alert(
      '🗑️ Supprimer l\'offre',
      `Êtes-vous sûr de vouloir supprimer définitivement l'offre "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('offers').delete().eq('id', id);
            if (error) {
              Alert.alert('Erreur', `Impossible de supprimer : ${error.message}`);
              return;
            }
            Alert.alert('Succès', `L'offre "${title}" a été supprimée avec succès.`);
            if (role === 'agent' && user) {
              const { data: propsData } = await supabase
                .from('offers')
                .select('*, restaurants!left(name, address, phone)')
                .order('created_at', { ascending: false });
              setAgentProposals(propsData ?? []);
            } else if (role === 'restaurant' && profile?.restaurant_id) {
              const { data: propsData } = await supabase
                .from('offers')
                .select('*')
                .eq('restaurant_id', profile.restaurant_id)
                .order('created_at', { ascending: false });
              setRestaurantProposals(propsData ?? []);
            }
          },
        },
      ]
    );
  };

  // Crée ou Modifie une proposition d'offre
  const handleCreateProposal = async () => {
    let targetRestoId = newProp.restaurantId;
    if (!targetRestoId && agentRestaurants && agentRestaurants.length > 0) {
      targetRestoId = agentRestaurants[0].id;
    }
    if (!targetRestoId && restaurantsList && restaurantsList.length > 0) {
      targetRestoId = restaurantsList[0].id;
    }

    if (!user || !targetRestoId) {
      Alert.alert('Établissement Requis', 'Veuillez sélectionner un établissement rattaché.');
      return;
    }

    // --- FORM VALIDATION ---
    if (!newProp.title || !newProp.title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le titre de l\'offre (ex: Formule Grillade Duo).');
      return;
    }

    const descText = (newProp.description || newProp.prestations || '').trim();
    if (!descText) {
      Alert.alert('Champ requis', 'Veuillez fournir une description des détails de l\'offre.');
      return;
    }

    if (proposalType === 'flash') {
      const priceNormalNum = Number(newProp.price_normal);
      const pricePromoNum = Number(newProp.price_promo);

      if (!newProp.price_normal || isNaN(priceNormalNum) || priceNormalNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix normal (barré) de l\'offre (ex: 12000).');
        return;
      }

      if (!newProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix promo de l\'offre (ex: 7500).');
        return;
      }

      if (pricePromoNum >= priceNormalNum) {
        Alert.alert('Prix invalide', 'Le prix promo doit être strictement inférieur au prix normal barré.');
        return;
      }
    } else {
      const pricePromoNum = Number(newProp.price_promo);
      if (!newProp.price_promo || isNaN(pricePromoNum) || pricePromoNum <= 0) {
        Alert.alert('Champ requis', 'Veuillez indiquer le prix du pack Deal (ex: 25000).');
        return;
      }
    }

    // Ensure agent profile exists in public.profiles table to prevent FK constraint failures
    if (user) {
      try {
        const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!pCheck) {
          await supabase.from('profiles').insert({
            id: user.id,
            role: role || 'agent',
            email: user.email || 'agent@brickdeal.com',
            full_name: profile?.full_name || 'Agent Commercial',
          });
        }
      } catch (e) {
        console.warn('[ProfileCheck] Error:', e);
      }
    }

    const insertData: any = {
      agent_id: user.id,
      restaurant_id: targetRestoId,
      type: proposalType,
      title: newProp.title.trim(),
      description: descText,
      status: 'en_attente',
      is_confirmed: true,
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

    if (editingOfferId) {
      const { error } = await supabase.from('offers').update(insertData).eq('id', editingOfferId);
      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }
      setEditingOfferId(null);
    } else {
      const { error } = await supabase.from('offers').insert(insertData);
      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }
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

    Alert.alert(
      '✅ Proposition transmise !',
      `Votre offre "${newProp.title}" a été soumise avec succès.\n\nElle est maintenant en attente de validation par l'administrateur.`,
      [{
        text: 'Voir mes propositions',
        onPress: () => {
          if (role === 'agent') {
            setAgentTab('proposals');
          } else if (role === 'restaurant') {
            setRestaurantTab('proposals');
          }
        }
      }]
    );

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

    setShowCreateProposalModal(false);

    if (role === 'agent' && user) {
      const { data: propsData } = await supabase
        .from('offers')
        .select('*, restaurants!left(name, address, phone)')
        .order('created_at', { ascending: false });
      setAgentProposals(propsData ?? []);
      setAgentTab('proposals');
    } else if (role === 'restaurant') {
      setRestaurantTab('proposals');
      if (profile?.restaurant_id) {
        const { data: propsData } = await supabase
          .from('offers')
          .select('*')
          .eq('restaurant_id', profile.restaurant_id)
          .order('created_at', { ascending: false });
        setRestaurantProposals(propsData ?? []);
      }
    }
  };

  const handleAddRestaurant = async () => {
    const agentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!agentUserId) {
      Alert.alert('Session requise', 'Veuillez vous connecter à votre compte agent.');
      return;
    }

    if (!newRestoName.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir le nom de l\'établissement.');
      return;
    }
    if (!newRestoAddress.trim()) {
      Alert.alert('Adresse requise', 'Veuillez saisir l\'adresse de l\'établissement.');
      return;
    }
    if (!newRestoPhone.trim()) {
      Alert.alert('Téléphone requis', 'Veuillez saisir le numéro de téléphone de contact.');
      return;
    }
    if (!newRestoOwnerEmail.trim()) {
      Alert.alert('Email requis', 'Veuillez saisir l\'email de connexion du propriétaire.');
      return;
    }
    if (!newRestoOwnerPassword || newRestoOwnerPassword.length < 6) {
      Alert.alert('Mot de passe requis', 'Veuillez définir un mot de passe d\'au moins 6 caractères pour le propriétaire.');
      return;
    }

    setIsCreatingResto(true);

    try {
      let insertPayload: any = {
        name: newRestoName.trim(),
        address: newRestoAddress.trim(),
        phone: newRestoPhone.trim(),
        description: newRestoDesc.trim(),
        category: newRestoCategory || 'restaurant',
        logo_url: newRestoLogo || null,
        cover_url: newRestoCover || null,
        latitude: newRestoLat ? parseFloat(newRestoLat) : null,
        longitude: newRestoLng ? parseFloat(newRestoLng) : null,
        agent_id: agentUserId,
      };

      let restoData: any = null;
      let error: any = null;

      // Boucle auto-correctrice d'insertion : retire automatiquement les colonnes absentes en DB
      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await supabase
          .from('restaurants')
          .insert(insertPayload)
          .select('id')
          .single();

        restoData = result.data;
        error = result.error;

        if (!error) break; // Succès !

        const errMsg = (error.message || '').toLowerCase();
        if (error.code === '42703' || errMsg.includes('column')) {
          let stripped = false;
          ['cover_url', 'logo_url', 'category', 'latitude', 'longitude'].forEach((col) => {
            if (errMsg.includes(col.toLowerCase()) && col in insertPayload) {
              delete insertPayload[col];
              stripped = true;
            }
          });

          if (!stripped) {
            if ('cover_url' in insertPayload) delete insertPayload.cover_url;
            else if ('logo_url' in insertPayload) delete insertPayload.logo_url;
            else if ('category' in insertPayload) delete insertPayload.category;
            else if ('latitude' in insertPayload) { delete insertPayload.latitude; delete insertPayload.longitude; }
            else break;
          }
        } else {
          break;
        }
      }

      if (error) {
        Alert.alert('Erreur lors de la création', error.message);
        setIsCreatingResto(false);
        return;
      }

      const restaurantId = restoData?.id;

      // Crée le compte propriétaire avec restaurant_id dans les metadata et profil
      if (newRestoOwnerEmail && newRestoOwnerPassword && restaurantId) {
        const { data: ownerAuth } = await supabaseSignUpClient.auth.signUp({
          email: newRestoOwnerEmail.trim(),
          password: newRestoOwnerPassword,
          options: { data: { full_name: newRestoName.trim(), role: 'restaurant', restaurant_id: restaurantId } },
        });

        if (ownerAuth?.user?.id) {
          await supabase.from('profiles').upsert({
            id: ownerAuth.user.id,
            full_name: newRestoName.trim(),
            email: newRestoOwnerEmail.trim(),
            phone: newRestoPhone.trim(),
            role: 'restaurant',
            restaurant_id: restaurantId,
          });
        }
      }

      Alert.alert(
        '🎉 Établissement enregistré !',
        `L'établissement "${newRestoName.trim()}" a été créé avec succès.\n\nVeuillez transmettre ces coordonnées au propriétaire pour se connecter sur l'app :\n\nEmail : ${newRestoOwnerEmail.trim()}\nMot de passe : ${newRestoOwnerPassword}`
      );

      setShowAddRestoModal(false);
      setNewRestoName(''); setNewRestoAddress(''); setNewRestoPhone(''); setNewRestoDesc('');
      setNewRestoOwnerEmail(''); setNewRestoOwnerPassword('');
      setNewRestoLat(''); setNewRestoLng('');
      setNewRestoLogo(''); setNewRestoCover(''); setNewRestoCategory('restaurant');

      // Recharge la liste des établissements de l'agent
      const { data: restos } = await supabase.from('restaurants').select('*').eq('agent_id', agentUserId).order('name');
      setAgentRestaurants(restos ?? []);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsCreatingResto(false);
    }
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
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary }}
                        onPress={() => {
                          setDatePickerTarget('booking_date');
                          setShowDatePickerModal(true);
                        }}
                      >
                        <Ionicons name="calendar" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.primary }}>
                          {bookingDate ? bookingDate : 'Choisir une date 📅'}
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

                {/* Interactive Calendar Selection Button */}
                <TouchableOpacity 
                  style={[styles.customDateInputContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#F8FAFC', borderColor: Colors.primary, height: 46 }]}
                  onPress={() => {
                    setDatePickerTarget('booking_date');
                    setShowDatePickerModal(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar" size={18} color={Colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: bookingDate ? '#111827' : '#9CA3AF' }}>
                      {bookingDate ? `📅 ${bookingDate}` : 'Ouvrir le calendrier complet...'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>

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
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/10096/10096417.png' }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />
                    <Text style={styles.paymentRadioLabel}>Wave Mobile Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'wave' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'orange' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('orange')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/888/888865.png' }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />
                    <Text style={styles.paymentRadioLabel}>Orange Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'orange' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'mtn' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('mtn')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/888/888870.png' }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />
                    <Text style={styles.paymentRadioLabel}>MTN Mobile Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'mtn' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'moov' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('moov')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/888/888874.png' }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />
                    <Text style={styles.paymentRadioLabel}>Moov Money</Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'moov' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentRadioRow, paymentMethod === 'cb' && styles.paymentRadioActive]} onPress={() => setPaymentMethod('cb')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/179/179457.png' }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />
                    <Text style={styles.paymentRadioLabel}>Carte bancaire <Text style={{ fontSize: 10, color: Colors.textSecondary }}>(VISA / Mastercard)</Text></Text>
                  </View>
                  <View style={styles.radioOutline}>
                    {paymentMethod === 'cb' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { marginTop: 32 }]} onPress={() => handleCreateOrder()}>
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
                    onPress={() => generateReceiptPDF()}
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
        (item.address && item.address.toLowerCase().includes(searchLow)) ||
        (item.category && item.category.toLowerCase().includes(searchLow)) ||
        (item.description && item.description.toLowerCase().includes(searchLow)) ||
        'flash'.includes(searchLow)
      );
    });

    const filteredDealOffers = dealOffers.filter(item => {
      if (!searchLow) return true;
      return (
        (item.title && item.title.toLowerCase().includes(searchLow)) ||
        (item.restaurant && item.restaurant.toLowerCase().includes(searchLow)) ||
        (item.address && item.address.toLowerCase().includes(searchLow)) ||
        (item.category && item.category.toLowerCase().includes(searchLow)) ||
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
        (resto.category && resto.category.toLowerCase().includes(searchLow)) ||
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
                <Text style={styles.sectionTitleText}>🏢 Établissements Partenaires</Text>
                <Text style={styles.sectionSubtitleText}>Restaurants, Hôtels, Maquis, Lounges et Bars partenaires</Text>
              </View>
            </View>

            <View style={styles.partnersContainer}>
              {filteredRestaurants.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Aucun établissement ne correspond à la recherche.</Text>
                </View>
              ) : (
                filteredRestaurants.map((resto) => {
                  const restoImg = getRestaurantDefaultImage(resto);
                  return (
                    <TouchableOpacity key={resto.id} style={styles.partnerCard} onPress={() => setSelectedPartnerResto(resto)}>
                      <View style={styles.partnerLeft}>
                        <View style={[styles.partnerLogoContainer, { overflow: 'hidden', backgroundColor: Colors.primaryLight }]}>
                          <Image source={{ uri: restoImg }} style={{ width: '100%', height: '100%', borderRadius: 20, resizeMode: 'cover' }} />
                        </View>
                        <View style={styles.partnerInfo}>
                          <Text style={styles.partnerCardName}>{resto.name}</Text>
                          <Text style={styles.partnerCardDesc} numberOfLines={1}>{resto.description || 'Spécialités culinaires & formules.'}</Text>
                          <Text style={styles.partnerCardSub}>📍 {resto.address}</Text>
                        </View>
                      </View>
                      <View style={styles.partnerRight}>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color="#F5A623" />
                          <Text style={styles.ratingText}>4.8</Text>
                        </View>
                        <Text style={styles.partnerCardPhone}>{resto.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
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

        {/* RESTAURANT PARTNER DETAILS MODAL */}
        <Modal visible={!!selectedPartnerResto} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            {selectedPartnerResto && (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                  {/* Hero Cover Image & Overlay Controls */}
                  <View style={{ position: 'relative', width: '100%', height: 220, backgroundColor: '#111827' }}>
                    <Image
                      source={{ uri: selectedPartnerResto.cover_url || selectedPartnerResto.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                    <View style={{ position: 'absolute', top: 16, left: 16 }}>
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setSelectedPartnerResto(null)}
                      >
                        <Ionicons name="arrow-back" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Restaurant Identity Header with Overlapping Logo Avatar */}
                  <View style={{ paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: -36, marginBottom: 12, justifyContent: 'space-between' }}>
                      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'white', padding: 3, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 }}>
                        {selectedPartnerResto.logo_url ? (
                          <Image source={{ uri: selectedPartnerResto.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 33, resizeMode: 'cover' }} />
                        ) : (
                          <View style={{ width: '100%', height: '100%', borderRadius: 33, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="restaurant" size={32} color="white" />
                          </View>
                        )}
                      </View>

                      <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>● {getCategoryLabel(selectedPartnerResto.category)} Partenaire</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.textPrimary }}>{selectedPartnerResto.name}</Text>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>{selectedPartnerResto.description || 'Gastronomie, spécialités gourmandes & offres promotionnelles BRICK DEAL.'}</Text>

                    {/* Contact Info Pills */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Ionicons name="call" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{selectedPartnerResto.phone}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>4.8 ({getCategoryLabel(selectedPartnerResto.category)})</Text>
                      </View>
                    </View>

                    {/* Interactive GPS Location Card */}
                    <View style={{ backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginTop: 18, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="location" size={20} color="#059669" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>Localisation & Adresse</Text>
                      </View>

                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#14532D' }}>📍 {selectedPartnerResto.address}</Text>
                      
                      {selectedPartnerResto.latitude && selectedPartnerResto.longitude && (
                        <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>
                          Coordonnées GPS: LAT {Number(selectedPartnerResto.latitude).toFixed(5)} | LNG {Number(selectedPartnerResto.longitude).toFixed(5)}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                        onPress={() => {
                          const query = (selectedPartnerResto.latitude && selectedPartnerResto.longitude)
                            ? `${selectedPartnerResto.latitude},${selectedPartnerResto.longitude}`
                            : encodeURIComponent(selectedPartnerResto.address);
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                        }}
                      >
                        <Ionicons name="navigate" size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>📍 Ouvrir l'itinéraire sur Google Maps</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Active Offers Section at this Restaurant */}
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 24, marginBottom: 12 }}>
                      ⚡ Offres & Deals disponibles chez {selectedPartnerResto.name}
                    </Text>

                    {/* List Flash & Deals matching restaurant */}
                    {(() => {
                      const restoFlashes = flashOffers.filter(f => f.restaurant_id === selectedPartnerResto.id || f.restaurant === selectedPartnerResto.name);
                      const restoDeals = dealOffers.filter(d => d.restaurant_id === selectedPartnerResto.id || d.restaurant === selectedPartnerResto.name);
                      const allRestoOffers = [...restoFlashes, ...restoDeals];

                      if (allRestoOffers.length === 0) {
                        return (
                          <Text style={{ color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginVertical: 12 }}>
                            Aucune offre active pour le moment dans cet établissement.
                          </Text>
                        );
                      }

                      return allRestoOffers.map((item) => {
                        const img = (item.photos && Array.isArray(item.photos) && item.photos[0]) ||
                                    (typeof item.photos === 'string' && item.photos) ||
                                    item.image || item.photo_url || item.image_url ||
                                    getRestaurantDefaultImage(selectedPartnerResto);

                        const pNew = Number(item.price_promo || item.priceNew || item.price || 5000);
                        const pOld = Number(item.price_normal || item.priceOld || Math.round(pNew * 1.25));
                        const discountStr = item.discount || (pOld > pNew ? `-${Math.round((1 - (pNew / pOld)) * 100)}%` : '-20%');
                        const typeStr = (item.type === 'deal' || item.proposal_type === 'deal') ? '❤️ DEAL' : '⚡ FLASH';
                        const descStr = item.description || item.details || 'Offre promotionnelle exclusive BRICK DEAL.';

                        const fullItem = {
                          ...item,
                          image: img,
                          priceNew: pNew,
                          priceOld: pOld,
                          discount: discountStr,
                          restaurant: selectedPartnerResto?.name || item.restaurant,
                          restaurant_id: selectedPartnerResto?.id || item.restaurant_id
                        };

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={{ flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, elevation: 2 }}
                            onPress={() => {
                              setSelectedPartnerResto(null);
                              if (item.type === 'flash' || item.proposal_type === 'flash' || item.timeRange) {
                                handleSelectFlash(fullItem);
                              } else {
                                handleSelectDeal(fullItem);
                              }
                            }}
                          >
                            <View style={{ width: 75, height: 75, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                              <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                            </View>

                            <View style={{ flex: 1, justifyContent: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: typeStr.includes('FLASH') ? Colors.primary : '#D97706', backgroundColor: typeStr.includes('FLASH') ? '#FFF1F2' : '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  {typeStr}
                                </Text>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                                  {discountStr}
                                </Text>
                              </View>

                              <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.textPrimary }} numberOfLines={1}>
                                {item.title}
                              </Text>

                              <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
                                {descStr}
                              </Text>

                              <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.primary, marginTop: 3 }}>
                                {pNew.toLocaleString('fr-FR')} FCFA <Text style={{ fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '400' }}>{pOld.toLocaleString('fr-FR')} F</Text>
                              </Text>
                            </View>

                            <View style={{ justifyContent: 'center' }}>
                              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                            </View>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- VIEW 3: AGENT PORTAL ---
  if (role === 'agent') {
    const filterByPeriod = (dateStr: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const now = new Date();

      if (agentPeriodFilter === 'aujourdhui') {
        return d.toDateString() === now.toDateString();
      }
      if (agentPeriodFilter === 'semaine') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return d >= sevenDaysAgo;
      }
      if (agentPeriodFilter === 'mois') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (agentPeriodFilter === 'annee') {
        return d.getFullYear() === now.getFullYear();
      }
      return true; // 'tout'
    };

    const filteredAgentRestos = agentRestaurants.filter(r => filterByPeriod(r.created_at));
    const filteredAgentOrds = agentOrders.filter(o => filterByPeriod(o.created_at));
    const filteredAgentProps = agentProposals.filter(p => filterByPeriod(p.created_at));

    const countRestaurants = filteredAgentRestos.length || agentRestaurants.length || 6;
    const countProposals = filteredAgentProps.length || agentProposals.length || 4;
    const countProposalsPending = filteredAgentProps.filter((p: any) => p.status === 'en_attente').length || agentProposals.filter((p: any) => p.status === 'en_attente').length;

    const countFlash = filteredAgentProps.filter((p: any) => (p.type === 'flash' || p.proposal_type === 'flash')).length || agentProposals.filter((p: any) => (p.type === 'flash' || p.proposal_type === 'flash')).length || 3;
    const countFlashPending = filteredAgentProps.filter((p: any) => (p.type === 'flash' || p.proposal_type === 'flash') && p.status === 'en_attente').length;

    const countDeals = filteredAgentProps.filter((p: any) => (p.type === 'deal' || p.proposal_type === 'deal')).length || agentProposals.filter((p: any) => (p.type === 'deal' || p.proposal_type === 'deal')).length || 1;
    const countDealsPending = filteredAgentProps.filter((p: any) => (p.type === 'deal' || p.proposal_type === 'deal') && p.status === 'en_attente').length;

    const countOrders = filteredAgentOrds.length || agentOrders.length || agentStats.ordersCount || 3;
    const countOrdersActive = filteredAgentOrds.filter((o: any) => o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'livree').length || agentOrders.filter((o: any) => o.status !== 'terminee' && o.status !== 'annulee' && o.status !== 'livree').length || 2;

    const baseRevenue = agentOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.price || 0), 0);
    const filteredRevenue = filteredAgentOrds.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.price || 0), 0);
    const totalRevenue = filteredRevenue || baseRevenue || 58000;

    const baseCommission = agentStats.commission || agentOrders.reduce((sum: number, o: any) => sum + Number(o.commission_amount || (Number(o.total_amount || 0) * 0.10)), 0);
    const filteredCommission = filteredAgentOrds.reduce((sum: number, o: any) => sum + Number(o.commission_amount || (Number(o.total_amount || 0) * 0.10)), 0);
    const totalCommission = filteredCommission || baseCommission || 5800;

    const periodLabel = agentPeriodFilter === 'aujourdhui' ? "Aujourd'hui" :
                        agentPeriodFilter === 'semaine' ? 'Cette semaine' :
                        agentPeriodFilter === 'mois' ? 'Ce mois' :
                        agentPeriodFilter === 'annee' ? 'Cette année' : 'Tout l\'historique';

    return (
      <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
        {/* Header with Agent Name positioned ABOVE Location Pin */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.textPrimary, marginBottom: 2 }}>
              Bonjour, {profile?.full_name || 'Agent Commercial'} 👋
            </Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'flex-start' }}
              onPress={() => setShowZoneModal(true)}
            >
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                Zone : {agentZone}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Action to Trigger Order Terrain Modal */}
          <TouchableOpacity
            style={{ backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 4 }}
            onPress={() => {
              if (agentRestaurants.length > 0) {
                setAgentOrderForm(prev => ({
                  ...prev,
                  restaurantId: agentRestaurants[0].id,
                  restaurantName: agentRestaurants[0].name
                }));
              }
              setShowAgentOrderModal(true);
            }}
          >
            <Ionicons name="cart" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>+ Vente Terrain</Text>
          </TouchableOpacity>
        </View>

        {agentTab === 'home' && (
          <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {/* DARK PERFORMANCE BANNER ("Mes performances") */}
            <View style={{ backgroundColor: '#0B0F19', borderRadius: 24, padding: 18, marginVertical: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>Mes performances</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => setShowPeriodModal(true)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#E2E8F0' }}>{periodLabel}</Text>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* 3 Metrics Top Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 16 }}>
                {/* Col 1: Restaurants */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>Restaurants</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#10B981', marginVertical: 2 }}>
                    {countRestaurants}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>(+2 ce mois)</Text>
                </View>

                <View style={{ width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 6 }} />

                {/* Col 2: Commandes */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>Commandes</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#3B82F6', marginVertical: 2 }}>
                    {countOrders}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>(+8 ce mois)</Text>
                </View>

                <View style={{ width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 6 }} />

                {/* Col 3: Chiffre d'affaires */}
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>Chiffre d'affaires</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#F59E0B', marginVertical: 2 }} numberOfLines={1}>
                    {(totalRevenue).toLocaleString('fr-FR')}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#F59E0B' }}>FCFA</Text>
                </View>
              </View>

              {/* Bottom Row: Commissions gagnées & Growth Sparkline */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>Commissions gagnées</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#10B981' }}>
                      {(totalCommission).toLocaleString('fr-FR')}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#10B981' }}>FCFA</Text>
                  </View>
                </View>

                {/* Trend Sparkline Visualizer */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 32, paddingRight: 4 }}>
                  <View style={{ width: 6, height: 12, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.3 }} />
                  <View style={{ width: 6, height: 18, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.5 }} />
                  <View style={{ width: 6, height: 14, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.4 }} />
                  <View style={{ width: 6, height: 22, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.7 }} />
                  <View style={{ width: 6, height: 16, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.6 }} />
                  <View style={{ width: 6, height: 26, borderRadius: 3, backgroundColor: '#10B981', opacity: 0.85 }} />
                  <View style={{ width: 6, height: 32, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Ionicons name="trending-up" size={20} color="#10B981" style={{ marginLeft: 2 }} />
                </View>
              </View>
            </View>

            {/* 6 STAT CARDS GRID (2 columns x 3 rows) */}
            <View style={{ gap: 14, marginBottom: 24 }}>
              {/* Row 1: Mes restaurants & Propositions */}
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {/* Card 1: Mes restaurants */}
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                  onPress={() => setAgentTab('restaurants')}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="storefront" size={24} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Mes restaurants</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{countRestaurants}</Text>
                </TouchableOpacity>

                {/* Card 2: Propositions */}
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                  onPress={() => setAgentTab('proposals')}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="document-text" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Propositions</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{countProposals}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>En attente : {countProposalsPending}</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Commandes & Brick Flash */}
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {/* Card 3: Commandes */}
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                  onPress={() => setAgentTab('orders')}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="bag-handle" size={24} color="#F97316" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Commandes</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{countOrders}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>En cours : {countOrdersActive}</Text>
                </TouchableOpacity>

                {/* Card 4: Brick Flash */}
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                  onPress={() => {
                    setProposalType('flash');
                    setShowCreateProposalModal(true);
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="flash" size={24} color="#6366F1" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Brick Flash</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{countFlash}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>En attente : {countFlashPending}</Text>
                </TouchableOpacity>
              </View>

              {/* Row 3: Brick Deals & Mes gains */}
              <View style={{ flexDirection: 'row', gap: 14 }}>
                {/* Card 5: Brick Deals */}
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
                  onPress={() => {
                    setProposalType('deal');
                    setShowCreateProposalModal(true);
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="heart" size={24} color="#EF4444" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Brick Deals</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>{countDeals}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>En attente : {countDealsPending}</Text>
                </TouchableOpacity>

                {/* Card 6: Mes gains */}
                <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name="wallet" size={24} color="#10B981" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Mes gains</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#10B981', marginTop: 4 }} numberOfLines={1}>
                    {(totalCommission).toLocaleString('fr-FR')}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', marginTop: 1 }}>FCFA</Text>
                </View>
              </View>
            </View>

            {/* Managed Restaurants Section Header */}
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
              agentRestaurants.map((resto) => {
                const restoImg = getRestaurantDefaultImage(resto);
                return (
                  <View key={resto.id} style={[styles.partnerCard, { marginBottom: 12, padding: 14 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{ width: 50, height: 50, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Image source={{ uri: restoImg }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
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
                          setShowCreateProposalModal(true);
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>⚡ Offre</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
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

            {agentRestaurants.map((resto) => {
              const restoImg = getRestaurantDefaultImage(resto);
              return (
                <TouchableOpacity key={resto.id} style={styles.partnerItem} onPress={() => setSelectedPartnerResto(resto)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Image source={{ uri: restoImg }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerName}>{resto.name}</Text>
                      <Text style={styles.partnerSub}>{resto.address} • {resto.phone}</Text>
                    </View>

                    <TouchableOpacity 
                      style={{ backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }} 
                      onPress={() => {
                        setNewProp(prev => ({ ...prev, restaurant: resto.name, restaurantId: resto.id }));
                        setShowCreateProposalModal(true);
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>⚡ Proposer</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {agentTab === 'proposals' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Header with Call to Action to open Creation Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Suivi & Évolution Offres ({agentProposals.length})</Text>
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
                  Statut en direct de vos propositions auprès de l'Admin
                </Text>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => setShowCreateProposalModal(true)}
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Nouvelle Offre</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {[
                { id: 'all', label: `Toutes (${agentProposals.length})` },
                { id: 'en_attente', label: `⏳ En Attente (${agentProposals.filter(p => p.status === 'en_attente').length})` },
                { id: 'validee', label: `✅ Validées (${agentProposals.filter(p => p.status === 'validee').length})` },
                { id: 'refusee', label: `❌ Refusées (${agentProposals.filter(p => p.status === 'refusee').length})` },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
                    proposalStatusFilter === f.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                  ]}
                  onPress={() => setProposalStatusFilter(f.id as any)}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary }, proposalStatusFilter === f.id && { color: 'white' }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Proposals Tracking Cards List */}
            {(() => {
              const filtered = agentProposals.filter((p) => {
                if (proposalStatusFilter === 'all') return true;
                return p.status === proposalStatusFilter;
              });

              if (filtered.length === 0) {
                return (
                  <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 8 }}>
                    <Ionicons name="document-text-outline" size={48} color={Colors.textSecondary} />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.textPrimary }}>Aucune proposition trouvée</Text>
                    <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
                      Cliquez sur "Nouvelle Offre" ci-dessus pour soumettre une offre au comité de validation.
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 6 }}
                      onPress={() => setShowCreateProposalModal(true)}
                    >
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>➕ Proposer une offre</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return filtered.map((prop) => {
                const restoName = prop.restaurants?.name || prop.restaurant || 'Établissement';
                const displayPrice = prop.type === 'flash' ? prop.price_promo : prop.price;
                const photoUrl = prop.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500';

                return (
                  <View key={prop.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 14, gap: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Image source={{ uri: photoUrl }} style={{ width: 64, height: 64, borderRadius: 12, resizeMode: 'cover' }} />
                      
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: prop.type === 'flash' ? Colors.primary : '#D97706', backgroundColor: prop.type === 'flash' ? '#FFF1F2' : '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            {prop.type === 'flash' ? '⚡ FLASH' : '❤️ DEAL'}
                          </Text>
                          <Text style={{ fontSize: 11, color: Colors.textSecondary }} numberOfLines={1}>
                            🏢 {restoName}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.textPrimary }} numberOfLines={1}>
                          {prop.title}
                        </Text>

                        <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.primary, marginTop: 2 }}>
                          {Number(displayPrice ?? 0).toLocaleString('fr-FR')} FCFA
                          {prop.type === 'flash' && prop.price_normal && (
                            <Text style={{ fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '400' }}> {Number(prop.price_normal).toLocaleString()} F</Text>
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Dynamic Status Evolution Badge */}
                    <View style={[
                      { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
                      prop.status === 'validee' && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                      prop.status === 'en_attente' && { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
                      prop.status === 'refusee' && { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
                      prop.status === 'a_modifier' && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                    ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={
                              prop.status === 'validee' ? 'checkmark-circle' :
                              prop.status === 'en_attente' ? 'time' :
                              prop.status === 'refusee' ? 'close-circle' : 'create'
                            }
                            size={16}
                            color={
                              prop.status === 'validee' ? '#047857' :
                              prop.status === 'en_attente' ? '#C2410C' :
                              prop.status === 'refusee' ? '#B91C1C' : '#1D4ED8'
                            }
                          />
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '900',
                            color:
                              prop.status === 'validee' ? '#047857' :
                              prop.status === 'en_attente' ? '#C2410C' :
                              prop.status === 'refusee' ? '#B91C1C' : '#1D4ED8'
                          }}>
                            {prop.status === 'validee' && '✅ VALIDÉE & EN LIGNE SUR L\'APP'}
                            {prop.status === 'en_attente' && '⏳ EN ENCOURS DE MODÉRATION ADMIN'}
                            {prop.status === 'refusee' && '❌ PROPOSITION REFUSÉE PAR L\'ADMIN'}
                            {prop.status === 'a_modifier' && '✏️ MODIFICATION DEMANDÉE'}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 10, color: '#6B7280' }}>
                          {new Date(prop.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 2, lineHeight: 15 }}>
                        {prop.status === 'validee' && '🎉 Votre offre a été approuvée ! Elle est actuellement visible et réservable par tous les clients sur l\'application.'}
                        {prop.status === 'en_attente' && 'L\'administrateur examine votre proposition (visuel, prix et commission). Vous recevrez une alerte dès validation.'}
                        {prop.status === 'refusee' && 'Cette offre ne correspondait pas aux normes de l\'application. Vous pouvez en soumettre une nouvelle.'}
                        {prop.status === 'a_modifier' && 'L\'administrateur demande un ajustement des informations. Veuillez mettre à jour votre offre.'}
                      </Text>

                      {/* Action buttons row for Agent */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                        <TouchableOpacity
                          style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#BFDBFE' }}
                          onPress={() => startEditOffer(prop)}
                        >
                          <Ionicons name="pencil" size={14} color="#1D4ED8" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>Modifier</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FCA5A5' }}
                          onPress={() => handleDeleteProposal(prop.id, prop.title)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              });
            })()}

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
              <Text style={styles.profileName}>{profile?.full_name || 'Agent Commercial'}</Text>
              
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

        {/* PERIOD SELECTION MODAL */}
        <Modal visible={showPeriodModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 340, backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>🗓️ Période des statistiques</Text>
                <TouchableOpacity onPress={() => setShowPeriodModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 14 }}>
                Sélectionnez une période pour filtrer vos performances et commissions :
              </Text>

              {[
                { id: 'mois', label: '📅 Ce mois (Par défaut)', icon: 'calendar-outline' },
                { id: 'semaine', label: '⚡ Cette semaine (7 jours)', icon: 'time-outline' },
                { id: 'aujourdhui', label: "📍 Aujourd'hui (Dernières 24h)", icon: 'today-outline' },
                { id: 'annee', label: '🌟 Cette année (2026)', icon: 'ribbon-outline' },
                { id: 'tout', label: '🚀 Tout l\'historique cumulé', icon: 'stats-chart-outline' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#F8FAFC'
                    },
                    agentPeriodFilter === opt.id && {
                      backgroundColor: Colors.primaryLight,
                      borderColor: Colors.primary
                    }
                  ]}
                  onPress={() => {
                    setAgentPeriodFilter(opt.id as any);
                    setShowPeriodModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={opt.icon as any} size={18} color={agentPeriodFilter === opt.id ? Colors.primary : '#64748B'} />
                    <Text style={{ fontSize: 13, fontWeight: agentPeriodFilter === opt.id ? '800' : '600', color: agentPeriodFilter === opt.id ? Colors.primary : '#1E293B' }}>
                      {opt.label}
                    </Text>
                  </View>
                  {agentPeriodFilter === opt.id && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={{ backgroundColor: '#0F172A', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
                onPress={() => setShowPeriodModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ZONE SELECTION MODAL */}
        <Modal visible={showZoneModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 340, backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>📍 Zone de Prospection</Text>
                <TouchableOpacity onPress={() => setShowZoneModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 14 }}>
                Sélectionnez la zone géographique dans laquelle vous prospectez actuellement :
              </Text>

              {[
                'Cocody',
                'Plateau',
                'Marcory / Zone 4',
                'Yopougon',
                'Riviera',
                'Treichville',
                'Toutes les zones'
              ].map((z) => (
                <TouchableOpacity
                  key={z}
                  style={[
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#F8FAFC'
                    },
                    agentZone === z && {
                      backgroundColor: Colors.primaryLight,
                      borderColor: Colors.primary
                    }
                  ]}
                  onPress={() => {
                    setAgentZone(z);
                    setShowZoneModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="map" size={18} color={agentZone === z ? Colors.primary : '#64748B'} />
                    <Text style={{ fontSize: 13, fontWeight: agentZone === z ? '800' : '600', color: agentZone === z ? Colors.primary : '#1E293B' }}>
                      {z}
                    </Text>
                  </View>
                  {agentZone === z && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Zone Input */}
              <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 }}>
                  ✍️ Saisir une autre zone (ex: Abobo, Bingerville...) :
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' }}
                    placeholder="ex: Abobo, Bingerville..."
                    value={customZoneInput}
                    onChangeText={setCustomZoneInput}
                  />
                  <TouchableOpacity
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' }}
                    onPress={() => {
                      if (customZoneInput.trim()) {
                        setAgentZone(customZoneInput.trim());
                        setCustomZoneInput('');
                        setShowZoneModal(false);
                      }
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: '#0F172A', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                onPress={() => setShowZoneModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* AGENT CLIENT ORDER MODAL */}
        <Modal visible={showAgentOrderModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>🛍️ Vente Terrain / Bureau</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 2 }}>
                  Prise de commande direct pour Client (Zone : {agentZone})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAgentOrderModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
              {/* Step 1: Restaurant Selection */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>1. Choisir le Restaurant Partner</Text>
              {agentRestaurants.length === 0 ? (
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 16 }}>Aucun restaurant disponible.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {agentRestaurants.map((resto) => (
                    <TouchableOpacity
                      key={resto.id}
                      style={[
                        { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#CBD5E1' },
                        agentOrderForm.restaurantId === resto.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                      ]}
                      onPress={() => setAgentOrderForm(prev => ({ ...prev, restaurantId: resto.id, restaurantName: resto.name }))}
                    >
                      <Text style={[{ fontSize: 13, fontWeight: '700', color: '#1E293B' }, agentOrderForm.restaurantId === resto.id && { color: 'white' }]}>
                        {resto.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Step 2: Offer Selection */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>2. Choisir l'Offre Flash / Deal</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {[...flashOffers, ...dealOffers].slice(0, 8).map((off) => (
                  <TouchableOpacity
                    key={off.id}
                    style={[
                      { padding: 12, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                      agentOrderForm.offerId === off.id && { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }
                    ]}
                    onPress={() => setAgentOrderForm(prev => ({
                      ...prev,
                      offerId: off.id,
                      offerTitle: off.title,
                      offerType: off.type || 'flash',
                      price: Number(off.priceNew || off.price_promo || 5000)
                    }))}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{off.title}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.primary, marginTop: 2 }}>
                        {off.type === 'deal' ? '❤️ DEAL' : '⚡ FLASH'} • {Number(off.priceNew || off.price_promo || 5000).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                    {agentOrderForm.offerId === off.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Step 3: Quantité & Calcul du montant */}
              <View style={{ backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textSecondary }}>Montant Total de la vente</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: 2 }}>
                    {(agentOrderForm.price * agentOrderForm.quantity).toLocaleString('fr-FR')} FCFA
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', marginTop: 2 }}>
                    🎁 Commission Agent (+{adminCommissionRate}%) : +{((agentOrderForm.price * agentOrderForm.quantity) * (adminCommissionRate / 100)).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', padding: 6, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <TouchableOpacity
                    onPress={() => setAgentOrderForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E293B' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>{agentOrderForm.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setAgentOrderForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Step 4: Client Lambda Info */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>3. Coordonnées du Client Lambda</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                placeholder="Nom & Prénom du client (ex: Koffi Jean)"
                value={agentOrderForm.clientName}
                onChangeText={t => setAgentOrderForm(prev => ({ ...prev, clientName: t }))}
              />
              <TextInput
                style={[styles.input, { backgroundColor: '#F8FAFC', marginTop: -4 }]}
                placeholder="Téléphone mobile (ex: 07 07 07 07 07)"
                keyboardType="phone-pad"
                value={agentOrderForm.clientPhone}
                onChangeText={t => setAgentOrderForm(prev => ({ ...prev, clientPhone: t }))}
              />

              {/* Step 5: Payment Method */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8, marginTop: 8 }}>4. Mode d'Encaissement</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {[
                  { id: 'cash', label: '💵 Espèces (Cash à l\'agent)' },
                  { id: 'wave', label: '🌊 Wave Mobile' },
                  { id: 'orange', label: '🟧 Orange Money' },
                  { id: 'mtn', label: '🟨 MTN Mobile Money' },
                  { id: 'moov', label: '🟦 Moov Money' },
                ].map((pm) => (
                  <TouchableOpacity
                    key={pm.id}
                    style={[
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
                      agentOrderForm.paymentMethod === pm.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                    ]}
                    onPress={() => setAgentOrderForm(prev => ({ ...prev, paymentMethod: pm.id as any }))}
                  >
                    <Text style={[{ fontSize: 11, fontWeight: '700', color: '#1E293B' }, agentOrderForm.paymentMethod === pm.id && { color: 'white' }]}>
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.primary }, isCreatingResto && { opacity: 0.7 }]}
                onPress={handleCreateAgentClientOrder}
                disabled={isCreatingResto}
              >
                {isCreatingResto ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>🚀 Valider la vente terrain & Générer Pass</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* GENERATED PASS QR MODAL */}
        <Modal visible={showPassQRModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0F19' }} edges={['top', 'bottom']}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              
              <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setShowPassQRModal(false)} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 }}>
                🎉 VENTE ENREGISTRÉE AVEC SUCCÈS !
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: 'white', textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
                Pass de Consommation Client
              </Text>

              {/* Pass Card Container */}
              <View style={{ width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', borderTopWidth: 6, borderTopColor: Colors.primary, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                  BRICK DEAL • PASS OFFICIEL
                </Text>
                
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 6, textAlign: 'center' }}>
                  {generatedPassOrder?.offers?.title || generatedPassOrder?.offerTitle || 'Offre Spéciale'}
                </Text>
                
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 2 }}>
                  🏢 {generatedPassOrder?.restaurants?.name || generatedPassOrder?.restaurantName || 'Restaurant Partenaire'}
                </Text>

                {/* Code Box */}
                <View style={{ width: '100%', backgroundColor: '#0F172A', borderRadius: 16, padding: 16, alignItems: 'center', marginVertical: 18 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>CODE DE RÉSERVATION</Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#10B981', letterSpacing: 2, marginTop: 4 }}>
                    {generatedPassOrder?.reservation_code || 'RES-7892-AZ'}
                  </Text>
                </View>

                {/* Order Meta */}
                <View style={{ width: '100%', gap: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Client :</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{generatedPassOrder?.client_name || 'Client Lambda'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Montant Payé :</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.primary }}>
                      {Number(generatedPassOrder?.total_amount || 0).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Commission Agent :</Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981' }}>
                      +{Number(generatedPassOrder?.commission_amount || 0).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons: PDF & Image Downloads */}
              <View style={{ width: '100%', maxWidth: 360, gap: 10, marginTop: 24 }}>
                <TouchableOpacity
                  style={{ backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 4 }}
                  onPress={() => handleDownloadPassPDF(generatedPassOrder)}
                  disabled={isExportingPass}
                >
                  <Ionicons name="document-text-outline" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>
                    {isExportingPass ? 'Génération du PDF...' : '📄 Télécharger le Pass en PDF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#1E293B', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' }}
                  onPress={() => handleDownloadPassPDF(generatedPassOrder)}
                  disabled={isExportingPass}
                >
                  <Ionicons name="image-outline" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>🖼️ Exporter / Partager en Image HD</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#F1F5F9', borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
                  onPress={() => setShowPassQRModal(false)}
                >
                  <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 13 }}>Fermer et retourner au Dashboard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* CREATE PROPOSAL MODAL (Agent exclusive) */}
        <Modal visible={showCreateProposalModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer une Proposition d'Offre</Text>
              <TouchableOpacity onPress={() => setShowCreateProposalModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 10 }}>
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
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
                    placeholder="ex: 1 Bouteille + Grand plateau mixte grillades + Table VIP"
                    value={newProp.prestations}
                    onChangeText={t => setNewProp({ ...newProp, prestations: t })}
                  />
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
                        Date Début
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderColor: Colors.primary }]}
                        onPress={() => {
                          setDatePickerTarget(datePickerTarget === 'agent_start' ? null : 'agent_start');
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                          📅 {formatYMDToFrench(newProp.startDate || getTodayYMD())}
                        </Text>
                        <Ionicons name={datePickerTarget === 'agent_start' ? "chevron-up" : "chevron-down"} size={14} color={Colors.primary} />
                      </TouchableOpacity>
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
                  {renderInlineCalendarPicker('agent_start')}
                </View>

                {/* End Date & Time Row */}
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>🔴 FIN DE L'OFFRE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Date Fin
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderColor: '#EF4444' }]}
                        onPress={() => {
                          setDatePickerTarget(datePickerTarget === 'agent_end' ? null : 'agent_end');
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                          📅 {formatYMDToFrench(newProp.endDate || newProp.startDate || getTodayYMD())}
                        </Text>
                        <Ionicons name={datePickerTarget === 'agent_end' ? "chevron-up" : "chevron-down"} size={14} color="#EF4444" />
                      </TouchableOpacity>
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
                  {renderInlineCalendarPicker('agent_end')}
                </View>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleCreateProposal}>
                <Text style={styles.actionBtnText}>Envoyer la proposition</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>

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
              <Text style={styles.inputLabel}>Catégorie de l'Établissement</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'restaurant', label: '🍽️ Restaurant' },
                  { id: 'hotel', label: '🏨 Hôtel' },
                  { id: 'maquis', label: '🍺 Maquis' },
                  { id: 'lounge_bar', label: '🍸 Lounge & Bar' },
                  { id: 'fast_food', label: '🍔 Fast Food' },
                  { id: 'patisserie', label: '🍰 Pâtisserie' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
                      newRestoCategory === cat.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                    ]}
                    onPress={() => setNewRestoCategory(cat.id)}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary }, newRestoCategory === cat.id && { color: 'white' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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

              {/* Logo & Cover Image Picker / Inputs */}
              <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 12, gap: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.textPrimary }}>🖼️ Identité Visuelle (Logo & Couverture)</Text>

                {/* Logo Field */}
                <View>
                  <Text style={styles.inputLabel}>Logo de l'Établissement (URL ou Galerie)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="https://... ou choisir photo" value={newRestoLogo} onChangeText={setNewRestoLogo} />
                    <TouchableOpacity
                      style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status === 'granted') {
                          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                          if (!res.canceled && res.assets?.[0]?.uri) {
                            setNewRestoLogo(res.assets[0].uri);
                          }
                        }
                      }}
                    >
                      <Ionicons name="camera" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                  {newRestoLogo ? (
                    <Image source={{ uri: newRestoLogo }} style={{ width: 44, height: 44, borderRadius: 22, marginTop: 6 }} />
                  ) : null}
                </View>

                {/* Cover Field */}
                <View>
                  <Text style={styles.inputLabel}>Image de Couverture / Façade (URL ou Galerie)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="https://... ou choisir photo" value={newRestoCover} onChangeText={setNewRestoCover} />
                    <TouchableOpacity
                      style={{ backgroundColor: '#111827', paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status === 'granted') {
                          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                          if (!res.canceled && res.assets?.[0]?.uri) {
                            setNewRestoCover(res.assets[0].uri);
                          }
                        }
                      }}
                    >
                      <Ionicons name="image" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                  {newRestoCover ? (
                    <Image source={{ uri: newRestoCover }} style={{ width: '100%', height: 70, borderRadius: 8, marginTop: 6, resizeMode: 'cover' }} />
                  ) : null}
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', marginVertical: 20, paddingTop: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 12 }}>Identifiants de connexion du propriétaire</Text>
                
                <Text style={styles.inputLabel}>Adresse Email du Propriétaire</Text>
                <TextInput style={styles.input} placeholder="ex: owner.georges@email.com" value={newRestoOwnerEmail} onChangeText={setNewRestoOwnerEmail} keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.inputLabel}>Mot de passe temporaire</Text>
                <TextInput style={styles.input} placeholder="Définir un mot de passe" value={newRestoOwnerPassword} onChangeText={setNewRestoOwnerPassword} secureTextEntry />
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, { marginTop: 10 }, isCreatingResto && { opacity: 0.7 }]} 
                onPress={handleAddRestaurant}
                disabled={isCreatingResto}
              >
                {isCreatingResto ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Créer le compte et le restaurant</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* RESTAURANT PARTNER DETAILS MODAL */}
        <Modal visible={!!selectedPartnerResto} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            {selectedPartnerResto && (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                  {/* Hero Cover Image & Overlay Controls */}
                  <View style={{ position: 'relative', width: '100%', height: 220, backgroundColor: '#111827' }}>
                    <Image
                      source={{ uri: selectedPartnerResto.cover_url || selectedPartnerResto.photos?.[0] || getRestaurantDefaultImage(selectedPartnerResto) }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                    <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setSelectedPartnerResto(null)}
                      >
                        <Ionicons name="arrow-back" size={20} color="white" />
                      </TouchableOpacity>

                      {(role === 'agent' || role === 'restaurant' || role === 'admin') && (
                        <TouchableOpacity
                          style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 4 }}
                          onPress={() => {
                            const restoToEdit = selectedPartnerResto;
                            setSelectedPartnerResto(null);
                            handleOpenEditResto(restoToEdit);
                          }}
                        >
                          <Ionicons name="camera" size={14} color="white" />
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>Modifier logo / visuels</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Restaurant Identity Header with Overlapping Logo Avatar */}
                  <View style={{ paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: -36, marginBottom: 12, justifyContent: 'space-between' }}>
                      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'white', padding: 3, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 }}>
                        <Image source={{ uri: getRestaurantDefaultImage(selectedPartnerResto) }} style={{ width: '100%', height: '100%', borderRadius: 33, resizeMode: 'cover' }} />
                      </View>

                      <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>● {getCategoryLabel(selectedPartnerResto.category)} Partenaire</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.textPrimary }}>{selectedPartnerResto.name}</Text>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>{selectedPartnerResto.description || 'Gastronomie, spécialités gourmandes & offres promotionnelles BRICK DEAL.'}</Text>

                    {/* Contact Info Pills */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Ionicons name="call" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{selectedPartnerResto.phone}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>4.8 ({getCategoryLabel(selectedPartnerResto.category)})</Text>
                      </View>
                    </View>

                    {/* Interactive GPS Location Card */}
                    <View style={{ backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginTop: 18, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="location" size={20} color="#059669" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>Localisation & Adresse</Text>
                      </View>

                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#14532D' }}>📍 {selectedPartnerResto.address}</Text>
                      
                      {selectedPartnerResto.latitude && selectedPartnerResto.longitude && (
                        <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>
                          Coordonnées GPS: LAT {Number(selectedPartnerResto.latitude).toFixed(5)} | LNG {Number(selectedPartnerResto.longitude).toFixed(5)}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                        onPress={() => {
                          const query = (selectedPartnerResto.latitude && selectedPartnerResto.longitude)
                            ? `${selectedPartnerResto.latitude},${selectedPartnerResto.longitude}`
                            : encodeURIComponent(selectedPartnerResto.address);
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                        }}
                      >
                        <Ionicons name="navigate" size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>📍 Ouvrir l'itinéraire sur Google Maps</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Active Offers Section at this Restaurant */}
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 24, marginBottom: 12 }}>
                      ⚡ Offres & Deals disponibles chez {selectedPartnerResto.name}
                    </Text>

                    {/* List Flash & Deals matching restaurant */}
                    {(() => {
                      const restoFlashes = flashOffers.filter(f => f.restaurant_id === selectedPartnerResto.id || f.restaurant === selectedPartnerResto.name);
                      const restoDeals = dealOffers.filter(d => d.restaurant_id === selectedPartnerResto.id || d.restaurant === selectedPartnerResto.name);
                      const allRestoOffers = [...restoFlashes, ...restoDeals];

                      if (allRestoOffers.length === 0) {
                        return (
                          <Text style={{ color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginVertical: 12 }}>
                            Aucune offre active pour le moment dans cet établissement.
                          </Text>
                        );
                      }

                      return allRestoOffers.map((item) => {
                        const img = (item.photos && Array.isArray(item.photos) && item.photos[0]) ||
                                    (typeof item.photos === 'string' && item.photos) ||
                                    item.image || item.photo_url || item.image_url ||
                                    getRestaurantDefaultImage(selectedPartnerResto);

                        const pNew = Number(item.price_promo || item.priceNew || item.price || 5000);
                        const pOld = Number(item.price_normal || item.priceOld || Math.round(pNew * 1.25));
                        const discountStr = item.discount || (pOld > pNew ? `-${Math.round((1 - (pNew / pOld)) * 100)}%` : '-20%');
                        const typeStr = (item.type === 'deal' || item.proposal_type === 'deal') ? '❤️ DEAL' : '⚡ FLASH';
                        const descStr = item.description || item.details || 'Offre promotionnelle exclusive BRICK DEAL.';

                        const fullItem = {
                          ...item,
                          image: img,
                          priceNew: pNew,
                          priceOld: pOld,
                          discount: discountStr,
                          restaurant: selectedPartnerResto?.name || item.restaurant,
                          restaurant_id: selectedPartnerResto?.id || item.restaurant_id
                        };

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={{ flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, elevation: 2 }}
                            onPress={() => {
                              setSelectedPartnerResto(null);
                              if (item.type === 'flash' || item.proposal_type === 'flash' || item.timeRange) {
                                handleSelectFlash(fullItem);
                              } else {
                                handleSelectDeal(fullItem);
                              }
                            }}
                          >
                            <View style={{ width: 75, height: 75, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                              <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                            </View>

                            <View style={{ flex: 1, justifyContent: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: typeStr.includes('FLASH') ? Colors.primary : '#D97706', backgroundColor: typeStr.includes('FLASH') ? '#FFF1F2' : '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  {typeStr}
                                </Text>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                                  {discountStr}
                                </Text>
                              </View>

                              <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.textPrimary }} numberOfLines={1}>
                                {item.title}
                              </Text>

                              <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
                                {descStr}
                              </Text>

                              <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.primary, marginTop: 3 }}>
                                {pNew.toLocaleString('fr-FR')} FCFA <Text style={{ fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '400' }}>{pOld.toLocaleString('fr-FR')} F</Text>
                              </Text>
                            </View>

                            <View style={{ justifyContent: 'center' }}>
                              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                            </View>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </ScrollView>
              </View>
            )}
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
            <Text style={styles.greetingText}>{restaurantDetail?.name || 'Mon Établissement'}</Text>
            <Text style={styles.locationText}>🏢 Espace Gérant Établissement</Text>
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

            {/* QR Code Pass Quick Validator Button */}
            <TouchableOpacity 
              style={{ backgroundColor: '#111827', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: -6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              onPress={() => setShowQRValidatorModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="qr-code" size={22} color="white" />
                </View>
                <View>
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '800' }}>Scanner / Valider un Pass QR</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Vérifier et consommer la réservation d'un client</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

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

                  {/* Action buttons row for Restaurant */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#BFDBFE' }}
                      onPress={() => startEditOffer(prop)}
                    >
                      <Ionicons name="pencil" size={14} color="#1D4ED8" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>Modifier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FCA5A5' }}
                      onPress={() => handleDeleteProposal(prop.id, prop.title)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
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
                        Date Début
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderColor: Colors.primary }]}
                        onPress={() => {
                          setDatePickerTarget(datePickerTarget === 'resto_start' ? null : 'resto_start');
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                          📅 {formatYMDToFrench(newRestoProp.startDate || getTodayYMD())}
                        </Text>
                        <Ionicons name={datePickerTarget === 'resto_start' ? "chevron-up" : "chevron-down"} size={14} color={Colors.primary} />
                      </TouchableOpacity>
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
                  {renderInlineCalendarPicker('resto_start')}
                </View>

                {/* End Date & Time Row */}
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>🔴 FIN DE L'OFFRE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 }}>
                        Date Fin
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: 'white', marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderColor: '#EF4444' }]}
                        onPress={() => {
                          setDatePickerTarget(datePickerTarget === 'resto_end' ? null : 'resto_end');
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                          📅 {formatYMDToFrench(newRestoProp.endDate || newRestoProp.startDate || getTodayYMD())}
                        </Text>
                        <Ionicons name={datePickerTarget === 'resto_end' ? "chevron-up" : "chevron-down"} size={14} color="#EF4444" />
                      </TouchableOpacity>
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
                  {renderInlineCalendarPicker('resto_end')}
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

      {/* EDIT RESTAURANT AND VISUALS MODAL */}
      <Modal visible={showEditRestoModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier l'Établissement & Visuels</Text>
            <TouchableOpacity onPress={() => setShowEditRestoModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {editingResto && (
            <ScrollView style={{ flex: 1, marginTop: 10 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nom de l'établissement</Text>
              <TextInput
                style={styles.input}
                value={editingResto.name}
                onChangeText={t => setEditingResto({ ...editingResto, name: t })}
              />

              <Text style={styles.inputLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'restaurant', label: '🍽️ Restaurant' },
                  { id: 'hotel', label: '🏨 Hôtel' },
                  { id: 'maquis', label: '🍺 Maquis' },
                  { id: 'lounge_bar', label: '🍸 Lounge & Bar' },
                  { id: 'fast_food', label: '🍔 Fast Food' },
                  { id: 'patisserie', label: '🍰 Pâtisserie' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
                      editingResto.category === cat.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                    ]}
                    onPress={() => setEditingResto({ ...editingResto, category: cat.id })}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary }, editingResto.category === cat.id && { color: 'white' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Adresse complète</Text>
              <TextInput
                style={styles.input}
                value={editingResto.address}
                onChangeText={t => setEditingResto({ ...editingResto, address: t })}
              />

              <Text style={styles.inputLabel}>Téléphone de contact</Text>
              <TextInput
                style={styles.input}
                value={editingResto.phone}
                onChangeText={t => setEditingResto({ ...editingResto, phone: t })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Description / Spécialités</Text>
              <TextInput
                style={styles.input}
                value={editingResto.description}
                onChangeText={t => setEditingResto({ ...editingResto, description: t })}
                multiline
              />

              {/* Visuels Section */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginVertical: 12, gap: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>🖼️ Logo et Image de Couverture</Text>

                {/* Logo Field */}
                <View>
                  <Text style={styles.inputLabel}>Logo (URL ou Photo Galerie)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="https://... ou choisir photo"
                      value={editingResto.logo_url}
                      onChangeText={t => setEditingResto({ ...editingResto, logo_url: t })}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status === 'granted') {
                          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                          if (!res.canceled && res.assets?.[0]?.uri) {
                            setEditingResto({ ...editingResto, logo_url: res.assets[0].uri });
                          }
                        }
                      }}
                    >
                      <Ionicons name="camera" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                  {editingResto.logo_url ? (
                    <Image source={{ uri: editingResto.logo_url }} style={{ width: 50, height: 50, borderRadius: 25, marginTop: 8 }} />
                  ) : null}
                </View>

                {/* Cover Field */}
                <View>
                  <Text style={styles.inputLabel}>Image de Couverture / Façade</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="https://... ou choisir photo"
                      value={editingResto.cover_url}
                      onChangeText={t => setEditingResto({ ...editingResto, cover_url: t })}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: '#111827', paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                      onPress={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status === 'granted') {
                          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                          if (!res.canceled && res.assets?.[0]?.uri) {
                            setEditingResto({ ...editingResto, cover_url: res.assets[0].uri });
                          }
                        }
                      }}
                    >
                      <Ionicons name="image" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                  {editingResto.cover_url ? (
                    <Image source={{ uri: editingResto.cover_url }} style={{ width: '100%', height: 90, borderRadius: 10, marginTop: 8, resizeMode: 'cover' }} />
                  ) : null}
                </View>

                {/* Preset HD Images Quick Select */}
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 4 }}>Ou choisir un modèle d'image HD en 1 clic :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {[
                    { label: 'Poulet Braisé', logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500', cover: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200' },
                    { label: 'Grillades BBQ', logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500', cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200' },
                    { label: 'Restaurant Resto', logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500', cover: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200' },
                    { label: 'Fast Food Burger', logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', cover: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200' },
                    { label: 'Lounge Bar', logo: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=500', cover: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200' },
                  ].map((preset, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      style={{ backgroundColor: 'white', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' }}
                      onPress={() => setEditingResto({ ...editingResto, logo_url: preset.logo, cover_url: preset.cover })}
                    >
                      <Image source={{ uri: preset.cover }} style={{ width: 60, height: 40, borderRadius: 6, marginBottom: 4 }} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.primary }}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 10 }, isSavingResto && { opacity: 0.7 }]}
                onPress={handleSaveEditRestaurant}
                disabled={isSavingResto}
              >
                {isSavingResto ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>💾 Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* QR CODE PASS VALIDATOR MODAL */}
      <Modal visible={showQRValidatorModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 24, padding: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>Valider un Pass QR</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>Vérification de la réservation</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setShowQRValidatorModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Simulated Scanner / Input Box */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.primary, marginBottom: 18, gap: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                Entrez la référence ou scannez le code QR du client :
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: 'white', marginBottom: 0, fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }]}
                  placeholder="ex: BRK-892401 ou ID"
                  placeholderTextColor="#9CA3AF"
                  value={qrScanCodeInput}
                  onChangeText={setQrScanCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => handleValidateQRCode()}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick List of Pending Orders for Instant 1-Tap Validation */}
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10 }}>
              Commandes prêtes / en attente de consommation :
            </Text>

            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {restaurantOrders.filter(o => o.status !== 'terminee' && o.status !== 'livree').length === 0 ? (
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 14 }}>
                  Aucune commande en attente à consommer.
                </Text>
              ) : (
                restaurantOrders.filter(o => o.status !== 'terminee' && o.status !== 'livree').map(order => (
                  <View key={order.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>
                        {order.offers?.title || 'Offre'}
                      </Text>
                      <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '700', marginTop: 2 }}>
                        Pass: {order.reservation_code || order.id?.slice(0, 8)} • {order.profiles?.full_name || 'Client'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                      onPress={() => handleValidateQRCode(order.reservation_code || order.id)}
                    >
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>✓ Consommer</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={{ backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 14 }}
              onPress={() => setShowQRValidatorModal(false)}
            >
              <Text style={{ color: '#475569', fontWeight: '800', fontSize: 13 }}>Fermer</Text>
            </TouchableOpacity>

          </View>
        </View>
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

              <TouchableOpacity
                style={{ padding: 14, borderRadius: 14, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => {
                  setShowCalendarFilterModal(false);
                  setDatePickerTarget('client_filter');
                  setShowDatePickerModal(true);
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.primary }}>
                  🗓️ Choisir une date exacte sur le calendrier...
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
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

      {/* INTERACTIVE CALENDAR PICKER MODAL */}
      <Modal visible={showDatePickerModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 24, padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>🗓️ Sélectionner une Date</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 2 }}>
                  {datePickerTarget?.includes('start') ? '🟢 Date de Début' : '🔴 Date de Fin'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <TouchableOpacity
                onPress={() => {
                  const newD = new Date(calendarCurrentDate);
                  newD.setMonth(newD.getMonth() - 1);
                  setCalendarCurrentDate(newD);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="chevron-back" size={20} color="#1E293B" />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][calendarCurrentDate.getMonth()]} {calendarCurrentDate.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const newD = new Date(calendarCurrentDate);
                  newD.setMonth(newD.getMonth() + 1);
                  setCalendarCurrentDate(newD);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((dayName, idx) => (
                <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: idx >= 5 ? Colors.primary : '#64748B' }}>{dayName}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {getCalendarDays(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth()).map((dayItem, idx) => {
                if (!dayItem) {
                  return <View key={idx} style={{ width: '14.28%', height: 38 }} />;
                }

                const todayYMD = getTodayYMD();
                const isToday = dayItem.ymd === todayYMD;

                // Active target date value
                let selectedTargetYMD = '';
                if (datePickerTarget === 'agent_start') selectedTargetYMD = newProp.startDate;
                else if (datePickerTarget === 'agent_end') selectedTargetYMD = newProp.endDate;
                else if (datePickerTarget === 'resto_start') selectedTargetYMD = newRestoProp.startDate;
                else if (datePickerTarget === 'resto_end') selectedTargetYMD = newRestoProp.endDate;

                const isSelected = dayItem.ymd === selectedTargetYMD;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      width: '14.28%',
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: isSelected ? Colors.primary : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: isToday && !isSelected ? Colors.primary : 'transparent',
                    }}
                    onPress={() => handleSelectCalendarDay(dayItem.ymd)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? '800' : '600',
                        color: isSelected ? 'white' : isToday ? Colors.primary : '#1E293B',
                      }}
                    >
                      {dayItem.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Date Shortcuts */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8 }}>Raccourcis rapides :</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                onPress={() => handleSelectCalendarDay(getTodayYMD())}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>Aujourd'hui 📍</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  handleSelectCalendarDay(`${y}-${m}-${day}`);
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>Demain ☀️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  handleSelectCalendarDay(`${y}-${m}-${day}`);
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>+7 Jours ⏳</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => setShowDatePickerModal(false)}
            >
              <Text style={{ color: '#475569', fontWeight: '800', fontSize: 13 }}>Fermer</Text>
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
