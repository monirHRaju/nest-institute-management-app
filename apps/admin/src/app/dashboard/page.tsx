'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  Users,
  BookOpen,
  CreditCard,
  Calendar,
  GraduationCap,
  Clock,
  ClipboardCheck,
  BarChart,
  ArrowRight,
  Sparkles,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import type { BatchRecord, FinancialStatsSummary } from '@repo/shared';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DashboardPage() {
  const t = useTranslations('nav');
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';

  // 1. Students stats query
  const { data: studentsRes } = useQuery<{ meta: { total: number } }>({
    queryKey: ['students-stats'],
    queryFn: () => get('/students?limit=1'),
    enabled: !isSuperAdmin && !!user,
  });

  // 2. Courses query
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses'],
    queryFn: () => get('/courses'),
    enabled: !isSuperAdmin && !!user,
  });

  // 3. Batches query (backend automatically filters by instructorId when user.role === INSTRUCTOR)
  const { data: batches = [] } = useQuery<BatchRecord[]>({
    queryKey: ['batches-dashboard', user?.id],
    queryFn: () => get('/batches'),
    enabled: !isSuperAdmin && !!user,
  });

  // 4. Financial stats query (for tenant admins)
  const { data: feesStats } = useQuery<FinancialStatsSummary>({
    queryKey: ['fees-stats'],
    queryFn: () => get('/fees/stats'),
    enabled: !isSuperAdmin && !isInstructor && !!user,
  });

  // 5. Instructors stats query (for tenant admins)
  const { data: instructorsRes } = useQuery<{ meta: { total: number } }>({
    queryKey: ['instructors-stats'],
    queryFn: () => get('/instructors?limit=1'),
    enabled: !isSuperAdmin && !isInstructor && !!user,
  });

  // Today's Day Name
  const todayIndex = new Date().getDay();
  const todayDayName = DAYS_OF_WEEK[todayIndex];

  // For Instructors: Calculate classes scheduled for today
  const todaysClasses = batches.filter((b) => {
    if (b.classDays && Array.isArray(b.classDays)) {
      return b.classDays.includes(todayDayName);
    }
    if (b.schedule) {
      return b.schedule.toLowerCase().includes(todayDayName.toLowerCase());
    }
    return false;
  });

  const totalAssignedStudents = batches.reduce(
    (sum, b) => sum + (b._count?.enrollments || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.firstName}!
            </h1>
            {isInstructor && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Instructor Portal
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Multi-tenant SaaS administration and platform performance overview.'
              : isInstructor
              ? `Today is ${todayDayName}. Here are your assigned classes, sessions, and student roll-call tasks.`
              : 'Institutional operations overview, academic cohorts, and financial performance.'}
          </p>
        </div>

        {isInstructor && (
          <Button asChild className="gap-2">
            <Link href="/dashboard/attendance">
              <ClipboardCheck className="h-4 w-4" />
              Take Attendance
            </Link>
          </Button>
        )}
      </div>

      {/* SUPER ADMIN DASHBOARD */}
      {isSuperAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">Institutes running on platform</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform ARR</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">৳ 2.4M</div>
              <p className="text-xs text-muted-foreground mt-1">Subscription revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">99.98%</div>
              <p className="text-xs text-muted-foreground mt-1">API gateway uptime</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* INSTRUCTOR DASHBOARD */}
      {isInstructor && (
        <div className="space-y-6">
          {/* Instructor KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
                <CalendarDays className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{todaysClasses.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Scheduled for {todayDayName}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Assigned Batches</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{batches.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active student cohorts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAssignedStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">Enrolled across your classes</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Scheduled Classes Widget */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Today's Classes ({todayDayName})
                  </CardTitle>
                  <CardDescription>
                    Your active teaching sessions and quick roll-call attendance shortcuts for today.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/batches">View Timetable</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todaysClasses.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-base">No classes scheduled for today!</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    You have no teaching sessions on {todayDayName}. Check your weekly timetable in the batches view to review your schedule.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaysClasses.map((b) => (
                    <Card key={b.id} className="border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-base">{b.name}</h4>
                            <p className="text-xs text-muted-foreground">{b.course?.name || b.course?.title}</p>
                          </div>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {b.classTime || b.schedule || 'Regular Slot'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {b._count?.enrollments || 0} Students Enrolled
                          </span>
                          <Button size="sm" className="gap-1.5 h-8 text-xs" asChild>
                            <Link href={`/dashboard/attendance?batchId=${b.id}`}>
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              Mark Roll Call
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Assigned Batches Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All My Assigned Batches</CardTitle>
              <CardDescription>Overview of all cohorts under your academic instruction</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="p-3">Batch Name</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3 text-center">Enrolled</th>
                      <th className="p-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          You have not been assigned to any batches yet. Contact your institute administrator.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/50">
                          <td className="p-3 font-medium">{b.name}</td>
                          <td className="p-3 text-muted-foreground">{b.course?.name || b.course?.title}</td>
                          <td className="p-3 text-xs">
                            <span className="font-medium text-foreground">{b.classTime || b.schedule || 'TBD'}</span>
                            {b.classDays && b.classDays.length > 0 && (
                              <span className="text-muted-foreground block text-[11px]">
                                {b.classDays.join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">{b._count?.enrollments || 0}</td>
                          <td className="p-3 text-right">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                              <Link href={`/dashboard/attendance?batchId=${b.id}`}>
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Roll Call
                              </Link>
                            </Button>
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
      )}

      {/* TENANT ADMIN DASHBOARD */}
      {!isSuperAdmin && !isInstructor && (
        <div className="space-y-6">
          {/* Admin KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('students')}</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsRes?.meta?.total ?? '0'}</div>
                <p className="text-xs text-muted-foreground mt-1">Total student intake</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faculty</CardTitle>
                <GraduationCap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{instructorsRes?.meta?.total ?? '0'}</div>
                <p className="text-xs text-muted-foreground mt-1">Teaching instructors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('courses')}</CardTitle>
                <BookOpen className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courses.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Curriculum programs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('batches')}</CardTitle>
                <Calendar className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batches.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active class cohorts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collections</CardTitle>
                <CreditCard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600">
                  ৳{feesStats?.totalCollected ? feesStats.totalCollected.toLocaleString() : '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total fees collected</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <BarChart className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/reports" className="gap-1 text-xs">
                      Open Hub <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">Executive Reports Hub</CardTitle>
                <CardDescription>
                  Deep dive into student attendance rates, at-risk alerts, fee collections, and monthly admission trends.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/instructors" className="gap-1 text-xs">
                      Faculty Roster <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">Faculty & Instructors</CardTitle>
                <CardDescription>
                  Manage instructor profiles, teaching qualifications, specializations, and weekly timetable allocations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/fees" className="gap-1 text-xs">
                      Billing <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">Fees & Financials</CardTitle>
                <CardDescription>
                  Generate student invoices, process cash and mobile money payments, and issue printable money receipts.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
