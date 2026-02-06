import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// Required for auth session to work properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '416281156741-cn1vmd73s9vu7pp6t4ohe4tj6imbtjh7.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '416281156741-brtr7npacdjb5kfemcgm0uqkikuk3if8.apps.googleusercontent.com';

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

  // Google Auth setup - using native redirect for development builds
  // IMPORTANT: The redirect URI must match the scheme in app.json ("techpulse")
  // For development builds, add this to Google Cloud Console:
  // OAuth 2.0 Client IDs > Android Client > Add the SHA-1 fingerprint
  // The redirect URI for native apps uses the scheme: techpulse://oauth
  const redirectUri = makeRedirectUri({
    scheme: 'techpulse',  // Must match "scheme" in app.json
    path: 'oauth',        // Add path to ensure proper URL formatting with query params
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri, // Explicitly pass the redirect URI
    scopes: ['openid', 'profile', 'email'],
  });

  // Debug: Log request state and configuration
  useEffect(() => {
    console.log('=== Google Auth Debug ===');
    console.log('Request state:', request ? 'ready' : 'not ready');
    console.log('Redirect URI:', redirectUri);
    console.log('Expected scheme: techpulse://oauth');
    console.log('=========================');
  }, [request, redirectUri]);

  // Handle Google Auth response
  useEffect(() => {
    console.log('Google Auth response:', response?.type);
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchGoogleUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.error('Google Auth error:', response.error);
      Alert.alert('Authentication Error', response.error?.message || 'Something went wrong. Make sure you are using a development build, not Expo Go.');
    } else if (response?.type === 'dismiss') {
      console.log('User dismissed the auth prompt');
    }
  }, [response]);

  const fetchGoogleUserInfo = async (accessToken: string) => {
    setLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();
      console.log('Google user info:', userInfo);
      onSuccess({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      Alert.alert('Error', 'Failed to get user information from Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('Google login button pressed');
    console.log('Redirect URI being used:', request?.redirectUri);

    // Check if running in Expo Go (exp:// scheme)
    const isExpoGo = redirectUri.startsWith('exp://');

    if (isExpoGo) {
      Alert.alert(
        'Development Build Required',
        'Google OAuth does not work in Expo Go because the auth proxy service was discontinued.\n\n' +
        'To test Google Sign-In, you need to create a development build:\n\n' +
        '1. Run: npx eas build --profile development --platform android\n' +
        '2. Install the generated APK on your device\n' +
        '3. Run: npx expo start --dev-client\n\n' +
        'For now, you can use the email OTP login option below.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!request) {
      Alert.alert('Not Ready', 'Google Sign-In is still loading. Please try again.');
      return;
    }
    try {
      const result = await promptAsync();
      console.log('promptAsync result:', result);
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'Failed to open Google Sign-In');
    }
  };

  const handleSendCode = () => {
    if (email) {
      setShowOTP(true);
      // TODO: Send OTP to email via backend
      console.log('Sending OTP to:', email);
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      // TODO: Verify OTP via backend
      console.log('Verifying OTP:', otp);
      onSuccess({ email });
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
                style={[loginStyles.googleBtn, redirectUri.startsWith('exp://') && loginStyles.googleBtnDisabled]}
                onPress={handleGoogleLogin}
              >
                <Ionicons name="logo-google" size={20} color="#ffffff" />
                <Text style={loginStyles.googleBtnText}>
                  {redirectUri.startsWith('exp://') ? 'Google (requires dev build)' : 'Continue with Google'}
                </Text>
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
              <View style={loginStyles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color="#64748b" />
                <TextInput
                  style={loginStyles.input}
                  placeholder="000000"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={setOTP}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[loginStyles.primaryBtn, otp.length !== 6 && loginStyles.primaryBtnDisabled]}
                onPress={handleVerifyOTP}
                disabled={otp.length !== 6}
              >
                <Text style={loginStyles.primaryBtnText}>Verify & Login</Text>
              </TouchableOpacity>

              <TouchableOpacity style={loginStyles.backLink} onPress={() => setShowOTP(false)}>
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
});

// Main Screen (after login)
function MainScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <View style={mainStyles.container}>
      <View style={mainStyles.content}>
        <TechPulseLogo size="small" />
        <Text style={mainStyles.welcome}>Welcome!</Text>
        <Text style={mainStyles.email}>{user.email}</Text>
        {user.name && <Text style={mainStyles.name}>{user.name}</Text>}
      </View>
      <TouchableOpacity style={mainStyles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ffffff" />
        <Text style={mainStyles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const mainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  welcome: {
    fontSize: 28,
    color: '#ffffff',
    marginTop: 32,
  },
  email: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 8,
  },
  name: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ffffff',
  },
});

// Main App with simple navigation
export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'main'>('welcome');
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setScreen('main');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('welcome');
  };

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

      {screen === 'main' && user && (
        <MainScreen user={user} onLogout={handleLogout} />
      )}
    </View>
  );
}
