'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Briefcase,
  Edit,
  Eye,
  Plus,
  Search,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

interface StaffRecord {
  id: string;
  designation: string;
  department?: string | null;
  joinDate: string;
  baseSalary: string | number;
  bankInfo?: string | null;
  mobileWallet?: string | null;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: 'STAFF' | 'INSTRUCTOR';
    isActive: boolean;
    _count?: {
      instructorBatches: number;
    };
  };
  _count?: {
    payrolls: number;
  };
}

export default function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'TENANT_ADMIN';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'INSTRUCTOR' | 'STAFF'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'INSTRUCTOR' as 'INSTRUCTOR' | 'STAFF',
    designation: '',
    department: '',
    baseSalary: '',
    mobileWallet: '',
    bankInfo: '',
  });

  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'INSTRUCTOR' as 'INSTRUCTOR' | 'STAFF',
    designation: '',
    department: '',
    baseSalary: '',
    mobileWallet: '',
    bankInfo: '',
    isActive: true,
  });

  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: staffList = [], isLoading } = useQuery<StaffRecord[]>({
    queryKey: ['staff', search, roleFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return get<StaffRecord[]>(`/staff${qs ? `?${qs}` : ''}`);
    },
  });

  const { data: staffDetail } = useQuery<any>({
    queryKey: ['staff-detail', viewingId],
    queryFn: () => get(`/staff/${viewingId}`),
    enabled: Boolean(viewingId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/staff', payload),
    onSuccess: () => {
      toast.success('Staff member created');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowCreateModal(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'INSTRUCTOR',
        designation: '',
        department: '',
        baseSalary: '',
        mobileWallet: '',
        bankInfo: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create staff member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      patch(`/staff/${id}`, payload),
    onSuccess: () => {
      toast.success('Staff profile updated');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEditingStaff(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update staff member');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => patch(`/staff/${id}/deactivate`, {}),
    onSuccess: () => {
      toast.success('Staff member deactivated');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to deactivate staff');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim() || undefined,
      password: createForm.password.trim() || undefined,
      role: createForm.role,
      designation: createForm.designation.trim(),
      department: createForm.department.trim() || undefined,
      baseSalary: Number(createForm.baseSalary || 0),
      mobileWallet: createForm.mobileWallet.trim() || undefined,
      bankInfo: createForm.bankInfo.trim() || undefined,
    });
  };

  const openEdit = (s: StaffRecord) => {
    setEditingStaff(s);
    setEditForm({
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      phone: s.user.phone || '',
      role: s.user.role,
      designation: s.designation,
      department: s.department || '',
      baseSalary: String(s.baseSalary),
      mobileWallet: s.mobileWallet || '',
      bankInfo: s.bankInfo || '',
      isActive: s.isActive,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    updateMutation.mutate({
      id: editingStaff.id,
      payload: {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        designation: editForm.designation.trim(),
        department: editForm.department.trim() || null,
        baseSalary: Number(editForm.baseSalary || 0),
        mobileWallet: editForm.mobileWallet.trim() || null,
        bankInfo: editForm.bankInfo.trim() || null,
        isActive: editForm.isActive,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff &amp; Instructors</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage teachers, administrative staff, salaries, and batch assignments.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff / Instructor
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
          >
            <option value="ALL">All Roles</option>
            <option value="INSTRUCTOR">Instructors</option>
            <option value="STAFF">Staff</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Directory ({staffList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading staff...</div>
          ) : staffList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-2 font-medium">Name</th>
                    <th className="py-3 px-2 font-medium">Role</th>
                    <th className="py-3 px-2 font-medium">Designation</th>
                    <th className="py-3 px-2 font-medium">Base Salary</th>
                    <th className="py-3 px-2 font-medium">Batches</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {s.user.firstName} {s.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.user.email}
                          {s.user.phone ? ` · ${s.user.phone}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={s.user.role === 'INSTRUCTOR' ? 'default' : 'secondary'}>
                          {s.user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div>{s.designation}</div>
                        {s.department && (
                          <div className="text-xs text-muted-foreground">{s.department}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium">
                        ৳{Number(s.baseSalary).toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        {s.user._count?.instructorBatches ?? 0}
                      </td>
                      <td className="py-3 px-2">
                        {s.isActive ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            <UserCheck className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-600 border-rose-300">
                            <UserX className="h-3 w-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingId(s.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(s)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {s.isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deactivateMutation.mutate(s.id)}
                                title="Deactivate"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </>
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

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Add Staff / Instructor</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      required
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      required
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Role *</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, role: e.target.value as any })
                      }
                    >
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  </div>
                  <div>
                    <Label>Base Salary (৳) *</Label>
                    <Input
                      type="number"
                      min={0}
                      required
                      value={createForm.baseSalary}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, baseSalary: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Designation *</Label>
                    <Input
                      required
                      placeholder="e.g. Senior Instructor"
                      value={createForm.designation}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, designation: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      placeholder="e.g. Computer Science"
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, department: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mobile Wallet (bKash/Nagad)</Label>
                    <Input
                      value={createForm.mobileWallet}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, mobileWallet: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Initial Password</Label>
                    <Input
                      type="password"
                      placeholder="Default: Staff@1234"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Bank Info</Label>
                  <Input
                    placeholder="Bank name, branch, account no."
                    value={createForm.bankInfo}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, bankInfo: e.target.value })
                    }
                  />
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
                    {createMutation.isPending ? 'Saving...' : 'Create Staff'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>
                Edit Staff — {editingStaff.user.firstName} {editingStaff.user.lastName}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setEditingStaff(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      required
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      required
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    >
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Designation *</Label>
                    <Input
                      required
                      value={editForm.designation}
                      onChange={(e) =>
                        setEditForm({ ...editForm, designation: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={editForm.department}
                      onChange={(e) =>
                        setEditForm({ ...editForm, department: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Base Salary (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      required
                      value={editForm.baseSalary}
                      onChange={(e) =>
                        setEditForm({ ...editForm, baseSalary: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Mobile Wallet</Label>
                    <Input
                      value={editForm.mobileWallet}
                      onChange={(e) =>
                        setEditForm({ ...editForm, mobileWallet: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Bank Info</Label>
                  <Input
                    value={editForm.bankInfo}
                    onChange={(e) => setEditForm({ ...editForm, bankInfo: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="staff-active"
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                  <Label htmlFor="staff-active">Active</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Staff Detail Modal */}
      {viewingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Staff Details</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setViewingId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {!staffDetail ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Full Name</div>
                      <div className="font-semibold">
                        {staffDetail.user.firstName} {staffDetail.user.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Designation</div>
                      <div className="font-semibold">
                        {staffDetail.designation}
                        {staffDetail.department ? ` (${staffDetail.department})` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Base Salary</div>
                      <div className="font-semibold">
                        ৳{Number(staffDetail.baseSalary).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Payment Info</div>
                      <div className="font-medium">
                        {staffDetail.mobileWallet || staffDetail.bankInfo || 'Not set'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-2">
                      Assigned Batches ({staffDetail.user.instructorBatches?.length || 0})
                    </h3>
                    {staffDetail.user.instructorBatches?.length > 0 ? (
                      <div className="space-y-2">
                        {staffDetail.user.instructorBatches.map((b: any) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between border rounded-md p-2.5 text-sm"
                          >
                            <div>
                              <span className="font-medium">{b.name}</span>
                              <span className="text-muted-foreground"> — {b.course?.name}</span>
                            </div>
                            <Badge variant="secondary">
                              {b._count?.students ?? 0} students
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No batches assigned.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-2">
                      Recent Payrolls ({staffDetail.payrolls?.length || 0})
                    </h3>
                    {staffDetail.payrolls?.length > 0 ? (
                      <div className="space-y-1.5">
                        {staffDetail.payrolls.map((p: any) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between border rounded-md p-2 text-sm"
                          >
                            <span>
                              {String(p.month).padStart(2, '0')}/{p.year}
                            </span>
                            <span className="font-medium">
                              ৳{Number(p.netAmount).toLocaleString()}
                            </span>
                            <Badge variant={p.status === 'PAID' ? 'default' : 'secondary'}>
                              {p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No payroll records yet.</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
