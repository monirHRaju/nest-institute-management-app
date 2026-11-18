'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ReportCardPrintModal } from '@/components/report-card-print-modal';
import { toast } from 'sonner';
import {
  Award,
  CheckCircle2,
  ClipboardEdit,
  FileText,
  GraduationCap,
  Plus,
  Settings2,
  X,
} from 'lucide-react';

export default function ExamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'TENANT_ADMIN';

  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [reportCard, setReportCard] = useState<any | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'MIDTERM',
    term: '',
    date: new Date().toISOString().slice(0, 10),
    totalMarks: '100',
    passMarks: '40',
    batchId: '',
  });

  const [scalesDraft, setScalesDraft] = useState<any[]>([]);

  // Student view data
  const { data: myResultsData, isLoading: loadingMyResults } = useQuery<any>({
    queryKey: ['my-exam-results'],
    queryFn: () => get('/exams/me/results'),
    enabled: isStudent,
  });

  // Admin / Staff / Instructor data
  const { data: exams = [], isLoading } = useQuery<any[]>({
    queryKey: ['exams', batchFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (batchFilter) params.set('batchId', batchFilter);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      return get<any[]>(`/exams${qs ? `?${qs}` : ''}`);
    },
    enabled: !isStudent,
  });

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
    enabled: !isStudent,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/exams', payload),
    onSuccess: () => {
      toast.success('Exam created');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        type: 'MIDTERM',
        term: '',
        date: new Date().toISOString().slice(0, 10),
        totalMarks: '100',
        passMarks: '40',
        batchId: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create exam');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => post(`/exams/${id}/publish`, {}),
    onSuccess: () => {
      toast.success('Exam results published to students');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to publish exam');
    },
  });

  const saveScalesMutation = useMutation({
    mutationFn: (scales: any[]) => put('/exams/grade-scales', { scales }),
    onSuccess: () => {
      toast.success('Grade scale updated');
      setShowScaleModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save grade scale');
    },
  });

  const openGradeScaleModal = async () => {
    try {
      const data = await get<any[]>('/exams/grade-scales');
      setScalesDraft(
        data.map((s) => ({
          grade: s.grade,
          minPercent: Number(s.minPercent),
          maxPercent: Number(s.maxPercent),
          gpaPoint: Number(s.gpaPoint),
        })),
      );
      setShowScaleModal(true);
    } catch (err: any) {
      toast.error('Failed to load grade scales');
    }
  };

  const openMyReportCard = async () => {
    if (!myResultsData?.student?.id) return;
    try {
      const data = await get(
        `/exams/student/${myResultsData.student.id}/report-card`,
      );
      setReportCard(data);
    } catch (err: any) {
      toast.error('Failed to load report card');
    }
  };

  if (isStudent) {
    const results = myResultsData?.results || [];
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Exam Results</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View your published exam scores, grades, and download your report card.
            </p>
          </div>
          {myResultsData?.student?.id && (
            <Button onClick={openMyReportCard}>
              <FileText className="h-4 w-4 mr-2" />
              View Report Card
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Published Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMyResults ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No published exam results available yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 px-2 font-medium">Exam</th>
                      <th className="py-3 px-2 font-medium">Course</th>
                      <th className="py-3 px-2 font-medium">Date</th>
                      <th className="py-3 px-2 font-medium text-right">Marks</th>
                      <th className="py-3 px-2 font-medium text-center">Grade</th>
                      <th className="py-3 px-2 font-medium text-right">GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-3 px-2 font-medium">{r.exam.name}</td>
                        <td className="py-3 px-2">{r.exam.course?.name}</td>
                        <td className="py-3 px-2">
                          {new Date(r.exam.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold">
                          {r.isAbsent
                            ? 'ABS'
                            : `${Number(r.marksObtained)} / ${Number(r.exam.totalMarks)}`}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge>{r.grade || '—'}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {r.gpaPoint !== null ? Number(r.gpaPoint).toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <ReportCardPrintModal
          reportCard={reportCard}
          onClose={() => setReportCard(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams &amp; Results</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create exams, enter marks, publish merit lists, and generate report cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={openGradeScaleModal}>
              <Settings2 className="h-4 w-4 mr-2" />
              Grade Scale
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.course?.name})
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
          </select>
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Exams ({exams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No exams created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-2 font-medium">Exam</th>
                    <th className="py-3 px-2 font-medium">Batch / Course</th>
                    <th className="py-3 px-2 font-medium">Date</th>
                    <th className="py-3 px-2 font-medium">Marks (Pass/Total)</th>
                    <th className="py-3 px-2 font-medium">Graded</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map((ex: any) => (
                    <tr key={ex.id} className="hover:bg-muted/40">
                      <td className="py-3 px-2">
                        <div className="font-medium">{ex.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ex.type}
                          {ex.term ? ` · ${ex.term}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>{ex.batch?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ex.course?.name}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {new Date(ex.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        {Number(ex.passMarks)} / {Number(ex.totalMarks)}
                      </td>
                      <td className="py-3 px-2">
                        {ex._count?.results ?? 0} / {ex.batch?._count?.students ?? 0}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={ex.status === 'PUBLISHED' ? 'default' : 'secondary'}
                        >
                          {ex.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/exams/${ex.id}`}>
                            <ClipboardEdit className="h-3.5 w-3.5 mr-1.5" />
                            Marks &amp; Results
                          </Link>
                        </Button>
                        {ex.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate(ex.id)}
                            disabled={publishMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Publish
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

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Create Exam</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({
                    name: createForm.name.trim(),
                    type: createForm.type,
                    term: createForm.term.trim() || undefined,
                    date: createForm.date,
                    totalMarks: Number(createForm.totalMarks),
                    passMarks: Number(createForm.passMarks),
                    batchId: createForm.batchId,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Exam Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Midterm Assessment"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Batch *</Label>
                  <select
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={createForm.batchId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, batchId: e.target.value })
                    }
                  >
                    <option value="">Select a batch...</option>
                    {batches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.course?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={createForm.type}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, type: e.target.value })
                      }
                    >
                      <option value="QUIZ">QUIZ</option>
                      <option value="MIDTERM">MIDTERM</option>
                      <option value="FINAL">FINAL</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </div>
                  <div>
                    <Label>Term / Session</Label>
                    <Input
                      placeholder="e.g. Spring 2026"
                      value={createForm.term}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, term: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      required
                      value={createForm.date}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Total Marks *</Label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={createForm.totalMarks}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, totalMarks: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Pass Marks *</Label>
                    <Input
                      type="number"
                      min={0}
                      required
                      value={createForm.passMarks}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, passMarks: e.target.value })
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
                    {createMutation.isPending ? 'Creating...' : 'Create Exam'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grade Scale Modal */}
      {showScaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Grade Scale Configuration</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowScaleModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                  <span>Grade</span>
                  <span>Min %</span>
                  <span>Max %</span>
                  <span>GPA</span>
                </div>
                {scalesDraft.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      value={s.grade}
                      onChange={(e) => {
                        const next = [...scalesDraft];
                        next[idx].grade = e.target.value;
                        setScalesDraft(next);
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={s.minPercent}
                      onChange={(e) => {
                        const next = [...scalesDraft];
                        next[idx].minPercent = Number(e.target.value);
                        setScalesDraft(next);
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={s.maxPercent}
                      onChange={(e) => {
                        const next = [...scalesDraft];
                        next[idx].maxPercent = Number(e.target.value);
                        setScalesDraft(next);
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={s.gpaPoint}
                      onChange={(e) => {
                        const next = [...scalesDraft];
                        next[idx].gpaPoint = Number(e.target.value);
                        setScalesDraft(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowScaleModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => saveScalesMutation.mutate(scalesDraft)}
                  disabled={saveScalesMutation.isPending}
                >
                  {saveScalesMutation.isPending ? 'Saving...' : 'Save Grade Scale'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
