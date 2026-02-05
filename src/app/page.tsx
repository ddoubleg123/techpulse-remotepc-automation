import Link from 'next/link';
import {
  Zap,
  MessageSquare,
  Ticket,
  FileText,
  Users,
  Shield,
  ChevronRight,
  Check,
  Star,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Synth AI Assistant',
    description: 'Get instant, accurate answers to diagnostic questions with our AI-powered chat assistant trained on automotive repair data.',
  },
  {
    icon: Ticket,
    title: 'Smart Ticket System',
    description: 'Automated queue with AI triage and human support escalation. Get help when you need it most.',
  },
  {
    icon: FileText,
    title: 'Unlimited Report Storage',
    description: 'Upload and store diagnostic reports indefinitely. Access your data from anywhere, anytime.',
  },
  {
    icon: Users,
    title: 'Mechanic Community',
    description: 'Connect with fellow professionals. Share knowledge in forums and direct messages.',
  },
  {
    icon: MessageSquare,
    title: 'Text & Audio Chat',
    description: 'Communicate with Synth via text or voice. Perfect for when your hands are dirty.',
  },
  {
    icon: Shield,
    title: 'Data Privacy',
    description: 'Your data is never used for AI training. Enterprise-grade security and privacy protection.',
  },
];

const testimonials = [
  {
    name: 'Mike Thompson',
    role: 'Shop Owner, Thompson Auto',
    content: 'TechPulse has cut my diagnostic time in half. Synth catches things I might have missed and explains the reasoning.',
    rating: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Master Technician',
    content: 'The community aspect is great. I can bounce ideas off other mechanics and get answers fast.',
    rating: 5,
  },
  {
    name: 'Carlos Rodriguez',
    role: 'Fleet Manager',
    content: 'Managing repairs across 50 vehicles is so much easier now. The reporting features are invaluable.',
    rating: 5,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TechPulse</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Automotive Diagnostics
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your AI Partner for<br />
            <span className="text-blue-600">Smarter Repairs</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            TechPulse combines AI assistance, expert support, and a community of mechanics
            to help you diagnose faster, fix better, and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/app/chat"
              className="bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
            >
              Try Synth Demo
            </Link>
          </div>
          <p className="text-gray-500 mt-4">
            1 month free trial - $350/month after - Cancel anytime
          </p>
        </div>

        {/* Hero Image/Demo */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                  <p className="text-gray-200">Hi! I&apos;m Synth, your AI automotive assistant. What are you working on today?</p>
                </div>
              </div>
              <div className="flex gap-4 justify-end">
                <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 max-w-lg">
                  <p className="text-white">2018 Honda Accord, P0300 random misfire code. Where should I start?</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                  <p className="text-gray-200">Great question! P0300 indicates random/multiple cylinder misfires. For a 2018 Accord, here&apos;s my diagnostic approach...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to diagnose smarter
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              TechPulse combines cutting-edge AI with practical tools built by mechanics, for mechanics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              One plan with everything included. No hidden fees.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">TechPulse Pro</h3>
                <p className="text-gray-600">Full access to all features</p>
              </div>
              <div className="text-center md:text-right mt-4 md:mt-0">
                <div className="flex items-baseline justify-center md:justify-end gap-1">
                  <span className="text-5xl font-bold text-gray-900">$350</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-green-600 font-medium">1 month free trial</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                'Unlimited Synth AI chat',
                'Text & audio support',
                'Priority ticket support',
                'Unlimited PDF storage',
                'Community access',
                'Mobile apps (iOS & Android)',
                'Direct messaging',
                'Referral rewards',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/auth/signup"
              className="block w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg text-center hover:bg-blue-700 transition-colors"
            >
              Start Your Free Trial
            </Link>
            <p className="text-center text-gray-500 mt-4 text-sm">
              No credit card required to start. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by mechanics everywhere
            </h2>
            <p className="text-xl text-gray-600">
              See what our community is saying about TechPulse.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">&quot;{testimonial.content}&quot;</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to work smarter?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of mechanics using TechPulse to diagnose faster and fix better.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors"
          >
            Start Your Free Trial
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TechPulse</span>
              </div>
              <p className="text-sm">
                AI-powered automotive diagnostics for professional mechanics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="/app" className="hover:text-white">Web App</a></li>
                <li><a href="#" className="hover:text-white">Mobile Apps</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} TechPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
