import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { wrapHandler } from '../../helpers';
import { HttpError } from '../../middlewares';
import { requireAuth } from '../auth/middlewares';
import { presignGet, presignPut } from './helpers';
import {
  isValidStorageKey,
  localPath,
  makeStorageKey,
  presignLocal,
  UPLOAD_CONTENT_TYPES,
  verifyLocalSignature,
  writeLocalFile
} from './local';

export const storageRouter = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

storageRouter.post('/presign-put', requireAuth, wrapHandler(async (req: Request, res: Response) => {
    const { filename } = req.body;
    const {
        storageDriver,
        storageEndpoint,
        storageBucket,
        storageRegion,
        storageAccessKey,
        storageSecretKey,
        storagePort,
        storageSSL,
    } = req.app.config;
    if (!filename || typeof filename !== 'string') {
        res.status(400).send({ data: { filename: null, message: 'Received an invalid file name.' } });
        return;
    }
    const key = makeStorageKey(filename);
    if (!key) {
        res.status(400).send({ data: { filename, message: 'Only photos, videos and PDF files can be uploaded.' } });
        return;
    }

    let uploadUrl: string | null;
    if (storageDriver === 'local') {
        uploadUrl = presignLocal(req.app.config, 'PUT', key);
    } else {
        uploadUrl = await presignPut(
            key,
            storageEndpoint as string,
            storageBucket as string,
            storageRegion as string,
            storageAccessKey as string,
            storageSecretKey as string,
            storagePort as number,
            storageSSL as boolean
        )
    }

    if (!uploadUrl) {
        res.status(400).send({ data: { uploadUrl, message: 'Could not generate upload URL.' } });
    } else {
        res.status(200).send({ data: { uploadUrl, filename: key } });
    }
}))

storageRouter.post('/presign-get', requireAuth, wrapHandler(async (req: Request, res: Response) => {
    const { filename } = req.body;
    const {
        storageDriver,
        storageEndpoint,
        storageBucket,
        storageRegion,
        storageAccessKey,
        storageSecretKey,
        storagePort,
        storageSSL,
        storageSignedGetExpiry,
    } = req.app.config;
    const filenames: string[] = Array.isArray(filename) ? filename : [filename];
    if (!filenames.length || filenames.some((name) => typeof name !== 'string' || !name)) {
        res.status(400).send({ data: { filename: null, message: 'Received an invalid file name.' } });
        return;
    }

    const urls: Record<string, string | null> = {};
    for (const name of filenames.slice(0, 50)) {
        if (storageDriver === 'local') {
            urls[name] = isValidStorageKey(name) ? presignLocal(req.app.config, 'GET', name) : null;
        } else {
            urls[name] = await presignGet(
                name,
                storageEndpoint as string,
                storageBucket as string,
                storageRegion as string,
                storageAccessKey as string,
                storageSecretKey as string,
                storagePort as number,
                storageSSL as boolean,
                storageSignedGetExpiry as number
            )
        }
    }

    if (Array.isArray(filename)) {
        res.status(200).send({ data: { retrieveUrls: urls } });
        return;
    }
    const retrieveUrl = urls[filename];
    if (!retrieveUrl) {
        res.status(400).send({ data: { retrieveUrl: null, message: 'Could not obtain a retrieve URL.' } });
    } else {
        res.status(200).send({ data: { retrieveUrl } });
    }
}))

// ---- local disk driver: the presigned URLs above point here -------------

storageRouter.put(
    /^\/local\/(.+)$/,
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
    wrapHandler(async (req: Request, res: Response) => {
        const key = req.params[0];
        const config = req.app.config;
        if (config.storageDriver !== 'local') { throw new HttpError(404, 'Not found.'); }
        if (!isValidStorageKey(key) || !verifyLocalSignature(config, 'PUT', key, req.query.expires, req.query.signature)) {
            throw new HttpError(403, 'Upload link is invalid or has expired.');
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) { throw new HttpError(400, 'Empty upload.'); }
        try {
            await writeLocalFile(config, key, req.body);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') { throw new HttpError(409, 'File already uploaded.'); }
            throw error;
        }
        res.status(200).send({ data: { filename: key } });
    })
);

storageRouter.get(/^\/local\/(.+)$/, wrapHandler(async (req: Request, res: Response) => {
    const key = req.params[0];
    const config = req.app.config;
    if (config.storageDriver !== 'local') { throw new HttpError(404, 'Not found.'); }
    if (!isValidStorageKey(key) || !verifyLocalSignature(config, 'GET', key, req.query.expires, req.query.signature)) {
        throw new HttpError(403, 'Link is invalid or has expired.');
    }
    const file = localPath(config, key);
    if (!fs.existsSync(file)) { throw new HttpError(404, 'File not found.'); }
    const ext = path.extname(key).slice(1);
    res.setHeader('Content-Type', UPLOAD_CONTENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    fs.createReadStream(file).pipe(res);
}))
