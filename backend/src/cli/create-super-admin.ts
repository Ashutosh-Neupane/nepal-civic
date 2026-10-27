#! /usr/bin/env node
import crypto from 'crypto';
import 'reflect-metadata';
import validator from 'validator';
import { assertPasswordStrength, hashSecret } from '../core/auth/helpers';
import { createApp } from '../index';
import type { StaffUserAttributes } from '../types';

// Usage: npm run create-super-admin -- <email> <first name> <last name>
// The password is read from the SUPER_ADMIN_PASSWORD environment variable.
(async () => {
    const [email, firstName, lastName] = process.argv.slice(2);
    const password = process.env.SUPER_ADMIN_PASSWORD || '';
    if (!email || !validator.isEmail(email) || !firstName || !lastName) {
        throw new Error('Usage: create-super-admin <email> <first name> <last name> (password in SUPER_ADMIN_PASSWORD)');
    }
    assertPasswordStrength(password);
    const app = await createApp();
    const { staffUserRepository } = app.repositories;
    if (await staffUserRepository.findByEmail(email)) {
        throw new Error(`An officer with email ${email} already exists.`);
    }
    await staffUserRepository.create({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'super_admin',
        isAdmin: true,
        isActive: true,
        permissions: ['read-contact-info', 'access-all-jurisdictions'],
        passwordHash: await hashSecret(password),
    } as unknown as StaffUserAttributes);
    console.log(`Created super admin ${email}.`);
    await app.database.close();
})().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
