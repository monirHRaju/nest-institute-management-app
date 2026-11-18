import { z } from 'zod';
import {
  AttendanceStatus,
  DiscountType,
  ExamStatus,
  ExamType,
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  PayrollStatus,
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

// ─── Phase 4: Staff & Payroll ─────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().max(20).optional(),
  role: z.enum([Role.STAFF, Role.INSTRUCTOR]).default(Role.INSTRUCTOR),
  designation: z.string().min(1, 'Designation is required').max(100),
  department: z.string().max(100).optional(),
  joinDate: z.coerce.date().optional(),
  baseSalary: z.coerce.number().min(0, 'Base salary must be non-negative'),
  bankInfo: z.string().max(250).optional(),
  mobileWallet: z.string().max(50).optional(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum([Role.STAFF, Role.INSTRUCTOR]).optional(),
  designation: z.string().min(1).max(100).optional(),
  department: z.string().max(100).nullable().optional(),
  joinDate: z.coerce.date().optional(),
  baseSalary: z.coerce.number().min(0).optional(),
  bankInfo: z.string().max(250).nullable().optional(),
  mobileWallet: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;

export const GeneratePayrollSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type GeneratePayrollDto = z.infer<typeof GeneratePayrollSchema>;

export const UpdatePayrollSchema = z.object({
  allowances: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  note: z.string().max(500).nullable().optional(),
});

export type UpdatePayrollDto = z.infer<typeof UpdatePayrollSchema>;

export const PayPayrollSchema = z.object({
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  paidAt: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
});

export type PayPayrollDto = z.infer<typeof PayPayrollSchema>;

export const BulkPayrollIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  method: z.nativeEnum(PaymentMethod).optional(),
  paidAt: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
});

export type BulkPayrollIdsDto = z.infer<typeof BulkPayrollIdsSchema>;

// ─── Phase 4: Exams, Results & Grade Scales ───────────────────────────────────

export const CreateExamSchema = z.object({
  name: z.string().min(1, 'Exam name is required').max(150),
  type: z.nativeEnum(ExamType).default(ExamType.CUSTOM),
  term: z.string().max(100).optional(),
  date: z.coerce.date(),
  totalMarks: z.coerce.number().positive('Total marks must be greater than 0'),
  passMarks: z.coerce.number().min(0, 'Pass marks must be non-negative'),
  batchId: z.string().min(1, 'Batch is required'),
  courseId: z.string().min(1).optional(),
});

export type CreateExamDto = z.infer<typeof CreateExamSchema>;

export const UpdateExamSchema = CreateExamSchema.partial().extend({
  status: z.nativeEnum(ExamStatus).optional(),
});

export type UpdateExamDto = z.infer<typeof UpdateExamSchema>;

export const ExamResultEntrySchema = z.object({
  studentId: z.string().min(1),
  marksObtained: z.coerce.number().min(0).default(0),
  isAbsent: z.boolean().default(false),
  remarks: z.string().max(250).optional(),
});

export const BulkUpsertExamResultsSchema = z.object({
  results: z.array(ExamResultEntrySchema).min(1, 'At least one result is required'),
});

export type BulkUpsertExamResultsDto = z.infer<typeof BulkUpsertExamResultsSchema>;

export const GradeScaleItemSchema = z.object({
  grade: z.string().min(1).max(10),
  minPercent: z.coerce.number().min(0).max(100),
  maxPercent: z.coerce.number().min(0).max(100),
  gpaPoint: z.coerce.number().min(0).max(5),
});

export const UpsertGradeScaleSchema = z.object({
  scales: z.array(GradeScaleItemSchema).min(1),
});

export type UpsertGradeScaleDto = z.infer<typeof UpsertGradeScaleSchema>;

export { PayrollStatus };




