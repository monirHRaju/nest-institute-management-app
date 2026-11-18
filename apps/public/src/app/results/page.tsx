import { API_BASE_URL, getTenantConfig } from '@/lib/api';
import { ResultsLookup } from './results-lookup';

export default async function PublicResultsPage() {
  const config = await getTenantConfig();

  if (!config) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Institute Not Found</h1>
        <p className="text-muted-foreground">
          The institute you are looking for does not exist or has been suspended.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center max-w-2xl mx-auto mb-8 print:hidden">
        <h1
          className="text-4xl font-extrabold mb-3"
          style={{ color: 'var(--tenant-primary)' }}
        >
          Academic Result Portal
        </h1>
        <p className="text-muted-foreground">
          Enter your Student Code (or Student ID) and registered mobile number to view and print your official transcript.
        </p>
      </div>

      <ResultsLookup
        tenantSlug={config.slug}
        tenantName={config.name}
        apiBaseUrl={API_BASE_URL}
      />
    </div>
  );
}
