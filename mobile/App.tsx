import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, NativeModules, InteractionManager } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
// Temporarily disable Google Sign-In for Expo Go testing
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from './src/stores/authStore';

// Import main app screens
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import diagnostic workflow screens (DiagnosticChatScreen loads image/document pickers only on tap)
import VinInputScreen from './src/screens/VinInputScreen';
import CodesInputScreen from './src/screens/CodesInputScreen';
import DiagnosticChatScreen from './src/screens/DiagnosticChatScreen';
import DiagnosticReportScreen from './src/screens/DiagnosticReportScreen';
import DiagnosticFeedbackScreen from './src/screens/DiagnosticFeedbackScreen';

// Import data sync screen
import DataSyncScreen from './src/screens/DataSyncScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Catch render errors so we see them instead of a white screen
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f172a' }}>
          <Text style={{ color: '#ef4444', fontSize: 16, marginBottom: 12 }}>Something went wrong</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Google Sign-In disabled for Expo Go compatibility
const isGoogleSignInAvailable = false;

// TechPulse Logo - pulse/heartbeat line design
function TechPulseLogo({ size = 'large' }: { size?: 'large' | 'small' }) {
  const width = size === 'large' ? 200 : 150;
  const height = size === 'large' ? 60 : 45;
  const fontSize = size === 'large' ? 28 : 22;

  return (
    <View style={logoStyles.container}>
      <Svg width={width} height={height} viewBox="0 0 200 60">
        <Path
          d="M0 30 L40 30 L50 10 L60 50 L70 20 L80 40 L90 30 L200 30"
          stroke="#3B82F6"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={[logoStyles.brandName, { fontSize }]}>TECHPULSE</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  brandName: {
    color: '#3B82F6',
    letterSpacing: 6,
    marginTop: 16,
  },
});

// Welcome Screen
function WelcomeScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={welcomeStyles.container}>
      <View style={welcomeStyles.logoSection}>
        <TechPulseLogo size="large" />
      </View>

      <View style={welcomeStyles.buttonSection}>
        <TouchableOpacity style={welcomeStyles.loginButton} onPress={onLogin}>
          <Text style={welcomeStyles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
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
});

// User type
interface User {
  email: string;
  name?: string;
  picture?: string;
}

// Login Screen
function LoginScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const { generateOTP, verifyOTP } = useAuthStore();

  const handleGoogleLogin = async () => {
    Alert.alert(
      'Google Sign-In Disabled',
      'Google Sign-In requires a development build and is not available in Expo Go.\n\nPlease use Email login instead.',
      [{ text: 'OK' }]
    );
  };

  const handleSendCode = () => {
    if (email) {
      const code = generateOTP(email);
      setShowOTP(true);
      setOtpError('');
      // In production, this would send via email
      // For now, show the code in an alert for testing
      Alert.alert(
        'Verification Code',
        `Your code is: ${code}\n\n(In production, this would be sent to ${email})`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      const isValid = verifyOTP(otp);
      if (isValid) {
        onSuccess({ email });
      } else {
        setOtpError('Invalid or expired code. Please try again.');
        setOTP('');
      }
    }
  };

  if (loading) {
    return (
      <View style={[loginStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#94a3b8', marginTop: 16 }}>Signing in...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={loginStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={loginStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={loginStyles.header}>
          <TouchableOpacity onPress={onBack} style={loginStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TechPulseLogo size="small" />
        </View>

        {/* Form */}
        <View style={loginStyles.form}>
          <Text style={loginStyles.title}>Welcome back</Text>
          <Text style={loginStyles.subtitle}>Sign in to continue</Text>

          {!showOTP ? (
            <>
              {/* Google Login */}
              <TouchableOpacity
                style={loginStyles.googleBtn}
                onPress={handleGoogleLogin}
              >
                <Ionicons name="logo-google" size={20} color="#ffffff" />
                <Text style={loginStyles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={loginStyles.divider}>
                <View style={loginStyles.dividerLine} />
                <Text style={loginStyles.dividerText}>or</Text>
                <View style={loginStyles.dividerLine} />
              </View>

              {/* Email Input */}
              <Text style={loginStyles.inputLabel}>Email address</Text>
              <View style={loginStyles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <TextInput
                  style={loginStyles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[loginStyles.primaryBtn, !email && loginStyles.primaryBtnDisabled]}
                onPress={handleSendCode}
                disabled={!email}
              >
                <Text style={loginStyles.primaryBtnText}>Send Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={loginStyles.otpInfo}>
                We sent a 6-digit code to{'\n'}
                <Text style={loginStyles.otpEmail}>{email}</Text>
              </Text>

              <Text style={loginStyles.inputLabel}>Enter code</Text>
              <View style={[loginStyles.inputContainer, otpError && loginStyles.inputContainerError]}>
                <Ionicons name="keypad-outline" size={20} color={otpError ? '#ef4444' : '#64748b'} />
                <TextInput
                  style={loginStyles.input}
                  placeholder="000000"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={(text) => {
                    setOTP(text);
                    setOtpError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {otpError ? (
                <Text style={loginStyles.errorText}>{otpError}</Text>
              ) : null}

              <TouchableOpacity
                style={[loginStyles.primaryBtn, otp.length !== 6 && loginStyles.primaryBtnDisabled]}
                onPress={handleVerifyOTP}
                disabled={otp.length !== 6}
              >
                <Text style={loginStyles.primaryBtnText}>Verify & Login</Text>
              </TouchableOpacity>

              <TouchableOpacity style={loginStyles.backLink} onPress={handleSendCode}>
                <Text style={loginStyles.backLinkText}>Resend code</Text>
              </TouchableOpacity>

              <TouchableOpacity style={loginStyles.backLink} onPress={() => {
                setShowOTP(false);
                setOtpError('');
                setOTP('');
              }}>
                <Text style={loginStyles.backLinkText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 60,
    padding: 8,
  },
  form: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
  },
  googleBtnDisabled: {
    backgroundColor: '#4285F450',
  },
  googleBtnText: {
    fontSize: 16,
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#3B82F650',
  },
  primaryBtnText: {
    fontSize: 16,
    color: '#ffffff',
  },
  otpInfo: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  otpEmail: {
    color: '#3B82F6',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backLinkText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
  },
});

// Main App Tab Navigator (after login)
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SynthAI') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="SynthAI" component={ChatScreen} options={{ tabBarLabel: 'Synth AI' }} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root Stack Navigator (includes tabs + diagnostic workflow screens)
function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="DataSync" component={DataSyncScreen} />
      <Stack.Screen name="VinInput" component={VinInputScreen} />
      <Stack.Screen name="CodesInput" component={CodesInputScreen} />
      <Stack.Screen name="DiagnosticChat" component={DiagnosticChatScreen} />
      <Stack.Screen name="DiagnosticReport" component={DiagnosticReportScreen} />
      <Stack.Screen name="DiagnosticFeedback" component={DiagnosticFeedbackScreen} />
    </Stack.Navigator>
  );
}

// Main App with simple navigation
export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'main'>('welcome');
  const [booted, setBooted] = useState(false);
  const prevAuthRef = useRef(false);
  const { user: authUser, isAuthenticated, setUser: setAuthUser } = useAuthStore();

  // Minimal first frame then show full UI (fixes stuck white / "Reloading..." screen)
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) {
        setBooted(true);
        SplashScreen.hideAsync();
      }
    });
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setBooted(true);
        SplashScreen.hideAsync();
      }
    }, 100);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      clearTimeout(timeout);
    };
  }, []);

  // Handle Google sign-out when user logs out (disabled for Expo Go)
  useEffect(() => {
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Derive screen based on auth state - if logged out while on main, go to welcome
  useEffect(() => {
    if (!isAuthenticated && screen === 'main') {
      // Use setTimeout to avoid the synchronous setState warning
      const timer = setTimeout(() => setScreen('welcome'), 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, screen]);

  const handleLoginSuccess = (loggedInUser: User) => {
    // Create a full user object for the store
    const fullUser = {
      id: loggedInUser.email, // Use email as ID for now
      email: loggedInUser.email,
      name: loggedInUser.name,
      picture: loggedInUser.picture,
    };
    setAuthUser(fullUser);
    setScreen('main');
  };

  // First frame: minimal paint so screen is never white (then booted becomes true and we show full UI)
  if (!booted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 24 }}>TechPulse</Text>
      </View>
    );
  }

  // If user is authenticated, show main app with navigation
  if (isAuthenticated && authUser) {
    return (
      <AppErrorBoundary>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <StatusBar style="light" />

        {screen === 'welcome' && (
          <WelcomeScreen onLogin={() => setScreen('login')} />
        )}

        {screen === 'login' && (
          <LoginScreen
            onBack={() => setScreen('welcome')}
            onSuccess={handleLoginSuccess}
          />
        )}
      </View>
    </AppErrorBoundary>
  );
}
