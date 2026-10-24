'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api';
import { toast } from 'sonner';
import {
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Plus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Award,
  CheckCircle2,
  XCircle,
  Edit,
  Clock,
  Eye,
} from 'lucide-react';
import type { InstructorProfileRecord, PaginatedResponse } from '@repo/shared';

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

export default function InstructorsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorProfileRecord | null>(null);
  const [viewBatchesInstructor, setViewBatchesInstructor] = useState<InstructorProfileRecord | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    specializationInput: '',
    qualification: '',
    joiningDate: new Date().toISOString().split('T')[0],
    bio: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    designation: '',
    specializationInput: '',
    qualification: '',
    joiningDate: '',
    bio: '',
    isActive: true,
    password: '',
  });

  // Fetch Instructors
  const { data: instructorsRes, isLoading } = useQuery<PaginatedResponse<InstructorProfileRecord>>({
    queryKey: ['instructors', search, activeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeFilter === 'ACTIVE') params.append('isActive', 'true');
      if (activeFilter === 'INACTIVE') params.append('isActive', 'false');
      return get<PaginatedResponse<InstructorProfileRecord>>(`/instructors?${params.toString()}`);
    },
  });

  const instructors = instructorsRes?.data || [];

  // Create Instructor Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/instructors', payload),
    onSuccess: () => {
      toast.success('Instructor registered successfully');
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setIsCreateOpen(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        designation: '',
        specializationInput: '',
        qualification: '',
        joiningDate: new Date().toISOString().split('T')[0],
        bio: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create instructor');
    },
  });

  // Update Instructor Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      patch(`/instructors/${id}`, payload),
    onSuccess: () => {
      toast.success('Instructor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update instructor');
    },
  });

  const handleOpenEdit = (inst: InstructorProfileRecord) => {
    setSelectedInstructor(inst);
    setEditForm({
      firstName: inst.firstName,
      lastName: inst.lastName,
      phone: inst.phone || '',
      designation: inst.designation || '',
      specializationInput: inst.specialization.join(', '),
      qualification: inst.qualification || '',
      joiningDate: inst.joiningDate ? new Date(inst.joiningDate).toISOString().split('T')[0] : '',
      bio: inst.bio || '',
      isActive: inst.isActive,
      password: '',
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const specializations = createForm.specializationInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    createMutation.mutate({
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      phone: createForm.phone.trim() || undefined,
      designation: createForm.designation.trim() || undefined,
      specialization: specializations,
      qualification: createForm.qualification.trim() || undefined,
      joiningDate: createForm.joiningDate ? new Date(createForm.joiningDate).toISOString() : undefined,
      bio: createForm.bio.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstructor) return;

    const specializations = editForm.specializationInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: any = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phone: editForm.phone.trim() || undefined,
      designation: editForm.designation.trim() || undefined,
      specialization: specializations,
      qualification: editForm.qualification.trim() || undefined,
      joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate).toISOString() : undefined,
      bio: editForm.bio.trim() || undefined,
      isActive: editForm.isActive,
    };

    if (editForm.password && editForm.password.length >= 6) {
      payload.password = editForm.password;
    }

    updateMutation.mutate({ id: selectedInstructor.id, payload });
  };

  // Aggregated KPI Stats
  const totalInstructors = instructors.length;
  const activeInstructors = instructors.filter((i) => i.isActive).length;
  const totalAssignedBatches = instructors.reduce((sum, i) => sum + (i._count?.instructorBatches || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faculty & Instructors</h1>
          <p className="text-muted-foreground text-sm">
            Manage teacher profiles, qualifications, class batch assignments, and teaching schedules.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Instructor
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstructors}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered teaching staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeInstructors}</div>
            <p className="text-xs text-muted-foreground mt-1">Active class assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Batches</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalAssignedBatches}</div>
            <p className="text-xs text-muted-foreground mt-1">Cohorts being instructed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Instructors Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Instructor</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Designation & Skills</th>
                  <th className="py-3 px-4 text-center font-medium text-muted-foreground">Assigned Batches</th>
                  <th className="py-3 px-4 text-center font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading faculty members...
                    </td>
                  </tr>
                ) : instructors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10">
                      <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="font-medium text-sm">No instructors found</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add your first teacher or instructor to assign them to batches.
                      </p>
                    </td>
                  </tr>
                ) : (
                  instructors.map((inst) => (
                    <tr key={inst.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-sm">
                          {inst.firstName} {inst.lastName}
                        </div>
                        {inst.qualification && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Award className="h-3 w-3 text-muted-foreground" />
                            {inst.qualification}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{inst.email}</span>
                        </div>
                        {inst.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{inst.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {inst.designation || 'Instructor'}
                        </div>
                        {inst.specialization && inst.specialization.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {inst.specialization.slice(0, 3).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {spec}
                              </Badge>
                            ))}
                            {inst.specialization.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{inst.specialization.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1.5"
                          onClick={() => setViewBatchesInstructor(inst)}
                        >
                          <Badge variant="outline" className="font-semibold">
                            {inst._count?.instructorBatches || 0} Batches
                          </Badge>
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inst.isActive ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 gap-1"
                          onClick={() => handleOpenEdit(inst)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal 1: Add Instructor */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Instructor</DialogTitle>
              <DialogDescription>
                Register an instructor account. They can login with their email and password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="instFirstName">First Name *</Label>
                  <Input
                    id="instFirstName"
                    placeholder="e.g. Tariqul"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instLastName">Last Name *</Label>
                  <Input
                    id="instLastName"
                    placeholder="e.g. Islam"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="instEmail">Email Address *</Label>
                  <Input
                    id="instEmail"
                    type="email"
                    placeholder="instructor@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instPassword">Login Password *</Label>
                  <Input
                    id="instPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="instPhone">Phone Number</Label>
                  <Input
                    id="instPhone"
                    placeholder="+8801712345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instDesignation">Designation</Label>
                  <Input
                    id="instDesignation"
                    placeholder="e.g. Lead Trainer"
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instSpec">Specializations (comma-separated)</Label>
                <Input
                  id="instSpec"
                  placeholder="e.g. React, Next.js, Node.js, TypeScript"
                  value={createForm.specializationInput}
                  onChange={(e) => setCreateForm({ ...createForm, specializationInput: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="instQual">Qualification</Label>
                  <Input
                    id="instQual"
                    placeholder="e.g. B.Sc in CSE"
                    value={createForm.qualification}
                    onChange={(e) => setCreateForm({ ...createForm, qualification: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instJoin">Joining Date</Label>
                  <Input
                    id="instJoin"
                    type="date"
                    value={createForm.joiningDate}
                    onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instBio">Bio / Profile Summary</Label>
                <Input
                  id="instBio"
                  placeholder="Brief summary of teaching experience or domain expertise..."
                  value={createForm.bio}
                  onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering...' : 'Register Instructor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Instructor */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Instructor Profile</DialogTitle>
              <DialogDescription>
                Update faculty credentials, skills, or employment status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Input
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Specializations (comma-separated)</Label>
                <Input
                  value={editForm.specializationInput}
                  onChange={(e) => setEditForm({ ...editForm, specializationInput: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Qualification</Label>
                  <Input
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Change Password (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Bio / Summary</Label>
                <Input
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: View Assigned Batches */}
      <Dialog open={Boolean(viewBatchesInstructor)} onOpenChange={() => setViewBatchesInstructor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Assigned Batches
            </DialogTitle>
            <DialogDescription>
              Cohorts taught by {viewBatchesInstructor?.firstName} {viewBatchesInstructor?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            {!viewBatchesInstructor?.instructorBatches || viewBatchesInstructor.instructorBatches.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                No batches assigned to this instructor yet.
              </div>
            ) : (
              viewBatchesInstructor.instructorBatches.map((b) => (
                <div key={b.id} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm">{b.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {b._count?.enrollments || 0} students
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{b.course?.name}</span>
                  </div>
                  {(b.classDays.length > 0 || b.classTime) && (
                    <div className="flex items-center gap-1.5 text-muted-foreground pt-1 border-t text-[11px]">
                      <Clock className="h-3 w-3 text-primary" />
                      <span>
                        {b.classDays.map((d) => d.slice(0, 3)).join(', ')} {b.classTime ? `• ${b.classTime}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewBatchesInstructor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
