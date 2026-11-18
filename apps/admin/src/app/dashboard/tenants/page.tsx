'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

export default function SuperAdminTenantsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['platform-tenant-stats'],
    queryFn: () => get('/tenants/stats'),
  });

  const { data: tenantsRes, isLoading } = useQuery<any>({
    queryKey: ['platform-tenants', search, statusFilter, planFilter],
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('limit', '100');
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter) qs.set('status', statusFilter);
      if (planFilter) qs.set('plan', planFilter);
      return get(`/tenants?${qs.toString()}`);
    },
  });

  const tenants: any[] = tenantsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/tenants', payload),
    onSuccess: () => {
      toast.success('Institute onboarded successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-stats'] });
      setShowCreateModal(false);
      setForm({
        name: '',
        slug: '',
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPassword: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to onboard institute');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      patch(`/tenants/${id}`, payload),
    onSuccess: () => {
      toast.success('Tenant updated');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update tenant');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Institutes Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Onboard coaching centers &amp; institutes, manage subscription plans, and control tenant access.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Onboard Institute
        </Button>
      </div>

      {/* Platform KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">
              Total Institutes
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats?.totalTenants ?? tenants.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.byStatus?.ACTIVE ?? 0} Active · {stats?.byStatus?.TRIAL ?? 0} Trial
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">
              Platform Students
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats?.totalStudents ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {stats?.totalCourses ?? 0} courses
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">
              SMS Dispatched (30d)
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats?.smsSent30d ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">
              Total Fee Volume
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              ৳{Number(stats?.totalPlatformRevenue || 0).toLocaleString('en-BD')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search institute by name or subdomain slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">All Plans</option>
            <option value="FREE">FREE</option>
            <option value="BASIC">BASIC</option>
            <option value="PRO">PRO</option>
          </select>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Institutes ({tenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading institutes...
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No institutes found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-2 font-medium">Institute</th>
                    <th className="py-3 px-2 font-medium">Slug / Subdomain</th>
                    <th className="py-3 px-2 font-medium">Users / Students</th>
                    <th className="py-3 px-2 font-medium">Plan</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium">Created</th>
                    <th className="py-3 px-2 font-medium text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/40">
                      <td className="py-3 px-2 font-semibold">{t.name}</td>
                      <td className="py-3 px-2 font-mono text-xs text-primary">
                        {t.slug}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.userCount} users · {t.studentCount ?? 0} students
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <select
                          className="h-8 rounded border border-input bg-background px-2 text-xs font-medium"
                          value={t.plan}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: t.id,
                              payload: { plan: e.target.value },
                            })
                          }
                        >
                          <option value="FREE">FREE</option>
                          <option value="BASIC">BASIC</option>
                          <option value="PRO">PRO</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={
                            t.status === 'ACTIVE'
                              ? 'default'
                              : t.status === 'SUSPENDED'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right space-x-1">
                        {t.status !== 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateMutation.mutate({
                                id: t.id,
                                payload: { status: 'ACTIVE' },
                              })
                            }
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Activate
                          </Button>
                        )}
                        {t.status !== 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() =>
                              updateMutation.mutate({
                                id: t.id,
                                payload: { status: 'SUSPENDED' },
                              })
                            }
                          >
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboard Institute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Onboard New Institute</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({
                    name: form.name.trim(),
                    slug: form.slug.trim().toLowerCase(),
                    ownerFirstName: form.ownerFirstName.trim(),
                    ownerLastName: form.ownerLastName.trim(),
                    ownerEmail: form.ownerEmail.trim(),
                    ownerPassword: form.ownerPassword,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Institute Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Apex Coaching"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Subdomain Slug *</Label>
                    <Input
                      required
                      placeholder="e.g. apex-coaching"
                      value={form.slug}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Owner First Name *</Label>
                    <Input
                      required
                      value={form.ownerFirstName}
                      onChange={(e) =>
                        setForm({ ...form, ownerFirstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Owner Last Name *</Label>
                    <Input
                      required
                      value={form.ownerLastName}
                      onChange={(e) =>
                        setForm({ ...form, ownerLastName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Owner Email *</Label>
                    <Input
                      type="email"
                      required
                      value={form.ownerEmail}
                      onChange={(e) =>
                        setForm({ ...form, ownerEmail: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Owner Password (min 8 chars) *</Label>
                    <Input
                      type="password"
                      minLength={8}
                      required
                      value={form.ownerPassword}
                      onChange={(e) =>
                        setForm({ ...form, ownerPassword: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Institute'}
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
