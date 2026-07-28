import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  const handleNext = () => {
    if (slideIndex === 0) {
      setSlideIndex(1);
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D60309" />
      <TouchableOpacity 
        style={styles.imageTouchable} 
        activeOpacity={0.95} 
        onPress={handleNext}
      >
        <Image
          source={
            slideIndex === 0
              ? require('../../assets/onboarding_slide1.png')
              : require('../../assets/onboarding_slide2.png')
          }
          style={styles.fullImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D60309',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: width * 0.96,
    height: height * 0.92,
  },
});
