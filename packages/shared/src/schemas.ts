import { z } from 'zod';
import { Role } from './types';

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

// ─── Tenant ───────────────────────────────────────────────────────────────────

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
  ownerFirstName: z.string().min(1).max(50),
  ownerLastName: z.string().min(1).max(50),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']).optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional(),
});

export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// ─── User ─────────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.nativeEnum(Role).default(Role.STAFF),
  phone: z.string().max(20).optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
