#! /usr/bin/env node
import type { Server } from 'http';
import { startGrievanceScheduler } from '../core/grievances/scheduler';
import { createApp } from '../index';
import logger from '../logging';

async function defaultServer(): Promise<Server> {
    const app = await createApp();
    const port = app.config.appPort;
    const server = app.listen(port, () => {
        logger.info(`application listening on ${port}.`)
    });
    const stopScheduler = startGrievanceScheduler(app);
    server.on('close', stopScheduler);
    return server;
}

export default defaultServer;
