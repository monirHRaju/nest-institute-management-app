'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Users,
  BarChart3,
  CheckCheck,
  CalendarDays,
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AttendanceStatus,
  BatchAttendanceSheetResponse,
  BatchAttendanceStats,
} from '@repo/shared';
import { ALL_DAYS } from '@/components/class-schedule-selector';

interface StudentAttendanceRow {
  studentId: string;
  systemId: string;
  firstName: string;
  lastName: string;
  phone: string;
  rollNumber?: string | null;
  classDays?: string[];
  classTime?: string | null;
  attendanceId?: string | null;
  status: AttendanceStatus;
  notes: string;
}

export default function AttendancePage() {
  const t = useTranslations('attendance');
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);

  // 1. Fetch all batches for selector
  const { data: batches = [], isLoading: isLoadingBatches } = useQuery<any[]>({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  // Automatically select batch from URL param or default to first batch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBatchId = urlParams.get('batchId');
      if (urlBatchId && batches.some((b) => b.id === urlBatchId)) {
        setSelectedBatchId(urlBatchId);
        return;
      }
    }
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // 2. Fetch attendance sheet for selected batch and date
  const {
    data: sheetData,
    isLoading: isLoadingSheet,
    isFetching: isFetchingSheet,
  } = useQuery<BatchAttendanceSheetResponse>({
    queryKey: ['attendance-sheet', selectedBatchId, sessionDate],
    queryFn: () =>
      get<BatchAttendanceSheetResponse>(
        `/attendance/batch/${selectedBatchId}?date=${sessionDate}`,
      ),
    enabled: !!selectedBatchId,
  });

  // 3. Fetch cumulative batch statistics
  const { data: batchStats } = useQuery<BatchAttendanceStats>({
    queryKey: ['attendance-stats', selectedBatchId],
    queryFn: () =>
      get<BatchAttendanceStats>(`/attendance/batch/${selectedBatchId}/stats`),
    enabled: !!selectedBatchId,
  });

  // Sync rows state when sheet data loads
  useEffect(() => {
    if (sheetData?.students) {
      setRows(
        sheetData.students.map((s) => ({
          studentId: s.studentId,
          systemId: s.systemId,
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          rollNumber: s.rollNumber ?? null,
          classDays: s.classDays || [],
          classTime: s.classTime ?? null,
          attendanceId: s.attendanceId ?? null,
          status: s.status || AttendanceStatus.PRESENT,
          notes: s.notes || '',
        })),
      );
    } else {
      setRows([]);
    }
  }, [sheetData]);

  // Bulk set all students to a specific status
  const handleBulkSetStatus = (status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status,
      })),
    );
  };

  // Update a single student's status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    );
  };

  // Update notes for a student
  const handleNotesChange = (studentId: string, notes: string) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, notes } : r)),
    );
  };

  // Save Attendance Mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      post('/attendance/batch', {
        batchId: selectedBatchId,
        date: sessionDate,
        records: rows.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          notes: r.notes.trim() ? r.notes.trim() : undefined,
        })),
      }),
    onSuccess: () => {
      toast.success(t('saveSuccess'));
      queryClient.invalidateQueries({
        queryKey: ['attendance-sheet', selectedBatchId, sessionDate],
      });
      queryClient.invalidateQueries({
        queryKey: ['attendance-stats', selectedBatchId],
      });
      queryClient.invalidateQueries({
        queryKey: ['student'],
      });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to save attendance records',
      );
    },
  });

  // Compute live counts for current sheet
  const presentCount = rows.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const absentCount = rows.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const lateCount = rows.filter((r) => r.status === AttendanceStatus.LATE).length;
  const excusedCount = rows.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
  const totalCount = rows.length;
  const currentRate =
    totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {/* Global Save Button */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isFetchingSheet}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? t('saving') : t('saveAttendance')}
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Selection Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Batch Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('selectBatch')}
              </label>
              <select
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={isLoadingBatches}
              >
                <option value="">{t('chooseBatch')}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} {batch.course ? `(${batch.course.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {t('sessionDate')}
              </label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Batch Quick Details */}
            <div className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-semibold">{selectedBatch?.course?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-medium text-foreground">
                  {selectedBatch?.classTime || selectedBatch?.schedule || 'Flexible'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Row (If batch selected) */}
      {selectedBatchId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Session Rate</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    {totalCount > 0 ? `${currentRate}%` : 'N/A'}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {presentCount} Present · {lateCount} Late
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Enrolled Students</p>
                  <p className="text-2xl font-bold mt-1">{totalCount}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {absentCount} Absent · {excusedCount} Excused
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Sessions</p>
                  <p className="text-2xl font-bold mt-1">{batchStats?.totalSessions ?? 0}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Recorded to date</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Historical Rate</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {batchStats ? `${batchStats.averageRate}%` : '100%'}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <CheckCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">All sessions combined</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Roll Call Sheet */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Roll-Call Attendance Sheet
                {sheetData?.markedCount && sheetData.markedCount > 0 ? (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs ml-2">
                    Marked ({sheetData.markedCount}/{totalCount})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs ml-2">
                    Unsaved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                Mark status for each student and click "Save Attendance" to record.
              </CardDescription>
            </div>

            {/* Quick Bulk Actions */}
            {rows.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSetStatus(AttendanceStatus.PRESENT)}
                  className="text-xs h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  {t('markAllPresent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSetStatus(AttendanceStatus.ABSENT)}
                  className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                  {t('markAllAbsent')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!selectedBatchId ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="font-medium">{t('selectBatchPrompt')}</p>
            </div>
          ) : isLoadingSheet ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <p className="animate-pulse">Loading roll-call sheet...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="font-medium">{t('noStudentsInBatch')}</p>
              <p className="text-xs">
                Enroll students into this batch from the Student Management module.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-14 text-center">#</th>
                    <th className="py-3 px-4">{t('studentName')}</th>
                    <th className="py-3 px-4 hidden md:table-cell">{t('schedule')}</th>
                    <th className="py-3 px-4 min-w-[280px]">{t('status')}</th>
                    <th className="py-3 px-4 min-w-[200px]">{t('remarks')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => {
                    const isPresent = row.status === AttendanceStatus.PRESENT;
                    const isAbsent = row.status === AttendanceStatus.ABSENT;
                    const isLate = row.status === AttendanceStatus.LATE;
                    const isExcused = row.status === AttendanceStatus.EXCUSED;

                    return (
                      <tr
                        key={row.studentId}
                        className={`transition-colors hover:bg-muted/30 ${
                          isAbsent
                            ? 'bg-rose-50/30 dark:bg-rose-950/10'
                            : isLate
                            ? 'bg-amber-50/30 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        {/* Roll number or row number */}
                        <td className="py-3 px-4 text-center font-mono font-medium text-xs text-muted-foreground">
                          {row.rollNumber || index + 1}
                        </td>

                        {/* Student Info */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {row.firstName} {row.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {row.systemId} · {row.phone}
                          </div>
                        </td>

                        {/* Student Schedule (Class Days & Time) */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          {row.classDays && row.classDays.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {row.classDays.map((day) => {
                                const d = ALL_DAYS.find((item) => item.key === day);
                                return (
                                  <Badge
                                    key={day}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-medium"
                                  >
                                    {d?.label || day}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Standard</span>
                          )}
                          {row.classTime && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{row.classTime}</span>
                            </div>
                          )}
                        </td>

                        {/* Status Buttons */}
                        <td className="py-3 px-4">
                          <div className="inline-flex rounded-lg border p-1 bg-background shadow-xs gap-1">
                            {/* PRESENT */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row.studentId, AttendanceStatus.PRESENT)
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('present')}
                            </button>

                            {/* ABSENT */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row.studentId, AttendanceStatus.ABSENT)
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                isAbsent
                                  ? 'bg-destructive text-destructive-foreground shadow-xs'
                                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {t('absent')}
                            </button>

                            {/* LATE */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row.studentId, AttendanceStatus.LATE)
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                isLate
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-muted-foreground hover:text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              {t('late')}
                            </button>

                            {/* EXCUSED */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row.studentId, AttendanceStatus.EXCUSED)
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                isExcused
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-muted-foreground hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              {t('excused')}
                            </button>
                          </div>
                        </td>

                        {/* Remarks / Notes */}
                        <td className="py-3 px-4">
                          <Input
                            placeholder="Optional note..."
                            value={row.notes}
                            onChange={(e) =>
                              handleNotesChange(row.studentId, e.target.value)
                            }
                            className="h-8 text-xs bg-background"
                          />
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
    </div>
  );
}
