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

// ─── Category ─────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

// ─── Course ───────────────────────────────────────────────────────────────────

export const CreateCourseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  duration: z.string().optional(),
  fees: z.coerce.number().min(0),
  categoryId: z.string().optional(),
});

export type CreateCourseDto = z.infer<typeof CreateCourseSchema>;

export const UpdateCourseSchema = CreateCourseSchema.partial();
export type UpdateCourseDto = z.infer<typeof UpdateCourseSchema>;

// ─── Batch ────────────────────────────────────────────────────────────────────

export const CreateBatchSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  schedule: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  instructorId: z.string().optional(),
  courseId: z.string().min(1),
});

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = CreateBatchSchema.partial();
export type UpdateBatchDto = z.infer<typeof UpdateBatchSchema>;

