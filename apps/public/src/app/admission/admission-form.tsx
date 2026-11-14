'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateAdmissionDto, CreateAdmissionSchema } from '@repo/shared';
import type { PublicCourse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface AdmissionFormProps {
  tenantSlug: string;
  tenantName: string;
  apiBaseUrl: string;
  courses: PublicCourse[];
  defaultCourseId?: string;
}

export function AdmissionForm({
  tenantSlug,
  tenantName,
  apiBaseUrl,
  courses,
  defaultCourseId,
}: AdmissionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdmissionDto>({
    resolver: zodResolver(CreateAdmissionSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      courseId: defaultCourseId || (courses[0]?.id ?? ''),
      guardianName: '',
      guardianPhone: '',
      address: '',
      message: '',
    },
  });

  const onSubmit = async (values: CreateAdmissionDto) => {
    setServerError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/public/admission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          result?.message ||
          result?.error ||
          'Failed to submit application. Please check your details and try again.';
        setServerError(Array.isArray(message) ? message.join(', ') : message);
        return;
      }

      setSubmitted(true);
      reset();
    } catch {
      setServerError(
        'Unable to connect to the server. Please check your internet connection and try again.',
      );
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle
            className="text-2xl"
            style={{ color: 'var(--tenant-primary)' }}
          >
            Application Submitted!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Thank you for applying to <strong>{tenantName}</strong>. Our
            admissions team has received your application and will review it
            shortly.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setSubmitted(false)}
              style={{
                backgroundColor: 'var(--tenant-primary)',
                color: 'white',
              }}
            >
              Submit Another Application
            </Button>
            <Button asChild variant="outline">
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Online Admission Form</CardTitle>
        <p className="text-sm text-muted-foreground">
          Fill out your details below to apply for admission at {tenantName}.
        </p>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahim Uddin"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number (BD) <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Select Course <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('courseId')}
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} — ৳{course.fees.toLocaleString('en-BD')}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="text-xs text-destructive mt-1">
                  {errors.courseId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Guardian Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Father / Mother / Guardian Name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('guardianName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Guardian Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('guardianPhone')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Present Address
            </label>
            <input
              type="text"
              placeholder="House, Road, Area, District"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('address')}
            />
            {errors.address && (
              <p className="text-xs text-destructive mt-1">
                {errors.address.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Message / Preferred Schedule (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Any questions or preferred batch timing..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('message')}
            />
            {errors.message && (
              <p className="text-xs text-destructive mt-1">
                {errors.message.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || courses.length === 0}
            className="w-full"
            style={{
              backgroundColor: 'var(--tenant-primary)',
              color: 'white',
            }}
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
