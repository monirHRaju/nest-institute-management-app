'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ClipboardList,
  Edit,
  Plus,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react';

interface StudentRecord {
  id: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  enrollmentDate: string;
  address?: string | null;
  batchId?: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    isActive: boolean;
  };
  batch?: {
    id: string;
    name: string;
    courseId: string;
    course?: {
      id: string;
      name: string;
    };
  } | null;
  _count?: {
    attendanceRecords: number;
  };
}

export default function StudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = user?.role === 'TENANT_ADMIN' || user?.role === 'STAFF';

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    batchId: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
  });

  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    isActive: true,
    batchId: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
  });

  const [viewingAttendanceStudentId, setViewingAttendanceStudentId] = useState<
    string | null
  >(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
    enabled: canWrite,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', search, courseFilter, batchFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (courseFilter) params.set('courseId', courseFilter);
      if (batchFilter) params.set('batchId', batchFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return get<StudentRecord[]>(`/students${qs ? `?${qs}` : ''}`);
    },
  });

  const { data: studentAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['student-attendance', viewingAttendanceStudentId],
    queryFn: () =>
      get<any>(`/attendance/student/${viewingAttendanceStudentId}`),
    enabled: Boolean(viewingAttendanceStudentId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/students', payload),
    onSuccess: () => {
      toast.success('Student enrolled successfully');
      setShowCreateModal(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        batchId: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to enroll student');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) =>
      patch(`/students/${payload.id}`, payload.data),
    onSuccess: () => {
      toast.success('Student profile updated');
      setEditingStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update student');
    },
  });

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setEditForm({
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      phone: student.user.phone || '',
      isActive: student.user.isActive,
      batchId: student.batchId || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      address: student.address || '',
    });
  };

  const filteredBatches = courseFilter
    ? batches.filter((b: any) => b.courseId === courseFilter)
    : batches;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage enrolled students, batch assignments, guardian info, and
            attendance history.
          </p>
        </div>

        {canWrite && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Enroll Student
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {canWrite && (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setBatchFilter('');
                }}
              >
                <option value="">All Courses</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="">All Batches</option>
              {filteredBatches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.course?.name ? `(${b.course.name})` : ''}
                </option>
              ))}
            </select>

            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading students...</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students match your current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-4 font-medium">Student</th>
                    <th className="py-3 px-4 font-medium">Contact</th>
                    <th className="py-3 px-4 font-medium">Course & Batch</th>
                    <th className="py-3 px-4 font-medium">Guardian</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {student.user.firstName} {student.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Enrolled:{' '}
                          {new Date(
                            student.enrollmentDate,
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{student.user.phone || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {student.batch ? (
                          <div>
                            <div className="font-medium">
                              {student.batch.course?.name || 'Course'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Batch: {student.batch.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div>{student.guardianName || '—'}</div>
                        {student.guardianPhone && (
                          <div className="text-xs text-muted-foreground">
                            {student.guardianPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {student.user.isActive ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                            <UserCheck className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserX className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setViewingAttendanceStudentId(student.id)
                            }
                          >
                            <ClipboardList className="h-4 w-4 mr-1" />{' '}
                            Attendance
                          </Button>
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(student)}
                            >
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll New Student Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Enroll New Student</CardTitle>
              <p className="text-sm text-muted-foreground">
                Creates a student portal login (default password is their phone
                number).
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({
                    ...createForm,
                    batchId: createForm.batchId || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name *
                    </label>
                    <Input
                      required
                      value={createForm.firstName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name *
                    </label>
                    <Input
                      required
                      value={createForm.lastName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone (01XXXXXXXXX) *
                    </label>
                    <Input
                      required
                      placeholder="01XXXXXXXXX"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assign Batch
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={createForm.batchId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, batchId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {batches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.course?.name ? `— ${b.course.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Guardian Name
                    </label>
                    <Input
                      value={createForm.guardianName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          guardianName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Guardian Phone
                    </label>
                    <Input
                      value={createForm.guardianPhone}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          guardianPhone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <Input
                    value={createForm.address}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, address: e.target.value })
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
                    {createMutation.isPending
                      ? 'Enrolling...'
                      : 'Enroll Student'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                Edit Student: {editingStudent.user.firstName}{' '}
                {editingStudent.user.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate({
                    id: editingStudent.id,
                    data: {
                      ...editForm,
                      batchId: editForm.batchId || null,
                    },
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <Input
                      required
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <Input
                      required
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone
                    </label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          isActive: e.target.value === 'active',
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assigned Batch
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editForm.batchId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, batchId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {batches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.course?.name ? `— ${b.course.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Guardian Name
                    </label>
                    <Input
                      value={editForm.guardianName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          guardianName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Guardian Phone
                    </label>
                    <Input
                      value={editForm.guardianPhone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          guardianPhone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <Input
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingStudent(null)}
                  >
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

      {/* Student Attendance Summary Modal */}
      {viewingAttendanceStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  Attendance Summary
                  {studentAttendance?.student
                    ? `: ${studentAttendance.student.user.firstName} ${studentAttendance.student.user.lastName}`
                    : ''}
                </CardTitle>
                {studentAttendance?.student?.batch && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Batch: {studentAttendance.student.batch.name} (
                    {studentAttendance.student.batch.course?.name})
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAttendanceStudentId(null)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingAttendance ? (
                <p className="text-sm text-muted-foreground">
                  Loading attendance records...
                </p>
              ) : studentAttendance ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="border rounded-md p-3 text-center">
                      <div className="text-xs text-muted-foreground">Rate</div>
                      <div className="text-xl font-bold">
                        {studentAttendance.summary.attendanceRate}%
                      </div>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-xl font-bold">
                        {studentAttendance.summary.totalClasses}
                      </div>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <div className="text-xs text-emerald-600">Present</div>
                      <div className="text-xl font-bold text-emerald-600">
                        {studentAttendance.summary.present}
                      </div>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <div className="text-xs text-destructive">Absent</div>
                      <div className="text-xl font-bold text-destructive">
                        {studentAttendance.summary.absent}
                      </div>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <div className="text-xs text-amber-600">Late/Excused</div>
                      <div className="text-xl font-bold text-amber-600">
                        {studentAttendance.summary.late +
                          studentAttendance.summary.excused}
                      </div>
                    </div>
                  </div>

                  {studentAttendance.records?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No attendance sessions recorded yet for this student.
                    </p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                      {studentAttendance.records.map((rec: any) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between p-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">
                              {new Date(rec.date).toLocaleDateString()}
                            </div>
                            {rec.remarks && (
                              <div className="text-xs text-muted-foreground">
                                {rec.remarks}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={
                              rec.status === 'PRESENT'
                                ? 'default'
                                : rec.status === 'ABSENT'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {rec.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
