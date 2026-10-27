import logger from '../../logging';
import { Request, Response, Router } from 'express';
import multer from 'multer';
import { wrapHandler } from '../../helpers';
import { enforceJurisdictionAccess, resolveJurisdiction } from '../../middlewares';
import { normalizeNepaliPhone, sendSms } from '../../sms';
import { EmailEventAttributes, InboundSmsDataAttributes, SmsEventAttributes } from '../../types';
import { verifySendGridWebhook } from './helpers';
import { EMAIL_EVENT_IGNORE } from './models';

export const communicationsRouter = Router();

/**
 * Map an inbound SMS callback from the SMS gateway (Sparrow SMS two-way / keyword
 * service) to the To / From / Body shape the inbound SMS pipeline uses.
 * `To` is the number or keyword the citizen texted; it is matched against InboundMap.
 */
export function normalizeInboundSms(payload: Record<string, unknown>): InboundSmsDataAttributes | null {
    const pick = (...keys: string[]) => {
        for (const key of keys) {
            const value = payload[key];
            if (typeof value === 'string' && value.trim()) { return value.trim(); }
        }
        return '';
    };
    const from = normalizeNepaliPhone(pick('from', 'From', 'sender', 'mobile'));
    const body = pick('text', 'Body', 'message', 'msg');
    const to = pick('keyword', 'to', 'To', 'shortcode', 'short_code');
    if (!from || !body || !to) { return null; }
    return { To: to, From: from, Body: body } as InboundSmsDataAttributes;
}

// public route for web hook integration (the gateway may call with GET or POST)
communicationsRouter.all('/inbound/sms', multer().none(), wrapHandler(async (req: Request, res: Response) => {
    const { serviceRequestService } = res.app.services;
    const { sparrowSmsToken, smsFromIdentity, inboundSmsSecret } = res.app.config;
    if (inboundSmsSecret && req.query.secret !== inboundSmsSecret) {
        res.status(403).send({ data: { status: 403, message: 'Invalid inbound SMS secret' } });
        return;
    }
    const inboundData = normalizeInboundSms({ ...req.query, ...req.body });
    if (!inboundData) {
        res.status(400).send({ data: { status: 400, message: 'Inbound SMS requires from, text and to/keyword' } });
        return;
    }

    // if we need to disambiguate manually we start a dialog with the submitter here
    const [
        disambiguate,
        disambiguateResponse,
        disambiguatedOriginalMessage,
        disambiguatedPublicId
    ] = await serviceRequestService.disambiguateInboundData(inboundData);
    if (disambiguate) {
        // Sparrow SMS inbound webhooks do not take a reply body, so the question goes out as a new SMS.
        try {
            await sendSms(
                sparrowSmsToken as string,
                inboundData.From,
                smsFromIdentity as string,
                disambiguateResponse,
                undefined,
            );
        } catch (error) {
            logger.warn(`Could not send disambiguation SMS: ${error}`);
        }
        res.status(200).send({ data: { status: 200, message: 'Received inbound SMS', reply: disambiguateResponse } });
        return;
    }
    await serviceRequestService.createServiceRequest(
        inboundData, disambiguatedOriginalMessage, disambiguatedPublicId
    );
    res.status(200).send({ data: { status: 200, message: 'Received inbound SMS', reply: null } });
}))

// public route for web hook integration
communicationsRouter.post('/inbound/email', multer().none(), wrapHandler(async (req: Request, res: Response) => {
    const { serviceRequestService } = res.app.services;
    await serviceRequestService.createServiceRequest(req.body);
    res.status(200).send({ data: { status: 200, message: "Received inbound email" } });
}))

// public route for web hook integration
communicationsRouter.post('/events/email', wrapHandler(async (req: Request, res: Response) => {
    const { sendGridSignedWebhookVerificationKey } = res.app.config;
    let verified;
    if (sendGridSignedWebhookVerificationKey) {
        // we are allowing unverified events IF this variable is not set
        // it really does need to be set for production use
        const signature = req.get('X-Twilio-Email-Event-Webhook-Signature');
        const timestamp = req.get('X-Twilio-Email-Event-Webhook-Timestamp');
        verified = verifySendGridWebhook(
            sendGridSignedWebhookVerificationKey as string,
            req.body as EmailEventAttributes,
            signature as string | undefined,
            timestamp as string | undefined
        );
    }

    if (sendGridSignedWebhookVerificationKey && !verified) {
        res.status(403).send({ data: { status: 403, message: "Unverified POST" } });
    }

    const { emailStatusRepository } = res.app.repositories;
    const emailEvents = req.body as unknown as EmailEventAttributes[];
    for (const event of emailEvents) {
        if (!EMAIL_EVENT_IGNORE.includes(event.event)) { await emailStatusRepository.createFromEvent(event); }
    }
    res.status(200).send({ data: { status: 200, message: "Received email event" } });
}))

// public route for web hook integration
communicationsRouter.post('/events/sms', wrapHandler(async (req: Request, res: Response) => {
    const { smsStatusRepository } = res.app.repositories;
    const event = req.body as unknown as SmsEventAttributes;
    await smsStatusRepository.createFromEvent(event);
    res.status(200).send({ data: { status: 200, message: "Received email event" } });
}))

communicationsRouter.get('/status/email/:email',
    wrapHandler(resolveJurisdiction()),
    enforceJurisdictionAccess,
    wrapHandler(async (req: Request, res: Response) => {
        const { emailStatusRepository } = res.app.repositories;
        // We enforce jurisdiction access for security, but actually
        // our email delivery status is global, not by jurisdiction
        // So the jurisdiction is not used in the data query.
        const base64Email = req.params.email;
        const record = await emailStatusRepository.isAllowed(base64Email);
        res.status(200).send({ data: record });
    }))

communicationsRouter.get('/status/phone/:phone',
    wrapHandler(resolveJurisdiction()),
    enforceJurisdictionAccess,
    wrapHandler(async (req: Request, res: Response) => {
        const { smsStatusRepository } = res.app.repositories;
        // We enforce jurisdiction access for security, but actually
        // our email delivery status is global, not by jurisdiction
        // So the jurisdiction is not used in the data query.
        const base64Phone = req.params.phone;
        const record = await smsStatusRepository.isAllowed(base64Phone);
        res.status(200).send({ data: record });
    }))

communicationsRouter.post('/create-map',
    wrapHandler(resolveJurisdiction()),
    enforceJurisdictionAccess,
    wrapHandler(async (req: Request, res: Response) => {
        const { inboundMessageService } = res.app.services;
        const data = Object.assign({}, req.body, { jurisdictionId: req.jurisdiction.id });
        const record = await inboundMessageService.createMap(data);
        res.status(200).send({ data: record });
    }))

communicationsRouter.get('/templates',
  wrapHandler(resolveJurisdiction()),
  enforceJurisdictionAccess,
  wrapHandler(async (req: Request, res: Response) => {
    const { templateService } = res.app.services;
    const [records, count] = await templateService.findAll(req.jurisdiction.id);
    res.status(200).send({ data: records, count: count });
}))

communicationsRouter.get('/templates/:id',
  wrapHandler(resolveJurisdiction()),
  enforceJurisdictionAccess,
  wrapHandler(async (req: Request, res: Response) => {
    const { templateService } = res.app.services;
    const record = await templateService.findOne(req.jurisdiction.id, req.params.id);
    res.status(200).send({ data: record });
}))

communicationsRouter.post('/templates',
  wrapHandler(resolveJurisdiction()),
  enforceJurisdictionAccess,
  wrapHandler(async (req: Request, res: Response) => {
    const { templateService } = res.app.services;
    const record = await templateService.create(req.body);
    res.status(200).send({ data: record });
}))

communicationsRouter.put('/templates/:id',
  wrapHandler(resolveJurisdiction()),
  enforceJurisdictionAccess,
  wrapHandler(async (req: Request, res: Response) => {
    const { templateService } = res.app.services;
    const { id } = req.params;
    const record = await templateService.update(req.jurisdiction.id, id, req.body);
    res.status(200).send({ data: record });
}))

communicationsRouter.post('/templates/delete/:id',
  wrapHandler(resolveJurisdiction()),
  enforceJurisdictionAccess,
  wrapHandler(async (req: Request, res: Response) => {
    const { templateService } = res.app.services;
    const { id } = req.params;
    const record = await templateService.delete(req.jurisdiction.id, id);
    res.status(200).send({ data: record });
  }))
