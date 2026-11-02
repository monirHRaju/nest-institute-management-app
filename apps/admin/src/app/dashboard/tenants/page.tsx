'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import {
  Building2,
  Users,
  BookOpen,
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Edit,
  Power,
  ChevronRight,
  TrendingUp,
  Layers,
} from 'lucide-react';
import type { SuperAdminTenantRecord, PaginatedResponse } from '@repo/shared';
import { TenantStatus, TenantPlan } from '@repo/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SuperAdminTenantsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');

  // Modals
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<SuperAdminTenantRecord | null>(null);

  // Onboarding Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<TenantPlan>(TenantPlan.FREE);
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Edit Tenant Form State
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<TenantStatus>(TenantStatus.ACTIVE);
  const [editPlan, setEditPlan] = useState<TenantPlan>(TenantPlan.FREE);

  // Auto-slug generator
  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewTenantSlug(slug);
  };

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('limit', '50');
  if (searchTerm) queryParams.set('search', searchTerm);
  if (statusFilter) queryParams.set('status', statusFilter);
  const queryString = `?${queryParams.toString()}`;

  // Query: Fetch Tenants
  const { data: tenantsRes, isLoading: tenantsLoading } = useQuery<PaginatedResponse<SuperAdminTenantRecord>>({
    queryKey: ['super-admin-tenants', searchTerm, statusFilter],
    queryFn: () => get(`/tenants${queryString}`),
    enabled: isSuperAdmin,
  });

  const tenants = tenantsRes?.data || [];

  // Filter client-side by plan if selected
  const filteredTenants = tenants.filter((t) => {
    if (planFilter && t.plan !== planFilter) return false;
    return true;
  });

  // KPI Calculations
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
  const trialCount = tenants.filter((t) => t.status === TenantStatus.TRIAL).length;
  const suspendedCount = tenants.filter((t) => t.status === TenantStatus.SUSPENDED).length;
  const totalStudents = tenants.reduce((acc, t) => acc + (t._count?.students || 0), 0);

  // Mutation: Create Tenant
  const createTenantMutation = useMutation({
    mutationFn: (data: any) => post('/tenants', data),
    onSuccess: () => {
      toast.success('Institute onboarded successfully with owner credentials');
      setIsOnboardOpen(false);
      resetOnboardForm();
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to onboard institute');
    },
  });

  // Mutation: Update Tenant Plan & Status
  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => patch(`/tenants/${id}`, data),
    onSuccess: () => {
      toast.success('Institute updated successfully');
      setIsEditOpen(false);
      setEditingTenant(null);
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update institute');
    },
  });

  // Mutation: Suspend / Toggle
  const toggleSuspendMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: TenantStatus }) => {
      const nextStatus = currentStatus === TenantStatus.SUSPENDED ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED;
      return patch(`/tenants/${id}`, { status: nextStatus });
    },
    onSuccess: (_, variables) => {
      const msg = variables.currentStatus === TenantStatus.SUSPENDED ? 'Institute activated' : 'Institute suspended';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Action failed');
    },
  });

  const resetOnboardForm = () => {
    setNewTenantName('');
    setNewTenantSlug('');
    setNewTenantPlan(TenantPlan.FREE);
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerEmail('');
    setOwnerPassword('');
  };

  const handleOpenEdit = (t: SuperAdminTenantRecord) => {
    setEditingTenant(t);
    setEditName(t.name);
    setEditStatus(t.status);
    setEditPlan(t.plan);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    updateTenantMutation.mutate({
      id: editingTenant.id,
      data: {
        name: editName,
        status: editStatus,
        plan: editPlan,
      },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !ownerEmail || !ownerPassword) {
      toast.error('All fields are required');
      return;
    }
    createTenantMutation.mutate({
      name: newTenantName,
      slug: newTenantSlug,
      ownerEmail,
      ownerPassword,
      ownerFirstName,
      ownerLastName,
    });
  };

  // Access Guard
  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm">
          The Tenants Management Hub is restricted to platform Super Administrators. Please contact system support.
        </p>
        <Button asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutes & Tenants Hub</h1>
          <p className="text-muted-foreground">
            Multi-tenant governance, institute provisioning, subscription plan assignments, and status controls.
          </p>
        </div>
        <Button onClick={() => setIsOnboardOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Onboard Institute
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Institutes</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform tenant accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Fully operational institutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Accounts</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{trialCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Evaluating the platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{suspendedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Access paused / inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled across all institutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by institute name or subdomain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Plans</option>
                <option value="FREE">Free</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="p-3">Institute</th>
                  <th className="p-3">Subscription</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Metrics</th>
                  <th className="p-3">Primary Administrator</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantsLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading institutes directory...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No institute accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const isSuspended = t.status === TenantStatus.SUSPENDED;
                    return (
                      <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{t.name}</div>
                          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <span>{t.slug}.edumanage.com</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              t.plan === TenantPlan.PRO
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 font-bold'
                                : t.plan === TenantPlan.BASIC
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-secondary text-secondary-foreground'
                            }
                          >
                            {t.plan}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              t.status === TenantStatus.ACTIVE
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.status === TenantStatus.TRIAL
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200 font-semibold'
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-3 text-xs">
                            <span title="Students" className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {t._count?.students || 0}
                            </span>
                            <span title="Batches" className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {t._count?.batches || 0}
                            </span>
                            <span title="Courses" className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              {t._count?.courses || 0}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-xs">
                          {t.owner ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {t.owner.firstName} {t.owner.lastName}
                              </div>
                              <div className="text-muted-foreground">{t.owner.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None assigned</span>
                          )}
                        </td>

                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleOpenEdit(t)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              variant={isSuspended ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 text-xs gap-1 ${
                                isSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'text-destructive hover:bg-destructive/10'
                              }`}
                              disabled={toggleSuspendMutation.isPending}
                              onClick={() => toggleSuspendMutation.mutate({ id: t.id, currentStatus: t.status })}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {isSuspended ? 'Activate' : 'Suspend'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: ONBOARD NEW INSTITUTE */}
      <Dialog open={isOnboardOpen} onOpenChange={setIsOnboardOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Onboard New Tenant Institute
            </DialogTitle>
            <DialogDescription>
              Create an institute workspace, allocate their subdomain, and provision the first administrator account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Institute Identity */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Institute Information
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-name">Institute Name</Label>
                <Input
                  id="create-name"
                  value={newTenantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. CodeCraft Professional Academy"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-slug">Subdomain Slug</Label>
                  <Input
                    id="create-slug"
                    value={newTenantSlug}
                    onChange={(e) => setNewTenantSlug(e.target.value)}
                    placeholder="codecraft-academy"
                    required
                  />
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {newTenantSlug || 'slug'}.edumanage.com
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-plan">Subscription Plan</Label>
                  <select
                    id="create-plan"
                    value={newTenantPlan}
                    onChange={(e) => setNewTenantPlan(e.target.value as TenantPlan)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="FREE">Free Tier (Standard)</option>
                    <option value="BASIC">Basic Growth Plan</option>
                    <option value="PRO">Pro Enterprise Plan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Owner Credentials */}
            <div className="space-y-3 pt-3 border-t">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                First Administrator Account (TENANT_ADMIN)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-fn">Admin First Name</Label>
                  <Input
                    id="owner-fn"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-ln">Admin Last Name</Label>
                  <Input
                    id="owner-ln"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Admin Email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="admin@institute.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-pwd">Initial Password</Label>
                  <Input
                    id="owner-pwd"
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOnboardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTenantMutation.isPending} className="gap-2">
                <Building2 className="h-4 w-4" />
                {createTenantMutation.isPending ? 'Provisioning...' : 'Provision Institute'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT TENANT PLAN & STATUS */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Institute Account
            </DialogTitle>
            <DialogDescription>
              Adjust organizational name, account operational status, or subscription tier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Institute Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Operational Status</Label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TenantStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="TRIAL">TRIAL (Evaluation)</option>
                <option value="SUSPENDED">SUSPENDED (Access Disabled)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan">Subscription Tier Plan</Label>
              <select
                id="edit-plan"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as TenantPlan)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="FREE">FREE Tier</option>
                <option value="BASIC">BASIC Plan</option>
                <option value="PRO">PRO Enterprise Plan</option>
              </select>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTenantMutation.isPending}>
                {updateTenantMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
