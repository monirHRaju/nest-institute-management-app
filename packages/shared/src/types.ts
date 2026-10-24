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

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PASSED_OUT = 'PASSED_OUT',
  DROPPED_OUT = 'DROPPED_OUT',
  SUSPENDED = 'SUSPENDED',
}

export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export const DAYS_OF_WEEK = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

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

// ─── Attendance Types ─────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  batchId: string;
  studentId: string;
  markedById?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    phone: string;
    classDays?: string[];
    classTime?: string | null;
  };
  batch?: {
    id: string;
    name: string;
  };
  markedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface BatchAttendanceStudentItem {
  studentId: string;
  systemId: string;
  firstName: string;
  lastName: string;
  phone: string;
  rollNumber?: string | null;
  classDays: string[];
  classTime?: string | null;
  attendanceId?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface BatchAttendanceSheetResponse {
  batchId: string;
  batchName: string;
  courseName: string;
  date: string;
  totalEnrolled: number;
  markedCount: number;
  students: BatchAttendanceStudentItem[];
}

export interface StudentAttendanceSummary {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number; // percentage e.g. 85.5
  records: AttendanceRecord[];
}

export interface BatchAttendanceStats {
  totalSessions: number;
  totalRecords: number;
  averageRate: number;
  breakdown: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}
