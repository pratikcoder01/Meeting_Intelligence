/**
 * validate.middleware.ts
 *
 * Generic Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/register', validate(RegisterSchema), controller.register);
 *   router.get('/:id',       validate(ParamsSchema, 'params'), controller.getById);
 *
 * On success:  the validated (and Zod-transformed) data replaces req[target].
 * On failure:  next() is called with a ValidationError containing field-level
 *              details, which the global error handler formats using the unified
 *              envelope.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { ValidationError } from '@/utils/errors';

type ValidationTarget = 'body' | 'params' | 'query';

interface FieldError {
  field: string;
  message: string;
  received?: unknown;
}

const formatZodErrors = (error: ZodError): FieldError[] =>
  error.errors.map((e) => ({
    field: e.path.join('.') || 'root',
    message: e.message,
    received: 'received' in e ? e.received : undefined,
  }));

export const validate =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (schema: ZodType<any, any, any>, target: ValidationTarget = 'body') =>
    (req: Request, _res: Response, next: NextFunction): void => {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
        const details = formatZodErrors(result.error);
        next(new ValidationError('Request validation failed', details));
        return;
      }

      // Replace with the parsed + Zod-coerced/transformed data so controllers
      // always receive correctly typed values (e.g., Date from string).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      (req as any)[target] = result.data;
      next();
    };
