export default function PublicHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--tenant-primary)' }}>
        Welcome to Our Institute
      </h1>
      <p className="mt-4 text-gray-600">
        Tenant-specific content will load here in Segment 1.5.
      </p>
    </main>
  );
}
