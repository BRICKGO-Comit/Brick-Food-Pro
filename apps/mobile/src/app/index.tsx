import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './_layout';
import { Colors } from '../theme/colors';

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

// Mock datasets for rich UI rendering
const flashOffers = [
  {
    id: 'flash_1',
    title: 'Menu Burger Duo',
    restaurant: 'Le QG Lounge',
    rating: '4.6',
    priceOld: 12000,
    priceNew: 7500,
    timeRemaining: '01h:42m',
    quantityRemaining: 18,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    discount: '-37%',
    description: '1 Burger au choix + Frites + 1 Boisson 33cl',
    startHour: '14h00',
    endHour: '17h00',
    countdownHours: 1,
    countdownMinutes: 42,
    countdownSeconds: 18
  },
  {
    id: 'flash_2',
    title: 'Seau de Poulet Kora',
    restaurant: 'Chez Georges',
    rating: '4.5',
    priceOld: 15000,
    priceNew: 9500,
    timeRemaining: '02h:15m',
    quantityRemaining: 8,
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=500&auto=format&fit=crop&q=60',
    discount: '-36%',
    description: '10 morceaux de poulet + frites familiales + boisson 1L',
    startHour: '12h00',
    endHour: '15h00',
    countdownHours: 2,
    countdownMinutes: 15,
    countdownSeconds: 0
  },
  {
    id: 'flash_3',
    title: 'Pizza Royale XL',
    restaurant: 'Pizzeria Bella',
    rating: '4.7',
    priceOld: 10000,
    priceNew: 6500,
    timeRemaining: '00h:55m',
    quantityRemaining: 12,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60',
    discount: '-35%',
    description: 'Pizza Royale diamètre 40cm (jambon, champignons, fromage)',
    startHour: '18h00',
    endHour: '21h00',
    countdownHours: 0,
    countdownMinutes: 55,
    countdownSeconds: 0
  }
];

const dealOffers = [
  {
    id: 'deal_1',
    title: 'Pack Couple Romantique',
    restaurant: 'Le Bateau Ivoire',
    rating: '4.8',
    priceOld: 35000,
    priceNew: 25000,
    validity: 'Jusqu\'au 30 Août',
    persons: 2,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
    discount: '-30%',
    inclusions: [
      'Entrée assortie',
      '2 Plats au choix',
      '2 Boissons',
      '1 Dessert',
      'Décoration de table'
    ]
  },
  {
    id: 'deal_2',
    title: 'Buffet Dimanche en Famille',
    restaurant: 'Le QG Lounge',
    rating: '4.6',
    priceOld: 45000,
    priceNew: 30000,
    validity: 'Tous les dimanches',
    persons: 4,
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=500&auto=format&fit=crop&q=60',
    discount: '-33%',
    inclusions: [
      'Buffet chaud & froid à volonté',
      'Boissons locales gratuites',
      'Espace de jeux pour enfants',
      'Animation musicale live'
    ]
  }
];

export default function MobileApp() {
  const { role, setRole, isLoggedIn, setIsLoggedIn } = useAuth();
  
  // Navigation tabs states for each role
  const [clientTab, setClientTab] = useState<'home' | 'reservations' | 'profile'>('home');
  const [agentTab, setAgentTab] = useState<'home' | 'restaurants' | 'proposals' | 'profile'>('home');
  const [restaurantTab, setRestaurantTab] = useState<'home' | 'orders' | 'profile'>('home');

  // Checkout modal states
  const [selectedFlash, setSelectedFlash] = useState<any | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<number>(1); // 1: Date/Time, 2: Resume, 3: Payment, 4: Success

  // Auth flow states
  const [showClientAuthModal, setShowClientAuthModal] = useState(false);
  const [showProLoginModal, setShowProLoginModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Client info state
  const [clientName, setClientName] = useState('Eric Kouassi');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientPhone, setClientPhone] = useState('+225 07 45 89 12 36');

  // Pro info state
  const [proEmail, setProEmail] = useState('');
  const [proPassword, setProPassword] = useState('');

  // Local state for registered restaurants
  const [restaurantsList, setRestaurantsList] = useState([
    { id: 'resto_001', name: 'Le Bateau Ivoire', address: 'Cocody 2 Plateaux', phone: '+225 07 58 45 12 36', description: 'Spécialités ivoiriennes.', ownerEmail: 'owner.bateau@email.com' },
    { id: 'resto_002', name: 'Le QG Lounge', address: 'Riviera Palmeraie', phone: '+225 07 01 02 03 04', description: 'Grillades et bar lounge.', ownerEmail: 'owner.qg@email.com' }
  ]);
  const [showAddRestoModal, setShowAddRestoModal] = useState(false);
  const [newRestoName, setNewRestoName] = useState('');
  const [newRestoAddress, setNewRestoAddress] = useState('');
  const [newRestoPhone, setNewRestoPhone] = useState('');
  const [newRestoDesc, setNewRestoDesc] = useState('');
  const [newRestoOwnerEmail, setNewRestoOwnerEmail] = useState('');
  const [newRestoOwnerPassword, setNewRestoOwnerPassword] = useState('');
  
  // Form booking selections
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [deliveryMode, setDeliveryMode] = useState<'retrait' | 'livraison'>('retrait');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'mtn' | 'cb'>('wave');

  // Real-time details state variables
  const [reservationId, setReservationId] = useState<string>('BD125487');
  const [countdown, setCountdown] = useState({ hours: 1, minutes: 42, seconds: 18 });

  // Ticking countdown timer for Flash offers
  useEffect(() => {
    let timer: any;
    if (selectedFlash) {
      setCountdown({
        hours: selectedFlash.countdownHours || 1,
        minutes: selectedFlash.countdownMinutes || 42,
        seconds: selectedFlash.countdownSeconds || 18
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

  // Action helpers to initialize date/time/resID dynamically
  const handleSelectFlash = (item: any) => {
    setSelectedFlash(item);
    setBookingStep(0);
    setBookingDate('Demain ' + getFrenchDate(1));
    setBookingTime(item.startHour);
    setBookingQty(1);
    setDeliveryMode('retrait');
    setReservationId('BD' + Math.floor(100000 + Math.random() * 900000));
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

  // Agent proposal state
  const [proposalType, setProposalType] = useState<'flash' | 'deal'>('flash');
  const [newProp, setNewProp] = useState({
    restaurant: 'Le Bateau Ivoire',
    title: '',
    description: '',
    price_normal: '',
    price_promo: '',
    quantity: '10',
    pack_type: 'couple',
    persons: '2',
    prestations: '',
  });

  // Restaurant orders simulation
  const [orders, setOrders] = useState([
    { id: '#BF12458', client: 'Jean K.', phone: '07 58 45 12 36', items: '2 articles (Menu Poulet Braisé + Jus)', amount: '12 000 FCFA', mode: 'retrait', status: 'nouvelle', time: '14:30' },
    { id: '#BF12457', client: 'Awa D.', phone: '05 06 78 90 12', items: '3 articles', amount: '18 500 FCFA', mode: 'livraison', status: 'en_preparation', time: '14:20' },
    { id: '#BF12456', client: 'Marc T.', phone: '01 02 34 56 78', items: '1 article', amount: '9 000 FCFA', mode: 'retrait', status: 'prete', time: '14:10' },
  ]);

  const handleUpdateStatus = (id: string, nextStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
    Alert.alert('Succès', `Commande ${id} mise à jour avec le statut : ${nextStatus}`);
  };

  const handleCreateProposal = () => {
    Alert.alert('Proposition soumise', `Votre proposition "${newProp.title}" a été envoyée avec succès à l'administration centrale en statut EN ATTENTE.`);
    setNewProp({
      restaurant: 'Le Bateau Ivoire',
      title: '',
      description: '',
      price_normal: '',
      price_promo: '',
      quantity: '10',
      pack_type: 'couple',
      persons: '2',
      prestations: '',
    });
  };

  // --- VIEW 1: AUTH LOGIN GATEWAY REMOVED ---
  // Guest Client is shown by default at startup

  // --- VIEW 2: CLIENT PORTAL ---
  if (role === 'client') {
    if (selectedFlash || selectedDeal) {
      return (
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* STEP 0: DETAILS VIEW */}
          {bookingStep === 0 && (
            <View style={{ flex: 1 }}>
              {/* Custom Header for Step 0 */}
              <View style={[styles.detailHeader, selectedFlash && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <TouchableOpacity onPress={() => { setSelectedDeal(null); setSelectedFlash(null); }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.detailHeaderTitle}>{selectedFlash ? 'Brick Flash' : 'Brick Deal'}</Text>
                  {selectedFlash && <Text style={styles.detailHeaderSubtitle}>📍 Cocody, Abidjan</Text>}
                </View>
                <TouchableOpacity style={styles.bellIconContainer}>
                  <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
                  <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>3</Text></View>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Image container */}
                <View style={styles.detailImageContainer}>
                  <Image source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }} style={styles.detailImage} />
                  <View style={selectedFlash ? [styles.bestDealBadge, { backgroundColor: '#E30613' }] : styles.bestDealBadge}>
                    <Text style={styles.bestDealBadgeText}>{selectedFlash ? selectedFlash.discount : 'MEILLEUR DEAL'}</Text>
                  </View>
                  <TouchableOpacity style={styles.favoriteBtn}>
                    <Ionicons name="heart-outline" size={20} color="black" />
                  </TouchableOpacity>
                </View>

                {/* Content Area */}
                <View style={styles.detailContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.detailTitle}>{selectedFlash ? selectedFlash.title : selectedDeal?.title}</Text>
                    {!selectedFlash && (
                      <View style={styles.discountLabel}>
                        <Text style={styles.discountLabelText}>{selectedDeal?.discount}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.detailSubtitle}>
                    <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{selectedFlash ? selectedFlash.restaurant : selectedDeal?.restaurant}</Text>
                    <Text style={styles.ratingTextSecondary}>  ⭐ {selectedFlash ? '4,6 (128 avis)' : '4,8 (256 avis)'}</Text>
                  </Text>

                  {selectedFlash && (
                    <Text style={styles.descriptionText}>{selectedFlash.description}</Text>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.priceOld}>{(selectedFlash ? selectedFlash.priceOld : selectedDeal?.priceOld)?.toLocaleString()} FCFA</Text>
                    <Text style={styles.priceBold}>{(selectedFlash ? selectedFlash.priceNew : selectedDeal?.priceNew)?.toLocaleString()} FCFA</Text>
                    {selectedFlash && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>Économisez {(selectedFlash.priceOld - selectedFlash.priceNew).toLocaleString()} FCFA</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.peopleBadge}>
                    <Ionicons name="people-outline" size={16} color={Colors.primary} />
                    <Text style={styles.peopleBadgeText}>{selectedFlash ? 'Pour 1 personne' : 'Pour 2 personnes'}</Text>
                  </View>

                  {/* What's included block for Deal */}
                  {!selectedFlash ? (
                    <View style={styles.inclusionsContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inclusionsTitle}>Ce pack comprend :</Text>
                        {selectedDeal?.inclusions?.map((inc: string, idx: number) => (
                          <View key={idx} style={styles.inclusionRow}>
                            <Text style={styles.checkIcon}>✓</Text>
                            <Text style={styles.inclusionText}>{inc}</Text>
                          </View>
                        ))}
                      </View>
                      
                      {/* Restaurant logo card */}
                      <View style={styles.restoLogoCard}>
                        <View style={styles.restoLogoCardIcon}>
                          <Ionicons name="restaurant-outline" size={20} color={Colors.textPrimary} />
                        </View>
                        <Text style={styles.restoLogoText}>{selectedDeal?.restaurant?.toUpperCase()}</Text>
                        <Text style={styles.restoLogoSub}>Restaurant</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Availability Box */}
                  <View style={selectedFlash ? styles.flashAvailabilityBox : styles.availabilityBox}>
                    <View style={styles.availabilityHalf}>
                      <Text style={styles.availabilityLabel}>{selectedFlash ? 'Début' : 'Disponible du'}</Text>
                      <Text style={styles.availabilityVal}>
                        {selectedFlash ? `📅 ${getTodayFormatted()}\n${selectedFlash.startHour}` : `📅 ${getTodayFormatted()}\n12h00`}
                      </Text>
                    </View>
                    <View style={styles.separatorLine} />
                    <View style={styles.availabilityHalf}>
                      <Text style={styles.availabilityLabel}>{selectedFlash ? 'Fin' : 'Au'}</Text>
                      <Text style={styles.availabilityVal}>
                        {selectedFlash ? `📅 ${getTodayFormatted()}\n${selectedFlash.endHour}` : `📅 ${getFutureFormatted(15)}\n23h00`}
                      </Text>
                    </View>
                  </View>

                  {/* Additional boxes for Flash */}
                  {selectedFlash ? (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                      {/* Box 1: Fin dans */}
                      <View style={styles.countdownBox}>
                        <Text style={{ fontSize: 10, color: Colors.textSecondary }}>Fin dans</Text>
                        <View style={styles.countdownValRow}>
                          <Ionicons name="time-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.countdownValText}>
                            {String(countdown.hours).padStart(2, '0')} : {String(countdown.minutes).padStart(2, '0')} : {String(countdown.seconds).padStart(2, '0')}
                          </Text>
                        </View>
                        <View style={styles.countdownLabelsRow}>
                          <Text style={styles.countdownLabelText}>H</Text>
                          <Text style={styles.countdownLabelText}>MIN</Text>
                          <Text style={styles.countdownLabelText}>SEC</Text>
                        </View>
                      </View>

                      {/* Box 2: Offres dispo */}
                      <View style={[styles.countdownBox, { backgroundColor: '#FFFDF9', borderColor: '#FDF2E2' }]}>
                        <Text style={{ fontSize: 10, color: Colors.textSecondary }}>Plus que</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                          <Ionicons name="cube-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                            <Text style={{ color: Colors.primary, fontWeight: '800' }}>{selectedFlash.quantityRemaining}</Text> offres
                          </Text>
                        </View>
                        <Text style={{ fontSize: 8, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' }}>disponibles</Text>
                      </View>
                    </View>
                  ) : (
                    /* Left availability count for Deal */
                    <View style={styles.warningRow}>
                      <Ionicons name="people" size={16} color={Colors.primary} />
                      <Text style={styles.warningText}>
                        Plus que <Text style={{ color: Colors.primary, fontWeight: '700' }}>23</Text> réservations disponibles
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.actionBtn} onPress={() => setBookingStep(1)}>
                    <Text style={styles.actionBtnText}>
                      {selectedFlash ? '⚡ J\'en profite' : '❤️ Je réserve'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                <View style={styles.timeGrid}>
                  {(selectedFlash ? ['14h00', '15h00', '16h00', '17h00', '18h00'] : ['12h00', '13h00', '14h00', '19h00', '20h00', '21h00']).map(t => (
                    <TouchableOpacity key={t} style={[styles.timeItem, bookingTime === t && styles.timeActive]} onPress={() => setBookingTime(t)}>
                      <Text style={[styles.timeItemText, bookingTime === t && { color: 'white', fontWeight: '700' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
                  <Image source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }} style={styles.selectedPackImg} />
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

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View style={styles.selectedPackCard}>
                  <Image source={{ uri: selectedFlash ? selectedFlash.image : selectedDeal?.image }} style={styles.selectedPackImg} />
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

              <View style={styles.modalBody}>
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
              </View>
            </View>
          )}

          {/* STEP 4: SUCCESS */}
          {bookingStep === 4 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                <View style={styles.successCheckContainer}>
                  <Ionicons name="checkmark" size={40} color="white" />
                </View>
                <Text style={styles.successTitle}>Réservation confirmée !</Text>
                <Text style={styles.successSubtitle}>
                  {selectedFlash ? 'Votre Brick Flash est réservé.' : 'Votre Brick Deal est réservé.'}
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

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981', width: '100%', marginTop: 0 }]} onPress={() => { setSelectedFlash(null); setSelectedDeal(null); setClientTab('reservations'); }}>
                  <Text style={styles.actionBtnText}>Voir mes réservations</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{isLoggedIn ? `Bonjour ${clientName.split(' ')[0]} 👋` : 'Bonjour Invité 👋'}</Text>
            <Text style={styles.locationText}>📍 Cocody, Abidjan ▾</Text>
          </View>
        </View>

        {clientTab === 'home' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
              <TextInput 
                placeholder="Rechercher un plat, un resto..." 
                placeholderTextColor={Colors.textSecondary}
                style={styles.searchInput}
              />
              <TouchableOpacity style={styles.filterBtn}>
                <Ionicons name="options-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
              <View style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#6B21A8' }]}>12</Text>
                  <Ionicons name="calendar-outline" size={18} color="#6B21A8" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#6B21A8' }]}>Réservations</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#E6F8F3' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#047857' }]}>8</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#047857' }]}>Terminées</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FFF7ED' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: '#C2410C' }]}>3</Text>
                  <Ionicons name="time-outline" size={18} color="#C2410C" />
                </View>
                <Text style={[styles.metricCardTitle, { color: '#C2410C' }]}>En cours</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FFEBEB' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={[styles.metricCardVal, { color: Colors.primary }]}>24 500 F</Text>
                  <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={[styles.metricCardTitle, { color: Colors.primary }]}>Économies</Text>
              </View>
            </ScrollView>

            {/* Brick Flash Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleText}>⚡ BRICK FLASH</Text>
                <Text style={styles.sectionSubtitleText}>Offres exclusives de dernière minute</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {flashOffers.map((item) => (
                <TouchableOpacity key={item.id} style={styles.dealCard} onPress={() => handleSelectFlash(item)}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardBadge}>
                    <Text style={styles.badgeText}>{item.discount}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardCategory}>BRICK FLASH</Text>
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
                    <Text style={styles.cardMeta}>⏳ Fin dans {item.timeRemaining}  •  📦 {item.quantityRemaining} restants</Text>
                    <View style={styles.cardBtn}>
                      <Text style={styles.cardBtnText}>⚡ J'en profite</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Brick Deal Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleText}>❤️ BRICK DEAL</Text>
                <Text style={styles.sectionSubtitleText}>Expériences et formules de groupe</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {dealOffers.map((item) => (
                <TouchableOpacity key={item.id} style={styles.dealCard} onPress={() => handleSelectDeal(item)}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={[styles.cardBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.badgeText}>{item.discount}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardCategory, { color: '#F59E0B' }]}>BRICK DEAL</Text>
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
              
              <View style={styles.orderListItem}>
                <View style={styles.orderListHeader}>
                  <Text style={styles.orderListResto}>Le QG Lounge</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.warningLight }]}><Text style={[styles.statusText, { color: Colors.warning }]}>En préparation</Text></View>
                </View>
                <Text style={styles.orderListDetail}>Menu Burger Duo • 16 Août 2024, 15h00</Text>
                <Text style={styles.orderListTotal}>Montant payé : 7 500 FCFA (Réf: BF12458)</Text>
              </View>

              <View style={styles.orderListItem}>
                <View style={styles.orderListHeader}>
                  <Text style={styles.orderListResto}>Le Bateau Ivoire</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.successLight }]}><Text style={[styles.statusText, { color: Colors.success }]}>Confirmée</Text></View>
                </View>
                <Text style={styles.orderListDetail}>Pack Couple Romantique • 17 Août 2024, 19h00</Text>
                <Text style={styles.orderListTotal}>Montant payé : 25 000 FCFA (Réf: BD12548)</Text>
              </View>
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
              <View style={styles.profileCard}>
                <Text style={styles.profileName}>{clientName}</Text>
                <Text style={styles.profileEmail}>{clientEmail || 'client.test@brickfood.com'}</Text>
                <Text style={styles.profilePhone}>{clientPhone}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { setIsLoggedIn(false); setRole('client'); }}>
                <Text style={styles.logoutBtnText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.scrollArea, { justifyContent: 'space-between', paddingBottom: 24, flex: 1 }]}>
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

              {/* Link to Pro space */}
              <TouchableOpacity style={{ alignSelf: 'center', padding: 12 }} onPress={() => { setProEmail(''); setProPassword(''); setShowProLoginModal(true); }}>
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }}>
                  🔑 Espace Professionnel (Commerciaux & Restaurants)
                </Text>
              </TouchableOpacity>
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

          </SafeAreaView>
        </Modal>

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
                <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64, resizeMode: 'contain' }} />
                <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', marginTop: 8 }}>BRICK<Text style={{ color: Colors.primary }}>FOOD STAFF</Text></Text>
                <Text style={{ color: '#7D7D7D', fontSize: 13, textAlign: 'center', marginTop: 4 }}>Connectez-vous à votre espace commercial ou partenaire</Text>
              </View>

              <Text style={{ color: 'white', fontWeight: '600' }}>Adresse email professionnelle</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: '#222', color: 'white', borderColor: '#444', height: 48, borderRadius: 8, paddingHorizontal: 12 }]} 
                placeholder="agent@brickfood.com ou owner@resto.com" 
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

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 24 }]} onPress={() => {
                if (!proEmail || !proPassword) {
                  Alert.alert('Erreur', 'Veuillez saisir votre email et votre mot de passe.');
                  return;
                }
                const email = proEmail.toLowerCase().trim();
                if (email.includes('agent') || email === 'eric@brickfood.com') {
                  setRole('agent');
                  setAgentTab('home');
                  setIsLoggedIn(true);
                  setShowProLoginModal(false);
                  Alert.alert('Connexion Réussie', 'Bienvenue dans votre espace Agent Commercial.');
                } else if (email.includes('owner') || email.includes('resto') || email.includes('bateau')) {
                  setRole('restaurant');
                  setRestaurantTab('home');
                  setIsLoggedIn(true);
                  setShowProLoginModal(false);
                  Alert.alert('Connexion Réussie', 'Bienvenue dans l\'espace Restaurant Partenaire.');
                } else {
                  Alert.alert('Erreur de connexion', 'Identifiants professionnels non reconnus. Veuillez utiliser les identifiants transmis.');
                }
              }}>
                <Text style={styles.actionBtnText}>Se connecter au Staff</Text>
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

            <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={require('../../assets/icon.png')} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
                <Text style={{ fontSize: 20, fontWeight: '900', marginTop: 4 }}>BRICK<Text style={{ color: Colors.primary }}>FOOD</Text></Text>
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

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={() => {
                if (!clientEmail || !clientPassword || (isSignup && !clientName)) {
                  Alert.alert('Champs requis', 'Veuillez remplir tous les champs nécessaires.');
                  return;
                }
                setRole('client');
                setIsLoggedIn(true);
                setShowClientAuthModal(false);
                Alert.alert(
                  isSignup ? 'Compte créé !' : 'Connexion réussie !',
                  `Bienvenue ${isSignup ? clientName : 'de retour'} ! Vous pouvez maintenant finaliser votre paiement.`
                );
                if (selectedFlash || selectedDeal) {
                  setBookingStep(3);
                }
              }}>
                <Text style={styles.actionBtnText}>{isSignup ? 'Créer mon compte' : 'Se connecter'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => setIsSignup(!isSignup)}>
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                  {isSignup ? 'Déjà un compte ? Connectez-vous' : 'Nouveau sur Brick Food ? Inscrivez-vous'}
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
            <Text style={styles.locationText}>Eric Mba's (Responsable 18 Restos)</Text>
          </View>
          <TouchableOpacity style={styles.logoutBadge} onPress={() => setIsLoggedIn(false)}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {agentTab === 'home' && (
          <ScrollView style={styles.scrollArea}>
            <View style={styles.agentStatsCard}>
              <Text style={styles.agentStatsLabel}>Mes commissions de la semaine</Text>
              <Text style={styles.agentStatsVal}>145 000 FCFA</Text>
              <Text style={styles.agentStatsSub}>Objectif de vente : 34 / 50 Commandes (68%)</Text>
            </View>

            <Text style={styles.sectionTitle}>🏢 Mes Restaurants ({restaurantsList.length})</Text>
            {restaurantsList.map((resto) => (
              <View key={resto.id} style={styles.partnerItem}>
                <Text style={styles.partnerName}>{resto.name}</Text>
                <Text style={styles.partnerSub}>{resto.address} • {resto.phone}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {agentTab === 'restaurants' && (
          <ScrollView style={styles.scrollArea}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Inscriptions Terrain</Text>
              <TouchableOpacity style={[styles.loginBtn, { width: 'auto', paddingHorizontal: 12, height: 36 }]} onPress={() => {
                setNewRestoName('');
                setNewRestoAddress('');
                setNewRestoPhone('');
                setNewRestoDesc('');
                setNewRestoOwnerEmail('');
                setNewRestoOwnerPassword('');
                setShowAddRestoModal(true);
              }}>
                <Text style={[styles.loginBtnText, { fontSize: 13 }]}>➕ Inscrire un resto</Text>
              </TouchableOpacity>
            </View>

            {restaurantsList.map((resto) => (
              <View key={resto.id} style={styles.partnerItem}>
                <Text style={styles.partnerName}>{resto.name}</Text>
                <Text style={styles.partnerSub}>{resto.address} • {resto.phone}</Text>
                <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' }}>
                  ✉️ Compte gérant : {resto.ownerEmail}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {agentTab === 'proposals' && (
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Nouvelle Proposition d'Offre</Text>
            
            <View style={styles.tabSelector}>
              <TouchableOpacity style={[styles.tabSelectorBtn, proposalType === 'flash' && styles.tabSelectorActive]} onPress={() => setProposalType('flash')}>
                <Text style={[styles.tabSelectorText, proposalType === 'flash' && { color: 'white' }]}>⚡ Brick Flash</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabSelectorBtn, proposalType === 'deal' && styles.tabSelectorActive]} onPress={() => setProposalType('deal')}>
                <Text style={[styles.tabSelectorText, proposalType === 'deal' && { color: 'white' }]}>❤️ Brick Deal</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Restaurant</Text>
            <TextInput style={styles.input} value={newProp.restaurant} editable={false} />

            <Text style={styles.inputLabel}>Titre de l'offre</Text>
            <TextInput style={styles.input} placeholder="ex: Menu Burger Duo" value={newProp.title} onChangeText={t => setNewProp({ ...newProp, title: t })} />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Détails de l'offre" value={newProp.description} onChangeText={t => setNewProp({ ...newProp, description: t })} />

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
                <TextInput style={[styles.input, { height: 60 }]} multiline placeholder="2 Plats + 2 Boissons" value={newProp.prestations} onChangeText={t => setNewProp({ ...newProp, prestations: t })} />
              </>
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={handleCreateProposal}>
              <Text style={styles.actionBtnText}>Envoyer la proposition</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {agentTab === 'profile' && (
          <View style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Profil Agent</Text>
            <Text style={styles.profileName}>Eric Mba's</Text>
            <Text style={styles.profileEmail}>agent.eric@brickfood.com</Text>
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

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 10 }]} onPress={() => {
                if (!newRestoName || !newRestoOwnerEmail || !newRestoOwnerPassword) {
                  Alert.alert('Champs requis', 'Veuillez renseigner au moins le nom du resto et les identifiants de connexion.');
                  return;
                }
                const newRestoObj = {
                  id: `resto_00${restaurantsList.length + 1}`,
                  name: newRestoName,
                  address: newRestoAddress,
                  phone: newRestoPhone,
                  description: newRestoDesc,
                  ownerEmail: newRestoOwnerEmail
                };
                setRestaurantsList([...restaurantsList, newRestoObj]);
                Alert.alert(
                  'Établissement enregistré !',
                  `Veuillez transmettre ces coordonnées au propriétaire pour se connecter sur l'app :\n\nEmail : ${newRestoOwnerEmail}\nMot de passe : ${newRestoOwnerPassword}`
                );
                setShowAddRestoModal(false);
              }}>
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
            <Text style={styles.greetingText}>Restaurant : Le Bateau Ivoire</Text>
            <Text style={styles.locationText}>Cocody 2 Plateaux</Text>
          </View>
          <TouchableOpacity style={styles.logoutBadge} onPress={() => setIsLoggedIn(false)}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {restaurantTab === 'home' && (
          <ScrollView style={styles.scrollArea}>
            <View style={[styles.agentStatsCard, { backgroundColor: Colors.primary }]}>
              <Text style={[styles.agentStatsLabel, { color: 'white' }]}>Chiffre d'affaires aujourd'hui</Text>
              <Text style={[styles.agentStatsVal, { color: 'white' }]}>4 560 000 FCFA</Text>
              <Text style={[styles.agentStatsSub, { color: '#FFEBEB' }]}>12 commandes reçues  •  8 en préparation</Text>
            </View>

            <Text style={styles.sectionTitle}>📦 Commandes à traiter</Text>
            {orders.map(order => (
              <View key={order.id} style={styles.orderListItem}>
                <View style={styles.orderListHeader}>
                  <Text style={styles.orderListResto}>{order.client} ({order.id})</Text>
                  <View style={[styles.statusBadge, order.status === 'nouvelle' ? { backgroundColor: Colors.primaryLight } : { backgroundColor: Colors.warningLight }]}>
                    <Text style={[styles.statusText, order.status === 'nouvelle' ? { color: Colors.primary } : { color: Colors.warning }]}>
                      {order.status === 'nouvelle' ? 'Nouvelle' : 'En préparation'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderListDetail}>{order.items}</Text>
                <Text style={styles.orderListTotal}>Total : {order.amount} ({order.mode})</Text>
                
                <View style={styles.actionRow}>
                  {order.status === 'nouvelle' && (
                    <TouchableOpacity style={styles.actionBadgeBtn} onPress={() => handleUpdateStatus(order.id, 'en_preparation')}>
                      <Text style={styles.actionBadgeText}>Accepter</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'en_preparation' && (
                    <TouchableOpacity style={[styles.actionBadgeBtn, { backgroundColor: Colors.success }]} onPress={() => handleUpdateStatus(order.id, 'prete')}>
                      <Text style={styles.actionBadgeText}>Marquer Prête</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {restaurantTab === 'orders' && (
          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Historique des commandes</Text>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Jean K. (#BF12458)</Text>
              <Text style={styles.partnerSub}>Terminée • 12 000 FCFA • Retrait</Text>
            </View>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Sophie K. (#BF12455)</Text>
              <Text style={styles.partnerSub}>Livrée • 15 000 FCFA • Livraison</Text>
            </View>
          </ScrollView>
        )}

        {restaurantTab === 'profile' && (
          <View style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Fiche Établissement</Text>
            <Text style={styles.profileName}>Le Bateau Ivoire</Text>
            <Text style={styles.profileEmail}>Contact: +225 07 58 45 12 36</Text>
            <Text style={styles.profilePhone}>Horaires: 11h30 - 23h00</Text>
          </View>
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
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('profile')}>
            <Ionicons name={restaurantTab === 'profile' ? 'person' : 'person-outline'} size={22} color={restaurantTab === 'profile' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.navBtnText, restaurantTab === 'profile' && styles.activeNavText]}>Profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
    fontWeight: '850',
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
    fontWeight: '850',
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
