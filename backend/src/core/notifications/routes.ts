import { Request, Response, Router } from 'express';
import { wrapHandler } from '../../helpers';
import { HttpError } from '../../middlewares';
import type { AuthContext } from '../../types';
import { requireAuth } from '../auth/middlewares';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', wrapHandler(async (req: Request, res: Response) => {
    const { notificationRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [records, unread] = await notificationRepository.findForRecipient(auth.kind, auth.id, limit);
    res.status(200).send({ data: records, count: records.length, unread });
}))

notificationRouter.post('/read-all', wrapHandler(async (req: Request, res: Response) => {
    const { notificationRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const count = await notificationRepository.markAllRead(auth.kind, auth.id);
    res.status(200).send({ data: { updated: count } });
}))

notificationRouter.post('/:id/read', wrapHandler(async (req: Request, res: Response) => {
    const { notificationRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const updated = await notificationRepository.markRead(auth.kind, auth.id, req.params.id);
    if (!updated) { throw new HttpError(404, 'Notification not found.'); }
    res.status(200).send({ data: { updated: true } });
}))
