import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { verifyRecaptchaResponse } from './captcha';
import { scopeCoversJurisdiction } from './core/auth/scope';
import logger from './logging';
export function notFound(req: Request, res: Response): void {
    const status_code = 404
    const data = { message: 'Route Not Found.', status_code: status_code }
    const dataToLog = Object.assign({}, data, { path: req.path })
    logger.error(data.message, dataToLog);
    res.status(status_code).send({ data });
}

/** An error that maps to an HTTP status and a message safe to show to the client. */
export class HttpError extends Error {
    status: number;
    details?: Record<string, unknown>;

    constructor(status: number, message: string, details?: Record<string, unknown>) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function internalServerError(err: ErrorRequestHandler | Error, req: Request, res: Response, next: NextFunction): void {
    if (err instanceof HttpError) {
        const data = { message: err.message, status_code: err.status, ...err.details };
        if (err.status >= 500) { logger.error(err.message, { path: req.path }); }
        res.status(err.status).send({ data });
        return;
    }
    if (err && (err as Error).name === 'SequelizeValidationError') {
        const data = { message: (err as Error).message, status_code: 400 };
        res.status(400).send({ data });
        return;
    }
    const status_code = 500
    const data = { message: 'Internal Server Error.', status_code: status_code }
    const dataToLog = Object.assign({}, data, { path: req.path, error: `${err}` })
    logger.error(data.message, dataToLog);
    res.status(status_code).send({ data });
}

export function resolveJurisdiction(paramKey = 'jurisdictionId', excludedRoutes: string[] = []) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { jurisdictionRepository } = res.app.repositories;
        const jurisdictionId = req.query[paramKey];
        const errorStatus = 403;
        if (excludedRoutes.includes(req.path)) {
            next();
            return;
        }

        const errorMessage = _.isNil(jurisdictionId)
            ? 'A jurisdiction query parameter is required.'
            : 'A jurisdiction query parameter was present but is invalid.';
        const jurisdiction = _.isNil(jurisdictionId)
            ? null
            : await jurisdictionRepository.findOne(jurisdictionId as string);

        if (_.isNil(jurisdiction)) {
            const errorData = {
                message: errorMessage,
                status_code: errorStatus,
                path: req.path,
                error: `${new Error(errorMessage)}`
            }
            logger.error(errorData.message, errorData);
            res.status(errorStatus).send({ errorData });
            return;
        }
        req.jurisdiction = jurisdiction;
        next();
    }
}

export function enforceJurisdictionAccess(req: Request, res: Response, next: NextFunction): void {
    const STATUS_CODE_UNAUTHORIZED = 401;
    const STATUS_CODE_FORBIDDEN = 403;

    if (!req.app.config.enforceAuthorization) {
        next();
        return;
    }

    if (!req.auth || req.auth.kind !== 'staff') {
        res.status(STATUS_CODE_UNAUTHORIZED).send();
        return;
    }

    if (scopeCoversJurisdiction(req.auth.scope, req.jurisdiction)) {
        next();
        return;
    }

    res.status(STATUS_CODE_FORBIDDEN).send();
}

export async function maybeCaptcha(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { captchaEnabled, reCaptchaSecretKey } = req.app.config;
    const captchaResponseToken = req.body['captcha_response_token'];
    delete req.body['captcha_response_token'];

    if (captchaEnabled == true) {
        const captchaResponse = await verifyRecaptchaResponse(reCaptchaSecretKey, captchaResponseToken);
        if (captchaResponse.success == true) {
            next()
        } else {
            const status_code = 400
            const data = {
                message: 'Bad request: The reCaptcha token is invalid',
                status_code: status_code,
                error_codes: captchaResponse['error-codes']
            }
            res.status(status_code).send(data)
        }
    } else {
        next();
    }

}
