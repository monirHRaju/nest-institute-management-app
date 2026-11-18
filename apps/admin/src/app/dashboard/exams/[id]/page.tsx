'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ReportCardPrintModal } from '@/components/report-card-print-modal';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Save,
  Trophy,
} from 'lucide-react';

interface RowDraft {
  marksObtained: string;
  isAbsent: boolean;
  remarks: string;
}

export default function ExamMarksPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [reportCard, setReportCard] = useState<any | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['exam-results', examId],
    queryFn: () => get(`/exams/${examId}/results`),
    enabled: Boolean(examId),
  });

  useEffect(() => {
    if (!data?.entries) return;
    const initial: Record<string, RowDraft> = {};
    for (const entry of data.entries) {
      initial[entry.studentId] = {
        marksObtained:
          entry.marksObtained !== null && entry.marksObtained !== undefined
            ? String(entry.marksObtained)
            : '0',
        isAbsent: Boolean(entry.isAbsent),
        remarks: entry.remarks || '',
      };
    }
    setDrafts(initial);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (results: any[]) => put(`/exams/${examId}/results`, { results }),
    onSuccess: () => {
      toast.success('Marks saved & grades computed');
      queryClient.invalidateQueries({ queryKey: ['exam-results', examId] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save marks');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => post(`/exams/${examId}/publish`, {}),
    onSuccess: () => {
      toast.success('Exam published to students');
      queryClient.invalidateQueries({ queryKey: ['exam-results', examId] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to publish');
    },
  });

  const handleSaveAll = () => {
    if (!data?.entries?.length) return;
    const payload = data.entries.map((e: any) => {
      const d = drafts[e.studentId] || {
        marksObtained: '0',
        isAbsent: false,
        remarks: '',
      };
      return {
        studentId: e.studentId,
        marksObtained: d.isAbsent ? 0 : Number(d.marksObtained || 0),
        isAbsent: d.isAbsent,
        remarks: d.remarks.trim() || undefined,
      };
    });
    saveMutation.mutate(payload);
  };

  const openStudentReportCard = async (studentId: string) => {
    try {
      const term = data?.exam?.term
        ? `?term=${encodeURIComponent(data.exam.term)}`
        : '';
      const rc = await get(`/exams/student/${studentId}/report-card${term}`);
      setReportCard(rc);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load report card');
    }
  };

  if (isLoading || !data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading exam marks sheet...
      </div>
    );
  }

  const { exam, summary, entries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/exams"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Exams
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.name}</h1>
            <Badge variant={exam.status === 'PUBLISHED' ? 'default' : 'secondary'}>
              {exam.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {exam.batch?.name} · {exam.course?.name} · Total: {Number(exam.totalMarks)} ·
            Pass: {Number(exam.passMarks)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || entries.length === 0}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save All Marks'}
          </Button>
          {exam.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Graded</div>
            <div className="text-2xl font-bold mt-1">
              {summary.gradedCount} / {summary.totalStudents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Class Average</div>
            <div className="text-2xl font-bold mt-1">{summary.classAverage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Highest Score</div>
            <div className="text-2xl font-bold text-primary mt-1">
              {summary.highestMarks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Pass / Fail</div>
            <div className="text-2xl font-bold mt-1">
              <span className="text-emerald-600">{summary.passCount}</span> /{' '}
              <span className="text-rose-600">{summary.failCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marks Grid & Merit List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Marks Entry &amp; Merit List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No students are currently enrolled in this batch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-2 font-medium">Rank</th>
                    <th className="py-3 px-2 font-medium">Student</th>
                    <th className="py-3 px-2 font-medium">Absent</th>
                    <th className="py-3 px-2 font-medium">
                      Marks (/{Number(exam.totalMarks)})
                    </th>
                    <th className="py-3 px-2 font-medium">Grade</th>
                    <th className="py-3 px-2 font-medium">Remarks</th>
                    <th className="py-3 px-2 font-medium text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry: any) => {
                    const d = drafts[entry.studentId] || {
                      marksObtained: '0',
                      isAbsent: false,
                      remarks: '',
                    };
                    return (
                      <tr key={entry.studentId} className="hover:bg-muted/40">
                        <td className="py-2.5 px-2 font-semibold">
                          {entry.rank ? `#${entry.rank}` : '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-medium">
                            {entry.student.firstName} {entry.student.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.student.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="checkbox"
                            checked={d.isAbsent}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [entry.studentId]: {
                                  ...d,
                                  isAbsent: e.target.checked,
                                },
                              })
                            }
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <Input
                            type="number"
                            min={0}
                            max={Number(exam.totalMarks)}
                            step="0.5"
                            disabled={d.isAbsent}
                            className="w-28 h-8"
                            value={d.isAbsent ? '0' : d.marksObtained}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [entry.studentId]: {
                                  ...d,
                                  marksObtained: e.target.value,
                                },
                              })
                            }
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          {entry.grade ? (
                            <Badge variant={entry.passed ? 'default' : 'destructive'}>
                              {entry.grade}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <Input
                            placeholder="Optional remarks"
                            className="h-8 min-w-[160px]"
                            value={d.remarks}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [entry.studentId]: {
                                  ...d,
                                  remarks: e.target.value,
                                },
                              })
                            }
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openStudentReportCard(entry.studentId)}
                            title="View & Print Report Card"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
