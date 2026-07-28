import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  // Live timer for Slide 1 demo card
  const [secondsLeft, setSecondsLeft] = useState(6512); // 01h 48m 32s

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
  };

  const handleNext = () => {
    if (slideIndex < 2) {
      setSlideIndex(slideIndex + 1);
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Row */}
      <View style={styles.topHeader}>
        <View style={styles.logoBadgeContainer}>
          <Image source={require('../../assets/Icone.png')} style={styles.headerLogoImg} />
          <Text style={styles.brandTitleText}>
            BRICK<Text style={{ color: Colors.primary }}>DEAL</Text>
          </Text>
        </View>

        <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Passer</Text>
          <Ionicons name="chevron-forward" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Main Slide Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {slideIndex === 0 && (
          /* SLIDE 1: CLIENT DEALS & FLASH */
          <View style={styles.slideContainer}>
            <View style={styles.tagBadge}>
              <Ionicons name="flash" size={14} color={Colors.primary} />
              <Text style={styles.tagBadgeText}>LES BONS PLANS DU MOMENT</Text>
            </View>

            <Text style={styles.titleText}>
              Dégustez plus, <Text style={{ color: Colors.primary }}>payez moins !</Text>
            </Text>
            <Text style={styles.subtitleText}>
              Profitez chaque jour de réductions exclusives de <Text style={styles.highlightText}>-30% à -70%</Text> sur les meilleurs restaurants d'Abidjan.
            </Text>

            {/* Interactive Card Widget Demo */}
            <View style={styles.cardWidget}>
              <View style={styles.cardWidgetBadge}>
                <Text style={styles.cardWidgetBadgeText}>-50% ÉCONOMIE</Text>
              </View>

              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' }}
                style={styles.cardWidgetImage as any}
              />

              <View style={styles.cardWidgetDetails}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardWidgetTitle}>Menu Duo Gourmet Burger</Text>
                  <View style={styles.starPill}>
                    <Ionicons name="star" size={12} color="#F5A623" />
                    <Text style={styles.starPillText}>4.9</Text>
                  </View>
                </View>

                <Text style={styles.cardWidgetResto}>📍 Le Cap de Nissa • Cocody</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceOld}>12 000 F</Text>
                  <Text style={styles.priceNew}>6 000 FCFA</Text>
                </View>

                <View style={styles.timerBox}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.timerBoxText}>
                    Fin de l'offre dans : <Text style={{ fontWeight: '800', color: Colors.primary }}>{formatTimer(secondsLeft)}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Feature Highlights */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFEBEB' }]}>
                  <Ionicons name="flame" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.featureTitle}>Flash ⚡</Text>
                <Text style={styles.featureSub}>Deals minute du soir</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="heart" size={18} color="#9333EA" />
                </View>
                <Text style={styles.featureTitle}>Deal ❤️</Text>
                <Text style={styles.featureSub}>Formules Duo & Groupe</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#E6F8F3' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#059669" />
                </View>
                <Text style={styles.featureTitle}>100% Vérifié</Text>
                <Text style={styles.featureSub}>Qualité garantie</Text>
              </View>
            </View>
          </View>
        )}

        {slideIndex === 1 && (
          /* SLIDE 2: RESTAURATEURS & AGENTS */
          <View style={styles.slideContainer}>
            <View style={[styles.tagBadge, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="briefcase" size={14} color="#9333EA" />
              <Text style={[styles.tagBadgeText, { color: '#9333EA' }]}>ESPACE PRO & AGENTS</Text>
            </View>

            <Text style={styles.titleText}>
              Boostez vos ventes <Text style={{ color: Colors.primary }}>rapidement</Text>
            </Text>
            <Text style={styles.subtitleText}>
              Restaurateurs & Agents Commercials : publiez vos offres en <Text style={styles.highlightText}>30 secondes</Text> et attirez des centaines de clients en heures creuses.
            </Text>

            {/* Pro Stats Cards Widget */}
            <View style={styles.proStatsContainer}>
              <View style={styles.proStatCard}>
                <View style={styles.proStatHeader}>
                  <View style={[styles.proStatIconBox, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="trending-up" size={20} color="#059669" />
                  </View>
                  <Text style={styles.proStatValue}>+45%</Text>
                </View>
                <Text style={styles.proStatTitle}>Chiffre d'affaires</Text>
                <Text style={styles.proStatSub}>Augmentation moyenne des ventes en semaine</Text>
              </View>

              <View style={styles.proStatCard}>
                <View style={styles.proStatHeader}>
                  <View style={[styles.proStatIconBox, { backgroundColor: '#FFEBEB' }]}>
                    <Ionicons name="wallet" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.proStatValue}>10%</Text>
                </View>
                <Text style={styles.proStatTitle}>Commission Agent</Text>
                <Text style={styles.proStatSub}>Rémunération automatique à chaque réservation</Text>
              </View>
            </View>

            {/* Direct Link Banner */}
            <View style={styles.proCalloutBanner}>
              <Ionicons name="sparkles" size={20} color="#F5A623" />
              <View style={{ flex: 1 }}>
                <Text style={styles.proCalloutTitle}>Accès Professionnel Intégré</Text>
                <Text style={styles.proCalloutSub}>Un appui prolongé de 2s sur "Bonjour..." active votre connexion Staff.</Text>
              </View>
            </View>
          </View>
        )}

        {slideIndex === 2 && (
          /* SLIDE 3: QR CODE & RÉSERVATION */
          <View style={styles.slideContainer}>
            <View style={[styles.tagBadge, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="qr-code" size={14} color="#059669" />
              <Text style={[styles.tagBadgeText, { color: '#059669' }]}>SIMPLICITÉ SANS APPORT</Text>
            </View>

            <Text style={styles.titleText}>
              Réservez, <Text style={{ color: Colors.primary }}>présentez & régalez-vous !</Text>
            </Text>
            <Text style={styles.subtitleText}>
              Générez votre Pass de réservation instantané, présentez le QR Code en restaurant et profitez de votre repas.
            </Text>

            {/* QR Pass Demo Card */}
            <View style={styles.qrPassCard}>
              <View style={styles.qrPassHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="ticket" size={18} color="white" />
                  <Text style={styles.qrPassHeaderText}>PASS RÉSERVATION BRICK DEAL</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VALIDE</Text>
                </View>
              </View>

              <View style={styles.qrPassBody}>
                <View style={styles.qrCodeBox}>
                  <Ionicons name="qr-code-outline" size={90} color="#111827" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.qrPassCodeLabel}>CODE DE CONFIRMATION</Text>
                  <Text style={styles.qrPassCodeValue}>BD-894201</Text>

                  <View style={styles.qrPassDivider} />

                  <Text style={styles.qrPassInfoText}>📍 Présentez ce pass lors de votre arrivée au restaurant.</Text>
                </View>
              </View>
            </View>

            <View style={styles.trustBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
              <Text style={styles.trustBannerText}>
                Déjà plus de <Text style={{ fontWeight: '800', color: '#111827' }}>15 000 gourmands</Text> satisfaits en Côte d'Ivoire !
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation & Action Button */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, slideIndex === 0 && styles.dotActive]} />
          <View style={[styles.dot, slideIndex === 1 && styles.dotActive]} />
          <View style={[styles.dot, slideIndex === 2 && styles.dotActive]} />
        </View>

        {/* Main Action Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>
            {slideIndex === 2 ? 'Commencer l\'expérience 🚀' : 'Suivant'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  brandTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  slideContainer: {
    gap: 16,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  highlightText: {
    fontWeight: '800',
    color: Colors.primary,
  },

  // Slide 1 Card Widget
  cardWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginVertical: 4,
  },
  cardWidgetBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardWidgetBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  cardWidgetImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  cardWidgetDetails: {
    padding: 14,
    gap: 6,
  },
  cardWidgetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  cardWidgetResto: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  priceOld: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEBEB',
    marginTop: 6,
  },
  timerBoxText: {
    fontSize: 11,
    color: '#374151',
  },

  // Slide 1 Features
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  featureItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  featureSub: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },

  // Slide 2 Pro Stats
  proStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  proStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  proStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proStatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  proStatTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  proStatSub: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
  },
  proCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  proCalloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  proCalloutSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },

  // Slide 3 QR Pass Card
  qrPassCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 6,
  },
  qrPassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  qrPassHeaderText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  qrPassBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  qrCodeBox: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPassCodeLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrPassCodeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1,
    marginTop: 2,
  },
  qrPassDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  qrPassInfoText: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 15,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustBannerText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
  },

  // Bottom Navigation Controls
  bottomControls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});
