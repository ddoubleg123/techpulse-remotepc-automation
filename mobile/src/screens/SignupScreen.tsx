import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

export default function SignupScreen() {
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otp, setOTP] = useState('');

  const handleCreateAccount = () => {
    setStep('verify');
  };

  const handleVerify = () => {
    // TODO: Implement verification
  };

  const handleGoogleSignup = () => {
    // TODO: Implement Google OAuth
  };

  const isFormValid = name && email && phone;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="flash" size={40} color={colors.white} />
            </View>
            <Text style={styles.logoText}>TechPulse</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your free 1-month trial</Text>

            {step === 'info' ? (
              <>
                {/* Google Signup */}
                <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup}>
                  <Ionicons name="logo-google" size={20} color={colors.text} />
                  <Text style={styles.googleBtnText}>Sign up with Google</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Referral Code Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="gift-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Referral code (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={referralCode}
                    onChangeText={(text) => setReferralCode(text.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, !isFormValid && styles.primaryBtnDisabled]}
                  onPress={handleCreateAccount}
                  disabled={!isFormValid}
                >
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                </TouchableOpacity>

                <Text style={styles.terms}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.otpInfo}>
                  We sent a verification code to{'\n'}
                  <Text style={styles.otpEmail}>{email}</Text>
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="keypad-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.textMuted}
                    value={otp}
                    onChangeText={setOTP}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, otp.length !== 6 && styles.primaryBtnDisabled]}
                  onPress={handleVerify}
                  disabled={otp.length !== 6}
                >
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep('info')}
                >
                  <Text style={styles.backBtnText}>Go back</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Trial Info */}
            <View style={styles.trialInfo}>
              <View style={styles.trialItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.trialText}>1 month free trial</Text>
              </View>
              <View style={styles.trialItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.trialText}>$350/month after trial</Text>
              </View>
              <View style={styles.trialItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.trialText}>Cancel anytime</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.white,
  },
  form: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.primary + '50',
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  terms: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
  },
  otpInfo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  otpEmail: {
    fontWeight: '600',
    color: colors.text,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  trialInfo: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  trialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trialText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
});
