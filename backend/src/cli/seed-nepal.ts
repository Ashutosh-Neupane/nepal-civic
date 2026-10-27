#! /usr/bin/env node
import 'reflect-metadata';
import { createApp } from '../index';
import { seedNepal } from '../tools/seed-nepal';
import type { DatabaseEngine } from '../types';

(async () => {
    const app = await createApp();
    const summary = await seedNepal(app.database as DatabaseEngine);
    console.log(JSON.stringify(summary, null, 2));
    await app.database.close();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
