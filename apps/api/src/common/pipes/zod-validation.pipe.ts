import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe — validates request body against a Zod schema.
 *
 * Usage:
 *   @UsePipes(new ZodValidationPipe(CreateTenantSchema))
 *   create(@Body() body: unknown) { ... }
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      throw new BadRequestException({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    return result.data;
  }
}
