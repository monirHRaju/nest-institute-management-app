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

export enum FeeType {
  ADMISSION = 'ADMISSION',
  TUITION = 'TUITION',
  EXAM = 'EXAM',
  MATERIALS = 'MATERIALS',
  OTHER = 'OTHER',
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
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
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

// ─── Batch Types ──────────────────────────────────────────────────────────────

export interface BatchRecord {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  schedule?: string | null;
  classDays?: string[];
  classTime?: string | null;
  capacity?: number | null;
  courseId: string;
  instructorId?: string | null;
  course?: {
    id: string;
    title?: string;
    name?: string;
  };
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  _count?: {
    enrollments?: number;
  };
  createdAt?: string;
  updatedAt?: string;
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

// ─── Fee & Payment Types ──────────────────────────────────────────────────────

export interface FeeInvoiceRecord {
  id: string;
  invoiceNumber: string;
  title: string;
  feeType: FeeType;
  amount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate?: string | null;
  status: InvoiceStatus;
  notes?: string | null;
  studentId: string;
  courseId?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
  };
  course?: {
    id: string;
    name: string;
    fees: number;
  } | null;
  payments?: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string | null;
  paymentDate: string;
  notes?: string | null;
  invoiceId: string;
  studentId: string;
  receivedById?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    title: string;
    totalAmount: number;
    dueAmount: number;
  };
  student?: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  receivedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface StudentLedgerSummary {
  totalBilled: number;
  totalPaid: number;
  dueBalance: number;
  invoices: FeeInvoiceRecord[];
  payments: PaymentRecord[];
}

export interface FinancialStatsSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  totalInvoicesCount: number;
  totalPaymentsCount: number;
  methodBreakdown: Record<string, number>;
  recentPayments: PaymentRecord[];
}

// ─── Instructor & Faculty Types ───────────────────────────────────────────────

export interface InstructorProfileRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  designation?: string | null;
  specialization: string[];
  qualification?: string | null;
  joiningDate?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
  instructorBatches?: Array<{
    id: string;
    name: string;
    schedule?: string | null;
    classDays: string[];
    classTime?: string | null;
    capacity?: number | null;
    course?: {
      id: string;
      name: string;
    };
    _count?: {
      enrollments: number;
    };
  }>;
  _count?: {
    instructorBatches: number;
  };
}

export interface TimetableSlotItem {
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  instructorId?: string | null;
  instructorName?: string | null;
  classDays: string[];
  classTime?: string | null;
  studentCount: number;
  capacity?: number | null;
}

// ─── Reports & Analytics Types ────────────────────────────────────────────────

export interface AttendanceReportSummary {
  totalSessions: number;
  averageRate: number;
  batchStats: Array<{
    batchId: string;
    batchName: string;
    courseName: string;
    totalSessions: number;
    averageRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    systemId: string;
    name: string;
    phone: string;
    batchName: string;
    rate: number;
    sessions: number;
  }>;
}

export interface FinancialReportSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  methodBreakdown: Record<string, number>;
  monthlyCollections: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  courseRevenue: Array<{
    courseId: string;
    courseName: string;
    totalBilled: number;
    totalCollected: number;
    totalDue: number;
  }>;
}

export interface AdmissionsReportSummary {
  totalStudents: number;
  activeStudents: number;
  newAdmissionsThisMonth: number;
  monthlyAdmissions: Array<{
    month: string;
    count: number;
  }>;
  courseDistribution: Array<{
    courseId: string;
    courseName: string;
    count: number;
    percentage: number;
  }>;
}
