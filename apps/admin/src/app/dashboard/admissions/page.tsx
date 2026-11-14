'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, UserPlus } from 'lucide-react';

interface BatchItem {
  id: string;
  name: string;
  courseId: string;
  startDate?: string | null;
  capacity?: number | null;
}

interface AdmissionItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  message?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  courseId: string;
  createdAt: string;
  course?: {
    id: string;
    name: string;
    fees: number;
    batches?: BatchItem[];
  };
}

export default function AdmissionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [approvingApp, setApprovingApp] = useState<AdmissionItem | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianPhone, setGuardianPhone] = useState<string>('');

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => get<AdmissionItem[]>('/admissions'),
  });

  const { data: allBatches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<BatchItem[]>('/batches'),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      batchId?: string;
      guardianName?: string;
      guardianPhone?: string;
    }) =>
      post(`/admissions/${payload.id}/approve`, {
        batchId: payload.batchId || undefined,
        guardianName: payload.guardianName || undefined,
        guardianPhone: payload.guardianPhone || undefined,
      }),
    onSuccess: () => {
      toast.success('Admission approved and student enrolled!');
      setApprovingApp(null);
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Failed to approve admission',
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => post(`/admissions/${id}/reject`),
    onSuccess: () => {
      toast.success('Admission application rejected');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reject admission');
    },
  });

  const openApproveModal = (app: AdmissionItem) => {
    setApprovingApp(app);
    const courseBatches =
      app.course?.batches ??
      allBatches.filter((b) => b.courseId === app.courseId);
    setSelectedBatchId(courseBatches[0]?.id ?? '');
    setGuardianName(app.guardianName ?? '');
    setGuardianPhone(app.guardianPhone ?? '');
  };

  const filteredAdmissions = admissions.filter((item) =>
    statusFilter === 'ALL' ? true : item.status === statusFilter,
  );

  const availableBatchesForModal = approvingApp
    ? approvingApp.course?.batches?.length
      ? approvingApp.course.batches
      : allBatches.filter((b) => b.courseId === approvingApp.courseId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admission Applications</h1>
          <p className="text-sm text-muted-foreground">
            Review online admission requests and enroll approved applicants into
            batches.
          </p>
        </div>

        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? 'default' : 'outline'}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading admission applications...
            </p>
          ) : filteredAdmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No admission applications found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-4 font-medium">Applicant</th>
                    <th className="py-3 px-4 font-medium">Course</th>
                    <th className="py-3 px-4 font-medium">Contact & Address</th>
                    <th className="py-3 px-4 font-medium">Submitted</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAdmissions.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold">{app.name}</div>
                        {app.guardianName && (
                          <div className="text-xs text-muted-foreground">
                            Guardian: {app.guardianName}
                            {app.guardianPhone ? ` (${app.guardianPhone})` : ''}
                          </div>
                        )}
                        {app.message && (
                          <div className="text-xs italic text-muted-foreground mt-1 max-w-xs truncate">
                            &ldquo;{app.message}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {app.course?.name || 'Unknown Course'}
                        </div>
                        {app.course?.fees !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            Fee: ৳{app.course.fees.toLocaleString('en-BD')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div>{app.phone}</div>
                        {app.email && (
                          <div className="text-xs text-muted-foreground">
                            {app.email}
                          </div>
                        )}
                        {app.address && (
                          <div className="text-xs text-muted-foreground">
                            {app.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {app.status === 'PENDING' && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                        {app.status === 'APPROVED' && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </Badge>
                        )}
                        {app.status === 'REJECTED' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Rejected
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {app.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => openApproveModal(app)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(app.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Processed
                          </span>
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

      {/* Approve & Batch Assignment Modal */}
      {approvingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Approve & Enroll Student</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enrolling <strong>{approvingApp.name}</strong> into{' '}
                <strong>{approvingApp.course?.name}</strong>. This will create a
                Student account (default password: phone number).
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  approveMutation.mutate({
                    id: approvingApp.id,
                    batchId: selectedBatchId || undefined,
                    guardianName,
                    guardianPhone,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assign to Batch
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    <option value="">Unassigned (assign later)</option>
                    {availableBatchesForModal.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Guardian Name
                  </label>
                  <Input
                    placeholder="Guardian full name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Guardian Phone
                  </label>
                  <Input
                    placeholder="01XXXXXXXXX"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApprovingApp(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={approveMutation.isPending}>
                    {approveMutation.isPending
                      ? 'Enrolling...'
                      : 'Confirm Enrollment'}
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
