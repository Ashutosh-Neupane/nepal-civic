import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../middlewares';
import type { CitizenAuth, GovernmentLevel, StaffAuth } from '../../types';
import { levelRank } from './scope';

/** Reads a Bearer token, if any, and attaches the caller to `req.auth`. Never rejects. */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    try {
      const auth = await res.app.services.authService.authenticateToken(header.slice(7).trim());
      if (auth) {
        req.auth = auth;
        if (auth.kind === 'staff') { req.user = auth.staff; }
      }
    } catch (error) {
      next(error);
      return;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) { next(new HttpError(401, 'Please log in.')); return; }
  next();
}

export function requireCitizen(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) { next(new HttpError(401, 'Please log in.')); return; }
  if (req.auth.kind !== 'citizen') { next(new HttpError(403, 'Only citizens can do this.')); return; }
  next();
}

/** Staff only; optionally at or above a given level of government. */
export function requireStaff(minLevel?: GovernmentLevel | 'national') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) { next(new HttpError(401, 'Please log in.')); return; }
    if (req.auth.kind !== 'staff') { next(new HttpError(403, 'Only officers can do this.')); return; }
    if (minLevel && levelRank(req.auth.scope.level) < levelRank(minLevel)) {
      next(new HttpError(403, 'Your role does not allow this.'));
      return;
    }
    next();
  };
}

export function staffAuth(req: Request): StaffAuth {
  return req.auth as StaffAuth;
}

export function citizenAuth(req: Request): CitizenAuth {
  return req.auth as CitizenAuth;
}
