'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, del } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Shield,
  Clock,
  CalendarDays,
  CalendarCheck,
  CreditCard,
  Receipt,
  DollarSign,
  ArrowDownLeft,
  Wallet,
} from 'lucide-react';
import type {
  StudentAttendanceSummary,
  StudentLedgerSummary,
  FeeInvoiceRecord,
  PaymentRecord,
} from '@repo/shared';
import { PaymentReceiptModal } from '@/components/payment-receipt-modal';

import { ClassScheduleSelector, ALL_DAYS } from '@/components/class-schedule-selector';

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

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const queryClient = useQueryClient();

  // Dialog states
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<FeeInvoiceRecord | null>(null);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentRecord | null>(null);

  // Collect payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // New enrollment form state
  const [enrollForm, setEnrollForm] = useState({
    courseId: '',
    batchId: '',
    rollNumber: '',
  });

  // Edit student form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
    address: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    classDays: [] as string[],
    classTime: '',
  });

  // Fetch student details
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => get<any>(`/students/${studentId}`),
  });

  // Fetch student attendance summary and records
  const { data: attendanceSummary } = useQuery<StudentAttendanceSummary>({
    queryKey: ['student-attendance', studentId],
    queryFn: () => get<StudentAttendanceSummary>(`/attendance/students/${studentId}`),
  });

  // Fetch student billing & payment ledger
  const { data: ledger } = useQuery<StudentLedgerSummary>({
    queryKey: ['student-ledger', studentId],
    queryFn: () => get<StudentLedgerSummary>(`/fees/students/${studentId}/ledger`),
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/payments', payload),
    onSuccess: (res: any) => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['student-ledger', studentId] });
      setIsCollectPaymentOpen(false);
      if (res) setActiveReceiptPayment(res);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const handleOpenCollectPayment = (invoice: FeeInvoiceRecord) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentForm({
      amount: String(invoice.dueAmount),
      method: 'CASH',
      transactionId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsCollectPaymentOpen(true);
  };

  const handleCollectPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    if (amt > selectedInvoiceForPayment.dueAmount) {
      toast.error(`Amount exceeds remaining due (৳${selectedInvoiceForPayment.dueAmount})`);
      return;
    }

    recordPaymentMutation.mutate({
      invoiceId: selectedInvoiceForPayment.id,
      amount: amt,
      method: paymentForm.method,
      transactionId: paymentForm.transactionId.trim() || undefined,
      paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : undefined,
      notes: paymentForm.notes.trim() || undefined,
    });
  };

  // Fetch available courses for enrollment dialog
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Fetch available batches directly as fallback
  const { data: allBatches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  const selectedCourse = courses.find((c: any) => c.id === enrollForm.courseId);
  const availableBatches = useMemo(() => {
    if (!enrollForm.courseId) return [];
    if (selectedCourse?.batches && selectedCourse.batches.length > 0) {
      return selectedCourse.batches;
    }
    return allBatches.filter((b: any) => b.courseId === enrollForm.courseId);
  }, [enrollForm.courseId, selectedCourse, allBatches]);

  // Populate edit form when student loads
  const handleOpenEdit = () => {
    if (student) {
      setEditForm({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        phone: student.phone || '',
        email: student.email || '',
        status: student.status || 'ACTIVE',
        address: student.address || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        guardianRelation: student.guardianRelation || '',
        classDays: student.classDays || [],
        classTime: student.classTime || '',
      });
      setIsEditDialogOpen(true);
    }
  };

  // Mutation: Update Student Profile
  const updateStudentMutation = useMutation({
    mutationFn: (data: any) => patch(`/students/${studentId}`, data),
    onSuccess: () => {
      toast.success('Student profile updated');
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update student profile');
    },
  });

  // Mutation: Add Enrollment
  const addEnrollmentMutation = useMutation({
    mutationFn: (data: any) => post(`/students/${studentId}/enrollments`, data),
    onSuccess: () => {
      toast.success('Student enrolled successfully');
      setIsEnrollDialogOpen(false);
      setEnrollForm({ courseId: '', batchId: '', rollNumber: '' });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to enroll student');
    },
  });

  // Mutation: Update Enrollment Status
  const updateEnrollmentMutation = useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: string; status: string }) =>
      patch(`/students/${studentId}/enrollments/${enrollmentId}`, { status }),
    onSuccess: () => {
      toast.success('Enrollment status updated');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    },
  });

  // Mutation: Delete Enrollment
  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      del(`/students/${studentId}/enrollments/${enrollmentId}`),
    onSuccess: () => {
      toast.success('Enrollment removed');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Loading student record...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold">Student Not Found</h2>
        <p className="text-muted-foreground">The requested student record could not be found.</p>
        <Link href="/dashboard/students">
          <Button variant="outline">Back to Students</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {student.firstName} {student.lastName}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {student.studentId}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registered on {new Date(student.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
          <Button size="sm" onClick={() => setIsEnrollDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Enroll in Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Student Details Card */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Status</span>
                <span className="font-semibold text-emerald-600">{student.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Phone</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{student.phone}</span>
                </div>
              </div>
              {student.email && (
                <div>
                  <span className="text-muted-foreground block text-xs">Email</span>
                  <div className="flex items-center gap-1.5 mt-0.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{student.email}</span>
                  </div>
                </div>
              )}
              {student.gender && (
                <div>
                  <span className="text-muted-foreground block text-xs">Gender</span>
                  <span className="capitalize">{student.gender.toLowerCase()}</span>
                </div>
              )}
              {student.dateOfBirth && (
                <div>
                  <span className="text-muted-foreground block text-xs">Date of Birth</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              {student.address && (
                <div>
                  <span className="text-muted-foreground block text-xs">Address</span>
                  <div className="flex items-start gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <span>{student.address}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guardian Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Name</span>
                <span className="font-medium">{student.guardianName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Phone</span>
                <span>{student.guardianPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Relation</span>
                <span>{student.guardianRelation || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Class Schedule Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" /> Class Schedule
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleOpenEdit}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Class Days</span>
                {!student.classDays || student.classDays.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No days scheduled</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.classDays.map((day: string) => {
                      const dayObj = ALL_DAYS.find((d) => d.key === day);
                      return (
                        <Badge key={day} variant="secondary" className="text-xs bg-primary/10 text-primary font-medium">
                          {dayObj?.full || day}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Class Time</span>
                {student.classTime ? (
                  <div className="flex items-center gap-1.5 mt-1 font-medium text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{student.classTime}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No time slot specified</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Course Enrollments */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Course Enrollments ({student.enrollments?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    All enrolled academic courses and assigned batch cohorts.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsEnrollDialogOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Course
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!student.enrollments || student.enrollments.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="font-medium">No Course Enrollments</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add Course" to enroll this student into an institute program.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {student.enrollments.map((enr: any) => (
                    <div
                      key={enr.id}
                      className="p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">{enr.course.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            ৳{enr.course.fees}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            Batch:{' '}
                            <strong className="text-foreground">
                              {enr.batch?.name || 'Unassigned'}
                            </strong>
                          </span>
                          {enr.rollNumber && (
                            <span>
                              Roll: <strong className="text-foreground">{enr.rollNumber}</strong>
                            </span>
                          )}
                          {(enr.classTime || enr.batch?.classTime || enr.batch?.schedule) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <strong className="text-foreground">
                                {enr.classTime || enr.batch?.classTime || enr.batch?.schedule}
                              </strong>
                            </span>
                          )}
                          <span>
                            Date: {new Date(enr.enrollmentDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background"
                          value={enr.status}
                          onChange={(e) =>
                            updateEnrollmentMutation.mutate({
                              enrollmentId: enr.id,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="ENROLLED">Enrolled</option>
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="DROPPED">Dropped</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this course enrollment?')) {
                              deleteEnrollmentMutation.mutate(enr.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Performance Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-emerald-600" />
                    Attendance Performance
                  </CardTitle>
                  <CardDescription>
                    Summary of class attendance records and recent session log.
                  </CardDescription>
                </div>
                {attendanceSummary && attendanceSummary.totalSessions > 0 && (
                  <Badge
                    className={`text-sm px-2.5 py-0.5 font-semibold ${
                      attendanceSummary.attendanceRate >= 80
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : attendanceSummary.attendanceRate >= 60
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {attendanceSummary.attendanceRate}% Rate
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <div className="text-xs text-muted-foreground font-medium">Sessions</div>
                  <div className="text-lg font-bold mt-0.5">{attendanceSummary?.totalSessions ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">
                  <div className="text-xs font-medium">Present</div>
                  <div className="text-lg font-bold mt-0.5">{attendanceSummary?.present ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 text-rose-700">
                  <div className="text-xs font-medium">Absent</div>
                  <div className="text-lg font-bold mt-0.5">{attendanceSummary?.absent ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 text-amber-700">
                  <div className="text-xs font-medium">Late</div>
                  <div className="text-lg font-bold mt-0.5">{attendanceSummary?.late ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 text-blue-700">
                  <div className="text-xs font-medium">Excused</div>
                  <div className="text-lg font-bold mt-0.5">{attendanceSummary?.excused ?? 0}</div>
                </div>
              </div>

              {/* History list */}
              {!attendanceSummary || attendanceSummary.records.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <CalendarCheck className="h-6 w-6 text-muted-foreground/60 mx-auto mb-1" />
                  <p className="text-xs font-medium text-muted-foreground">
                    No attendance sessions recorded yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px] border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 sticky top-0 border-b text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Batch</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceSummary.records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-medium">{rec.date}</td>
                          <td className="py-2 px-3 text-muted-foreground">{rec.batch?.name || 'N/A'}</td>
                          <td className="py-2 px-3">
                            {rec.status === 'PRESENT' && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] px-1.5 py-0">
                                Present
                              </Badge>
                            )}
                            {rec.status === 'ABSENT' && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Absent
                              </Badge>
                            )}
                            {rec.status === 'LATE' && (
                              <Badge className="bg-amber-600 hover:bg-amber-700 text-[10px] px-1.5 py-0">
                                Late
                              </Badge>
                            )}
                            {rec.status === 'EXCUSED' && (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] px-1.5 py-0">
                                Excused
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground italic">
                            {rec.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fees & Billing Ledger Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Fees & Financial Ledger
                  </CardTitle>
                  <CardDescription>
                    Billing invoices, fee balances, and payment transaction history.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {ledger && (
                    <Badge
                      className={`text-xs px-2.5 py-0.5 font-semibold ${
                        ledger.dueBalance <= 0
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {ledger.dueBalance <= 0 ? 'Fully Paid' : `৳${ledger.dueBalance.toLocaleString()} Due`}
                    </Badge>
                  )}
                  <Link href="/dashboard/fees">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      All Fees
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="text-xs text-muted-foreground font-medium">Total Invoiced</div>
                  <div className="text-lg font-bold mt-0.5 text-foreground">
                    ৳{(ledger?.totalBilled ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">
                  <div className="text-xs font-medium">Total Paid</div>
                  <div className="text-lg font-bold mt-0.5">
                    ৳{(ledger?.totalPaid ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 text-amber-700">
                  <div className="text-xs font-medium">Outstanding Balance</div>
                  <div className="text-lg font-bold mt-0.5">
                    ৳{(ledger?.dueBalance ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Student Invoices Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Invoices ({ledger?.invoices?.length ?? 0})
                </h4>
                {!ledger?.invoices || ledger.invoices.length === 0 ? (
                  <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                    No invoices issued for this student yet.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3">Invoice #</th>
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Due</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ledger.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/10">
                            <td className="py-2 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                            <td className="py-2 px-3">{inv.title}</td>
                            <td className="py-2 px-3 text-right font-medium">৳{inv.totalAmount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-medium">৳{inv.paidAmount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-amber-600 font-bold">৳{inv.dueAmount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge
                                variant={inv.status === 'PAID' ? 'default' : inv.status === 'PARTIALLY_PAID' ? 'secondary' : 'outline'}
                                className={`text-[10px] px-1.5 py-0 ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-600 text-white'
                                    : 'text-rose-600 border-rose-300'
                                }`}
                              >
                                {inv.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {inv.dueAmount > 0 && (
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleOpenCollectPayment(inv)}
                                >
                                  Collect
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Student Payments History Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Payment History & Receipts ({ledger?.payments?.length ?? 0})
                </h4>
                {!ledger?.payments || ledger.payments.length === 0 ? (
                  <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                    No payment transactions recorded for this student yet.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3">Receipt #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                          <th className="py-2 px-3 text-center">Method</th>
                          <th className="py-2 px-3">TrxID</th>
                          <th className="py-2 px-3 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ledger.payments.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-muted/10">
                            <td className="py-2 px-3 font-mono font-medium">{pmt.receiptNumber}</td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(pmt.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600">
                              ৳{pmt.amount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                                {pmt.method}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {pmt.transactionId || '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 gap-1"
                                onClick={() => setActiveReceiptPayment(pmt)}
                              >
                                <Receipt className="h-3 w-3" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: Add Course Enrollment */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll in Course</DialogTitle>
            <DialogDescription>
              Select an available course and assign the student to a batch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Course</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={enrollForm.courseId}
                onChange={(e) =>
                  setEnrollForm({
                    ...enrollForm,
                    courseId: e.target.value,
                    batchId: '',
                  })
                }
              >
                <option value="">Choose a course...</option>
                {courses.map((course: any) => (
                  <option key={course.id} value={course.id}>
                    {course.name} (৳{course.fees})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Assign Batch (Optional)</Label>
              <select
                disabled={!enrollForm.courseId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                value={enrollForm.batchId}
                onChange={(e) => setEnrollForm({ ...enrollForm, batchId: e.target.value })}
              >
                <option value="">
                  {!enrollForm.courseId
                    ? 'Choose a course first...'
                    : availableBatches.length === 0
                    ? 'No batches found for this course (optional)'
                    : 'Select Batch (Optional)...'}
                </option>
                {availableBatches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.classTime || b.schedule ? `(${b.classTime || b.schedule})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Roll Number (Optional)</Label>
              <Input
                placeholder="e.g. 01"
                value={enrollForm.rollNumber}
                onChange={(e) => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!enrollForm.courseId || addEnrollmentMutation.isPending}
              onClick={() =>
                addEnrollmentMutation.mutate({
                  courseId: enrollForm.courseId,
                  batchId: enrollForm.batchId || undefined,
                  rollNumber: enrollForm.rollNumber || undefined,
                })
              }
            >
              Confirm Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Student Profile */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>Update contact and personal information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
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
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PASSED_OUT">Passed Out</option>
                <option value="DROPPED_OUT">Dropped Out</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <div className="pt-2 border-t space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Guardian Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Guardian Name</Label>
                  <Input
                    value={editForm.guardianName}
                    onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Guardian Phone</Label>
                  <Input
                    value={editForm.guardianPhone}
                    onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Class Schedule in Edit Modal */}
            <div className="pt-2 border-t space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Class Schedule (Days & Time)
              </h4>
              <ClassScheduleSelector
                selectedDays={editForm.classDays}
                onChangeDays={(days) => setEditForm({ ...editForm, classDays: days })}
                selectedTime={editForm.classTime}
                onChangeTime={(time) => setEditForm({ ...editForm, classTime: time })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateStudentMutation.isPending}
              onClick={() => updateStudentMutation.mutate(editForm)}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Collect Payment */}
      <Dialog open={isCollectPaymentOpen} onOpenChange={setIsCollectPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCollectPaymentSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                Collect Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for invoice {selectedInvoiceForPayment?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {selectedInvoiceForPayment && (
                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <div className="font-semibold text-foreground">
                    {selectedInvoiceForPayment.title}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="text-base font-bold text-amber-600">
                      ৳{selectedInvoiceForPayment.dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="stdPmtAmount">Payment Amount (৳) *</Label>
                <Input
                  id="stdPmtAmount"
                  type="number"
                  min="1"
                  step="any"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stdPmtMethod">Payment Method *</Label>
                <select
                  id="stdPmtMethod"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                >
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {paymentForm.method !== 'CASH' && (
                <div className="space-y-1.5">
                  <Label htmlFor="stdTrxId">Transaction ID / TrxID</Label>
                  <Input
                    id="stdTrxId"
                    placeholder="e.g. 9J28DA10B or deposit slip #"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="stdPmtDate">Payment Date</Label>
                <Input
                  id="stdPmtDate"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stdPmtNotes">Remarks / Receipt Note</Label>
                <Input
                  id="stdPmtNotes"
                  placeholder="Optional collection note..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCollectPaymentOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Digital Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(activeReceiptPayment)}
        onClose={() => setActiveReceiptPayment(null)}
        payment={activeReceiptPayment}
      />
    </div>
  );
}
