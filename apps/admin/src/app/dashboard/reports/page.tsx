'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Download,
  GraduationCap,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';

function downloadCsvString(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<
    'financial' | 'academic' | 'attendance' | 'enrollment' | 'payroll' | 'sms'
  >('financial');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: revenue, isLoading: loadingFinancial } = useQuery({
    queryKey: ['fees-revenue-report', from, to],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return get<any>(`/fees/revenue${q ? `?${q}` : ''}`);
    },
    enabled: tab === 'financial',
  });

  const { data: academic } = useQuery<any>({
    queryKey: ['reports-academic'],
    queryFn: () => get('/reports/academic'),
    enabled: tab === 'academic',
  });

  const { data: attendance } = useQuery<any>({
    queryKey: ['reports-attendance'],
    queryFn: () => get('/reports/attendance'),
    enabled: tab === 'attendance',
  });

  const { data: enrollment } = useQuery<any>({
    queryKey: ['reports-enrollment'],
    queryFn: () => get('/reports/enrollment'),
    enabled: tab === 'enrollment',
  });

  const { data: payroll } = useQuery<any>({
    queryKey: ['reports-payroll'],
    queryFn: () => get('/reports/payroll'),
    enabled: tab === 'payroll',
  });

  const { data: sms } = useQuery<any>({
    queryKey: ['reports-sms'],
    queryFn: () => get('/reports/sms'),
    enabled: tab === 'sms',
  });

  const kpis = revenue?.kpis;
  const trend = revenue?.monthlyTrend || [];
  const expensesByCategory: Record<string, number> =
    revenue?.expensesByCategory || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics &amp; Reports Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial, academic, attendance, enrollment, payroll, and SMS insights with CSV export.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          size="sm"
          variant={tab === 'financial' ? 'default' : 'ghost'}
          onClick={() => setTab('financial')}
        >
          <DollarSign className="h-4 w-4 mr-1.5" /> Financial
        </Button>
        <Button
          size="sm"
          variant={tab === 'academic' ? 'default' : 'ghost'}
          onClick={() => setTab('academic')}
        >
          <GraduationCap className="h-4 w-4 mr-1.5" /> Academic &amp; Exams
        </Button>
        <Button
          size="sm"
          variant={tab === 'attendance' ? 'default' : 'ghost'}
          onClick={() => setTab('attendance')}
        >
          <ClipboardCheck className="h-4 w-4 mr-1.5" /> Attendance
        </Button>
        <Button
          size="sm"
          variant={tab === 'enrollment' ? 'default' : 'ghost'}
          onClick={() => setTab('enrollment')}
        >
          <UserPlus className="h-4 w-4 mr-1.5" /> Enrollment Funnel
        </Button>
        <Button
          size="sm"
          variant={tab === 'payroll' ? 'default' : 'ghost'}
          onClick={() => setTab('payroll')}
        >
          <Wallet className="h-4 w-4 mr-1.5" /> Payroll
        </Button>
        <Button
          size="sm"
          variant={tab === 'sms' ? 'default' : 'ghost'}
          onClick={() => setTab('sms')}
        >
          <MessageSquare className="h-4 w-4 mr-1.5" /> SMS Usage
        </Button>
      </div>

      {/* 1. Financial Tab */}
      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="h-9 w-36 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-9 w-36 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {(from || to) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Revenue Collected
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  ৳{Number(kpis?.totalCollected || 0).toLocaleString('en-BD')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pending Dues
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  ৳{Number(kpis?.pendingDues || 0).toLocaleString('en-BD')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-700">
                  ৳{Number(kpis?.totalExpenses || 0).toLocaleString('en-BD')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Net Profit / Loss
                </CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ৳{Number(kpis?.netProfit || 0).toLocaleString('en-BD')}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  12-Month Revenue vs Expenses (BDT)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loadingFinancial ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Loading chart...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="collected"
                        name="Fee Collected"
                        fill="#16a34a"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#e11d48"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(expensesByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No expenses recorded.
                  </p>
                ) : (
                  Object.entries(expensesByCategory).map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-sm border-b pb-2"
                    >
                      <span className="font-medium">{cat}</span>
                      <span className="font-mono font-semibold">
                        ৳{Number(amt).toLocaleString('en-BD')}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Academic Tab */}
      {tab === 'academic' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-lg">
              Exam Performance Summary ({academic?.examCount || 0} Exams)
            </CardTitle>
            {academic?.csv && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsvString(academic.csv, 'academic-report.csv')
                }
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            {!academic?.examSummaries?.length ? (
              <div className="py-10 text-center text-muted-foreground">
                No exams found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2.5 px-2">Exam</th>
                      <th className="py-2.5 px-2">Batch / Course</th>
                      <th className="py-2.5 px-2 text-right">Graded</th>
                      <th className="py-2.5 px-2 text-right">Pass / Fail</th>
                      <th className="py-2.5 px-2 text-right">Pass Rate</th>
                      <th className="py-2.5 px-2 text-right">Avg Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {academic.examSummaries.map((ex: any) => (
                      <tr key={ex.examId}>
                        <td className="py-2.5 px-2 font-medium">{ex.examName}</td>
                        <td className="py-2.5 px-2">
                          {ex.batchName} — {ex.courseName}
                        </td>
                        <td className="py-2.5 px-2 text-right">{ex.gradedCount}</td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="text-emerald-600">{ex.passCount}</span> /{' '}
                          <span className="text-rose-600">{ex.failCount}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold">
                          {ex.passRate}%
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {ex.avgMarks} / {ex.totalMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Attendance Tab */}
      {tab === 'attendance' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-lg">
                Student Attendance Report ({attendance?.totalStudents || 0} Students)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Low-attendance alerts below {attendance?.threshold || 75}%:{' '}
                <strong className="text-rose-600">
                  {attendance?.lowAttendanceCount || 0} student(s)
                </strong>
              </p>
            </div>
            {attendance?.csv && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsvString(attendance.csv, 'attendance-report.csv')
                }
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            {!attendance?.students?.length ? (
              <div className="py-10 text-center text-muted-foreground">
                No student attendance data found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2.5 px-2">Code</th>
                      <th className="py-2.5 px-2">Student</th>
                      <th className="py-2.5 px-2">Batch</th>
                      <th className="py-2.5 px-2 text-right">Present / Total</th>
                      <th className="py-2.5 px-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.students.map((s: any) => (
                      <tr key={s.studentId}>
                        <td className="py-2.5 px-2 font-mono text-xs">
                          {s.studentCode}
                        </td>
                        <td className="py-2.5 px-2 font-medium">{s.studentName}</td>
                        <td className="py-2.5 px-2">{s.batchName}</td>
                        <td className="py-2.5 px-2 text-right">
                          {s.presentClasses} / {s.totalClasses}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Badge
                            variant={s.isLowAttendance ? 'destructive' : 'default'}
                          >
                            {s.attendanceRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Enrollment Funnel Tab */}
      {tab === 'enrollment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Applications</div>
                <div className="text-2xl font-bold">
                  {enrollment?.funnel?.totalApplications ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-2xl font-bold text-amber-600">
                  {enrollment?.funnel?.PENDING ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Approved</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {enrollment?.funnel?.APPROVED ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Rejected</div>
                <div className="text-2xl font-bold text-rose-600">
                  {enrollment?.funnel?.REJECTED ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-lg">Course Enrollment Breakdown</CardTitle>
              {enrollment?.csv && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadCsvString(enrollment.csv, 'enrollment-report.csv')
                  }
                >
                  <Download className="h-4 w-4 mr-1.5" /> Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2.5 px-2">Course</th>
                    <th className="py-2.5 px-2 text-right">Batches</th>
                    <th className="py-2.5 px-2 text-right">Applications</th>
                    <th className="py-2.5 px-2 text-right">Enrolled Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(enrollment?.byCourse || []).map((c: any) => (
                    <tr key={c.courseId}>
                      <td className="py-2.5 px-2 font-medium">{c.courseName}</td>
                      <td className="py-2.5 px-2 text-right">{c.batchCount}</td>
                      <td className="py-2.5 px-2 text-right">
                        {c.applicationsCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold">
                        {c.enrolledStudents}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Payroll Tab */}
      {tab === 'payroll' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-lg">
                Payroll Disbursement Summary ({payroll?.year || new Date().getFullYear()})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paid: <strong>৳{Number(payroll?.totalPaid || 0).toLocaleString()}</strong> ·
                Approved Pending:{' '}
                <strong>৳{Number(payroll?.totalApproved || 0).toLocaleString()}</strong>
              </p>
            </div>
            {payroll?.csv && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsvString(payroll.csv, 'payroll-report.csv')
                }
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            {!payroll?.records?.length ? (
              <div className="py-10 text-center text-muted-foreground">
                No payroll records found for this year.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2.5 px-2">Period</th>
                    <th className="py-2.5 px-2">Staff</th>
                    <th className="py-2.5 px-2 text-right">Net Amount</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payroll.records.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-2">{r.period}</td>
                      <td className="py-2.5 px-2 font-medium">
                        {r.staffName} ({r.designation})
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold">
                        ৳{Number(r.netAmount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant={r.status === 'PAID' ? 'default' : 'secondary'}
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. SMS Usage Tab */}
      {tab === 'sms' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-lg">
                SMS Gateway Usage ({sms?.totalLogs || 0} Dispatches)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Segments Sent:{' '}
                <strong>{sms?.totalSegmentsSent || 0}</strong> · Sent:{' '}
                <strong>{sms?.byStatus?.SENT || 0}</strong> · Failed:{' '}
                <strong className="text-rose-600">{sms?.byStatus?.FAILED || 0}</strong>
              </p>
            </div>
            {sms?.csv && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadCsvString(sms.csv, 'sms-usage-report.csv')}
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(sms?.byEvent || {}).map(([ev, cnt]) => (
                <div key={ev} className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">{ev}</div>
                  <div className="text-xl font-bold mt-1">{String(cnt)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
