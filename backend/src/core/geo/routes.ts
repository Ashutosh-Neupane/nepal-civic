import { Request, Response, Router } from 'express';
import { wrapHandler } from '../../helpers';

export const geoRouter = Router();

// Public reference data: the federal structure of Nepal.

geoRouter.get('/provinces', wrapHandler(async (req: Request, res: Response) => {
    const { geoRepository } = res.app.repositories;
    const records = await geoRepository.findProvinces();
    res.status(200).send({ data: records, count: records.length });
}))

geoRouter.get('/districts', wrapHandler(async (req: Request, res: Response) => {
    const { geoRepository } = res.app.repositories;
    const provinceId = req.query.provinceId ? Number(req.query.provinceId) : undefined;
    const records = await geoRepository.findDistricts(provinceId);
    res.status(200).send({ data: records, count: records.length });
}))

geoRouter.get('/districts/:id/local-levels', wrapHandler(async (req: Request, res: Response) => {
    const { geoRepository } = res.app.repositories;
    const records = await geoRepository.findLocalLevels(Number(req.params.id));
    res.status(200).send({ data: records, count: records.length });
}))

geoRouter.get('/local-levels/:id', wrapHandler(async (req: Request, res: Response) => {
    const { geoRepository } = res.app.repositories;
    const record = await geoRepository.findLocalLevel(req.params.id);
    if (!record) {
        res.status(404).send({ data: { message: 'Local level not found.' } });
        return;
    }
    res.status(200).send({ data: record });
}))
