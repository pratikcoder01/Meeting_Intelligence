import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@/utils/errors';

// ─── Validation Targets ───────────────────────────────────────────────────────
type ValidationTarget = 'body' | 'params' | 'query';

// ─── Validate Factory ─────────────────────────────────────────────────────────
/**
 * Returns an Express middleware that validates the specified part of the request
 * against the given Zod schema. On success, the parsed (and potentially
 * transformed) data replaces the original request data.
 *
 * @example
 * router.post('/meetings', validate(CreateMeetingSchema, 'body'), controller.create);
 */
export const validate =
  <T>(schema: ZodSchema<T>, target: ValidationTarget = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = formatZodErrors(result.error);
      next(new ValidationError('Request validation failed', details));
      return;
    }

    // Overwrite the request data with the parsed + transformed result
    // so that controllers always receive correctly typed data.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };

// ─── Format Zod Errors ────────────────────────────────────────────────────────
interface FieldError {
  field: string;
  message: string;
}

const formatZodErrors = (error: ZodError): FieldError[] =>
  error.errors.map((e) => ({
    field: e.path.join('.') || 'root',
    message: e.message,
  }));
