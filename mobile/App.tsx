import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, NativeModules } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from './src/stores/authStore';

// Import main app screens
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// ===== DIAGNOSTIC: Check if native module is available =====
const isGoogleSignInAvailable = !!NativeModules.RNGoogleSignin;
console.log('=== NATIVE MODULE CHECK ===');
console.log('GoogleSignin native module available:', isGoogleSignInAvailable);
console.log('NativeModules.RNGoogleSignin:', NativeModules.RNGoogleSignin ? 'EXISTS' : 'MISSING');
console.log('Platform:', Platform.OS);
console.log('===========================');

if (!isGoogleSignInAvailable) {
  console.error('CRITICAL: @react-native-google-signin native module is NOT available!');
  console.error('You need to rebuild your development build with: eas build --profile development --platform android');
}

// Configure Google Sign-In
// webClientId is used to get the ID token (for backend verification)
try {
  GoogleSignin.configure({
    webClientId: '416281156741-cn1vmd73s9vu7pp6t4ohe4tj6imbtjh7.apps.googleusercontent.com',
    offlineAccess: true,
  });
  console.log('GoogleSignin.configure() succeeded');
} catch (configError) {
  console.error('GoogleSignin.configure() FAILED:', configError);
}

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
  const [generatedCode, setGeneratedCode] = useState('');

  const { generateOTP, verifyOTP } = useAuthStore();

  const handleGoogleLogin = async () => {
    console.log('=== GOOGLE LOGIN ATTEMPT ===');
    console.log('Native module available:', isGoogleSignInAvailable);
    console.log('Timestamp:', new Date().toISOString());

    if (!isGoogleSignInAvailable) {
      Alert.alert(
        'Native Module Missing',
        'The Google Sign-In native module is not installed in this build.\n\n' +
        'You need to create a new development build:\n\n' +
        'eas build --profile development --platform android\n\n' +
        'Then install the new APK.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      // Step 1: Check Play Services
      console.log('Step 1: Checking Google Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Step 1: Play Services OK');

      // Step 2: Attempt sign in
      console.log('Step 2: Calling GoogleSignin.signIn()...');
      const response = await GoogleSignin.signIn();
      console.log('Step 2: Sign-in response received');
      console.log('Response type:', typeof response);
      console.log('Response:', JSON.stringify(response, null, 2));

      // Step 3: Extract user data
      if (response.data?.user) {
        const { email, name, photo } = response.data.user;
        console.log('Step 3: User data extracted - email:', email);
        onSuccess({
          email: email,
          name: name || undefined,
          picture: photo || undefined,
        });
      } else if (response.type === 'cancelled') {
        console.log('Step 3: User cancelled sign-in');
      } else {
        console.log('Step 3: Unexpected response structure:', response);
        Alert.alert('Sign-In Issue', 'Received response but no user data. Check console logs.');
      }
    } catch (error: any) {
      console.error('=== GOOGLE SIGN-IN ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('============================');

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the sign-in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-In In Progress', 'Please wait...');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available or outdated');
      } else if (error.code === '12500' || error.message?.includes('12500')) {
        Alert.alert(
          'Google Sign-In Error 12500',
          'This usually means:\n' +
          '1. SHA-1 fingerprint not registered in Google Cloud Console\n' +
          '2. OAuth consent screen not configured\n' +
          '3. Package name mismatch\n\n' +
          'Check your Google Cloud Console configuration.',
          [{ text: 'OK' }]
        );
      } else if (error.code === '10' || error.message?.includes('DEVELOPER_ERROR')) {
        Alert.alert(
          'Developer Error (Code 10)',
          'Configuration mismatch. Check:\n' +
          '1. google-services.json is correct\n' +
          '2. SHA-1 fingerprint matches\n' +
          '3. Package name matches\n' +
          '4. OAuth client ID is correct',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sign-In Error',
          `${error.message || 'Something went wrong'}\n\nError code: ${error.code || 'unknown'}`
        );
      }
    } finally {
      setLoading(false);
      console.log('=== GOOGLE LOGIN COMPLETE ===');
    }
  };

  const handleSendCode = () => {
    if (email) {
      const code = generateOTP(email);
      setGeneratedCode(code);
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
        tabBarIcon: ({ focused, color, size }) => {
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

// Main App with simple navigation
export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'main'>('welcome');

  const { user: authUser, isAuthenticated, setUser: setAuthUser } = useAuthStore();

  // Listen to auth state changes - when logout happens in ProfileScreen
  useEffect(() => {
    if (!isAuthenticated && screen === 'main') {
      // User logged out from ProfileScreen, go back to welcome
      setScreen('welcome');
      // Also sign out from Google if needed
      const signOutFromGoogle = async () => {
        try {
          if (GoogleSignin.hasPreviousSignIn()) {
            await GoogleSignin.signOut();
          }
        } catch (error) {
          console.log('Google sign out error:', error);
        }
      };
      signOutFromGoogle();
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

  // If user is authenticated, show main app with navigation
  if (isAuthenticated && authUser) {
    return (
      <NavigationContainer>
        <StatusBar style="light" />
        <MainTabNavigator />
      </NavigationContainer>
    );
  }

  return (
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
  );
}
