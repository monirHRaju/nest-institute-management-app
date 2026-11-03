import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { getTenantConfig, getPublicCourses } from '@/lib/server-api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function PublicHomePage() {
  const [config, courses] = await Promise.all([
    getTenantConfig(),
    getPublicCourses(),
  ]);

  const tenantName = config?.name || 'EduManage Institute';
  const theme = config?.themeConfig;
  const currency = config?.currency || 'USD';

  // Format currency helper
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const featuredCourses = courses.slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-slate-50/50 py-20 lg:py-28 border-b border-gray-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.100),transparent)] opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Admissions for Upcoming Batches Now Open</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-950 max-w-4xl mx-auto leading-tight sm:leading-none">
            Empower Your Future at{' '}
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600"
              style={{
                backgroundImage: `linear-gradient(to right, var(--tenant-primary), var(--tenant-accent))`,
              }}
            >
              {tenantName}
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {theme?.aboutText ||
              'Join thousands of successful graduates. Master in-demand technical, professional, and career skills with accredited industry instructors.'}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/apply"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold text-white shadow-md hover:shadow-lg transition-all active:scale-95"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              <span>Apply for Admission</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/courses"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span>Explore All Courses</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-gray-200/70 pt-8">
            <div className="p-4 text-center">
              <div className="text-3xl font-extrabold text-gray-900">{courses.length}+</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                Active Courses
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-3xl font-extrabold text-gray-900">100%</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                Accredited Curriculum
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-3xl font-extrabold text-gray-900">Flexible</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                Morning & Evening Batches
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-3xl font-extrabold text-gray-900">Verified</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                Digital Certificates
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
                <BookOpen className="w-4 h-4" />
                Featured Academic Offerings
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Explore Available Courses
              </h2>
              <p className="mt-2 text-gray-500 max-w-xl">
                Browse our industry-aligned programs designed to advance your professional career and practical skills.
              </p>
            </div>
            <Link
              href="/courses"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <span>View full course catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredCourses.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-gray-200">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No Courses Published Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                Our curriculum team is actively updating course listings. Please check back shortly or contact admissions.
              </p>
              <div className="mt-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50"
                >
                  Contact Admissions Desk
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <Card
                  key={course.id}
                  className="flex flex-col hover:shadow-lg transition-shadow border-gray-200 overflow-hidden group"
                >
                  <div
                    className="h-2 w-full transition-all group-hover:h-3"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="font-medium text-xs">
                        {course.category?.name || 'General Program'}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-gray-500">
                        {course.code || 'PRG'}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      <Link href={`/courses/${course.id}`}>{course.name}</Link>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 pb-4">
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {course.description ||
                        'Comprehensive training program with hands-on projects, industry mentoring, and professional certificate.'}
                    </p>

                    <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Duration:
                        </span>
                        <span className="font-medium text-gray-700">
                          {course.duration || 'Self-paced'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Upcoming Batches:
                        </span>
                        <span className="font-medium text-emerald-600">
                          {(course.activeBatches?.length ?? 0) > 0
                            ? `${course.activeBatches.length} Batch(es) Available`
                            : 'Open Admissions'}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-gray-100 flex items-center justify-between bg-slate-50/60">
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Tuition Fee</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatPrice(course.fees)}
                      </div>
                    </div>
                    <Link
                      href={`/apply?courseId=${course.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: 'var(--tenant-primary)' }}
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Online Services & Student Verification Banner */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/60 text-blue-300 border border-blue-700/50 mb-4">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Trust & Verification
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Online Admissions & Instant Student Verification
              </h2>
              <p className="mt-4 text-slate-300 text-base leading-relaxed">
                We believe in full transparency and accessible digital services. Prospective students can submit applications in minutes, track their review status online, and employers or institutions can verify student credentials anytime.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/track"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-all"
                >
                  <Search className="w-4 h-4" />
                  <span>Track Application Status</span>
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify Student ID</span>
                </Link>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-white text-base">Paperless Admissions</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Submit contact details, academic history, and batch preferences with zero paperwork.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-white text-base">Official Digital Credentials</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Students receive tamper-proof student IDs verifiable by recruiters and academic boards.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-white text-base">Dedicated Counseling</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Every applicant is assigned an admission counselor for guidance and batch placement.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-white text-base">Instant Tracking</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Check your review status 24/7 with your unique application reference number.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to apply CTA banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Start Your Academic Journey Today
          </h2>
          <p className="mt-4 text-blue-100 text-base max-w-xl mx-auto">
            Admissions are reviewed on a rolling basis. Secure your seat in the upcoming batch before registration closes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-base font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all"
            >
              <span>Submit Admission Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
