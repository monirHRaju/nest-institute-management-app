'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit } from 'lucide-react';
import Link from 'next/link';

export default function CoursesPage() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Link href="/dashboard/courses/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Course</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {courses.map((course: any) => (
                <div key={course.id} className="flex justify-between items-center p-4 border rounded-md">
                  <div>
                    <h3 className="font-semibold">{course.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Fee: ৳{course.fees} | Duration: {course.duration || 'N/A'}
                    </p>
                  </div>
                  <Link href={`/dashboard/courses/${course.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" /> Manage
                    </Button>
                  </Link>
                </div>
              ))}
              {courses.length === 0 && <p className="text-muted-foreground">No courses found.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
