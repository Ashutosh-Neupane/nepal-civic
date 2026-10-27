import chai from 'chai';
import chaiHttp from 'chai-http';
import crypto from 'crypto';
import { Application } from 'express';
import { hashSecret, signToken } from '../src/core/auth/helpers';
import { makeReference, parseReference } from '../src/core/grievances/constants';
import { createApp } from '../src/index';
import { normalizeDevanagari, seedNepal } from '../src/tools/seed-nepal';
import type { JurisdictionAttributes, StaffUserAttributes } from '../src/types';

chai.use(chaiHttp);

const PASSWORD = 'Sajilo2026';

describe('Nepal grievance workflow', function () {

  let app: Application;
  let kathmandu: JurisdictionAttributes;
  let lalitpur: JurisdictionAttributes;
  const tokens: Record<string, string> = {};
  const staff: Record<string, StaffUserAttributes> = {};

  async function makeStaff(key: string, data: Partial<StaffUserAttributes>): Promise<void> {
    const { staffUserRepository } = app.repositories;
    const id = crypto.randomUUID();
    await staffUserRepository.create({
      id,
      firstName: key,
      lastName: 'Officer',
      email: `${key}@example.gov.np`,
      isAdmin: true,
      isActive: true,
      permissions: ['read-contact-info'],
      passwordHash: await hashSecret(PASSWORD),
      ...data,
    } as unknown as StaffUserAttributes);
    staff[key] = await staffUserRepository.findById(id) as StaffUserAttributes;
    tokens[key] = signToken(app.config, { sub: id, kind: 'staff' });
  }

  async function registerCitizen(key: string, phone: string): Promise<void> {
    const otp = await chai.request(app).post('/auth/otp').send({ phone, purpose: 'register' });
    chai.assert.equal(otp.status, 200, JSON.stringify(otp.body));
    chai.assert.match(otp.body.data.devCode, /^\d{6}$/);
    const res = await chai.request(app).post('/auth/citizen/register').send({
      phone, otp: otp.body.data.devCode, fullName: `${key} Shrestha`, password: PASSWORD,
      jurisdictionId: kathmandu.id, wardNo: 10,
    });
    chai.assert.equal(res.status, 201, JSON.stringify(res.body));
    tokens[key] = res.body.data.token;
  }

  function as(key: string) {
    return { Authorization: `Bearer ${tokens[key]}` };
  }

  before(async function () {
    this.timeout(120000);
    app = await createApp();
    await app.migrator.up();
    const summary = await seedNepal(app.database);
    chai.assert.deepInclude(summary, { provinces: 7, districts: 77, localLevels: 753, wards: 6743 });
    const { Jurisdiction } = app.database.models;
    kathmandu = (await Jurisdiction.findOne({ where: { name: 'Kathmandu Metropolitan City' } }))
      ?.get({ plain: true }) as JurisdictionAttributes;
    lalitpur = (await Jurisdiction.findOne({ where: { name: 'Lalitpur Metropolitan City' } }))
      ?.get({ plain: true }) as JurisdictionAttributes;
    chai.assert.equal(kathmandu.wardCount, 32);

    const place = { jurisdictionId: kathmandu.id, districtId: kathmandu.districtId, provinceId: kathmandu.provinceId };
    await makeStaff('ward10', { role: 'ward_officer', wardNo: 10, ...place });
    await makeStaff('ward11', { role: 'ward_officer', wardNo: 11, ...place });
    await makeStaff('palika', { role: 'palika_officer', ...place });
    await makeStaff('district', { role: 'district_officer', districtId: kathmandu.districtId, provinceId: kathmandu.provinceId });
    await makeStaff('lalitpur', {
      role: 'palika_officer', jurisdictionId: lalitpur.id, districtId: lalitpur.districtId, provinceId: lalitpur.provinceId,
    });
    await makeStaff('admin', { role: 'super_admin', permissions: ['read-contact-info', 'access-all-jurisdictions'] });
    await registerCitizen('ram', '9841000001');
    await registerCitizen('sita', '+977-9801000002');
  })

  after(async function () {
    await app.database.drop({});
  })

  describe('federal structure', function () {

    it('seeds the 7 provinces with Nepali names', async function () {
      const res = await chai.request(app).get('/geo/provinces');
      chai.assert.equal(res.status, 200);
      chai.assert.lengthOf(res.body.data, 7);
      const bagmati = res.body.data.find((province: { id: number }) => province.id === 3);
      chai.assert.equal(bagmati.nameNe, 'बागमती प्रदेश');
    });

    it('lists districts and local levels', async function () {
      const districts = await chai.request(app).get(`/geo/districts?provinceId=${kathmandu.provinceId}`);
      chai.assert.equal(districts.status, 200);
      chai.assert.lengthOf(districts.body.data, 13);
      const levels = await chai.request(app).get(`/geo/districts/${kathmandu.districtId}/local-levels`);
      chai.assert.equal(levels.status, 200);
      chai.assert.lengthOf(levels.body.data, 11);
      chai.assert.isTrue(levels.body.data.some((level: { id: string }) => level.id === kathmandu.id));
    });

    it('is safe to run the seed again', async function () {
      this.timeout(60000);
      const summary = await seedNepal(app.database);
      chai.assert.equal(summary.localLevels, 753);
      chai.assert.equal(summary.departments, 0);
      chai.assert.equal(summary.services, 0);
    });

    it('repairs split Devanagari vowel signs', function () {
      chai.assert.equal(normalizeDevanagari('काठमाडाैं'), 'काठमाडौं');
      chai.assert.equal(normalizeDevanagari('गाेरखा'), 'गोरखा');
    });

    it('round trips grievance references', function () {
      const reference = makeReference(kathmandu.id, '42');
      chai.assert.deepEqual(parseReference(reference), { jurisdictionId: kathmandu.id, publicId: '42' });
    });
  });

  describe('accounts', function () {

    it('refuses non-Nepali mobile numbers', async function () {
      const res = await chai.request(app).post('/auth/otp').send({ phone: '+15555550100' });
      chai.assert.equal(res.status, 400);
    });

    it('refuses registration with a wrong code', async function () {
      const phone = '9761000003';
      const otp = await chai.request(app).post('/auth/otp').send({ phone });
      chai.assert.equal(otp.status, 200);
      const wrong = otp.body.data.devCode === '000000' ? '111111' : '000000';
      const res = await chai.request(app).post('/auth/citizen/register').send({
        phone, otp: wrong, fullName: 'Hari Thapa', password: PASSWORD,
      });
      chai.assert.equal(res.status, 400);
    });

    it('refuses a second account for the same number', async function () {
      const res = await chai.request(app).post('/auth/otp').send({ phone: '9841000001' });
      chai.assert.equal(res.status, 409);
    });

    it('logs a citizen in by phone and does not return the password hash', async function () {
      const res = await chai.request(app).post('/auth/citizen/login').send({ identifier: '+9779841000001', password: PASSWORD });
      chai.assert.equal(res.status, 200);
      chai.assert.equal(res.body.data.user.phone, '9841000001');
      chai.assert.notProperty(res.body.data.user, 'passwordHash');
      const bad = await chai.request(app).post('/auth/citizen/login').send({ identifier: '9841000001', password: 'wrong-pass1' });
      chai.assert.equal(bad.status, 401);
    });

    it('logs staff in by email, case-insensitively, with their scope', async function () {
      const res = await chai.request(app).post('/auth/staff/login').send({ email: 'WARD10@example.gov.np', password: PASSWORD });
      chai.assert.equal(res.status, 200, JSON.stringify(res.body));
      chai.assert.equal(res.body.data.role, 'ward_officer');
      chai.assert.deepInclude(res.body.data.scope, { level: 'ward', jurisdictionId: kathmandu.id, wardNo: 10 });
      chai.assert.notProperty(res.body.data.user, 'passwordHash');
    });

    it('rejects requests with a forged token', async function () {
      const res = await chai.request(app).get('/auth/me').set('Authorization', 'Bearer not-a-token');
      chai.assert.equal(res.status, 401);
    });
  });

  describe('grievances', function () {

    let grievanceId: string;
    let reference: string;

    it('validates the location is inside Nepal', async function () {
      const res = await chai.request(app).post('/grievances').set(as('ram')).send({
        title: 'Broken water pipe', description: 'Water has been leaking on the road for two days.',
        category: 'water', jurisdictionId: kathmandu.id, wardNo: 10, lat: 51.5, lon: -0.12,
      });
      chai.assert.equal(res.status, 400);
    });

    it('validates the ward number', async function () {
      const res = await chai.request(app).post('/grievances').set(as('ram')).send({
        title: 'Broken water pipe', description: 'Water has been leaking on the road for two days.',
        category: 'water', jurisdictionId: kathmandu.id, wardNo: 33, address: 'Baneshwor',
      });
      chai.assert.equal(res.status, 400);
    });

    it('lets a citizen register a grievance with the ward and SLA set', async function () {
      const res = await chai.request(app).post('/grievances').set(as('ram')).send({
        title: 'Broken water pipe', description: 'Water has been leaking on the road for two days.',
        category: 'water', priority: 'high', jurisdictionId: kathmandu.id, wardNo: 10,
        lat: 27.6915, lon: 85.3420, address: 'New Baneshwor',
      });
      chai.assert.equal(res.status, 201, JSON.stringify(res.body));
      const data = res.body.data;
      grievanceId = data.id;
      reference = data.reference;
      chai.assert.equal(data.status, 'pending');
      chai.assert.equal(data.currentLevel, 'ward');
      chai.assert.equal(data.districtId, kathmandu.districtId);
      chai.assert.equal(data.provinceId, kathmandu.provinceId);
      const hours = (new Date(data.slaDueAt).getTime() - new Date(data.createdAt).getTime()) / 3600000;
      chai.assert.approximately(hours, 48, 0.1);
      chai.assert.isUndefined(data.submitterPhone);
    });

    it('raises disaster grievances to at least high priority', async function () {
      const res = await chai.request(app).post('/grievances').set(as('sita')).send({
        title: 'Landslide blocking road', description: 'A landslide has blocked the ward road since morning.',
        category: 'disaster_mgmt', priority: 'low', jurisdictionId: kathmandu.id, wardNo: 10, address: 'Ward 10',
      });
      chai.assert.equal(res.status, 201);
      chai.assert.equal(res.body.data.priority, 'high');
    });

    it('shows citizens only their own grievances', async function () {
      const mine = await chai.request(app).get('/grievances').set(as('ram'));
      chai.assert.equal(mine.status, 200);
      chai.assert.equal(mine.body.count, 1);
      const other = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('sita'));
      chai.assert.equal(other.status, 404);
    });

    it('limits officers to their own ward, Palika and district', async function () {
      const ward10 = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('ward10'));
      chai.assert.equal(ward10.status, 200);
      chai.assert.equal(ward10.body.data.submitterPhone, '9841000001');
      const ward11 = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('ward11'));
      chai.assert.equal(ward11.status, 404);
      const otherPalika = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('lalitpur'));
      chai.assert.equal(otherPalika.status, 404);
      const district = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('district'));
      chai.assert.equal(district.status, 200);
      const byReference = await chai.request(app).get(`/grievances/reference/${reference}`).set(as('palika'));
      chai.assert.equal(byReference.status, 200);
    });

    it('hides personal details on the public map', async function () {
      const res = await chai.request(app).get(`/grievances/public?jurisdictionId=${kathmandu.id}`);
      chai.assert.equal(res.status, 200);
      const item = res.body.data.find((record: { id: string }) => record.id === grievanceId);
      chai.assert.exists(item);
      chai.assert.notProperty(item, 'phone');
      chai.assert.notProperty(item, 'firstName');
      chai.assert.notProperty(item, 'citizenId');
      chai.assert.equal(item.lat, 27.692);
    });

    it('lets the ward officer assign it and start work', async function () {
      const candidates = await chai.request(app).get(`/grievances/${grievanceId}/assignable-staff`).set(as('ward10'));
      chai.assert.equal(candidates.status, 200);
      const ids = candidates.body.data.map((candidate: { id: string }) => candidate.id);
      chai.assert.include(ids, staff.ward10.id);
      chai.assert.notInclude(ids, staff.ward11.id);

      const assign = await chai.request(app).post(`/grievances/${grievanceId}/assign`).set(as('ward10'))
        .send({ staffUserId: staff.ward10.id });
      chai.assert.equal(assign.status, 200, JSON.stringify(assign.body));
      chai.assert.equal(assign.body.data.status, 'assigned');
      chai.assert.equal(assign.body.data.assignedTo, staff.ward10.id);
      chai.assert.equal(assign.body.data.assignedToName, 'ward10 Officer');

      const wrongOfficer = await chai.request(app).post(`/grievances/${grievanceId}/assign`).set(as('ward10'))
        .send({ staffUserId: staff.lalitpur.id });
      chai.assert.equal(wrongOfficer.status, 400);

      const start = await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('ward10'))
        .send({ status: 'in_progress' });
      chai.assert.equal(start.status, 200);
      chai.assert.equal(start.body.data.status, 'in_progress');

      const skip = await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('ward10'))
        .send({ status: 'closed' });
      chai.assert.equal(skip.status, 400);
    });

    it('keeps internal notes away from the citizen', async function () {
      const res = await chai.request(app).post(`/grievances/${grievanceId}/comments`).set(as('ward10'))
        .send({ comment: 'Needs plumber from Palika store', isPublic: false });
      chai.assert.equal(res.status, 200);
      const citizenView = await chai.request(app).get(`/grievances/${grievanceId}`).set(as('ram'));
      const texts = citizenView.body.data.comments.map((comment: { comment: string }) => comment.comment);
      chai.assert.notInclude(texts, 'Needs plumber from Palika store');
      chai.assert.include(texts, 'Grievance registered.');
    });

    it('escalates to the Palika, and the ward can no longer act', async function () {
      const noReason = await chai.request(app).post(`/grievances/${grievanceId}/escalate`).set(as('ward10')).send({});
      chai.assert.equal(noReason.status, 400);
      const res = await chai.request(app).post(`/grievances/${grievanceId}/escalate`).set(as('ward10'))
        .send({ note: 'Main line repair needs Palika budget.' });
      chai.assert.equal(res.status, 200, JSON.stringify(res.body));
      chai.assert.equal(res.body.data.status, 'escalated');
      chai.assert.equal(res.body.data.currentLevel, 'palika');
      chai.assert.equal(res.body.data.escalationCount, 1);
      chai.assert.isNull(res.body.data.assignedTo);

      const ward = await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('ward10'))
        .send({ status: 'in_progress' });
      chai.assert.equal(ward.status, 403);
    });

    it('lets the Palika resolve it with a note', async function () {
      const noNote = await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('palika'))
        .send({ status: 'resolved' });
      chai.assert.equal(noNote.status, 400);
      const res = await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('palika'))
        .send({ status: 'resolved', note: 'Pipe replaced by the water section.' });
      chai.assert.equal(res.status, 200, JSON.stringify(res.body));
      chai.assert.equal(res.body.data.status, 'resolved');
      chai.assert.isNotNull(res.body.data.resolvedAt);
    });

    it('lets the citizen reopen, then confirm and rate', async function () {
      const reopen = await chai.request(app).post(`/grievances/${grievanceId}/reopen`).set(as('ram'))
        .send({ note: 'Still leaking near the gate.' });
      chai.assert.equal(reopen.status, 200);
      chai.assert.equal(reopen.body.data.status, 'reopened');
      chai.assert.equal(reopen.body.data.reopenCount, 1);
      chai.assert.isNull(reopen.body.data.resolvedAt);

      await chai.request(app).post(`/grievances/${grievanceId}/status`).set(as('palika'))
        .send({ status: 'resolved', note: 'Gate joint sealed as well.' });
      const otherCitizen = await chai.request(app).post(`/grievances/${grievanceId}/confirm`).set(as('sita')).send({});
      chai.assert.equal(otherCitizen.status, 404);
      const confirm = await chai.request(app).post(`/grievances/${grievanceId}/confirm`).set(as('ram'))
        .send({ note: 'Fixed, thank you.' });
      chai.assert.equal(confirm.status, 200);
      chai.assert.equal(confirm.body.data.status, 'closed');
      chai.assert.isNotNull(confirm.body.data.closedAt);

      const rate = await chai.request(app).post(`/grievances/${grievanceId}/feedback`).set(as('ram'))
        .send({ rating: 5, feedback: 'Quick work' });
      chai.assert.equal(rate.status, 200);
      chai.assert.equal(rate.body.data.citizenRating, 5);
    });

    it('notifies the citizen along the way', async function () {
      const res = await chai.request(app).get('/notifications').set(as('ram'));
      chai.assert.equal(res.status, 200);
      const types = res.body.data.map((notification: { type: string }) => notification.type);
      chai.assert.include(types, 'complaint_resolved');
      chai.assert.include(types, 'complaint_escalated');
    });

    it('escalates overdue grievances automatically', async function () {
      const { grievanceService } = app.services;
      const created = await chai.request(app).post('/grievances').set(as('sita')).send({
        title: 'Street light not working', description: 'The street light at the chowk has been off for a week.',
        category: 'electricity', priority: 'critical', jurisdictionId: kathmandu.id, wardNo: 10, address: 'Ward 10 chowk',
      });
      chai.assert.equal(created.status, 201);
      const later = new Date(Date.now() + 25 * 3600 * 1000);
      chai.assert.isAtLeast(await grievanceService.runEscalationSweep(later), 1);
      const view = await chai.request(app).get(`/grievances/${created.body.data.id}`).set(as('sita'));
      chai.assert.equal(view.body.data.currentLevel, 'palika');
      chai.assert.equal(view.body.data.status, 'escalated');
    });

    it('closes resolved grievances the citizen does not answer', async function () {
      const { grievanceService } = app.services;
      const created = await chai.request(app).post('/grievances').set(as('sita')).send({
        title: 'Garbage not collected', description: 'Garbage has not been collected from our lane this week.',
        category: 'sanitation', jurisdictionId: kathmandu.id, wardNo: 10, address: 'Ward 10 lane',
      });
      const id = created.body.data.id;
      await chai.request(app).post(`/grievances/${id}/status`).set(as('ward10')).send({ status: 'in_progress' });
      const resolved = await chai.request(app).post(`/grievances/${id}/status`).set(as('ward10'))
        .send({ status: 'resolved', note: 'Collected on Sunday.' });
      chai.assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
      const later = new Date(Date.now() + 8 * 24 * 3600 * 1000);
      chai.assert.isAtLeast(await grievanceService.runAutoCloseSweep(later), 1);
      const view = await chai.request(app).get(`/grievances/${id}`).set(as('sita'));
      chai.assert.equal(view.body.data.status, 'closed');
    });

    it('reports statistics within the officer scope', async function () {
      const palika = await chai.request(app).get('/grievances/stats').set(as('palika'));
      chai.assert.equal(palika.status, 200, JSON.stringify(palika.body));
      chai.assert.isAtLeast(palika.body.data.summary.total, 4);
      const lalitpurStats = await chai.request(app).get('/grievances/stats').set(as('lalitpur'));
      chai.assert.equal(lalitpurStats.body.data.summary.total, 0);
      const citizen = await chai.request(app).get('/grievances/stats').set(as('ram'));
      chai.assert.equal(citizen.status, 403);
    });
  });

  describe('officer accounts', function () {

    let wardOfficerId: string;

    it('lets a Palika officer create a ward officer in their Palika', async function () {
      const res = await chai.request(app).post('/admin/staff').set(as('palika')).send({
        role: 'ward_officer', firstName: 'Gita', lastName: 'Karki', email: 'gita@example.gov.np',
        jurisdictionId: kathmandu.id, wardNo: 5, phone: '9851000005', designation: 'वडा सचिव',
      });
      chai.assert.equal(res.status, 201, JSON.stringify(res.body));
      chai.assert.isString(res.body.data.temporaryPassword);
      chai.assert.notProperty(res.body.data, 'passwordHash');
      wardOfficerId = res.body.data.id;
      const login = await chai.request(app).post('/auth/staff/login')
        .send({ email: 'gita@example.gov.np', password: res.body.data.temporaryPassword });
      chai.assert.equal(login.status, 200);
    });

    it('does not let a Palika officer create officers elsewhere or above them', async function () {
      const elsewhere = await chai.request(app).post('/admin/staff').set(as('palika')).send({
        role: 'ward_officer', firstName: 'A', lastName: 'B', email: 'ab@example.gov.np', jurisdictionId: lalitpur.id, wardNo: 1,
      });
      chai.assert.equal(elsewhere.status, 403);
      const above = await chai.request(app).post('/admin/staff').set(as('palika')).send({
        role: 'district_officer', firstName: 'A', lastName: 'B', email: 'ab@example.gov.np', districtId: kathmandu.districtId,
      });
      chai.assert.equal(above.status, 403);
      const ward = await chai.request(app).get('/admin/staff').set(as('ward10'));
      chai.assert.equal(ward.status, 403);
    });

    it('lets the Palika deactivate the officer, which blocks login', async function () {
      const res = await chai.request(app).patch(`/admin/staff/${wardOfficerId}`).set(as('palika')).send({ isActive: false });
      chai.assert.equal(res.status, 200);
      const other = await chai.request(app).patch(`/admin/staff/${wardOfficerId}`).set(as('lalitpur')).send({ isActive: true });
      chai.assert.equal(other.status, 404);
      const list = await chai.request(app).get('/admin/staff').set(as('admin'));
      chai.assert.equal(list.status, 200);
      chai.assert.isAtLeast(list.body.count, 7);
    });
  });
});
