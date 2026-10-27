import cors from 'cors';
import type { Request, RequestHandler, Response } from 'express';
import { json, Router, urlencoded } from 'express';
import { wrapHandler } from '../helpers';
import { internalServerError, notFound } from '../middlewares';
import type { ModelDefinition, PluginBase } from '../types';
import { ChannelStatusModel, CommunicationModel, CommunicationRepository, communicationsRouter, EmailStatusRepository, InboundMapModel, MessageDisambiguationModel, TemplateModel } from './communications';
import { DepartmentModel, DepartmentRepository, departmentRouter } from './departments';
import { JurisdictionModel, JurisdictionRepository, jurisdictionRouter } from './jurisdictions';
import { open311Router } from './open311';
import { ServiceRequestCommentModel, ServiceRequestModel, ServiceRequestRepository, serviceRequestRouter } from './service-requests';
import { ServiceModel, ServiceRepository, serviceRouter } from './services';
import { adminRouter } from './admin';
import { authenticate, authRouter, CitizenUserModel, OtpCodeModel } from './auth';
import { DistrictModel, geoRouter, ProvinceModel } from './geo';
import { grievanceRouter } from './grievances';
import { NotificationModel, notificationRouter } from './notifications';
import { accountRouter, StaffUserDepartmentModel, StaffUserModel, StaffUserRepository } from './staff-users';
import { storageRouter } from './storage';

const coreRoutes = Router();

coreRoutes.get('/', wrapHandler(async (req: Request, res: Response) => {
  res.status(200).send({ data: { name: 'nepal-civic', version: '1.0.0' } });
}))
coreRoutes.use('/auth', authRouter);
coreRoutes.use('/geo', geoRouter);
coreRoutes.use('/grievances', grievanceRouter);
coreRoutes.use('/notifications', notificationRouter);
coreRoutes.use('/admin', adminRouter);
coreRoutes.use('/services', serviceRouter);
coreRoutes.use('/service-requests', serviceRequestRouter);
coreRoutes.use('/accounts', accountRouter);
coreRoutes.use('/communications', communicationsRouter);
coreRoutes.use('/jurisdictions', jurisdictionRouter);
coreRoutes.use('/departments', departmentRouter);
coreRoutes.use('/storage', storageRouter);
coreRoutes.use('/open311/v2', open311Router);

const coreModels: ModelDefinition[] = [
  JurisdictionModel,
  ServiceRequestModel,
  ServiceRequestCommentModel,
  ServiceModel,
  StaffUserModel,
  StaffUserDepartmentModel,
  CommunicationModel,
  DepartmentModel,
  InboundMapModel,
  ChannelStatusModel,
  MessageDisambiguationModel,
  TemplateModel,
  ProvinceModel,
  DistrictModel,
  CitizenUserModel,
  OtpCodeModel,
  NotificationModel
]

const coreRepositories: PluginBase[] = [
  JurisdictionRepository,
  ServiceRequestRepository,
  ServiceRepository,
  StaffUserRepository,
  CommunicationRepository,
  DepartmentRepository,
  EmailStatusRepository,
]

const coreMiddlewares: RequestHandler[] = [
  cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : true }),
  json({ limit: '1mb' }),
  urlencoded({ extended: true }),
  wrapHandler(authenticate),
]

export {
    coreRoutes,
    coreModels,
    coreRepositories,
    coreMiddlewares,
    internalServerError,
    notFound
};
