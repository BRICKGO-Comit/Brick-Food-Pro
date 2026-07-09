import React, { useState } from 'react';
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
import { useAuth } from './_layout';
import { Colors } from '../theme/colors';

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
  
  // Form booking selections
  const [bookingDate, setBookingDate] = useState<string>('Demain 16 Août');
  const [bookingTime, setBookingTime] = useState<string>('19h00');
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [deliveryMode, setDeliveryMode] = useState<'retrait' | 'livraison'>('retrait');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'mtn'>('wave');

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

  // --- VIEW 1: AUTH LOGIN GATEWAY ---
  if (!isLoggedIn) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authHeader}>
          <Image source={require('../assets/icon.png')} style={styles.logoImage} />
          <Text style={styles.logoText}>BRICK<Text style={{ color: Colors.primary }}>FOOD</Text></Text>
        </View>
        <Text style={styles.authSubtitle}>Le système digital qui optimise la restauration en Afrique.</Text>

        <View style={styles.loginForm}>
          <TouchableOpacity style={styles.loginBtn} onPress={() => { setRole('client'); setIsLoggedIn(true); }}>
            <Text style={styles.loginBtnText}>Se connecter en tant que Client</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.loginBtn, { backgroundColor: '#333' }]} onPress={() => { setRole('agent'); setIsLoggedIn(true); }}>
            <Text style={styles.loginBtnText}>Espace Agent Commercial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.loginBtn, { backgroundColor: '#555' }]} onPress={() => { setRole('restaurant'); setIsLoggedIn(true); }}>
            <Text style={styles.loginBtnText}>Espace Restaurant Partenaire</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- VIEW 2: CLIENT PORTAL ---
  if (role === 'client') {
    return (
      <View style={styles.mainContainer}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Bonjour Eric 👋</Text>
            <Text style={styles.locationText}>📍 Cocody, Abidjan ▾</Text>
          </View>
          <TouchableOpacity style={styles.logoutBadge} onPress={() => setIsLoggedIn(false)}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {clientTab === 'home' && (
          <ScrollView style={styles.scrollArea}>
            {/* Quick Metrics */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
              <View style={[styles.miniCard, { borderLeftColor: '#A855F7' }]}>
                <Text style={styles.miniCardVal}>12</Text>
                <Text style={styles.miniCardTitle}>Réservations</Text>
              </View>
              <View style={[styles.miniCard, { borderLeftColor: Colors.success }]}>
                <Text style={styles.miniCardVal}>8</Text>
                <Text style={styles.miniCardTitle}>Terminées</Text>
              </View>
              <View style={[styles.miniCard, { borderLeftColor: Colors.warning }]}>
                <Text style={styles.miniCardVal}>3</Text>
                <Text style={styles.miniCardTitle}>En cours</Text>
              </View>
              <View style={[styles.miniCard, { borderLeftColor: Colors.primary }]}>
                <Text style={styles.miniCardVal}>24 500 F</Text>
                <Text style={styles.miniCardTitle}>Économies</Text>
              </View>
            </ScrollView>

            {/* Brick Flash Section */}
            <Text style={styles.sectionTitle}>⚡ BRICK FLASH <Text style={styles.sectionSubtitle}>Dernière minute</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <View style={styles.dealCard}>
                <View style={styles.cardBadge}><Text style={styles.badgeText}>-37%</Text></View>
                <Text style={styles.cardCategory}>BRICK FLASH</Text>
                <Text style={styles.cardTitle}>Menu Burger Duo</Text>
                <Text style={styles.cardResto}>Le QG Lounge ⭐ 4,6</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceOld}>12 000 F</Text>
                  <Text style={styles.priceNew}>7 500 FCFA</Text>
                </View>
                <Text style={styles.cardMeta}>⏳ Fin dans 01h:42m  •  📦 18 restants</Text>
                <TouchableOpacity style={styles.cardBtn} onPress={() => { setSelectedFlash(true); setBookingStep(1); }}>
                  <Text style={styles.cardBtnText}>⚡ J'en profite</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Brick Deal Section */}
            <Text style={styles.sectionTitle}>❤️ BRICK DEAL <Text style={styles.sectionSubtitle}>Expériences exclusives</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <View style={styles.dealCard}>
                <View style={[styles.cardBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.badgeText}>-30%</Text></View>
                <Text style={[styles.cardCategory, { color: '#F59E0B' }]}>BRICK DEAL</Text>
                <Text style={styles.cardTitle}>Pack Couple Romantique</Text>
                <Text style={styles.cardResto}>Le Bateau Ivoire ⭐ 4,8</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceOld}>35 000 F</Text>
                  <Text style={styles.priceNew}>25 000 FCFA</Text>
                </View>
                <Text style={styles.cardMeta}>👥 Pour 2 pers  •  📅 Jusqu'au 30 Août</Text>
                <TouchableOpacity style={[styles.cardBtn, { backgroundColor: Colors.primary }]} onPress={() => { setSelectedDeal(true); setBookingStep(1); }}>
                  <Text style={styles.cardBtnText}>❤️ Je réserve</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Partners */}
            <Text style={styles.sectionTitle}>🏪 Restaurants Partenaires</Text>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Le Bateau Ivoire</Text>
              <Text style={styles.partnerSub}>Cuisine Africaine & Européenne • Cocody 2 Plateaux</Text>
            </View>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Le QG Lounge</Text>
              <Text style={styles.partnerSub}>Fast-Food & Grillades • Cocody Riviera</Text>
            </View>
          </ScrollView>
        )}

        {clientTab === 'reservations' && (
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
        )}

        {clientTab === 'profile' && (
          <View style={styles.scrollArea}>
            <Text style={styles.sectionTitle}>Mon Profil</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>Eric Kouassi</Text>
              <Text style={styles.profileEmail}>eric.kouassi@email.com</Text>
              <Text style={styles.profilePhone}>+225 07 45 89 12 36</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}>
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Client Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('home')}>
            <Text style={[styles.navBtnText, clientTab === 'home' && styles.activeNavText]}>🏠 Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={() => Alert.alert('Scanner QR Code', 'Ouverture de la caméra pour scanner le QR Code au restaurant.')}>
            <Text style={styles.scanBtnText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('reservations')}>
            <Text style={[styles.navBtnText, clientTab === 'reservations' && styles.activeNavText]}>📅 Réservations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setClientTab('profile')}>
            <Text style={[styles.navBtnText, clientTab === 'profile' && styles.activeNavText]}>👤 Profil</Text>
          </TouchableOpacity>
        </View>

        {/* --- BOOKING & CHECKOUT MODAL FLOW (Brick Flash / Brick Deal) --- */}
        <Modal visible={!!selectedFlash || !!selectedDeal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedFlash ? '⚡ Fiche Brick Flash' : '❤️ Fiche Brick Deal'}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedFlash(null); setSelectedDeal(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {bookingStep === 1 && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.formTitle}>1. Choisissez la date</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity style={[styles.radioItem, bookingDate === 'Aujourd\'hui 15 Août' && styles.radioActive]} onPress={() => setBookingDate('Aujourd\'hui 15 Août')}>
                    <Text>Aujourd'hui</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.radioItem, bookingDate === 'Demain 16 Août' && styles.radioActive]} onPress={() => setBookingDate('Demain 16 Août')}>
                    <Text>Demain</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.formTitle}>2. Choisissez l'heure</Text>
                <View style={styles.radioGroup}>
                  {['12h00', '13h00', '19h00', '20h00'].map(t => (
                    <TouchableOpacity key={t} style={[styles.radioItem, bookingTime === t && styles.radioActive]} onPress={() => setBookingTime(t)}>
                      <Text>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedFlash && (
                  <>
                    <Text style={styles.formTitle}>3. Quantité</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setBookingQty(q => Math.max(1, q - 1))}><Text>-</Text></TouchableOpacity>
                      <Text style={styles.qtyVal}>{bookingQty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setBookingQty(q => q + 1)}><Text>+</Text></TouchableOpacity>
                    </View>
                    
                    <Text style={styles.formTitle}>4. Comment récupérer ?</Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity style={[styles.radioItem, deliveryMode === 'retrait' && styles.radioActive]} onPress={() => setDeliveryMode('retrait')}>
                        <Text>Retrait au restaurant</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.radioItem, deliveryMode === 'livraison' && styles.radioActive]} onPress={() => setDeliveryMode('livraison')}>
                        <Text>Livraison à domicile</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.actionBtn} onPress={() => setBookingStep(2)}>
                  <Text style={styles.actionBtnText}>Continuer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {bookingStep === 2 && (
              <View style={styles.modalBody}>
                <Text style={styles.formTitle}>Résumé de la réservation</Text>
                <View style={styles.resumeCard}>
                  <Text style={styles.resumeText}>Offre : {selectedFlash ? 'Menu Burger Duo' : 'Pack Couple Romantique'}</Text>
                  <Text style={styles.resumeText}>Établissement : {selectedFlash ? 'Le QG Lounge' : 'Le Bateau Ivoire'}</Text>
                  <Text style={styles.resumeText}>Date : {bookingDate}</Text>
                  <Text style={styles.resumeText}>Heure : {bookingTime}</Text>
                  {selectedFlash && <Text style={styles.resumeText}>Quantité : {bookingQty} x | Mode : {deliveryMode}</Text>}
                  <Text style={[styles.resumeText, { fontWeight: '700', color: Colors.primary }]}>
                    Total à payer : {selectedFlash ? (7500 * bookingQty).toLocaleString() : '25 000'} FCFA
                  </Text>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={() => setBookingStep(3)}>
                  <Text style={styles.actionBtnText}>Confirmer et passer au paiement</Text>
                </TouchableOpacity>
              </View>
            )}

            {bookingStep === 3 && (
              <View style={styles.modalBody}>
                <Text style={styles.formTitle}>Choisissez votre moyen de paiement</Text>
                <TouchableOpacity style={[styles.payOption, paymentMethod === 'wave' && styles.payOptionActive]} onPress={() => setPaymentMethod('wave')}>
                  <Text style={styles.payOptionText}>Wave</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.payOption, paymentMethod === 'orange' && styles.payOptionActive]} onPress={() => setPaymentMethod('orange')}>
                  <Text style={styles.payOptionText}>Orange Money</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.payOption, paymentMethod === 'mtn' && styles.payOptionActive]} onPress={() => setPaymentMethod('mtn')}>
                  <Text style={styles.payOptionText}>MTN Mobile Money</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { marginTop: 40 }]} onPress={() => setBookingStep(4)}>
                  <Text style={styles.actionBtnText}>Payer maintenant</Text>
                </TouchableOpacity>
              </View>
            )}

            {bookingStep === 4 && (
              <View style={[styles.modalBody, { alignItems: 'center', justifyContent: 'center' }]}>
                <View style={styles.successCheck}><Text style={styles.successCheckText}>✓</Text></View>
                <Text style={styles.successTitle}>Réservation confirmée !</Text>
                <Text style={styles.successSubtitle}>Votre paiement a été validé avec succès.</Text>
                
                {/* QR Code mock representation */}
                <View style={styles.qrCodeBox}>
                  <Text style={styles.qrCodeTitle}>QR CODE</Text>
                  <Text style={styles.qrCodeVal}>BF-12458</Text>
                </View>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => { setSelectedFlash(null); setSelectedDeal(null); setClientTab('reservations'); }}>
                  <Text style={styles.actionBtnText}>Fermer & voir mes réservations</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }

  // --- VIEW 3: AGENT PORTAL ---
  if (role === 'agent') {
    return (
      <View style={styles.mainContainer}>
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

            <Text style={styles.sectionTitle}>🏢 Mes Restaurants (18)</Text>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Le Bateau Ivoire</Text>
              <Text style={styles.partnerSub}>Cocody 2 Plateaux • 12 offres actives</Text>
            </View>
            <View style={styles.partnerItem}>
              <Text style={styles.partnerName}>Toni Fast Food</Text>
              <Text style={styles.partnerSub}>Riviera Bonoumin • 8 offres actives</Text>
            </View>
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
            <Text style={[styles.navBtnText, agentTab === 'home' && styles.activeNavText]}>🏠 Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('proposals')}>
            <Text style={[styles.navBtnText, agentTab === 'proposals' && styles.activeNavText]}>📄 Proposition</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setAgentTab('profile')}>
            <Text style={[styles.navBtnText, agentTab === 'profile' && styles.activeNavText]}>👤 Profil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- VIEW 4: RESTAURANT PORTAL ---
  if (role === 'restaurant') {
    return (
      <View style={styles.mainContainer}>
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
            <Text style={[styles.navBtnText, restaurantTab === 'home' && styles.activeNavText]}>🏠 Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('orders')}>
            <Text style={[styles.navBtnText, restaurantTab === 'orders' && styles.activeNavText]}>📦 Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setRestaurantTab('profile')}>
            <Text style={[styles.navBtnText, restaurantTab === 'profile' && styles.activeNavText]}>👤 Profil</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: 50,
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
    padding: 16,
    width: 280,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardResto: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: 12,
  },
  priceOld: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  cardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  cardBtn: {
    backgroundColor: '#0F0F10',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
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
    paddingTop: 50,
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
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
  qrCodeBox: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    marginBottom: 40,
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
});
