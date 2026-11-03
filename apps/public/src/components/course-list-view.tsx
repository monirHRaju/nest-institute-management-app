'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Clock, Calendar, ArrowRight, BookOpen, Filter } from 'lucide-react';
import type { PublicCourseRecord } from '@repo/shared';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface CourseListViewProps {
  courses: PublicCourseRecord[];
  currency?: string;
}

export function CourseListView({ courses, currency = 'USD' }: CourseListViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => {
      if (c.category) {
        const catKey = c.category.slug || c.category.id;
        map.set(catKey, c.category.name);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      const catKey = c.category?.slug || c.category?.id;
      const matchCategory =
        selectedCategory === 'ALL' || catKey === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [courses, search, selectedCategory]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search by course title or code..."
            className="pl-9 bg-slate-50 border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Programs ({courses.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No courses match your criteria</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or reset the category filter to view all programs.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
            }}
            className="mt-4 text-xs font-semibold text-blue-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="flex flex-col hover:shadow-md transition-shadow border-gray-200 overflow-hidden group bg-white"
            >
              <div
                className="h-1.5 w-full transition-all group-hover:h-2.5"
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
                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  <Link href={`/courses/${course.id}`}>{course.name}</Link>
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {course.description ||
                    'Comprehensive training program with hands-on labs and official certification.'}
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
                        ? `${course.activeBatches.length} Batch(es) Active`
                        : 'Open Enrollment'}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t border-gray-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Tuition</div>
                  <div className="text-base font-bold text-gray-900">
                    {formatPrice(course.fees)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/courses/${course.id}`}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Details
                  </Link>
                  <Link
                    href={`/apply?courseId=${course.id}`}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  >
                    Apply
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
