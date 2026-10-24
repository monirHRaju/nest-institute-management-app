'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import {
  BarChart,
  Calendar,
  Download,
  Printer,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  GraduationCap,
  Filter,
} from 'lucide-react';
import type {
  AttendanceReportSummary,
  FinancialReportSummary,
  AdmissionsReportSummary,
  BatchRecord,
} from '@repo/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ReportTab = 'attendance' | 'financial' | 'admissions';

export default function ExecutiveReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Fetch batches for filter dropdown
  const { data: batches = [] } = useQuery<BatchRecord[]>({
    queryKey: ['batches-all'],
    queryFn: () => get('/batches'),
  });

  // Build query string params
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);
  if (selectedBatchId && activeTab === 'attendance') {
    queryParams.set('batchId', selectedBatchId);
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  // 1. Attendance Report Query
  const { data: attendanceReport, isLoading: loadingAttendance } = useQuery<AttendanceReportSummary>({
    queryKey: ['report-attendance', startDate, endDate, selectedBatchId],
    queryFn: () => get(`/reports/attendance${queryString}`),
    enabled: activeTab === 'attendance',
  });

  // 2. Financial Report Query
  const { data: financialReport, isLoading: loadingFinancial } = useQuery<FinancialReportSummary>({
    queryKey: ['report-financial', startDate, endDate],
    queryFn: () => get(`/reports/financial${queryString}`),
    enabled: activeTab === 'financial',
  });

  // 3. Admissions Report Query
  const { data: admissionsReport, isLoading: loadingAdmissions } = useQuery<AdmissionsReportSummary>({
    queryKey: ['report-admissions', startDate, endDate],
    queryFn: () => get(`/reports/admissions${queryString}`),
    enabled: activeTab === 'admissions',
  });

  // Quick Date Range presets
  const applyPreset = (preset: 'all' | 'this_month' | 'last_30' | 'this_year') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstJan = new Date(today.getFullYear(), 0, 1);
      setStartDate(firstJan.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeTab === 'attendance' && attendanceReport) {
      csvContent += 'Batch Name,Course,Total Sessions,Attendance Rate (%),Present,Absent\n';
      attendanceReport.batchStats.forEach((b) => {
        csvContent += `"${b.batchName}","${b.courseName}",${b.totalSessions},${b.averageRate}%,${b.presentCount},${b.absentCount}\n`;
      });
      csvContent += '\n\nAt Risk Students (<60% Attendance)\n';
      csvContent += 'Student Code,Student Name,Batch,Sessions Logged,Rate (%)\n';
      attendanceReport.atRiskStudents.forEach((s) => {
        csvContent += `"${s.systemId}","${s.name}","${s.batchName}",${s.sessions},${s.rate}%\n`;
      });
      downloadFile(csvContent, `attendance-report-${timestamp}.csv`);
    } else if (activeTab === 'financial' && financialReport) {
      csvContent += 'Financial Metrics Statement\n';
      csvContent += `Total Invoiced,${financialReport.totalInvoiced}\n`;
      csvContent += `Total Collected,${financialReport.totalCollected}\n`;
      csvContent += `Outstanding Balance,${financialReport.totalOutstanding}\n`;
      csvContent += `Collection Rate,${financialReport.collectionRate}%\n\n`;

      csvContent += 'Payment Methods Breakdown\n';
      csvContent += 'Method,Total Amount\n';
      Object.entries(financialReport.methodBreakdown).forEach(([method, total]) => {
        csvContent += `"${method}",${total}\n`;
      });

      csvContent += '\nCourse Revenue Leaderboard\n';
      csvContent += 'Course Title,Total Billed,Total Collected,Total Due\n';
      financialReport.courseRevenue.forEach((cr) => {
        csvContent += `"${cr.courseName}",${cr.totalBilled},${cr.totalCollected},${cr.totalDue}\n`;
      });
      downloadFile(csvContent, `financial-report-${timestamp}.csv`);
    } else if (activeTab === 'admissions' && admissionsReport) {
      csvContent += 'Admissions & Enrollment Statement\n';
      csvContent += `Total Students,${admissionsReport.totalStudents}\n`;
      csvContent += `Active Students,${admissionsReport.activeStudents}\n`;
      csvContent += `New Admissions This Month,${admissionsReport.newAdmissionsThisMonth}\n\n`;

      csvContent += 'Course Popularity & Distribution\n';
      csvContent += 'Course Title,Total Students,Share (%)\n';
      admissionsReport.courseDistribution.forEach((cp) => {
        csvContent += `"${cp.courseName}",${cp.count},${cp.percentage}%\n`;
      });
      downloadFile(csvContent, `admissions-report-${timestamp}.csv`);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const encodedUri = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper stats for attendance status summary
  const totalPresentLogs = attendanceReport?.batchStats.reduce((acc, b) => acc + b.presentCount, 0) || 0;
  const totalAbsentLogs = attendanceReport?.batchStats.reduce((acc, b) => acc + b.absentCount, 0) || 0;
  const totalLateLogs = attendanceReport?.batchStats.reduce((acc, b) => acc + b.lateCount, 0) || 0;
  const totalExcusedLogs = attendanceReport?.batchStats.reduce((acc, b) => acc + b.excusedCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden during print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Reports Hub</h1>
          <p className="text-muted-foreground">
            Holistic institutional intelligence across attendance, financial collections, and student admissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Printable Report Header (only visible when printing) */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">EduManage Institutional Audit Report</h1>
        <p className="text-sm text-muted-foreground">
          Category: {activeTab.toUpperCase()} | Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </p>
        {(startDate || endDate) && (
          <p className="text-xs text-muted-foreground mt-1">
            Date Scope: {startDate || 'Beginning'} to {endDate || 'Present'}
          </p>
        )}
      </div>

      {/* Tab Navigation - Hidden during print */}
      <div className="flex border-b border-border gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Attendance Performance
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'financial'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Financial & Collections
        </button>
        <button
          onClick={() => setActiveTab('admissions')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'admissions'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Admissions & Trends
        </button>
      </div>

      {/* Date Filter & Preset Controls */}
      <Card className="print:hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-2">
              <Filter className="h-3 w-3" /> Presets:
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => applyPreset('all')}>All Time</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => applyPreset('this_month')}>This Month</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => applyPreset('last_30')}>Last 30 Days</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => applyPreset('this_year')}>Year to Date</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            {activeTab === 'attendance' && (
              <div>
                <Label className="text-xs">Filter by Batch (Optional)</Label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.course?.title || b.course?.name})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: ATTENDANCE PERFORMANCE REPORT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {loadingAttendance ? (
            <div className="p-12 text-center text-muted-foreground">Gathering attendance telemetry...</div>
          ) : !attendanceReport ? (
            <div className="p-12 text-center text-muted-foreground">No attendance records found for this period.</div>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{attendanceReport.averageRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Across all logged sessions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{attendanceReport.totalSessions}</div>
                    <p className="text-xs text-muted-foreground mt-1">Unique batch session dates</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Present Check-ins</CardTitle>
                    <Users className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalPresentLogs}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Late: {totalLateLogs} | Excused: {totalExcusedLogs}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Absent Count</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{totalAbsentLogs}</div>
                    <p className="text-xs text-muted-foreground mt-1">Missed student sessions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Batch Performance Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Batch Attendance Performance</CardTitle>
                  <CardDescription>
                    Aggregated presence rates per cohort to identify engaged vs underperforming classes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="p-3">Batch Name</th>
                          <th className="p-3">Course</th>
                          <th className="p-3 text-center">Sessions</th>
                          <th className="p-3">Attendance Rate</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceReport.batchStats.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-muted-foreground">
                              No batches recorded attendance in this window.
                            </td>
                          </tr>
                        ) : (
                          attendanceReport.batchStats.map((b) => {
                            const isGood = b.averageRate >= 80;
                            const isWarning = b.averageRate >= 60 && b.averageRate < 80;
                            return (
                              <tr key={b.batchId} className="hover:bg-muted/50">
                                <td className="p-3 font-medium">{b.batchName}</td>
                                <td className="p-3 text-muted-foreground">{b.courseName}</td>
                                <td className="p-3 text-center font-mono">{b.totalSessions}</td>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-32 bg-secondary h-2.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          isGood ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(b.averageRate, 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-xs">{b.averageRate}%</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <Badge
                                    variant="outline"
                                    className={
                                      isGood
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : isWarning
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }
                                  >
                                    {isGood ? 'Optimal' : isWarning ? 'Moderate' : 'Action Required'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Students (< 60% Attendance) */}
              <Card className="border-red-200 dark:border-red-900/40">
                <CardHeader className="bg-red-50/50 dark:bg-red-950/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-base text-red-800 dark:text-red-400">
                        At-Risk Students Watchlist (Attendance &lt; 60%)
                      </CardTitle>
                      <CardDescription>
                        Students exhibiting chronic absenteeism requiring counselor intervention or academic notice.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="p-3">Student</th>
                          <th className="p-3">ID Code</th>
                          <th className="p-3">Batch</th>
                          <th className="p-3 text-center">Sessions Logged</th>
                          <th className="p-3 text-right">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceReport.atRiskStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-emerald-600 font-medium">
                              🎉 Excellent! No students are currently below the 60% attendance threshold.
                            </td>
                          </tr>
                        ) : (
                          attendanceReport.atRiskStudents.map((s) => (
                            <tr key={`${s.studentId}-${s.batchName}`} className="hover:bg-red-50/30">
                              <td className="p-3 font-medium text-foreground">{s.name}</td>
                              <td className="p-3 font-mono text-xs">{s.systemId}</td>
                              <td className="p-3 text-muted-foreground">{s.batchName}</td>
                              <td className="p-3 text-center font-mono">
                                {s.sessions} sessions
                              </td>
                              <td className="p-3 text-right">
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 font-bold">
                                  {s.rate}%
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 2: FINANCIAL & COLLECTIONS STATEMENT */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {loadingFinancial ? (
            <div className="p-12 text-center text-muted-foreground">Aggregating financial ledger data...</div>
          ) : !financialReport ? (
            <div className="p-12 text-center text-muted-foreground">No financial records found for this period.</div>
          ) : (
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                    <Layers className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-mono">
                      ৳{financialReport.totalInvoiced.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">All billings generated</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600 font-mono">
                      ৳{financialReport.totalCollected.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Realized income deposited</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Dues</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600 font-mono">
                      ৳{financialReport.totalOutstanding.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Unpaid receivables balance</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{financialReport.collectionRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Collected vs total billed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Method Breakdown & Monthly Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Collections by Payment Method</CardTitle>
                    <CardDescription>Breakdown of gateway and cash channel receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.keys(financialReport.methodBreakdown).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No payments recorded</p>
                    ) : (
                      Object.entries(financialReport.methodBreakdown).map(([method, total]) => {
                        const pct = financialReport.totalCollected > 0
                          ? Math.round((total / financialReport.totalCollected) * 100)
                          : 0;
                        return (
                          <div key={method} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium capitalize">{method.toLowerCase().replace('_', ' ')}</span>
                              <span className="font-mono text-muted-foreground">
                                ৳{total.toLocaleString()} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Billing Collections</CardTitle>
                    <CardDescription>Cash intake velocity over recent operational months</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="p-3">Month</th>
                            <th className="p-3 text-center">Transactions</th>
                            <th className="p-3 text-right">Collected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {financialReport.monthlyCollections.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                No billing records in period.
                              </td>
                            </tr>
                          ) : (
                            financialReport.monthlyCollections.map((m) => (
                              <tr key={m.month}>
                                <td className="p-3 font-medium">{m.month}</td>
                                <td className="p-3 text-center font-mono text-xs">{m.count}</td>
                                <td className="p-3 text-right font-mono text-xs text-emerald-600 font-bold">
                                  ৳{m.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Course Revenue Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Course Program</CardTitle>
                  <CardDescription>Academic offering financial productivity and total collected revenue</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="p-3">Course Program</th>
                          <th className="p-3 text-right">Total Invoiced</th>
                          <th className="p-3 text-right">Collected Revenue</th>
                          <th className="p-3 text-right">Outstanding Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {financialReport.courseRevenue.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground">
                              No course revenue records found.
                            </td>
                          </tr>
                        ) : (
                          financialReport.courseRevenue.map((cr) => (
                            <tr key={cr.courseId} className="hover:bg-muted/50">
                              <td className="p-3 font-medium flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-primary" />
                                {cr.courseName}
                              </td>
                              <td className="p-3 text-right font-mono text-xs">
                                ৳{cr.totalBilled.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                ৳{cr.totalCollected.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono text-xs text-amber-600">
                                ৳{cr.totalDue.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 3: ADMISSIONS & ACADEMIC TRENDS */}
      {activeTab === 'admissions' && (
        <div className="space-y-6">
          {loadingAdmissions ? (
            <div className="p-12 text-center text-muted-foreground">Compiling admissions statistics...</div>
          ) : !admissionsReport ? (
            <div className="p-12 text-center text-muted-foreground">No admissions records found.</div>
          ) : (
            <>
              {/* Admissions KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{admissionsReport.totalStudents}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total student admissions recorded</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">{admissionsReport.activeStudents}</div>
                    <p className="text-xs text-muted-foreground mt-1">Currently attending classes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{admissionsReport.newAdmissionsThisMonth}</div>
                    <p className="text-xs text-muted-foreground mt-1">Admitted within past 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Course Popularity & Share */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Course Distribution & Market Share</CardTitle>
                    <CardDescription>Proportional distribution of enrollments across courses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {admissionsReport.courseDistribution.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No enrollment data</p>
                    ) : (
                      admissionsReport.courseDistribution.map((cp) => (
                        <div key={cp.courseId} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{cp.courseName}</span>
                            <span className="font-mono text-muted-foreground">
                              {cp.count} students ({cp.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${cp.percentage}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Admissions Velocity</CardTitle>
                    <CardDescription>New student admissions registered per calendar month</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="p-3">Month</th>
                            <th className="p-3 text-right">Admissions</th>
                            <th className="p-3 text-right">Share of Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {admissionsReport.monthlyAdmissions.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                No admissions recorded in this period.
                              </td>
                            </tr>
                          ) : (
                            admissionsReport.monthlyAdmissions.map((mt) => {
                              const share = admissionsReport.totalStudents > 0
                                ? Math.round((mt.count / admissionsReport.totalStudents) * 100)
                                : 0;
                              return (
                                <tr key={mt.month}>
                                  <td className="p-3 font-medium">{mt.month}</td>
                                  <td className="p-3 text-right font-mono font-bold">{mt.count}</td>
                                  <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                                    {share}%
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
