'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Edit,
  Trash2,
  ClipboardList,
  GraduationCap,
  CalendarDays,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { get, post, patch, del } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ClassScheduleSelector, ALL_DAYS } from '@/components/class-schedule-selector';

interface Batch {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  schedule?: string | null;
  classDays: string[];
  classTime?: string | null;
  capacity?: number | null;
  courseId: string;
  instructorId?: string | null;
  course: {
    id: string;
    name: string;
    fees: number;
    duration?: string | null;
  };
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    enrollments: number;
  };
  createdAt: string;
}

interface BatchFormData {
  name: string;
  courseId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
  capacity: string;
  schedule: string;
  classDays: string[];
  classTime: string;
}

const initialFormData: BatchFormData = {
  name: '',
  courseId: '',
  instructorId: '',
  startDate: '',
  endDate: '',
  capacity: '',
  schedule: '',
  classDays: [],
  classTime: '',
};

export default function BatchesPage() {
  const t = useTranslations('batches');
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'timetable'>('list');

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<BatchFormData>(initialFormData);
  const [editForm, setEditForm] = useState<BatchFormData>(initialFormData);

  // Fetch batches
  const { data: batches = [], isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ['batches'],
    queryFn: () => get<Batch[]>('/batches'),
  });

  // Fetch courses for dropdowns
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Fetch instructors for assignment
  const { data: instructorsRes } = useQuery<any>({
    queryKey: ['instructors-list'],
    queryFn: () => get<any>('/instructors?limit=100'),
  });
  const instructors = instructorsRes?.data || [];

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch =
        !searchTerm ||
        batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.course?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse =
        !selectedCourseFilter || batch.courseId === selectedCourseFilter;

      const matchesDay =
        !selectedDayFilter ||
        (batch.classDays && batch.classDays.includes(selectedDayFilter));

      return matchesSearch && matchesCourse && matchesDay;
    });
  }, [batches, searchTerm, selectedCourseFilter, selectedDayFilter]);

  // Aggregate statistics
  const totalBatches = batches.length;
  const totalEnrolledStudents = batches.reduce(
    (acc, b) => acc + (b._count?.enrollments || 0),
    0,
  );
  const activeCoursesCount = new Set(batches.map((b) => b.courseId)).size;

  // Create Batch Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => post('/batches', data),
    onSuccess: () => {
      toast.success('Batch created successfully');
      setIsCreateOpen(false);
      setCreateForm(initialFormData);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create batch');
    },
  });

  // Update Batch Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      patch(`/batches/${id}`, data),
    onSuccess: () => {
      toast.success('Batch updated successfully');
      setIsEditOpen(false);
      setEditingBatchId(null);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update batch');
    },
  });

  // Delete Batch Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/batches/${id}`),
    onSuccess: () => {
      toast.success('Batch deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete batch');
    },
  });

  const handleOpenCreate = () => {
    setCreateForm({
      ...initialFormData,
      courseId: courses[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (batch: Batch) => {
    setEditingBatchId(batch.id);
    setEditForm({
      name: batch.name || '',
      courseId: batch.courseId || '',
      instructorId: batch.instructor?.id || batch.instructorId || '',
      startDate: batch.startDate ? batch.startDate.split('T')[0] : '',
      endDate: batch.endDate ? batch.endDate.split('T')[0] : '',
      capacity: batch.capacity ? String(batch.capacity) : '',
      schedule: batch.schedule || '',
      classDays: batch.classDays || [],
      classTime: batch.classTime || '',
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.courseId) {
      toast.error('Batch name and Course are required');
      return;
    }
    createMutation.mutate({
      name: createForm.name.trim(),
      courseId: createForm.courseId,
      instructorId: createForm.instructorId || undefined,
      startDate: createForm.startDate ? new Date(createForm.startDate).toISOString() : undefined,
      endDate: createForm.endDate ? new Date(createForm.endDate).toISOString() : undefined,
      capacity: createForm.capacity ? Number(createForm.capacity) : undefined,
      schedule: createForm.schedule.trim() || undefined,
      classDays: createForm.classDays,
      classTime: createForm.classTime.trim() || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatchId || !editForm.name.trim() || !editForm.courseId) {
      toast.error('Batch name and Course are required');
      return;
    }
    updateMutation.mutate({
      id: editingBatchId,
      data: {
        name: editForm.name.trim(),
        courseId: editForm.courseId,
        instructorId: editForm.instructorId || null,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
        capacity: editForm.capacity ? Number(editForm.capacity) : null,
        schedule: editForm.schedule.trim() || null,
        classDays: editForm.classDays,
        classTime: editForm.classTime.trim() || null,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" /> List View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'timetable' ? 'secondary' : 'ghost'}
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode('timetable')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Weekly Timetable
            </Button>
          </div>
          <Button onClick={handleOpenCreate} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> {t('newBatch')}
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Batches</p>
                <p className="text-2xl font-bold mt-1 text-primary">{totalBatches}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all programs</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Courses</p>
                <p className="text-2xl font-bold mt-1">{activeCoursesCount}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">With scheduled cohorts</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Enrolled Students</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {totalEnrolledStudents}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total active enrollments</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Roll Call Ready</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{totalBatches}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Attendance enabled</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'timetable' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {ALL_DAYS.map((day) => {
              const dayBatches = batches.filter(
                (b) => b.classDays && b.classDays.includes(day.key),
              );
              return (
                <div key={day.key} className="space-y-2 border rounded-xl p-3 bg-card shadow-sm">
                  <div className="pb-2 border-b flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-primary tracking-wide">
                      {day.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                      {dayBatches.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 min-h-[140px]">
                    {dayBatches.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/60 italic py-8">
                        No classes
                      </div>
                    ) : (
                      dayBatches.map((b) => (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-1.5"
                        >
                          <div className="font-semibold text-foreground truncate">{b.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {b.course?.name}
                          </div>
                          {b.classTime && (
                            <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                              <Clock className="h-3 w-3" />
                              <span>{b.classTime}</span>
                            </div>
                          )}
                          {b.instructor && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <GraduationCap className="h-3 w-3" />
                              <span className="truncate">
                                {b.instructor.firstName} {b.instructor.lastName}
                              </span>
                            </div>
                          )}
                          <div className="pt-1 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{b._count?.enrollments || 0} students</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px]"
                              onClick={() => handleOpenEdit(b)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Course Filter */}
            <div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
              >
                <option value="">{t('allCourses')}</option>
                {courses.map((course: any) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Day Filter */}
            <div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
              >
                <option value="">{t('allDays')}</option>
                {ALL_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.full} ({d.label})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t('title')} ({filteredBatches.length})
              </CardTitle>
              <CardDescription className="mt-0.5">
                Active cohort batches, schedules, and class session hours.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingBatches ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="animate-pulse">Loading batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-lg">{t('noBatchesFound')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {t('noBatchesDesc')}
              </p>
              <Button size="sm" onClick={handleOpenCreate} className="mt-2">
                <Plus className="mr-1.5 h-4 w-4" /> {t('newBatch')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{t('batchName')}</th>
                    <th className="py-3 px-4">{t('course')}</th>
                    <th className="py-3 px-4">{t('schedule')}</th>
                    <th className="py-3 px-4 text-center">{t('students')}</th>
                    <th className="py-3 px-4 hidden md:table-cell">{t('dates')}</th>
                    <th className="py-3 px-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBatches.map((batch) => {
                    const enrolledCount = batch._count?.enrollments || 0;
                    const capacity = batch.capacity;
                    const isFull = capacity ? enrolledCount >= capacity : false;

                    return (
                      <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                        {/* Batch Name & ID */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground text-base">
                            {batch.name}
                          </div>
                          {batch.instructor && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Instructor: {batch.instructor.firstName} {batch.instructor.lastName}
                            </div>
                          )}
                        </td>

                        {/* Course Name & Fees */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">
                            {batch.course?.name || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[11px] font-mono px-1.5 py-0">
                              ৳{batch.course?.fees ?? 0}
                            </Badge>
                            {batch.course?.duration && (
                              <span className="text-xs text-muted-foreground">
                                · {batch.course.duration}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Schedule: Class Days & Time */}
                        <td className="py-3.5 px-4">
                          {batch.classDays && batch.classDays.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {batch.classDays.map((day) => {
                                const d = ALL_DAYS.find((item) => item.key === day);
                                return (
                                  <Badge
                                    key={day}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-medium bg-primary/10 text-primary border-primary/20"
                                  >
                                    {d?.label || day}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              {batch.schedule || 'Flexible Schedule'}
                            </span>
                          )}

                          {batch.classTime && (
                            <div className="flex items-center gap-1 text-xs text-foreground font-medium mt-0.5">
                              <Clock className="h-3 w-3 text-primary" />
                              <span>{batch.classTime}</span>
                            </div>
                          )}
                        </td>

                        {/* Enrolled vs Capacity */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-semibold text-xs">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{enrolledCount}</span>
                            <span className="text-muted-foreground font-normal">
                              / {capacity || '∞'}
                            </span>
                          </div>
                          {isFull && (
                            <div className="text-[10px] text-destructive font-medium mt-0.5">
                              Full
                            </div>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 hidden md:table-cell text-xs text-muted-foreground">
                          {batch.startDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(batch.startDate).toLocaleDateString()}</span>
                              {batch.endDate && (
                                <span> - {new Date(batch.endDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          ) : (
                            <span className="italic">Ongoing</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Attendance Link */}
                            <Link href={`/dashboard/attendance?batchId=${batch.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                              >
                                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                                {t('takeAttendance')}
                              </Button>
                            </Link>

                            {/* Edit Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(batch)}
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete batch "${batch.name}"?`,
                                  )
                                ) {
                                  deleteMutation.mutate(batch.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
      </>
      )}

      {/* Dialog: Create New Batch */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('newBatch')}</DialogTitle>
            <DialogDescription>
              Create a new student cohort for an academic course program.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div>
              <Label>Batch Name *</Label>
              <Input
                required
                placeholder="e.g. Batch 01 (Morning)"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Course *</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={createForm.courseId}
                onChange={(e) => setCreateForm({ ...createForm, courseId: e.target.value })}
              >
                <option value="">Select a course...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (৳{c.fees})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Assigned Instructor</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editForm.instructorId}
                onChange={(e) => setEditForm({ ...editForm, instructorId: e.target.value })}
              >
                <option value="">Unassigned (None)</option>
                {instructors.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.firstName} {inst.lastName} {inst.designation ? `(${inst.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Assigned Instructor</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={createForm.instructorId}
                onChange={(e) => setCreateForm({ ...createForm, instructorId: e.target.value })}
              >
                <option value="">Unassigned (None)</option>
                {instructors.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.firstName} {inst.lastName} {inst.designation ? `(${inst.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Max Student Capacity</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 25 (leave empty for unlimited)"
                value={createForm.capacity}
                onChange={(e) =>
                  setCreateForm({ ...createForm, capacity: e.target.value })
                }
              />
            </div>

            {/* Class Schedule Selector */}
            <div className="pt-2 border-t space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Class Schedule (Days & Time)
              </Label>
              <ClassScheduleSelector
                selectedDays={createForm.classDays}
                onChangeDays={(days) => setCreateForm({ ...createForm, classDays: days })}
                selectedTime={createForm.classTime}
                onChangeTime={(time) => setCreateForm({ ...createForm, classTime: time })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Batch */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editBatch')}</DialogTitle>
            <DialogDescription>
              Update batch details, cohort schedules, and capacity limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div>
              <Label>Batch Name *</Label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Course *</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editForm.courseId}
                onChange={(e) => setEditForm({ ...editForm, courseId: e.target.value })}
              >
                <option value="">Select a course...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (৳{c.fees})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Assigned Instructor</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editForm.instructorId}
                onChange={(e) => setEditForm({ ...editForm, instructorId: e.target.value })}
              >
                <option value="">Unassigned (None)</option>
                {instructors.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.firstName} {inst.lastName} {inst.designation ? `(${inst.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Max Student Capacity</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 25 (leave empty for unlimited)"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
              />
            </div>

            {/* Class Schedule Selector in Edit */}
            <div className="pt-2 border-t space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Class Schedule (Days & Time)
              </Label>
              <ClassScheduleSelector
                selectedDays={editForm.classDays}
                onChangeDays={(days) => setEditForm({ ...editForm, classDays: days })}
                selectedTime={editForm.classTime}
                onChangeTime={(time) => setEditForm({ ...editForm, classTime: time })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
