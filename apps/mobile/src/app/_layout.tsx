import React, { createContext, useState, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Create a mock authentication context for roles testing
interface AuthContextType {
  role: 'client' | 'agent' | 'restaurant';
  setRole: (role: 'client' | 'agent' | 'restaurant') => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (login: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default function RootLayout() {
  const [role, setRole] = useState<'client' | 'agent' | 'restaurant'>('client');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  return (
    <AuthContext.Provider value={{ role, setRole, isLoggedIn, setIsLoggedIn }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Slot />
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
});
