import React from 'react';
import { BookOpen } from 'lucide-react';
import { getTenantConfig, getPublicCourses } from '@/lib/server-api';
import { CourseListView } from '@/components/course-list-view';

export const metadata = {
  title: 'Course Catalog & Programs | EduManage',
  description: 'Explore active certificate, diploma, and technical courses offered by the institute.',
};

export default async function PublicCoursesPage() {
  const [config, courses] = await Promise.all([
    getTenantConfig(),
    getPublicCourses(),
  ]);

  const currency = config?.currency || 'USD';

  return (
    <div className="py-12 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
            <BookOpen className="w-4 h-4" />
            Curriculum & Courses
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            Explore All Academic Programs
          </h1>
          <p className="mt-2 text-base text-gray-600 max-w-2xl">
            Choose from industry-certified training programs taught by experienced educators. Select a course to view the syllabus, batch schedule, and apply online.
          </p>
        </div>

        {/* Client Interactive Course List */}
        <CourseListView courses={courses} currency={currency} />
      </div>
    </div>
  );
}
