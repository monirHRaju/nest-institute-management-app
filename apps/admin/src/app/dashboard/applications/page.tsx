'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  DollarSign,
  ChevronRight,
  Loader2,
  Eye,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { get, patch, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  AdmissionApplicationRecord,
  ApplicationStatus,
  ApproveAndAdmitDto,
  UpdateApplicationStatusDto,
} from '@repo/shared';

interface ApplicationsResponse {
  success: boolean;
  data: AdmissionApplicationRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ApplicationsPage() {
  const t = useTranslations('applications');
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [page, setPage] = useState(1);

  // Review Dialog state
  const [selectedApp, setSelectedApp] = useState<AdmissionApplicationRecord | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAdmitWizardOpen, setIsAdmitWizardOpen] = useState(false);

  // Admit wizard form fields
  const [admitBatchId, setAdmitBatchId] = useState<string>('');
  const [customStudentId, setCustomStudentId] = useState<string>('');
  const [createInvoice, setCreateInvoice] = useState<boolean>(true);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Fetch courses for filter & wizard
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Fetch batches for admit wizard
  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  // Fetch applications list
  const { data: response, isLoading } = useQuery<ApplicationsResponse>({
    queryKey: ['applications', page, searchTerm, selectedStatus, selectedCourse],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (searchTerm) params.set('search', searchTerm);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedCourse) params.set('courseId', selectedCourse);
      return get<ApplicationsResponse>(`/applications?${params.toString()}`);
    },
  });

  const applications = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };

  // Calculate quick stats
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  // Open review dialog
  const handleOpenReview = (app: AdmissionApplicationRecord) => {
    setSelectedApp(app);
    setAdminNotes(app.adminNotes || '');
    setAdmitBatchId(app.batchId || '');
    setCustomStudentId('');
    setCreateInvoice(true);
    setInvoiceAmount(app.course?.fees ? app.course.fees.toString() : '');
    setIsReviewOpen(true);
    setIsAdmitWizardOpen(false);
  };

  // Update Status Mutation (e.g. Reject or save notes)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateApplicationStatusDto }) =>
      patch<any>(`/applications/${id}`, dto),
    onSuccess: () => {
      toast.success('Application updated successfully');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setIsReviewOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update application');
    },
  });

  // Approve & Admit Mutation
  const approveAndAdmitMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApproveAndAdmitDto }) =>
      post<any>(`/applications/${id}/approve`, dto),
    onSuccess: (data) => {
      const stdId = data?.student?.studentId || 'New Student';
      toast.success(`Application approved! Student enrolled successfully (${stdId})`);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsReviewOpen(false);
      setIsAdmitWizardOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve application');
    },
  });

  const handleQuickReject = () => {
    if (!selectedApp) return;
    if (confirm(`Are you sure you want to reject application ${selectedApp.applicationNumber}?`)) {
      updateStatusMutation.mutate({
        id: selectedApp.id,
        dto: {
          status: 'REJECTED',
          adminNotes: adminNotes.trim() || undefined,
        },
      });
    }
  };

  const handleConfirmAdmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    approveAndAdmitMutation.mutate({
      id: selectedApp.id,
      dto: {
        batchId: admitBatchId || undefined,
        customStudentId: customStudentId.trim() || undefined,
        createInvoice,
        invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : undefined,
        adminNotes: adminNotes.trim() || undefined,
      },
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </Badge>
        );
    }
  };

  // Filter batches for the selected course in dialog
  const courseBatches = batches.filter(
    (b) => b.courseId === selectedApp?.courseId
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {t('title')}
            </h1>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white font-bold">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/students"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>View Admitted Students</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Online applicants</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase flex items-center justify-between">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <p className="text-xs text-amber-600 mt-0.5">Awaiting committee review</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase flex items-center justify-between">
              <span>Approved & Admitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
            <p className="text-xs text-emerald-600 mt-0.5">Enrolled as active students</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-rose-700 uppercase flex items-center justify-between">
              <span>Rejected</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">{rejectedCount}</div>
            <p className="text-xs text-rose-600 mt-0.5">Unaccepted submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t('allStatuses')}</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved & Admitted</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Course Dropdown */}
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Academic Programs</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">{t('trackingId')}</th>
                  <th className="py-3 px-4">{t('applicant')}</th>
                  <th className="py-3 px-4">{t('course')}</th>
                  <th className="py-3 px-4">{t('submitted')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading applications queue...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium text-foreground">No applications found</p>
                      <p className="text-xs mt-1">
                        When prospective students apply on your public website, their submissions will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        {app.applicationNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">
                          {app.firstName} {app.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{app.phone}</span>
                          {app.email && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{app.email}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">
                          {app.course?.name || 'General Course'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Batch: {app.batch?.name || 'Unassigned / Open'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {formatDate(app.createdAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(app.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(app)}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('review')}</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Showing page <span className="font-bold text-foreground">{meta.page}</span> of{' '}
                <span className="font-bold text-foreground">{meta.totalPages}</span> ({meta.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review & Decision Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <div>
              <DialogHeader className="border-b pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">
                      Tracking: {selectedApp.applicationNumber}
                    </span>
                    <DialogTitle className="text-xl font-bold mt-0.5">
                      {selectedApp.firstName} {selectedApp.lastName}
                    </DialogTitle>
                  </div>
                  <div>{getStatusBadge(selectedApp.status)}</div>
                </div>
              </DialogHeader>

              {/* If already approved, show admitted student record */}
              {selectedApp.status === 'APPROVED' && (
                <div className="my-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-950">Student Officially Admitted</div>
                      <div>
                        Assigned Student ID:{' '}
                        <span className="font-mono font-bold text-emerald-900">
                          {selectedApp.studentId || selectedApp.student?.studentId || 'STD-ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/students`}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                  >
                    <span>View Student Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Applicant Profile Information */}
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-muted/40 border">
                    <span className="text-muted-foreground block mb-0.5">Phone Number</span>
                    <span className="font-semibold text-foreground">{selectedApp.phone}</span>
                  </div>

                  <div className="p-2.5 rounded bg-muted/40 border">
                    <span className="text-muted-foreground block mb-0.5">Email Address</span>
                    <span className="font-semibold text-foreground">{selectedApp.email || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 rounded bg-muted/40 border">
                    <span className="text-muted-foreground block mb-0.5">Gender</span>
                    <span className="font-semibold text-foreground">{selectedApp.gender || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 rounded bg-muted/40 border">
                    <span className="text-muted-foreground block mb-0.5">Date of Birth</span>
                    <span className="font-semibold text-foreground">{formatDate(selectedApp.dateOfBirth)}</span>
                  </div>

                  <div className="p-2.5 rounded bg-muted/40 border sm:col-span-2">
                    <span className="text-muted-foreground block mb-0.5">Address</span>
                    <span className="font-semibold text-foreground">{selectedApp.address || 'N/A'}</span>
                  </div>
                </div>

                {/* Guardian Details if available */}
                {(selectedApp.guardianName || selectedApp.guardianPhone) && (
                  <div className="p-3 rounded bg-muted/30 border text-xs space-y-1">
                    <div className="font-bold text-foreground">Guardian Details</div>
                    <div className="text-muted-foreground">
                      Name: <span className="text-foreground font-medium">{selectedApp.guardianName || 'N/A'}</span>
                      {selectedApp.guardianRelation && ` (${selectedApp.guardianRelation})`}
                      {selectedApp.guardianPhone && (
                        <> • Phone: <span className="text-foreground font-medium">{selectedApp.guardianPhone}</span></>
                      )}
                    </div>
                  </div>
                )}

                {/* Program Details */}
                <div className="p-3.5 rounded bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    Applied Academic Program
                  </div>
                  <div className="text-blue-900 font-semibold text-sm">
                    {selectedApp.course?.name || 'Assigned Course'}
                  </div>
                  <div className="text-blue-800 text-xs flex items-center gap-4">
                    <span>Preferred Batch: <strong>{selectedApp.batch?.name || 'Next Intake'}</strong></span>
                    {selectedApp.course?.fees && (
                      <span>Tuition Fee: <strong>${selectedApp.course.fees}</strong></span>
                    )}
                  </div>
                </div>

                {/* Applicant Notes */}
                {selectedApp.notes && (
                  <div className="p-3 rounded bg-muted/20 border text-xs">
                    <span className="font-semibold text-foreground block mb-0.5">Applicant Notes:</span>
                    <p className="text-muted-foreground italic">{selectedApp.notes}</p>
                  </div>
                )}

                {/* Internal Counselor Notes Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="reviewNotes" className="text-xs font-semibold">
                    {t('counselorNotes')}
                  </Label>
                  <textarea
                    id="reviewNotes"
                    rows={2}
                    placeholder="Internal counseling observations, verification results, interview notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* 1-Click Admit Wizard Section */}
                {isAdmitWizardOpen && selectedApp.status !== 'APPROVED' && (
                  <form onSubmit={handleConfirmAdmit} className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-4 animate-in slide-in-from-top-2">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-primary" />
                      Confirm Student Admission & Enrollment
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="admitBatch">Assign to Batch</Label>
                        <select
                          id="admitBatch"
                          value={admitBatchId}
                          onChange={(e) => setAdmitBatchId(e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded border border-input bg-background"
                        >
                          <option value="">Auto-Assign / Default Batch</option>
                          {courseBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="customId">Student ID (Optional)</Label>
                        <Input
                          id="customId"
                          placeholder="Leave blank for STD-YYYY-XXXX"
                          className="h-8 text-xs font-mono"
                          value={customStudentId}
                          onChange={(e) => setCustomStudentId(e.target.value)}
                        />
                      </div>

                      <div className="sm:col-span-2 pt-1 flex items-center justify-between border-t border-primary/20">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createInvoice}
                            onChange={(e) => setCreateInvoice(e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span className="font-medium text-foreground">{t('createInvoice')}</span>
                        </label>

                        {createInvoice && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Amount: $</span>
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs font-semibold"
                              value={invoiceAmount}
                              onChange={(e) => setInvoiceAmount(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAdmitWizardOpen(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={approveAndAdmitMutation.isPending}
                        className="text-xs font-semibold gap-1.5"
                      >
                        {approveAndAdmitMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm & Admit as Student</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Dialog Footer Actions */}
              <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row gap-2 justify-between">
                <div>
                  {selectedApp.status !== 'REJECTED' && selectedApp.status !== 'APPROVED' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleQuickReject}
                      disabled={updateStatusMutation.isPending}
                      className="text-xs"
                    >
                      {t('reject')}
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReviewOpen(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>

                  {selectedApp.status !== 'APPROVED' && !isAdmitWizardOpen && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsAdmitWizardOpen(true)}
                      className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('approveAndAdmit')}</span>
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
