/**
 * Tenant isolation helpers for Prisma queries.
 *
 * Design note: We use EXPLICIT tenantId injection in service-layer Prisma calls
 * rather than a $use middleware (which stacks up on a shared singleton) or
 * $extends (which creates a new client instance per request, complicating NestJS DI).
 *
 * Usage in a service:
 *   prisma.user.findMany({ where: withTenant(tenantId) })
 *   prisma.user.findMany({ where: withTenant(tenantId, { isActive: true }) })
 *   prisma.user.create({ data: withTenant(tenantId, { email, passwordHash }) })
 */

/** Models that are scoped to a tenant (have a tenantId column). */
export const TENANT_SCOPED_MODELS = [
  'User',
  'Session',
  // Phase 2+: 'Course', 'Batch', 'Student', 'Attendance'
  // Phase 3+: 'FeeStructure', 'FeeInvoice', 'Payment', 'Expense'
] as const;

/**
 * Merges a tenantId filter into a Prisma `where` object.
 * Safe to use on both read and write operations.
 *
 * @example
 * // Read
 * prisma.user.findMany({ where: withTenant(tenantId, { role: 'STAFF' }) })
 *
 * // Create
 * prisma.user.create({ data: withTenant(tenantId, { email, passwordHash, role }) })
 */
export function withTenant<T extends Record<string, unknown>>(
  tenantId: string,
  extra?: T,
): T & { tenantId: string } {
  return { tenantId, ...(extra ?? {}) } as T & { tenantId: string };
}

/**
 * Creates a simple `{ tenantId }` where object.
 * Useful when you only need the tenant filter with no other conditions.
 */
export function tenantFilter(tenantId: string): { tenantId: string } {
  return { tenantId };
}
