'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Phone, User } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAccount = async () => {
    if (!name || !email) { setError('Please enter your name and email'); return; }
    setIsLoading(true); setError('');
    try {
      // Real Supabase email OTP. create_user:true registers the account; the
      // full_name is passed as user metadata so the handle_new_user trigger can
      // populate it. Onboarding (shop assignment) happens after first sign-in.
      const res = await fetch(SUPABASE_URL + '/auth/v1/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, create_user: true, data: { full_name: name, phone } }),
      });
      if (res.ok) { setStep('verify'); }
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.msg || d.error_description || 'Could not send verification code');
      }
    } catch { setError('Network error — please try again'); } finally { setIsLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true); setError('');
    try {
      const res = await fetch(SUPABASE_URL + '/auth/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ type: 'email', email, token: otp }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.access_token) {
        let uid = '1';
        try { uid = JSON.parse(atob(d.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || '1'; } catch { /* ignore */ }
        if (d.refresh_token) { try { localStorage.setItem('supabase-refresh-token', d.refresh_token); } catch { /* ignore */ } }
        try { document.cookie = `tp_at=${d.access_token}; Path=/; SameSite=Lax; Secure`; } catch { /* ignore */ }
        signIn({ id: uid, email, name: name || email.split('@')[0], hasPaymentMethodOnFile: false }, d.access_token);
        router.push('/app');
      } else {
        setError(d.msg || d.error_description || 'Invalid code');
      }
    } catch { setError('Network error — please try again'); } finally { setIsLoading(false); }
  };

  const handleGoogleSignup = () => {
    window.location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(window.location.origin + '/app/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white">TechPulse</span>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Create your account
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Start your free 1-month trial today
            </p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {step === 'info' ? (
              <>
                {/* Google OAuth Button */}
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  onClick={handleGoogleSignup}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or sign up with email</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Full name"
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <Input
                    label="Phone number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <Input
                    label="Referral code (optional)"
                    type="text"
                    placeholder="XXXXXX"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  />
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleCreateAccount}
                  isLoading={isLoading}
                  disabled={!name || !email || !phone}
                >
                  Create account
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </>
            ) : (
              <>
                <Input
                  label="Verification code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
                <p className="text-sm text-gray-500 mt-2">
                  We sent a code to {email}
                </p>
                <Button
                  className="w-full mt-4"
                  onClick={handleVerifyOTP}
                  isLoading={isLoading}
                  disabled={otp.length !== 6}
                >
                  Verify & Continue
                </Button>
                <button
                  onClick={() => setStep('info')}
                  className="w-full mt-2 text-sm text-blue-600 hover:underline"
                >
                  Go back
                </button>
              </>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Trial Info */}
        <div className="text-center mt-6 text-white">
          <p className="text-sm">
            <span className="text-green-400">✓</span> 1 month free trial
          </p>
          <p className="text-sm">
            <span className="text-green-400">✓</span> $350/month after trial
          </p>
          <p className="text-sm">
            <span className="text-green-400">✓</span> Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
