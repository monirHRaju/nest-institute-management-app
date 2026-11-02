'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  Palette,
  Shield,
  CreditCard,
  Save,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lock,
  User,
  Sparkles,
  Check,
  Eye,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import type { TenantSettingsResponse, TenantThemeConfig } from '@repo/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type SettingsTab = 'profile' | 'branding' | 'preferences' | 'security';

const PRESET_PALETTES = [
  { name: 'Ocean Blue', primary: '#2563eb', accent: '#f59e0b' },
  { name: 'Emerald Academy', primary: '#059669', accent: '#d97706' },
  { name: 'Modern Violet', primary: '#7c3aed', accent: '#ec4899' },
  { name: 'Ruby Tech', primary: '#dc2626', accent: '#2563eb' },
  { name: 'Slate Minimal', primary: '#0f172a', accent: '#3b82f6' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<SettingsTab>(isSuperAdmin ? 'security' : 'profile');

  // Form State for Institute Profile & Branding
  const [instituteName, setInstituteName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [website, setWebsite] = useState('');

  // Form State for User Account Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Form State for Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch Tenant Settings (for Tenant Admin/Staff)
  const { data: settingsRes, isLoading } = useQuery<{ data: TenantSettingsResponse }>({
    queryKey: ['tenant-settings'],
    queryFn: () => get('/tenants/settings'),
    enabled: !isSuperAdmin && !!user,
  });

  // Populate state when settings load
  useEffect(() => {
    if (settingsRes?.data) {
      const s = settingsRes.data;
      setInstituteName(s.name || '');
      const t = s.themeConfig || ({} as TenantThemeConfig);
      setPrimaryColor(t.primaryColor || '#2563eb');
      setAccentColor(t.accentColor || '#f59e0b');
      setLogoUrl(t.logoUrl || '');
      setBannerUrl(t.bannerUrl || '');
      setAboutText(t.aboutText || '');
      setContactPhone(t.contactPhone || '');
      setContactEmail(t.contactEmail || '');
      setAddress(t.address || '');
      setCurrencySymbol(t.currencySymbol || '৳');
      setWebsite(t.website || '');
    }
  }, [settingsRes]);

  // Populate user profile info
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  // Mutation: Update Tenant Settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: { name?: string; themeConfig: Partial<TenantThemeConfig> }) =>
      patch('/tenants/settings', data),
    onSuccess: () => {
      toast.success('Institute settings & theme updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    },
  });

  // Mutation: Update User Profile
  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; phone?: string }) =>
      patch('/auth/profile', data),
    onSuccess: () => {
      toast.success('Your profile details updated successfully');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  // Mutation: Change Password
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      patch('/auth/password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update password');
    },
  });

  const handleSaveInstituteSettings = () => {
    updateSettingsMutation.mutate({
      name: instituteName,
      themeConfig: {
        primaryColor,
        accentColor,
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        aboutText: aboutText.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        address: address.trim() || undefined,
        currencySymbol: currencySymbol.trim() || '৳',
        website: website.trim() || undefined,
      },
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last names are required');
      return;
    }
    updateProfileMutation.mutate({
      firstName,
      lastName,
      phone: phone.trim() || undefined,
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isSuperAdmin ? 'Platform Settings' : 'Institute Settings & Customization'}
        </h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Manage global super-admin security, credentials, and platform configurations.'
            : 'Configure your institute identity, public theme branding, currency, and account security.'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        {!isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Institute Profile
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'branding'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Palette className="h-4 w-4" />
              Branding & Appearance
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preferences'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Preferences
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-4 w-4" />
          Account & Security
        </button>
      </div>

      {/* TAB 1: INSTITUTE PROFILE */}
      {!isSuperAdmin && activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Institute Identity</CardTitle>
              <CardDescription>
                Public institutional details used across student receipts, reports, and public portals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inst-name">Institute Name</Label>
                  <Input
                    id="inst-name"
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="e.g. CodeCraft Professional Academy"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Portal Subdomain</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm font-mono text-muted-foreground">
                    {settingsRes?.data?.slug || 'your-institute'}.edumanage.com
                  </div>
                  <p className="text-xs text-muted-foreground">Unique tenant identifier subdomain.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="inst-phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Contact Phone
                  </Label>
                  <Input
                    id="inst-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+880 1700-000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inst-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Official Email
                  </Label>
                  <Input
                    id="inst-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@yourinstitute.edu"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="inst-address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Campus Address
                </Label>
                <Input
                  id="inst-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. House 42, Road 11, Banani, Dhaka - 1213"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="inst-about">About / Description</Label>
                <textarea
                  id="inst-about"
                  rows={3}
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  placeholder="A brief mission statement or description of your educational programs..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveInstituteSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: BRANDING & APPEARANCE */}
      {!isSuperAdmin && activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Color Controls */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Color Theme & Palette</CardTitle>
                  <CardDescription>
                    Customize the primary and secondary branding colors rendered across your institute portal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Preset quick-pick */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Quick Preset Palettes
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRESET_PALETTES.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(p.primary);
                            setAccentColor(p.accent);
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg border text-xs hover:border-primary transition-colors text-left"
                        >
                          <div className="flex -space-x-1">
                            <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.primary }} />
                            <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.accent }} />
                          </div>
                          <span className="font-medium truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom color pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="color-primary">Primary Brand Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="color-primary"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-12 rounded cursor-pointer border border-input p-1 bg-transparent"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#2563eb"
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used for headers, primary action buttons & active states.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color-accent">Accent Brand Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="color-accent"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-10 w-12 rounded cursor-pointer border border-input p-1 bg-transparent"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#f59e0b"
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used for highlights, badges, and secondary callouts.</p>
                    </div>
                  </div>

                  {/* Logo & Banner URLs */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="logo-url">Logo Image URL</Label>
                      <Input
                        id="logo-url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                      <p className="text-xs text-muted-foreground">Direct link to your institute logo (PNG or SVG recommended).</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner-url">Header Banner Image URL</Label>
                      <Input
                        id="banner-url"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                      />
                      <p className="text-xs text-muted-foreground">Header background banner for public admission & receipt headers.</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveInstituteSettings}
                      disabled={updateSettingsMutation.isPending}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateSettingsMutation.isPending ? 'Saving...' : 'Apply Theme Branding'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Brand Preview Card */}
            <div>
              <Card className="sticky top-6 border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-primary" />
                    Live Brand Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time preview of how your theme renders in the UI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Mock Portal Header */}
                  <div
                    className="p-4 rounded-lg text-white space-y-2 shadow-inner"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="flex items-center gap-2">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-6 w-6 rounded object-contain bg-white/20 p-0.5" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                      <span className="font-bold text-sm truncate">{instituteName || 'Your Institute'}</span>
                    </div>
                    <p className="text-[11px] opacity-90 line-clamp-2">
                      {aboutText || 'Empowering learners with modern education.'}
                    </p>
                    <div className="pt-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: accentColor, color: '#ffffff' }}
                      >
                        Enrolling Now
                      </span>
                    </div>
                  </div>

                  {/* Mock Components */}
                  <div className="space-y-2 p-3 bg-muted/40 rounded-lg">
                    <span className="text-[11px] font-medium text-muted-foreground block">Buttons & UI Chips</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded text-xs font-semibold text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary Action
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded text-xs font-semibold border"
                        style={{ borderColor: accentColor, color: accentColor }}
                      >
                        Accent Action
                      </button>
                    </div>
                  </div>

                  {/* Currency Preview */}
                  <div className="p-3 border rounded-lg flex justify-between items-center">
                    <span className="text-muted-foreground">Standard Tuition Fee:</span>
                    <span className="font-bold font-mono text-sm" style={{ color: primaryColor }}>
                      {currencySymbol} 15,000
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC & BILLING PREFERENCES */}
      {!isSuperAdmin && activeTab === 'preferences' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Localization & Billing Settings</CardTitle>
              <CardDescription>
                Define default currencies, online links, and automated receipt formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pref-currency">Default Currency Symbol</Label>
                  <select
                    id="pref-currency"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="৳">৳ (Bangladeshi Taka - BDT)</option>
                    <option value="$">$ (US Dollar - USD)</option>
                    <option value="₹">₹ (Indian Rupee - INR)</option>
                    <option value="€">€ (Euro - EUR)</option>
                    <option value="£">£ (British Pound - GBP)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Displayed on fee invoices, payment receipts, and reports.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pref-website" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Institute Website URL
                  </Label>
                  <Input
                    id="pref-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.yourinstitute.edu"
                  />
                  <p className="text-xs text-muted-foreground">Displayed on printable student receipts for quick access.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveInstituteSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: ACCOUNT & SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Personal Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal Profile Details
              </CardTitle>
              <CardDescription>
                Update your administrative account contact details and display name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user?.email || ''} disabled className="bg-muted text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Email is tied to your login identity.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-phone">Phone Number</Label>
                    <Input
                      id="user-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1711-223344"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Account Password
              </CardTitle>
              <CardDescription>
                Update your login password to maintain high platform security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-pwd">Current Password</Label>
                  <Input
                    id="current-pwd"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-pwd">New Password</Label>
                  <Input
                    id="new-pwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                  <Input
                    id="confirm-pwd"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={changePasswordMutation.isPending}
                    className="gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
