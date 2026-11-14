import Link from 'next/link';
import { getPublicCourses, getTenantConfig } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function PublicHomePage() {
  const [config, courses] = await Promise.all([
    getTenantConfig(),
    getPublicCourses(),
  ]);

  if (!config) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Institute Not Found</h1>
        <p className="text-muted-foreground">
          The institute you are looking for does not exist or has been suspended.
        </p>
      </div>
    );
  }

  const { themeConfig } = config;
  const featuredCourses = courses.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-muted/30 py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1
            className="text-5xl font-extrabold tracking-tight mb-6"
            style={{ color: 'var(--tenant-primary)' }}
          >
            Welcome to {config.name}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {themeConfig.aboutText ||
              'Empowering students with modern education and professional training.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}
            >
              <Link href="/courses">Explore Courses</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              style={{
                borderColor: 'var(--tenant-accent)',
                color: 'var(--tenant-accent)',
              }}
            >
              <Link href="/admission">Apply for Admission</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold">Our Courses</h2>
            <Button asChild variant="outline">
              <Link href="/courses">View All Courses &rarr;</Link>
            </Button>
          </div>

          {featuredCourses.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <Card key={course.id} className="flex flex-col justify-between">
                  <CardHeader>
                    {course.category && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {course.category.name}
                      </span>
                    )}
                    <CardTitle className="mt-1">{course.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {course.description ||
                        'Comprehensive hands-on training designed by industry experts.'}
                    </p>
                    <div className="flex justify-between items-center text-sm font-medium border-t pt-3">
                      <span>Duration: {course.duration || 'Flexible'}</span>
                      <span
                        className="text-base font-bold"
                        style={{ color: 'var(--tenant-primary)' }}
                      >
                        ৳{course.fees.toLocaleString('en-BD')}
                      </span>
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
                        Apply Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground mb-4">
                New batches and courses are being announced soon.
              </p>
              <Button asChild variant="outline">
                <Link href="/admission">Inquire About Admission</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-muted/10 py-16 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <p className="mb-2">
            <strong>Address:</strong>{' '}
            {themeConfig.address || 'Contact us for location details'}
          </p>
          <p className="mb-2">
            <strong>Phone:</strong> {themeConfig.contactPhone || 'N/A'}
          </p>
          <p>
            <strong>Email:</strong> {themeConfig.contactEmail || 'N/A'}
          </p>
        </div>
      </section>
    </div>
  );
}
