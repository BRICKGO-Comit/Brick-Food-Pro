import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  // Live timer simulation for Slide 2
  const [secondsLeft, setSecondsLeft] = useState(9930); // 02h 45m 30s

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
    if (slideIndex === 0) {
      setSlideIndex(1);
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {slideIndex === 0 ? (
        /* SLIDE 1 : BOOSTEZ VOS VENTES */
        <View style={styles.slideContent}>
          {/* Header Texts */}
          <View style={styles.headerBlock}>
            <Text style={styles.mainTitle}>
              <Text style={{ color: Colors.primary }}>BOOSTEZ </Text>
              <Text style={{ color: '#111827' }}>VOS VENTES</Text>
            </Text>
            <Text style={styles.subtitle}>
              Lancez des <Text style={{ color: Colors.primary, fontWeight: '700' }}>promos flash</Text> et attirez plus de clients, rapidement !
            </Text>
            <View style={styles.redUnderline} />
          </View>

          {/* Center Graphic */}
          <View style={styles.centerGraphicContainer}>
            <View style={styles.graphicCardMockup}>
              <View style={styles.mockupHeader}>
                <Ionicons name="chevron-back" size={16} color="white" />
                <Text style={styles.mockupHeaderText}>Créer un deal</Text>
              </View>
              <View style={styles.mockupBody}>
                <Text style={styles.mockupLabel}>Titre du deal</Text>
                <View style={styles.mockupInput}>
                  <Text style={styles.mockupInputText}>-30% sur tous les burgers</Text>
                </View>
                <Text style={styles.mockupLabel}>Type de promotion</Text>
                <View style={styles.mockupInput}>
                  <Text style={styles.mockupInputText}>Pourcentage ▾</Text>
                </View>

                <View style={styles.flashBadge3D}>
                  <Text style={styles.flashBadge3DText}>FLASH DEAL ⚡</Text>
                </View>
              </View>
            </View>

            {/* Food Asset Image */}
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' }}
              style={styles.foodOverlayImage as any}
            />

            {/* Percent Badge Overlay */}
            <View style={styles.percentBadgeCircle}>
              <Text style={styles.percentBadgeText}>%</Text>
            </View>
          </View>

          {/* 3 Pillars Row */}
          <View style={styles.pillarsRow}>
            <View style={styles.pillarItem}>
              <View style={styles.pillarIconContainer}>
                <Ionicons name="rocket-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.pillarTitle}>LANCEZ</Text>
              <Text style={styles.pillarSub}>en quelques secondes</Text>
            </View>

            <View style={styles.pillarItem}>
              <View style={styles.pillarIconContainer}>
                <Ionicons name="people-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.pillarTitle}>TOUCHEZ</Text>
              <Text style={styles.pillarSub}>plus de clients</Text>
            </View>

            <View style={styles.pillarItem}>
              <View style={styles.pillarIconContainer}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.pillarTitle}>AUGMENTEZ</Text>
              <Text style={styles.pillarSub}>vos ventes facilement</Text>
            </View>
          </View>

          {/* Pagination Indicators */}
          <View style={styles.paginationRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>

          {/* Next Button */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
            <Text style={styles.actionBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        /* SLIDE 2 : DES OFFRES QUI DONNENT FAIM */
        <View style={styles.slideContent}>
          {/* Header Texts */}
          <View style={styles.headerBlock}>
            <Text style={styles.mainTitle}>
              DES OFFRES <Text style={{ color: Colors.primary }}>QUI DONNENT FAIM</Text>
            </Text>
            <Text style={styles.subtitle}>
              Mettez vos <Text style={{ color: Colors.primary, fontWeight: '700' }}>meilleurs plats</Text> en avant et créez l'envie avec des deals irrésistibles.
            </Text>
            <View style={styles.redUnderline} />
          </View>

          {/* Deal Preview Card Graphic */}
          <View style={styles.dealCardGraphic}>
            <View style={styles.dealCardHeaderBadge}>
              <Ionicons name="flame" size={14} color="white" />
              <Text style={styles.dealCardHeaderBadgeText}>Deal du jour</Text>
            </View>

            <View style={styles.dealCardBody}>
              <Text style={styles.discountText}>-40%</Text>
              <Text style={styles.dishTitle}>sur le poulet braisé</Text>
              <Text style={styles.timerText}>
                Fin dans : <Text style={{ color: Colors.primary, fontWeight: '800' }}>{formatTimer(secondsLeft)}</Text>
              </Text>
            </View>

            {/* Food Image */}
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80' }}
              style={styles.chickenFoodImage as any}
            />

            {/* Social Avatars Overlay */}
            <View style={styles.avatarsRow}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={styles.avatarImg as any} />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={[styles.avatarImg, { marginLeft: -10 }] as any} />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.avatarImg, { marginLeft: -10 }] as any} />
              <View style={[styles.avatarImg, styles.avatarCount, { marginLeft: -10 }]}>
                <Text style={styles.avatarCountText}>+250</Text>
              </View>
            </View>
          </View>

          {/* Sub Engagement Text */}
          <Text style={styles.engagementText}>
            Plus de <Text style={styles.boldEngage}>visibilité</Text>, plus d'<Text style={styles.boldEngage}>engagement</Text>, plus de <Text style={styles.boldEngage}>clients fidèles</Text> à votre resto.
          </Text>

          {/* Pagination Indicators */}
          <View style={styles.paginationRow}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>

          {/* Start Button */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
            <Text style={styles.actionBtnText}>Commencer</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slideContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  headerBlock: {
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 6,
    lineHeight: 20,
  },
  redUnderline: {
    width: 32,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 12,
  },

  // Slide 1 Graphic
  centerGraphicContainer: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  graphicCardMockup: {
    width: '80%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  mockupHeaderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  mockupBody: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    position: 'relative',
  },
  mockupLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
  },
  mockupInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  mockupInputText: {
    fontSize: 10,
    color: '#1F2937',
  },
  flashBadge3D: {
    position: 'absolute',
    top: -14,
    right: -16,
    backgroundColor: '#D10000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    transform: [{ rotate: '8deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  flashBadge3DText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  foodOverlayImage: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    width: 140,
    height: 120,
    borderRadius: 16,
  },
  percentBadgeCircle: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  percentBadgeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },

  // 3 Pillars
  pillarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  pillarItem: {
    flex: 1,
    alignItems: 'center',
  },
  pillarIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  pillarSub: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  // Slide 2 Graphic
  dealCardGraphic: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    position: 'relative',
    minHeight: 240,
  },
  dealCardHeaderBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  dealCardHeaderBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  dealCardBody: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    width: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  discountText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
  },
  dishTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timerText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  chickenFoodImage: {
    position: 'absolute',
    bottom: -15,
    right: 10,
    width: 150,
    height: 150,
    borderRadius: 20,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarCount: {
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCountText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },

  engagementText: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    marginVertical: 6,
    lineHeight: 18,
  },
  boldEngage: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Common Pagination & Buttons
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});
