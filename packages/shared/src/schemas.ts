import { z } from 'zod';
import {
  AttendanceStatus,
  DiscountType,
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  Role,
} from './types';

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

// ─── Admission ────────────────────────────────────────────────────────────────

export const CreateAdmissionSchema = z.object({
  name: z.string().min(2, 'Full name is required').max(100),
  phone: z
    .string()
    .regex(/^01\d{9}$/, 'Phone must be a valid 11-digit Bangladeshi number starting with 01'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  courseId: z.string().min(1, 'Please select a course'),
  address: z.string().max(250).optional(),
  guardianName: z.string().max(100).optional(),
  guardianPhone: z.string().max(20).optional(),
  message: z.string().max(500).optional(),
});

export type CreateAdmissionDto = z.infer<typeof CreateAdmissionSchema>;

export const ApproveAdmissionSchema = z.object({
  batchId: z.string().optional(),
  guardianName: z.string().max(100).optional(),
  guardianPhone: z.string().max(20).optional(),
  password: z.string().min(6).optional(),
  structureId: z.string().optional(),
  overrideTotal: z.coerce.number().min(0).optional(),
  discountId: z.string().optional(),
});

export type ApproveAdmissionDto = z.infer<typeof ApproveAdmissionSchema>;

// ─── Student ──────────────────────────────────────────────────────────────────

export const CreateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^01\d{9}$/, 'Phone must be a valid 11-digit BD number starting with 01'),
  password: z.string().min(6).optional(),
  batchId: z.string().optional(),
  guardianName: z.string().max(100).optional(),
  guardianPhone: z.string().max(20).optional(),
  address: z.string().max(250).optional(),
  structureId: z.string().optional(),
  overrideTotal: z.coerce.number().min(0).optional(),
  discountId: z.string().optional(),
});

export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  batchId: z.string().nullable().optional(),
  guardianName: z.string().max(100).nullable().optional(),
  guardianPhone: z.string().max(20).nullable().optional(),
  address: z.string().max(250).nullable().optional(),
});

export type UpdateStudentDto = z.infer<typeof UpdateStudentSchema>;

// ─── Attendance ───────────────────────────────────────────────────────────────

export const AttendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
  remarks: z.string().max(250).optional(),
});

export const MarkBatchAttendanceSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  records: z.array(AttendanceEntrySchema).min(1, 'At least one attendance record is required'),
});

export type MarkBatchAttendanceDto = z.infer<typeof MarkBatchAttendanceSchema>;

// ─── Phase 3: Fee Structure, Discounts & Assignments ──────────────────────────

export const InstallmentPlanItemSchema = z.object({
  sequence: z.coerce.number().int().min(1),
  percent: z.coerce.number().min(0).max(100).optional(),
  amount: z.coerce.number().min(0).optional(),
  dueOffsetDays: z.coerce.number().int().min(0).default(0),
});

export type InstallmentPlanItemDto = z.infer<typeof InstallmentPlanItemSchema>;

export const CreateFeeStructureSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  name: z.string().min(1, 'Name is required').max(100),
  totalAmount: z.coerce.number().min(0, 'Total amount must be non-negative'),
  installmentCount: z.coerce.number().int().min(1).max(24).default(1),
  installmentPlan: z.array(InstallmentPlanItemSchema).optional(),
  isActive: z.boolean().default(true),
});

export type CreateFeeStructureDto = z.infer<typeof CreateFeeStructureSchema>;

export const UpdateFeeStructureSchema = CreateFeeStructureSchema.partial();
export type UpdateFeeStructureDto = z.infer<typeof UpdateFeeStructureSchema>;

export const CreateDiscountSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  type: z.nativeEnum(DiscountType),
  value: z.coerce.number().min(0),
  reason: z.string().max(250).optional(),
  studentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateDiscountDto = z.infer<typeof CreateDiscountSchema>;

export const UpdateDiscountSchema = CreateDiscountSchema.partial();
export type UpdateDiscountDto = z.infer<typeof UpdateDiscountSchema>;

export const AssignFeeSchema = z.object({
  structureId: z.string().min(1, 'Fee structure is required'),
  overrideTotal: z.coerce.number().min(0).optional(),
  discountId: z.string().optional(),
  customDiscountType: z.nativeEnum(DiscountType).optional(),
  customDiscountValue: z.coerce.number().min(0).optional(),
  customDiscountReason: z.string().max(250).optional(),
  generateInvoices: z.boolean().default(true),
  note: z.string().max(250).optional(),
});

export type AssignFeeDto = z.infer<typeof AssignFeeSchema>;

// ─── Phase 3: Invoices & Payments ─────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  assignmentId: z.string().optional(),
  title: z.string().max(150).optional(),
  installmentNo: z.coerce.number().int().min(1).default(1),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  discount: z.coerce.number().min(0).default(0),
  dueDate: z.coerce.date(),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceSchema = z.object({
  title: z.string().max(150).optional(),
  amount: z.coerce.number().positive().optional(),
  discount: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});

export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().max(120).optional(),
  note: z.string().max(250).optional(),
  paidAt: z.coerce.date().optional(),
});

export type RecordPaymentDto = z.infer<typeof RecordPaymentSchema>;

// ─── Phase 3: Expenses ────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
});

export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

export const UpdateExpenseSchema = CreateExpenseSchema.partial();
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>;




