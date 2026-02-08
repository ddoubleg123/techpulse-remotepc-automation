import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

// TechPulse Logo - pulse/heartbeat line design
function TechPulseLogo() {
  return (
    <View style={logoStyles.container}>
      <Svg width={200} height={60} viewBox="0 0 200 60">
        <Path
          d="M0 30 L40 30 L50 10 L60 50 L70 20 L80 40 L90 30 L200 30"
          stroke="#3B82F6"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={logoStyles.brandName}>TECHPULSE</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 28,
    color: '#3B82F6',
    letterSpacing: 6,
    marginTop: 16,
  },
});

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <TechPulseLogo />
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 180,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  forgotPassword: {
    marginTop: 24,
    padding: 8,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#64748b',
  },
});
