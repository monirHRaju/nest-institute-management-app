/**
 * Shared enums, types, and Zod schemas used across
 * apps/api, apps/admin, and apps/public.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  STAFF = 'STAFF',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
}

export enum AdmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum DiscountType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
  SCHOLARSHIP = 'SCHOLARSHIP',
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  SSLCOMMERZ = 'SSLCOMMERZ',
  OTHER = 'OTHER',
}

export enum ExpenseCategory {
  SALARY = 'SALARY',
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  MARKETING = 'MARKETING',
  EQUIPMENT = 'EQUIPMENT',
  OTHER = 'OTHER',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum ExamType {
  QUIZ = 'QUIZ',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  CUSTOM = 'CUSTOM',
}

export enum ExamStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: Role;
  tenantId: string | null; // null for SUPER_ADMIN
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface TenantThemeConfig {
  primaryColor: string;   // e.g. "#2563eb"
  accentColor: string;    // e.g. "#f59e0b"
  logoUrl?: string;
  bannerUrl?: string;
  aboutText?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
}
