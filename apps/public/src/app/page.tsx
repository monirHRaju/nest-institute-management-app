import { getTenantConfig } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function PublicHomePage() {
  const config = await getTenantConfig();

  if (!config) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Institute Not Found</h1>
        <p className="text-muted-foreground">The institute you are looking for does not exist or has been suspended.</p>
      </div>
    );
  }

  const { themeConfig } = config;

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-muted/30 py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6" style={{ color: 'var(--tenant-primary)' }}>
            Welcome to {config.name}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {themeConfig.aboutText || 'Empowering students with modern education and professional training.'}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}>
              Explore Courses
            </Button>
            <Button size="lg" variant="outline" style={{ borderColor: 'var(--tenant-accent)', color: 'var(--tenant-accent)' }}>
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Section Placeholder */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Offerings</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle>Course Area {i}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Learn the latest skills and advance your career with our comprehensive curriculum designed by industry experts.
                  </p>
                  <Button variant="link" className="p-0" style={{ color: 'var(--tenant-primary)' }}>
                    Learn more &rarr;
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-muted/10 py-16 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <p className="mb-2"><strong>Address:</strong> {themeConfig.address || 'Contact us for location details'}</p>
          <p className="mb-2"><strong>Phone:</strong> {themeConfig.contactPhone || 'N/A'}</p>
          <p><strong>Email:</strong> {themeConfig.contactEmail || 'N/A'}</p>
        </div>
      </section>
    </div>
  );
}
