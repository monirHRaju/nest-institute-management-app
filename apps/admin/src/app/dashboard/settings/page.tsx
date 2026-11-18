'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  MessageSquare,
  Palette,
  RefreshCw,
  Save,
  Send,
  Wallet,
} from 'lucide-react';

const EVENT_LABELS: Array<{ key: string; label: string; desc: string }> = [
  {
    key: 'ADMISSION_RECEIVED',
    label: 'Admission Application Received',
    desc: 'Send SMS to applicant (and Admin Phone) when a public application is submitted',
  },
  {
    key: 'ADMISSION_APPROVED',
    label: 'Admission Approved',
    desc: 'Send SMS to student/guardian when their admission is approved',
  },
  {
    key: 'FEE_INVOICE_CREATED',
    label: 'Fee Invoice Issued',
    desc: 'Notify student/guardian when a new fee invoice is generated',
  },
  {
    key: 'FEE_PAYMENT_RECEIVED',
    label: 'Fee Payment Receipt',
    desc: 'Send payment confirmation SMS when fee payment is recorded',
  },
  {
    key: 'FEE_OVERDUE_REMINDER',
    label: 'Overdue Fee Reminder',
    desc: 'Allow overdue fee reminder SMS via BulkSMSBD',
  },
  {
    key: 'ATTENDANCE_ABSENT',
    label: 'Student Marked Absent',
    desc: 'Send alert SMS to guardian when a student is marked ABSENT',
  },
  {
    key: 'EXAM_RESULT_PUBLISHED',
    label: 'Exam Result Published',
    desc: 'Send marks & grade SMS to student/guardian when an exam is published',
  },
  {
    key: 'PAYROLL_PAID',
    label: 'Staff Salary Paid',
    desc: 'Notify instructor/staff when monthly payroll is disbursed',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState<'sms' | 'branding'>('sms');

  // SMS Settings State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [senderId, setSenderId] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [enabledEvents, setEnabledEvents] = useState<Record<string, boolean>>({});
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');

  // Branding State
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    primaryColor: '#2563eb',
    accentColor: '#f59e0b',
    logoUrl: '',
    bannerUrl: '',
    tagline: '',
    heroHeading: '',
    aboutText: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    facebookUrl: '',
    youtubeUrl: '',
    showCourses: true,
    showAdmission: true,
    showResults: true,
  });

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ['sms-settings'],
    queryFn: () => get('/sms/settings'),
    enabled: !isSuperAdmin,
  });

  const { data: branding } = useQuery<any>({
    queryKey: ['tenant-branding'],
    queryFn: () => get('/tenants/me/branding'),
    enabled: !isSuperAdmin,
  });

  useEffect(() => {
    if (!settings) return;
    setSenderId(settings.senderId || '');
    setAdminPhone(settings.adminPhone || '');
    setIsEnabled(Boolean(settings.isEnabled));
    setEnabledEvents(settings.enabledEvents || {});
  }, [settings]);

  useEffect(() => {
    if (!branding) return;
    const tc = branding.themeConfig || {};
    setBrandingForm({
      name: branding.name || '',
      primaryColor: tc.primaryColor || '#2563eb',
      accentColor: tc.accentColor || '#f59e0b',
      logoUrl: tc.logoUrl || '',
      bannerUrl: tc.bannerUrl || '',
      tagline: tc.tagline || '',
      heroHeading: tc.heroHeading || '',
      aboutText: tc.aboutText || '',
      contactPhone: tc.contactPhone || '',
      contactEmail: tc.contactEmail || '',
      address: tc.address || '',
      facebookUrl: tc.facebookUrl || '',
      youtubeUrl: tc.youtubeUrl || '',
      showCourses: tc.showCourses !== false,
      showAdmission: tc.showAdmission !== false,
      showResults: tc.showResults !== false,
    });
  }, [branding]);

  const saveSmsMutation = useMutation({
    mutationFn: (payload: any) => put('/sms/settings', payload),
    onSuccess: () => {
      toast.success('SMS gateway settings saved');
      setApiKeyInput('');
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: (payload: any) => put('/tenants/me/branding', payload),
    onSuccess: () => {
      toast.success('Institute branding & public website theme updated');
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update branding');
    },
  });

  const balanceMutation = useMutation({
    mutationFn: () => get<any>('/sms/balance'),
    onSuccess: (res) => {
      toast.success(`Current BulkSMSBD Balance: ${res.balance}`);
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Balance check failed');
    },
  });

  const testSmsMutation = useMutation({
    mutationFn: () =>
      post<any>('/sms/test', {
        phone: testPhone.trim() || undefined,
        message: testMessage.trim() || undefined,
      }),
    onSuccess: (res) => {
      if (res.sent) {
        toast.success(`Test SMS sent (${res.providerCode}: ${res.providerResponse})`);
      } else {
        toast.error(
          `Gateway returned ${res.providerCode || res.status}: ${
            res.providerResponse || res.reason
          }`,
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to send test SMS');
    },
  });

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Super Admin Platform Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Each institute manages its own BulkSMSBD API key and public website branding from its Tenant Admin dashboard.
            </p>
            <Button asChild>
              <Link href="/dashboard/tenants">Go to Institutes Hub</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading institute settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Institute Settings &amp; Branding
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your dedicated BulkSMSBD gateway and customize your public institute website.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            Open SMS Hub (Broadcast, Templates &amp; Logs)
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          size="sm"
          variant={tab === 'sms' ? 'default' : 'ghost'}
          onClick={() => setTab('sms')}
        >
          <KeyRound className="h-4 w-4 mr-1.5" />
          SMS Gateway (BulkSMSBD)
        </Button>
        <Button
          size="sm"
          variant={tab === 'branding' ? 'default' : 'ghost'}
          onClick={() => setTab('branding')}
        >
          <Palette className="h-4 w-4 mr-1.5" />
          Branding &amp; Public Website
        </Button>
      </div>

      {tab === 'sms' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                BulkSMSBD Credentials (Per-Tenant)
              </CardTitle>
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Gateway Enabled' : 'Gateway Disabled'}
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSmsMutation.mutate({
                    apiKey: apiKeyInput.trim() || undefined,
                    senderId: senderId.trim() || null,
                    adminPhone: adminPhone.trim() || null,
                    isEnabled,
                    enabledEvents,
                  });
                }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <div className="font-medium text-sm">Enable Automated SMS</div>
                    <div className="text-xs text-muted-foreground">
                      Turn on to allow automatic SMS dispatch using your BulkSMSBD account
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>BulkSMSBD API Key (`api_key`)</Label>
                      {settings?.hasApiKey && (
                        <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved ({settings.apiKeyHint})
                        </span>
                      )}
                    </div>
                    <Input
                      type="password"
                      placeholder={
                        settings?.hasApiKey
                          ? `Leave blank to keep existing key (${settings.apiKeyHint})`
                          : 'Paste your BulkSMSBD api_key here'
                      }
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Stored encrypted with AES-256-GCM. Get your key from{' '}
                      <a
                        href="https://bulksmsbd.net/developers"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline inline-flex items-center gap-0.5"
                      >
                        bulksmsbd.net/developers <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>

                  <div>
                    <Label>Sender ID (`senderid`)</Label>
                    <Input
                      placeholder="e.g. 8809617611XXX or Masking ID"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Admin Phone Number</Label>
                    <Input
                      placeholder="e.g. 017XXXXXXXX"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3">
                    Automatic Event Triggers
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EVENT_LABELS.map((ev) => (
                      <label
                        key={ev.key}
                        className="flex items-start gap-2.5 border rounded-md p-3 cursor-pointer hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(enabledEvents[ev.key])}
                          onChange={(e) =>
                            setEnabledEvents({
                              ...enabledEvents,
                              [ev.key]: e.target.checked,
                            })
                          }
                        />
                        <div className="text-xs">
                          <div className="font-semibold">{ev.label}</div>
                          <div className="text-muted-foreground mt-0.5">{ev.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saveSmsMutation.isPending}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {saveSmsMutation.isPending ? 'Saving...' : 'Save SMS Settings'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  BulkSMSBD Credit Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Last Known Balance</div>
                  <div className="text-2xl font-bold mt-1">
                    {settings?.lastBalance !== null && settings?.lastBalance !== undefined
                      ? `৳${settings.lastBalance}`
                      : 'Not checked'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => balanceMutation.mutate()}
                  disabled={balanceMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {balanceMutation.isPending ? 'Checking...' : 'Check Live Balance'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Send Test SMS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div>
                  <Label className="text-xs">Recipient Phone (optional)</Label>
                  <Input
                    placeholder={adminPhone || '017XXXXXXXX'}
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Message (optional)</Label>
                  <Input
                    placeholder="Test SMS from our institute..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => testSmsMutation.mutate()}
                  disabled={testSmsMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {testSmsMutation.isPending ? 'Sending...' : 'Send Test SMS'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Institute Branding &amp; Public Portal Customizer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveBrandingMutation.mutate(brandingForm);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Institute Display Name</Label>
                    <Input
                      value={brandingForm.name}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Tagline / Subtitle</Label>
                    <Input
                      placeholder="e.g. Excellence in IT & Career Training"
                      value={brandingForm.tagline}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, tagline: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Brand Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        className="h-10 w-12 rounded border cursor-pointer"
                        value={brandingForm.primaryColor}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            primaryColor: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={brandingForm.primaryColor}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            primaryColor: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        className="h-10 w-12 rounded border cursor-pointer"
                        value={brandingForm.accentColor}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            accentColor: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={brandingForm.accentColor}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            accentColor: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={brandingForm.logoUrl}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, logoUrl: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Hero Banner URL</Label>
                    <Input
                      placeholder="https://example.com/banner.jpg"
                      value={brandingForm.bannerUrl}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, bannerUrl: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>About Institute</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm mt-1"
                    value={brandingForm.aboutText}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, aboutText: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={brandingForm.contactPhone}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          contactPhone: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={brandingForm.contactEmail}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          contactEmail: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={brandingForm.address}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, address: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 border-t pt-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={brandingForm.showCourses}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          showCourses: e.target.checked,
                        })
                      }
                    />
                    Show Courses Catalog
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={brandingForm.showAdmission}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          showAdmission: e.target.checked,
                        })
                      }
                    />
                    Show Online Admission Form
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={brandingForm.showResults}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          showResults: e.target.checked,
                        })
                      }
                    />
                    Show Public Result Lookup
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saveBrandingMutation.isPending}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {saveBrandingMutation.isPending ? 'Saving...' : 'Save Branding'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Live Brand Preview Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Live Public Site Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div
                className="rounded-lg p-5 text-white space-y-2"
                style={{ backgroundColor: brandingForm.primaryColor || '#2563eb' }}
              >
                <div className="text-lg font-bold">
                  {brandingForm.name || 'Your Institute'}
                </div>
                {brandingForm.tagline && (
                  <div className="text-xs opacity-90">{brandingForm.tagline}</div>
                )}
                <p className="text-xs opacity-85 line-clamp-3">
                  {brandingForm.aboutText ||
                    'Empowering students with modern education and professional training.'}
                </p>
                <div className="pt-2">
                  <span
                    className="inline-block text-xs font-semibold px-3 py-1 rounded text-white"
                    style={{ backgroundColor: brandingForm.accentColor || '#f59e0b' }}
                  >
                    Apply Now
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <strong>Subdomain:</strong> {branding?.slug || 'institute'}
                </div>
                {brandingForm.contactPhone && (
                  <div>
                    <strong>Phone:</strong> {brandingForm.contactPhone}
                  </div>
                )}
                {brandingForm.address && (
                  <div>
                    <strong>Address:</strong> {brandingForm.address}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
