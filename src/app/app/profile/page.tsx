'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Button, Input, Avatar } from '@/components/ui';
import { Camera, Mail, Phone, MapPin, Building, Save, Gift, Copy, Check } from 'lucide-react';

export default function ProfilePage() {
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    shopName: 'Smith Auto Repair',
    address: '123 Main Street, Anytown, ST 12345',
    specialty: 'European Vehicles',
  });

  const referralCode = 'JOHN2024';
  const referralLink = `https://techpulse.com/ref/${referralCode}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    // Save profile
    console.log('Saving profile:', profile);
  };

  return (
    <AppLayout title="Profile" subtitle="Manage your account settings">
      <div className="max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar name={profile.name} size="xl" className="w-24 h-24 text-2xl" />
                <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                <p className="text-gray-500">{profile.shopName}</p>
                <p className="text-sm text-gray-400 mt-1">Member since January 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <Input
                label="Email Address"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                icon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Phone Number"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                icon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Shop Name"
                value={profile.shopName}
                onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
                icon={<Building className="w-4 h-4" />}
              />
            </div>
            <Input
              label="Address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              icon={<MapPin className="w-4 h-4" />}
            />
            <Input
              label="Specialty"
              value={profile.specialty}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
              placeholder="e.g., European Vehicles, Diesel Engines"
            />
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Referral Program</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Earn a free month for every referral!
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                When someone signs up using your referral code and becomes a paid subscriber,
                you&apos;ll both get one free month of TechPulse.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm">
                  {referralLink}
                </div>
                <Button onClick={handleCopyReferral} variant="outline">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-500">Total Referrals</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">2</p>
                <p className="text-sm text-gray-500">Successful</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">$700</p>
                <p className="text-sm text-gray-500">Total Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Email notifications', description: 'Receive updates via email' },
              { label: 'Push notifications', description: 'Receive push notifications on your device' },
              { label: 'Ticket updates', description: 'Get notified when your tickets are updated' },
              { label: 'Community replies', description: 'Get notified when someone replies to your posts' },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900">{pref.label}</p>
                  <p className="text-sm text-gray-500">{pref.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
