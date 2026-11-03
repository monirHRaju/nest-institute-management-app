import type {
  CreatePublicApplicationDto,
  AdmissionApplicationRecord,
  StudentVerificationResult,
} from '@repo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Resolves the tenant slug on client side from window.location.hostname
 */
export function getClientTenantSlug(): string {
  if (typeof window === 'undefined') return 'mtech';

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
    return parts[0].toLowerCase();
  }
  return 'mtech';
}

export interface ApplicationSubmissionResult {
  success: boolean;
  applicationNumber: string;
  message: string;
  application?: {
    id: string;
    applicationNumber: string;
    applicantName: string;
    courseName: string;
    batchName?: string;
    submittedAt: string;
  };
}

/**
 * Submit an online admission application from public frontend
 */
export async function submitPublicApplication(
  dto: CreatePublicApplicationDto
): Promise<ApplicationSubmissionResult> {
  const slug = getClientTenantSlug();
  const res = await fetch(`${API_BASE_URL}/public/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': slug,
    },
    body: JSON.stringify(dto),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to submit application');
  }

  return data.data ?? data;
}

/**
 * Track an application status by application number and applicant phone
 */
export async function trackPublicApplication(
  applicationNumber: string,
  phone: string
): Promise<AdmissionApplicationRecord> {
  const slug = getClientTenantSlug();
  const query = new URLSearchParams({
    applicationNumber: applicationNumber.trim().toUpperCase(),
    phone: phone.trim(),
  });

  const res = await fetch(`${API_BASE_URL}/public/track?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': slug,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Application not found. Please verify your application number and phone.');
  }

  return (data.data ?? data) as AdmissionApplicationRecord;
}

/**
 * Publicly verify student credentials by student ID (e.g. STD-2026-0001)
 */
export async function verifyStudentCredential(
  studentId: string
): Promise<StudentVerificationResult> {
  const slug = getClientTenantSlug();
  const query = new URLSearchParams({
    studentId: studentId.trim().toUpperCase(),
  });

  const res = await fetch(`${API_BASE_URL}/public/verify?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': slug,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'No active or graduated student found with this ID');
  }

  return (data.data ?? data) as StudentVerificationResult;
}
