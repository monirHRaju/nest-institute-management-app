import Link from 'next/link';
import { getPublicCourses, getTenantConfig } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function PublicCoursesPage() {
  const [config, courses] = await Promise.all([
    getTenantConfig(),
    getPublicCourses(),
  ]);

  if (!config) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Institute Not Found</h1>
        <p className="text-muted-foreground">
          Unable to load course catalog for this institute.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mb-10">
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: 'var(--tenant-primary)' }}
        >
          Available Courses
        </h1>
        <p className="text-muted-foreground text-lg">
          Explore our career-focused courses at {config.name} and apply online to
          secure your seat in an upcoming batch.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-medium mb-2">No courses published yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Please check back soon or contact our office directly for upcoming
            batches.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    {course.category && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground mb-2">
                        {course.category.name}
                      </span>
                    )}
                    <CardTitle className="text-xl">{course.name}</CardTitle>
                  </div>
                  <span
                    className="text-lg font-bold whitespace-nowrap"
                    style={{ color: 'var(--tenant-primary)' }}
                  >
                    ৳{course.fees.toLocaleString('en-BD')}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {course.description ||
                    'Practical curriculum with mentor support and real-world projects.'}
                </p>

                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                  <div>
                    <strong>Duration:</strong> {course.duration || 'Flexible'}
                  </div>
                  <div>
                    <strong>Active Batches:</strong>{' '}
                    {course.batches?.length ? (
                      course.batches.map((b) => b.name).join(', ')
                    ) : (
                      <span>Enrolling for next batch</span>
                    )}
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full"
                  style={{
                    backgroundColor: 'var(--tenant-primary)',
                    color: 'white',
                  }}
                >
                  <Link href={`/admission?courseId=${course.id}`}>
                    Apply for This Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
