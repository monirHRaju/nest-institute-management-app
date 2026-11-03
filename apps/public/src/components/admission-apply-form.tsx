'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  Check,
  Send,
  Loader2,
  AlertCircle,
  ArrowRight,
  Printer,
  Sparkles,
} from 'lucide-react';
import type { PublicCourseRecord } from '@repo/shared';
import { submitPublicApplication, ApplicationSubmissionResult } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdmissionApplyFormProps {
  courses: PublicCourseRecord[];
}

export function AdmissionApplyForm({ courses }: AdmissionApplyFormProps) {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || (courses[0]?.id ?? '');
  const initialBatchId = searchParams.get('batchId') || '';

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);

  // Form fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [notes, setNotes] = useState('');

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ApplicationSubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter batches for selected course
  const currentCourse = courses.find((c) => c.id === selectedCourseId);
  const availableBatches = currentCourse?.activeBatches || currentCourse?.batches || [];

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    setSelectedBatchId(''); // reset batch selection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCourseId) {
      setErrorMsg('Please select a course to apply for.');
      return;
    }
    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg('Last name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Contact phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPublicApplication({
        courseId: selectedCourseId,
        batchId: selectedBatchId || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        phone: phone.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        gender: gender ? gender : undefined,
        address: address.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        guardianRelation: guardianRelation.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.applicationNumber) {
      navigator.clipboard.writeText(result.applicationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const applicantFullName = `${firstName} ${lastName}`.trim();

  // If application was successfully submitted, show confirmation screen
  if (result) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-gray-200 shadow-md text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Application Received Successfully
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950">
            Thank You, {applicantFullName}!
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Your admission application has been registered in our database. Our admissions committee is now reviewing your application.
          </p>
        </div>

        {/* Tracking Reference Card */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Your Official Application Tracking ID
          </div>
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-300">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-blue-700 tracking-wider">
              {result.applicationNumber}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-1.5 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy ID</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Please record or screenshot this number. You will need this ID alongside your phone number to check admission updates.
          </p>
        </div>

        {/* Details Summary */}
        <div className="text-left text-xs space-y-2 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Applicant:</span>
            <span className="font-semibold text-gray-900">{applicantFullName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Selected Program:</span>
            <span className="font-semibold text-gray-900">
              {currentCourse?.name || 'Assigned by Counselor'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Primary Contact Phone:</span>
            <span className="font-semibold text-gray-900">{phone}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Status:</span>
            <span className="font-semibold text-amber-600 uppercase">Pending Review</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/track?applicationNumber=${result.applicationNumber}&phone=${encodeURIComponent(phone)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            <span>Track Application Status</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print Confirmation</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-6 sm:p-10 border border-gray-200 shadow-sm max-w-3xl mx-auto space-y-8"
    >
      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold">Submission Incomplete</h5>
            <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Step 1: Program & Batch Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div
            className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            1
          </div>
          <h3 className="text-base font-bold text-gray-900">Academic Program Selection</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="courseSelect">
              Course / Program <span className="text-red-500">*</span>
            </Label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>
                Select Course...
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} {course.code ? `(${course.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batchSelect">Preferred Batch (Optional)</Label>
            <select
              id="batchSelect"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Next Available / Open Intake</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Applicant Personal Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div
            className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            2
          </div>
          <h3 className="text-base font-bold text-gray-900">Applicant Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="e.g. John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="applicantEmail">Email Address</Label>
            <Input
              id="applicantEmail"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="applicantPhone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="applicantPhone"
              type="tel"
              placeholder="e.g. +1 555-0199 or 01700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="applicantDob">Date of Birth</Label>
            <Input
              id="applicantDob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="applicantGender">Gender</Label>
            <select
              id="applicantGender"
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Gender...</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="applicantAddress">Current Address</Label>
            <Input
              id="applicantAddress"
              placeholder="Street address, City, Postal Code"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Guardian & Additional Details (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div
            className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            3
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Guardian & Additional Details (Optional)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="guardianName">Guardian / Parent Name</Label>
            <Input
              id="guardianName"
              placeholder="e.g. Robert Doe"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardianRelation">Guardian Relationship</Label>
            <Input
              id="guardianRelation"
              placeholder="e.g. Father, Mother, Sibling"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="guardianPhone">Guardian Contact Phone</Label>
            <Input
              id="guardianPhone"
              type="tel"
              placeholder="Guardian mobile number"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="applicantNotes">Additional Notes or Inquiries</Label>
            <textarea
              id="applicantNotes"
              rows={3}
              placeholder="Any specific questions, schedule preferences, or background details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 max-w-sm">
          By clicking Submit Application, you verify that the information supplied is accurate and agree to receive admission updates.
        </p>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 text-sm font-semibold shadow-md gap-2"
          style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Application...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Application</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
