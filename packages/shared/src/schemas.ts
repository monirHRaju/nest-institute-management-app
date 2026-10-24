import { z } from 'zod';
import {
  Role,
  StudentStatus,
  EnrollmentStatus,
  AttendanceStatus,
  FeeType,
  InvoiceStatus,
  PaymentMethod,
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
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  schedule: z.string().optional().nullable(),
  classDays: z.array(z.string()).optional().default([]),
  classTime: z.string().max(100).optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  instructorId: z.string().optional().nullable(),
  courseId: z.string().min(1),
});

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = CreateBatchSchema.partial();
export type UpdateBatchDto = z.infer<typeof UpdateBatchSchema>;

// ─── Enrollment ───────────────────────────────────────────────────────────────

export const CreateEnrollmentSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  batchId: z.string().optional().nullable(),
  rollNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.nativeEnum(EnrollmentStatus).default(EnrollmentStatus.ENROLLED),
  classDays: z.array(z.string()).optional().default([]),
  classTime: z.string().max(100).optional().nullable(),
});

export type CreateEnrollmentDto = z.infer<typeof CreateEnrollmentSchema>;

export const UpdateEnrollmentSchema = z.object({
  batchId: z.string().optional().nullable(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
  rollNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  classDays: z.array(z.string()).optional(),
  classTime: z.string().max(100).optional().nullable(),
});

export type UpdateEnrollmentDto = z.infer<typeof UpdateEnrollmentSchema>;

// ─── Student ──────────────────────────────────────────────────────────────────

export const CreateStudentSchema = z.object({
  studentId: z.string().max(50).optional(), // Auto-generated if omitted
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().min(3, 'Phone is required').max(20),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  guardianName: z.string().max(100).optional().nullable(),
  guardianPhone: z.string().max(20).optional().nullable(),
  guardianRelation: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
  // Class schedule preferences
  classDays: z.array(z.string()).optional().default([]),
  classTime: z.string().max(100).optional().nullable(),
  // Optional initial enrollment for 1-step admission
  initialEnrollment: z
    .object({
      courseId: z.string().min(1, 'Course is required'),
      batchId: z.string().optional().nullable(),
      rollNumber: z.string().max(50).optional().nullable(),
      classDays: z.array(z.string()).optional().default([]),
      classTime: z.string().max(100).optional().nullable(),
    })
    .optional(),
});

export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.omit({
  initialEnrollment: true,
}).partial();

export type UpdateStudentDto = z.infer<typeof UpdateStudentSchema>;

export const StudentQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  classDay: z.string().optional(),
  classTime: z.string().optional(),
});

export type StudentQueryDto = z.infer<typeof StudentQuerySchema>;

// ─── Attendance ───────────────────────────────────────────────────────────────

export const MarkAttendanceEntrySchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
  notes: z.string().max(255).optional().nullable(),
});

export type MarkAttendanceEntryDto = z.infer<typeof MarkAttendanceEntrySchema>;

export const SaveBatchAttendanceSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  date: z.string().min(1, 'Date is required'), // Format: YYYY-MM-DD
  records: z.array(MarkAttendanceEntrySchema).min(1, 'At least one student record is required'),
});

export type SaveBatchAttendanceDto = z.infer<typeof SaveBatchAttendanceSchema>;

export const UpdateAttendanceRecordSchema = z.object({
  status: z.nativeEnum(AttendanceStatus).optional(),
  notes: z.string().max(255).optional().nullable(),
});

export type UpdateAttendanceRecordDto = z.infer<typeof UpdateAttendanceRecordSchema>;

export const AttendanceQuerySchema = PaginationSchema.extend({
  batchId: z.string().optional(),
  studentId: z.string().optional(),
  date: z.string().optional(), // Specific single date YYYY-MM-DD
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AttendanceQueryDto = z.infer<typeof AttendanceQuerySchema>;

// ─── Fees & Billing ──────────────────────────────────────────────────────────

export const CreateFeeInvoiceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().optional().nullable(),
  title: z.string().min(1, 'Invoice title is required').max(150),
  feeType: z.nativeEnum(FeeType).default(FeeType.TUITION),
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
  discount: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateFeeInvoiceDto = z.infer<typeof CreateFeeInvoiceSchema>;

export const UpdateFeeInvoiceSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  feeType: z.nativeEnum(FeeType).optional(),
  amount: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateFeeInvoiceDto = z.infer<typeof UpdateFeeInvoiceSchema>;

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  transactionId: z.string().max(100).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type RecordPaymentDto = z.infer<typeof RecordPaymentSchema>;

export const FeeInvoiceQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  feeType: z.nativeEnum(FeeType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FeeInvoiceQueryDto = z.infer<typeof FeeInvoiceQuerySchema>;

export const PaymentQuerySchema = PaginationSchema.extend({
  invoiceId: z.string().optional(),
  studentId: z.string().optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type PaymentQueryDto = z.infer<typeof PaymentQuerySchema>;

// ─── Instructor & Faculty ─────────────────────────────────────────────────────

export const CreateInstructorSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().max(20).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  specialization: z.array(z.string()).optional().default([]),
  qualification: z.string().max(100).optional().nullable(),
  joiningDate: z.coerce.date().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});

export type CreateInstructorDto = z.infer<typeof CreateInstructorSchema>;

export const UpdateInstructorSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  specialization: z.array(z.string()).optional(),
  qualification: z.string().max(100).optional().nullable(),
  joiningDate: z.coerce.date().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type UpdateInstructorDto = z.infer<typeof UpdateInstructorSchema>;

export const InstructorQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type InstructorQueryDto = z.infer<typeof InstructorQuerySchema>;

// ─── Reports ──────────────────────────────────────────────────────────────────

export const ReportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
});

export type ReportFilterDto = z.infer<typeof ReportFilterSchema>;
