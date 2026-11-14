import {
  API_BASE_URL,
  getPublicCourses,
  getTenantConfig,
} from '@/lib/api';
import { AdmissionForm } from './admission-form';

export default async function PublicAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const [{ courseId }, config, courses] = await Promise.all([
    searchParams,
    getTenantConfig(),
    getPublicCourses(),
  ]);

  if (!config) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Institute Not Found</h1>
        <p className="text-muted-foreground">
          Unable to load admission form for this institute.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <AdmissionForm
        tenantSlug={config.slug}
        tenantName={config.name}
        apiBaseUrl={API_BASE_URL}
        courses={courses}
        defaultCourseId={courseId}
      />
    </div>
  );
}
