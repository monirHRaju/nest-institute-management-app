import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  ArrowRight,
  ChevronRight,
  BookOpen,
  DollarSign,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { getPublicCourseById, getTenantConfig } from '@/lib/server-api';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const course = await getPublicCourseById(id);
  if (!course) return { title: 'Course Not Found' };
  return {
    title: `${course.name} | Course Details`,
    description: course.description || `Enroll in ${course.name} at our institute.`,
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const [course, config] = await Promise.all([
    getPublicCourseById(id),
    getTenantConfig(),
  ]);

  if (!course) {
    notFound();
  }

  const currency = config?.currency || 'USD';
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBA';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const batches = course.batches || course.activeBatches || [];

  return (
    <div className="py-10 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/courses" className="hover:text-gray-900 transition-colors">
            Courses
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold truncate max-w-xs">{course.name}</span>
        </nav>

        {/* Course Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-semibold text-xs">
                  {course.category?.name || 'General Program'}
                </Badge>
                {course.code && (
                  <Badge variant="outline" className="font-mono text-xs text-gray-600">
                    {course.code}
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accredited Program
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-950 tracking-tight">
                {course.name}
              </h1>

              <p className="text-gray-600 text-base max-w-3xl leading-relaxed">
                {course.description ||
                  'Acquire in-demand practical skills with expert mentoring, live projects, and comprehensive course materials tailored for career success.'}
              </p>
            </div>

            {/* Quick CTA Box for Mobile/Desktop */}
            <div className="shrink-0 flex flex-col items-start lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8">
              <span className="text-xs text-gray-500 uppercase font-semibold">Total Program Fee</span>
              <span className="text-3xl font-extrabold text-gray-900 my-1">
                {formatPrice(course.fees)}
              </span>
              <Link
                href={`/apply?courseId=${course.id}`}
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                <span>Apply for this Course</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Upcoming Batches */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview & Key Highlights */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Course Curriculum & Highlights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Duration</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {course.duration || 'Flexible / Self-paced'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Certification</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Verifiable completion credential upon passing final assessment
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Interactive Learning</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Small batch sizes for personalized instructor guidance and live Q&A
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Career Placement</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Resume review and recruitment networking assistance
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Batches Table */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Available Batches & Schedule
                </h2>
                <Badge variant="outline" className="text-xs">
                  {batches.length} Open
                </Badge>
              </div>

              {batches.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-gray-200">
                  <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">No scheduled batches right now</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You can still submit a general application, and our admissions counselor will assign you to the next upcoming intake.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/apply?courseId=${course.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: 'var(--tenant-primary)' }}
                    >
                      <span>Apply for Next Intake</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Batch Name</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Enrolled / Cap</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-900">{batch.name}</div>
                            {batch.instructor?.name && (
                              <div className="text-xs text-gray-500">
                                Instructor: {batch.instructor.name}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                            {formatDate(batch.startDate)}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                            {batch.schedule || batch.classTime || 'Standard Schedule'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            <span className="font-semibold text-gray-900">
                              {batch.enrolledCount ?? 0}
                            </span>
                            {batch.capacity && (
                              <span className="text-gray-400"> / {batch.capacity} seats</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/apply?courseId=${course.id}&batchId=${batch.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
                              style={{ backgroundColor: 'var(--tenant-primary)' }}
                            >
                              <span>Select Batch</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Admission Summary & Inquiry Card */}
          <div className="space-y-6">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-gray-900">
                  Admission Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2.5 text-xs">
                  {course.code && (
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Program Code</span>
                      <span className="font-mono font-bold text-gray-900">{course.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium text-gray-900">
                      {course.category?.name || 'General'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Estimated Duration</span>
                    <span className="font-medium text-gray-900">
                      {course.duration || 'Self-paced'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Total Program Fee</span>
                    <span className="font-bold text-sm text-gray-900">
                      {formatPrice(course.fees)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Admissions Status</span>
                    <Badge variant="success" className="text-[10px] font-semibold">
                      Accepting Applications
                    </Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/apply?courseId=${course.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  >
                    <span>Apply for this Course</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Need Help Box */}
            <div className="p-5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs space-y-2.5">
              <h4 className="font-bold text-blue-900 text-sm">Have Questions Before Enrolling?</h4>
              <p className="text-blue-800/80 leading-relaxed">
                Our academic counselors are available to answer your curriculum, batch scheduling, and fee installment questions.
              </p>
              <div className="pt-1">
                <Link
                  href="/contact"
                  className="font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  Contact Admissions Counseling &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
