'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Search, UserCheck, Users, GraduationCap, Eye, Clock, CalendarDays } from 'lucide-react';
import { get } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StudentStatus } from '@repo/shared';
import { ALL_DAYS } from '@/components/class-schedule-selector';

interface Enrollment {
  id: string;
  status: string;
  rollNumber?: string | null;
  course: {
    id: string;
    name: string;
  };
  batch?: {
    id: string;
    name: string;
  } | null;
}

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  status: StudentStatus;
  gender?: string | null;
  classDays?: string[];
  classTime?: string | null;
  createdAt: string;
  enrollments: Enrollment[];
}

interface StudentsResponse {
  success: boolean;
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function StudentsPage() {
  const t = useTranslations('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [page, setPage] = useState(1);

  // Fetch courses for the filter dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Fetch students with search & filter params
  const { data: response, isLoading } = useQuery<StudentsResponse>({
    queryKey: ['students', page, searchTerm, selectedStatus, selectedCourse, selectedDay],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (searchTerm) params.set('search', searchTerm);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedCourse) params.set('courseId', selectedCourse);
      if (selectedDay) params.set('classDay', selectedDay);

      return get<StudentsResponse>(`/students?${params.toString()}`);
    },
  });

  const students = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, totalPages: 1 };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'PASSED_OUT':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Completed</Badge>;
      case 'DROPPED_OUT':
        return <Badge variant="destructive">Dropped Out</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-amber-600 hover:bg-amber-700">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/dashboard/students/new">
          <Button className="shadow">
            <Plus className="mr-2 h-4 w-4" /> {t('newAdmission')}
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.status === 'ACTIVE').length}
              <span className="text-xs text-muted-foreground font-normal ml-1">on current page</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Courses</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PASSED_OUT">Passed Out</option>
                <option value="DROPPED_OUT">Dropped Out</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t('allCourses')}</option>
                {courses.map((course: any) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Class Days</option>
                {ALL_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.full}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">{t('studentId')}</th>
                  <th className="px-6 py-3">{t('name')}</th>
                  <th className="px-6 py-3">{t('contact')}</th>
                  <th className="px-6 py-3">{t('schedule')}</th>
                  <th className="px-6 py-3">{t('enrolledCourses')}</th>
                  <th className="px-6 py-3">{t('status')}</th>
                  <th className="px-6 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-10 w-10 text-muted-foreground/60" />
                        <p className="font-medium text-foreground">{t('noStudentsFound')}</p>
                        <p className="text-xs text-muted-foreground">{t('noStudentsDesc')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-xs">
                        {student.studentId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {student.firstName} {student.lastName}
                        </div>
                        {student.gender && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {student.gender.toLowerCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{student.phone}</div>
                        {student.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {student.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(!student.classDays || student.classDays.length === 0) && !student.classTime ? (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        ) : (
                          <div className="space-y-1">
                            {student.classDays && student.classDays.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {student.classDays.map((day) => {
                                  const dayObj = ALL_DAYS.find((d) => d.key === day);
                                  return (
                                    <span
                                      key={day}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary"
                                    >
                                      {dayObj?.label || day}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {student.classTime && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 font-medium whitespace-nowrap">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{student.classTime}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {student.enrollments.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {student.enrollments.map((enr) => (
                              <span
                                key={enr.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium"
                              >
                                {enr.course.name}
                                {enr.batch && (
                                  <span className="text-muted-foreground ml-1">
                                    ({enr.batch.name})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(student.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/students/${student.id}`}>
                          <Button variant="outline" size="sm" className="h-8">
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            {t('viewProfile')}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t">
              <span className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
