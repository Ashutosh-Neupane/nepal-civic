#! /usr/bin/env node
import 'reflect-metadata';
import { initConfig } from '../config';
import { sendSms } from '../sms';
import { AppConfig } from '../types';

(async () => {
  const config = await initConfig();
  const {
    sparrowSmsToken,
    smsFromIdentity,
    testToPhone,
  } = config as AppConfig;
  const sendAt = new Date();
  const response = await sendSms(
    sparrowSmsToken as string,
    testToPhone as string,
    smsFromIdentity as string,
    'Test message body.',
    sendAt,
  );
  console.log(response);
})();
