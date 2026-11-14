'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCheck, Save } from 'lucide-react';

type StatusOption = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface SheetRow {
  studentId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email: string;
  status: StatusOption;
  remarks: string;
  isMarked: boolean;
}

function StudentSelfAttendanceView() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => get<any>('/attendance/me'),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading your attendance summary...
      </p>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No student attendance profile found.
        </CardContent>
      </Card>
    );
  }

  const { student, summary, records = [] } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-sm text-muted-foreground">
          {student.batch
            ? `${student.batch.course?.name || 'Course'} — Batch: ${student.batch.name}`
            : 'Not assigned to a batch yet'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.attendanceRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {summary.present}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Absent / Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {summary.absent} / {summary.late}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No attendance sessions have been recorded yet.
            </p>
          ) : (
            <div className="divide-y border rounded-md">
              {records.map((rec: any) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {new Date(rec.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rec.batch?.name}
                      {rec.remarks ? ` — ${rec.remarks}` : ''}
                    </div>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialBatchId = searchParams.get('batchId') || '';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rows, setRows] = useState<SheetRow[]>([]);

  const isStudent = user?.role === 'STUDENT';

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
    enabled: !isStudent,
  });

  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const { data: sheetData, isLoading: isLoadingSheet } = useQuery({
    queryKey: ['attendance-sheet', selectedBatchId, selectedDate],
    queryFn: () =>
      get<any>(`/attendance/batch/${selectedBatchId}?date=${selectedDate}`),
    enabled: !isStudent && Boolean(selectedBatchId),
  });

  useEffect(() => {
    if (sheetData?.students) {
      setRows(sheetData.students);
    }
  }, [sheetData]);

  const saveMutation = useMutation({
    mutationFn: () =>
      post('/attendance/batch', {
        batchId: selectedBatchId,
        date: selectedDate,
        records: rows.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks || undefined,
        })),
      }),
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      queryClient.invalidateQueries({
        queryKey: ['attendance-sheet', selectedBatchId, selectedDate],
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save attendance');
    },
  });

  if (isStudent) {
    return <StudentSelfAttendanceView />;
  }

  const updateRowStatus = (studentId: string, status: StatusOption) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, status } : row,
      ),
    );
  };

  const updateRowRemarks = (studentId: string, remarks: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, remarks } : row,
      ),
    );
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((row) => ({ ...row, status: 'PRESENT' })));
  };

  const counts = {
    present: rows.filter((r) => r.status === 'PRESENT').length,
    absent: rows.filter((r) => r.status === 'ABSENT').length,
    late: rows.filter((r) => r.status === 'LATE').length,
    excused: rows.filter((r) => r.status === 'EXCUSED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Batch Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Select a batch and class date to mark or update student attendance.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              <CheckCheck className="h-4 w-4 mr-1.5" /> Mark All Present
            </Button>
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        )}
      </div>

      {/* Batch & Date Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Batch
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                <option value="">Choose a batch...</option>
                {batches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.course?.name ? `(${b.course.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Session Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">Present: {counts.present}</Badge>
              <Badge variant="destructive">Absent: {counts.absent}</Badge>
              <Badge variant="outline">Late: {counts.late}</Badge>
              <Badge variant="outline">Excused: {counts.excused}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Sheet */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Attendance Sheet ({selectedDate})
          </CardTitle>
          {sheetData?.isAlreadyMarked && (
            <Badge className="bg-emerald-600 text-white">
              Previously Marked
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!selectedBatchId ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Please select a batch to load its enrolled students.
            </p>
          ) : isLoadingSheet ? (
            <p className="text-sm text-muted-foreground">
              Loading students for this batch...
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active students are enrolled in this batch yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-4 font-medium">Student</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {row.firstName} {row.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.phone || row.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              'PRESENT',
                              'ABSENT',
                              'LATE',
                              'EXCUSED',
                            ] as StatusOption[]
                          ).map((st) => (
                            <Button
                              key={st}
                              type="button"
                              size="sm"
                              variant={
                                row.status === st
                                  ? st === 'ABSENT'
                                    ? 'destructive'
                                    : 'default'
                                  : 'outline'
                              }
                              onClick={() => updateRowStatus(row.studentId, st)}
                            >
                              {st}
                            </Button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          placeholder="Optional note..."
                          value={row.remarks}
                          onChange={(e) =>
                            updateRowRemarks(row.studentId, e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
