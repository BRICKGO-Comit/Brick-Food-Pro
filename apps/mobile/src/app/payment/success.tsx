import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentSuccessRoute() {
  const router = useRouter();

  useEffect(() => {
    // Redirige doucement vers la page principale qui affiche le Pass QR
    const timer = setTimeout(() => {
      router.replace('/');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F19', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, marginTop: 16 }}>
        Paiement Confirmé !
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
        Ouverture de votre Pass de réservation...
      </Text>
    </View>
  );
}
