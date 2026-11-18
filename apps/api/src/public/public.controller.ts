import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ExamStatus,
  PublicResultLookupDto,
  PublicResultLookupSchema,
} from '@repo/shared';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantContext } from '../common/types/request.types';

export function matchesPhoneTail(
  inputPhone: string,
  storedPhones: Array<string | null | undefined>,
): boolean {
  const inputDigits = (inputPhone || '').replace(/[^\d]/g, '');
  if (inputDigits.length < 4) return false;
  const tail = inputDigits.slice(-4);

  return storedPhones.some((sp) => {
    if (!sp) return false;
    const storedDigits = sp.replace(/[^\d]/g, '');
    if (storedDigits.length < 4) return false;
    if (inputDigits.length >= 10) {
      return storedDigits.endsWith(inputDigits.slice(-10));
    }
    return storedDigits.slice(-4) === tail;
  });
}

@ApiTags('Public API')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenant-config')
  @Public()
  @ApiOperation({ summary: 'Get public configuration for the current tenant' })
  @ApiResponse({ status: 200, description: 'Tenant config retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenantConfig(@CurrentTenant() tenant: TenantContext | undefined) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        themeConfig: tenant.themeConfig,
      },
    };
  }

  @Get('courses')
  @Public()
  @ApiOperation({ summary: 'Get public course catalog for the current tenant' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getPublicCourses(@CurrentTenant() tenant: TenantContext | undefined) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }

    const courses = await this.prisma.course.findMany({
      where: { tenantId: tenant.id },
      include: {
        category: true,
        batches: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: courses,
    };
  }

  @Post('results/lookup')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Public result lookup using Student Code/ID + phone verification',
  })
  async lookupResults(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body(new ZodValidationPipe(PublicResultLookupSchema))
    dto: PublicResultLookupDto,
  ) {
    if (!tenant) {
      throw new BadRequestException('Tenant context missing or invalid');
    }

    const identifier = dto.identifier.trim();
    const student = await this.prisma.student.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { studentCode: { equals: identifier, mode: 'insensitive' } },
          { id: identifier },
        ],
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
        batch: {
          include: { course: true },
        },
      },
    });

    const genericNotFound = new NotFoundException(
      'No matching student record found for the provided Student Code/ID and phone number',
    );

    if (!student) {
      throw genericNotFound;
    }

    const phoneVerified = matchesPhoneTail(dto.phone, [
      student.user.phone,
      student.guardianPhone,
    ]);
    if (!phoneVerified) {
      throw genericNotFound;
    }

    const results = await this.prisma.examResult.findMany({
      where: {
        tenantId: tenant.id,
        studentId: student.id,
        exam: {
          status: ExamStatus.PUBLISHED,
          ...(dto.term?.trim()
            ? { term: { contains: dto.term.trim(), mode: 'insensitive' } }
            : {}),
        },
      },
      include: {
        exam: {
          include: {
            course: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { exam: { date: 'asc' } },
    });

    let totalObtained = 0;
    let totalMax = 0;
    let gpaSum = 0;
    let gpaCount = 0;
    let allPassed = results.length > 0;

    const exams = results.map((r) => {
      const obtained = Number(r.marksObtained);
      const max = Number(r.exam.totalMarks);
      const pass = Number(r.exam.passMarks);
      const passed = !r.isAbsent && obtained >= pass;
      if (!passed) allPassed = false;

      totalObtained += obtained;
      totalMax += max;
      if (r.gpaPoint !== null) {
        gpaSum += Number(r.gpaPoint);
        gpaCount += 1;
      }

      return {
        examId: r.examId,
        examName: r.exam.name,
        examType: r.exam.type,
        term: r.exam.term,
        date: r.exam.date,
        courseName: r.exam.course.name,
        totalMarks: max,
        passMarks: pass,
        marksObtained: obtained,
        percent: max > 0 ? Number(((obtained / max) * 100).toFixed(2)) : 0,
        grade: r.grade ?? (passed ? 'P' : 'F'),
        gpaPoint: r.gpaPoint !== null ? Number(r.gpaPoint) : null,
        isAbsent: r.isAbsent,
        passed,
      };
    });

    return {
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          themeConfig: tenant.themeConfig,
        },
        student: {
          id: student.id,
          studentCode: student.studentCode || student.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          batchName: student.batch?.name ?? null,
          courseName: student.batch?.course?.name ?? null,
          enrollmentDate: student.enrollmentDate,
        },
        exams,
        summary: {
          examCount: exams.length,
          totalObtained: Number(totalObtained.toFixed(2)),
          totalMarks: Number(totalMax.toFixed(2)),
          overallPercent:
            totalMax > 0
              ? Number(((totalObtained / totalMax) * 100).toFixed(2))
              : 0,
          averageGpa:
            gpaCount > 0 ? Number((gpaSum / gpaCount).toFixed(2)) : 0,
          overallResult:
            exams.length === 0 ? 'NO_EXAMS' : allPassed ? 'PASS' : 'FAIL',
        },
      },
    };
  }

  @Get('verify/student/:code')
  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify student enrollment & report card authenticity by code',
  })
  async verifyStudent(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('code') code: string,
  ) {
    if (!tenant) {
      throw new BadRequestException('Tenant context missing or invalid');
    }

    const cleanCode = code.trim();
    const student = await this.prisma.student.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { studentCode: { equals: cleanCode, mode: 'insensitive' } },
          { id: cleanCode },
        ],
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        batch: {
          include: { course: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Verification code does not match any student record');
    }

    return {
      success: true,
      data: {
        verified: true,
        instituteName: tenant.name,
        studentCode: student.studentCode || student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        courseName: student.batch?.course?.name ?? null,
        batchName: student.batch?.name ?? null,
        enrollmentDate: student.enrollmentDate,
        status: student.user.isActive ? 'ACTIVE' : 'INACTIVE',
        verifiedAt: new Date().toISOString(),
      },
    };
  }
}
