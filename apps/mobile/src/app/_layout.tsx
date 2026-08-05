import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, StatusBar } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  isLoggedIn: boolean;
  loading: boolean;
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Splash Screen Overlay State
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplashOverlay(false);
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const refreshProfile = async (userId?: string) => {
    const targetId = userId ?? user?.id;
    if (!targetId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', targetId).single();
    if (data) {
      const metaPhone = user?.user_metadata?.phone || session?.user?.user_metadata?.phone;
      if ((!data.phone || data.phone === 'Non renseigné') && metaPhone) {
        data.phone = metaPhone;
        await supabase.from('profiles').update({ phone: metaPhone }).eq('id', targetId);
      }
    }
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data) {
              const metaPhone = session.user.user_metadata?.phone;
              if ((!data.phone || data.phone === 'Non renseigné') && metaPhone) {
                data.phone = metaPhone;
                supabase.from('profiles').update({ phone: metaPhone }).eq('id', session.user.id);
              }
            }
            setProfile(data as Profile | null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // Écoute des changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (error) console.error('[onAuthStateChange] Error fetching profile:', error.message);
            else console.log('[onAuthStateChange] Profile fetched:', data);
            setProfile(data as Profile | null);
          });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const role: UserRole = profile?.role ?? 'client';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, session, profile, role, isLoggedIn, loading, refreshProfile }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#D60309" />
        <View style={styles.container}>
          <Slot />
          {showSplashOverlay && (
            <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim }]} pointerEvents="none">
              <Image 
                source={require('../../assets/splash.png')} 
                style={styles.splashImage} 
                resizeMode="contain" 
              />
            </Animated.View>
          )}
        </View>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D60309',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  splashImage: {
    width: '90%',
    height: '90%',
  },
});
