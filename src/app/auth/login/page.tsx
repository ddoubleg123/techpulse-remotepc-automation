'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Phone } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setOtpSent(true);
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push('/app');
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    router.push('/app');
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
              Welcome back
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Sign in to access your account
            </p>

            {/* Google OAuth Button */}
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogleLogin}
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
              Continue with Google
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Auth Method Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setAuthMethod('email');
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  authMethod === 'email'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </button>
              <button
                onClick={() => {
                  setAuthMethod('phone');
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  authMethod === 'phone'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </button>
            </div>

            {!otpSent ? (
              <>
                {authMethod === 'email' ? (
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                ) : (
                  <Input
                    label="Phone number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                )}
                <Button
                  className="w-full mt-4"
                  onClick={handleSendOTP}
                  isLoading={isLoading}
                  disabled={authMethod === 'email' ? !email : !phone}
                >
                  Send verification code
                </Button>
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
                  Code sent to {authMethod === 'email' ? email : phone}
                </p>
                <Button
                  className="w-full mt-4"
                  onClick={handleVerifyOTP}
                  isLoading={isLoading}
                  disabled={otp.length !== 6}
                >
                  Verify & Sign in
                </Button>
                <button
                  onClick={() => setOtpSent(false)}
                  className="w-full mt-2 text-sm text-blue-600 hover:underline"
                >
                  Use different {authMethod}
                </button>
              </>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is protected. We never store passwords.
        </p>
      </div>
    </div>
  );
}
