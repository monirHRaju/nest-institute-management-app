'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { post, get } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, BookOpen, ShieldAlert, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { ClassScheduleSelector } from '@/components/class-schedule-selector';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NewStudentAdmissionPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    // Class Schedule Preferences
    classDays: [] as string[],
    classTime: '',
    // Initial Course Enrollment
    enrollInCourse: true,
    courseId: '',
    batchId: '',
    rollNumber: '',
  });

  // Fetch available courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Fetch available batches directly as fallback
  const { data: allBatches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  // Selected course details to access its batches
  const selectedCourse = courses.find((c: any) => c.id === formData.courseId);
  const batches = useMemo(() => {
    if (!formData.courseId) return [];
    if (selectedCourse?.batches && selectedCourse.batches.length > 0) {
      return selectedCourse.batches;
    }
    return allBatches.filter((b: any) => b.courseId === formData.courseId);
  }, [formData.courseId, selectedCourse, allBatches]);

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => post('/students', payload),
    onSuccess: (res: any) => {
      toast.success('Student admitted successfully!');
      const studentId = res.data?.id;
      if (studentId) {
        router.push(`/dashboard/students/${studentId}`);
      } else {
        router.push('/dashboard/students');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to register student';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      toast.error('First name, last name, and phone are required.');
      return;
    }

    const payload: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      classDays: formData.classDays,
    };

    if (formData.studentId.trim()) payload.studentId = formData.studentId.trim();
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.gender) payload.gender = formData.gender;
    if (formData.dateOfBirth) payload.dateOfBirth = new Date(formData.dateOfBirth).toISOString();
    if (formData.address.trim()) payload.address = formData.address.trim();
    if (formData.guardianName.trim()) payload.guardianName = formData.guardianName.trim();
    if (formData.guardianPhone.trim()) payload.guardianPhone = formData.guardianPhone.trim();
    if (formData.guardianRelation.trim()) payload.guardianRelation = formData.guardianRelation.trim();
    if (formData.classTime.trim()) payload.classTime = formData.classTime.trim();

    if (formData.enrollInCourse && formData.courseId) {
      payload.initialEnrollment = {
        courseId: formData.courseId,
        batchId: formData.batchId || undefined,
        rollNumber: formData.rollNumber.trim() || undefined,
        classDays: formData.classDays,
        classTime: formData.classTime.trim() || undefined,
      };
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Student Admission</h1>
            <p className="text-muted-foreground text-sm">
              Register a student profile and optionally enroll them into a course cohort.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Student Information
            </CardTitle>
            <CardDescription>
              Essential student profile and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="studentId">
                  Student ID <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="studentId"
                  placeholder="Auto-generated if left blank"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  required
                  placeholder="e.g. Tanvir"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  required
                  placeholder="e.g. Ahmed"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  required
                  placeholder="01XXXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select Gender...</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Present Address</Label>
                <Input
                  id="address"
                  placeholder="Road, Area, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Guardian Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              Guardian Details
            </CardTitle>
            <CardDescription>
              Emergency contact and parent/guardian information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  placeholder="Parent / Guardian Name"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="guardianPhone">Guardian Phone</Label>
                <Input
                  id="guardianPhone"
                  placeholder="01XXXXXXXXX"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="guardianRelation">Relationship</Label>
                <select
                  id="guardianRelation"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.guardianRelation}
                  onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                >
                  <option value="">Select Relation...</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Guardian">Other Legal Guardian</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Class Schedule (Days & Time) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Class Schedule (Days & Time)
            </CardTitle>
            <CardDescription>
              Select scheduled class days (e.g. Sat-Mon-Wed, Sun-Tue-Thu) and class timing to manage students day- and time-wise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassScheduleSelector
              selectedDays={formData.classDays}
              onChangeDays={(days) => setFormData({ ...formData, classDays: days })}
              selectedTime={formData.classTime}
              onChangeTime={(time) => setFormData({ ...formData, classTime: time })}
            />
          </CardContent>
        </Card>

        {/* Section 4: Course & Batch Enrollment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Initial Course Admission & Enrollment
                </CardTitle>
                <CardDescription>
                  Optionally enroll the student immediately upon registration.
                </CardDescription>
              </div>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary h-4 w-4"
                  checked={formData.enrollInCourse}
                  onChange={(e) => setFormData({ ...formData, enrollInCourse: e.target.checked })}
                />
                <span className="font-medium">Enroll Now</span>
              </label>
            </div>
          </CardHeader>

          {formData.enrollInCourse && (
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="courseSelect">Select Course</Label>
                  <select
                    id="courseSelect"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.courseId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        courseId: e.target.value,
                        batchId: '', // Reset batch when course changes
                      })
                    }
                  >
                    <option value="">Select a Course...</option>
                    {courses.map((course: any) => (
                      <option key={course.id} value={course.id}>
                        {course.name} (৳{course.fees})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="batchSelect">
                    Assign Batch <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <select
                    id="batchSelect"
                    disabled={!formData.courseId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                    value={formData.batchId}
                    onChange={(e) => {
                      const chosenBatchId = e.target.value;
                      const chosenBatch = batches.find((b: any) => b.id === chosenBatchId);
                      setFormData((prev) => ({
                        ...prev,
                        batchId: chosenBatchId,
                        classDays: chosenBatch?.classDays?.length ? chosenBatch.classDays : prev.classDays,
                        classTime: chosenBatch?.classTime || (chosenBatch?.schedule || prev.classTime),
                      }));
                    }}
                  >
                    <option value="">
                      {!formData.courseId
                        ? 'Select a course first...'
                        : batches.length === 0
                        ? 'No batches found for this course (assign later)'
                        : 'Select a Batch (or assign later)...'}
                    </option>
                    {batches.map((batch: any) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} {batch.schedule || batch.classTime ? `(${batch.classTime || batch.schedule})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="rollNumber">
                    Class Roll Number <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="rollNumber"
                    placeholder="e.g. 01, 101"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/students">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending} className="min-w-[140px]">
            {createMutation.isPending ? 'Registering...' : 'Complete Admission'}
          </Button>
        </div>
      </form>
    </div>
  );
}
