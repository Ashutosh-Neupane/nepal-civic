#!/usr/bin/env node
/**
 * Loads demo data for Kathmandu Metropolitan City through the public API, then spreads
 * the grievances over the last two weeks so dashboards and charts have history.
 *
 * Needs a running server started with OTP_EXPOSE_IN_RESPONSE=1, the Nepal seed loaded,
 * and a super admin (npm run create-super-admin). Usage:
 *   API_URL=http://localhost:3000 ADMIN_EMAIL=admin@example.gov.np ADMIN_PASSWORD=... \
 *   DATABASE_URL=postgres://... node scripts/seed-demo.mjs
 */
import pg from 'pg';

const API = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@2083';
const KTM = 'lg-307';

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function staffLogin(email, password) {
  return (await call('POST', '/auth/staff/login', { email, password })).token;
}

/** Creates an officer and sets the demo password, or logs in if they already exist. */
async function officer(adminToken, spec) {
  try {
    const created = await call('POST', '/admin/staff', spec, adminToken);
    const token = await staffLogin(spec.email, created.temporaryPassword);
    await call('POST', '/auth/change-password', { currentPassword: created.temporaryPassword, newPassword: DEMO_PASSWORD }, token);
  } catch (error) {
    if (!String(error.message).includes('409')) throw error;
  }
  return { ...spec, token: await staffLogin(spec.email, DEMO_PASSWORD) };
}

async function citizen(phone, fullName) {
  try {
    const otp = await call('POST', '/auth/otp', { phone, purpose: 'register' });
    return (await call('POST', '/auth/citizen/register', { phone, otp: otp.devCode, fullName, password: DEMO_PASSWORD })).token;
  } catch {
    return (await call('POST', '/auth/citizen/login', { identifier: phone, password: DEMO_PASSWORD })).token;
  }
}

// [category, priority, ward, title, description, lat, lon, address, daysAgo]
const GRIEVANCES = [
  ['roads', 'high', 10, 'Large pothole near Baneshwor Chowk', 'A deep pothole in the middle lane is causing motorbikes to swerve. Two accidents this week.', 27.6889, 85.3358, 'Baneshwor Chowk', 13],
  ['water', 'critical', 16, 'No drinking water for five days', 'KUKL supply has stopped in our tole for five days. Families are buying jar water.', 27.7215, 85.2967, 'Nayabazar, Balaju', 12],
  ['sanitation', 'medium', 1, 'Garbage not collected for a week', 'Waste has piled up near the temple and stray dogs are spreading it on the road.', 27.7172, 85.3240, 'Naxal Bhagwati Bahal', 12],
  ['electricity', 'medium', 4, 'Street lights off on the whole lane', 'Six street lights have been off for two weeks. The lane is unsafe at night.', 27.7239, 85.3330, 'Bishalnagar', 11],
  ['drainage', 'high', 29, 'Sewer overflowing onto the road', 'The sewer line overflows every time it rains. Dirty water enters shops.', 27.7006, 85.3076, 'New Road', 10],
  ['roads', 'medium', 32, 'Footpath slabs broken', 'Broken footpath slabs near the school. Children walk on the road instead.', 27.6825, 85.3477, 'Koteshwor', 10],
  ['health', 'high', 10, 'Ward health post has no medicine', 'The ward health post has been out of basic medicines for ten days.', 27.6905, 85.3345, 'Ward 10 health post', 9],
  ['water', 'high', 4, 'Pipe leak wasting water', 'A main pipe is leaking at the junction. Water runs on the road all day.', 27.7228, 85.3311, 'Chandol', 9],
  ['education', 'low', 1, 'Community school toilet broken', 'The girls’ toilet at the community school has been locked because it is broken.', 27.7160, 85.3262, 'Naxal', 8],
  ['sanitation', 'high', 16, 'Dead animal on the riverbank', 'A dead animal has been lying near the Bishnumati bank for three days. Strong smell.', 27.7180, 85.3002, 'Bishnumati corridor', 8],
  ['disaster_mgmt', 'critical', 29, 'Old building wall cracked after tremor', 'The front wall of an old building cracked after last night’s tremor and may fall on the lane.', 27.7041, 85.3095, 'Asan', 7],
  ['electricity', 'low', 32, 'Pole light flickering', 'One street light near the bus stop keeps flickering.', 27.6790, 85.3490, 'Koteshwor bus stop', 7],
  ['roads', 'critical', 16, 'Road cave-in after pipe work', 'Part of the road caved in where the pipe work was done. A car got stuck.', 27.7230, 85.2990, 'Balaju', 6],
  ['drainage', 'medium', 10, 'Blocked drain causes flooding', 'Drain is blocked with plastic. Water collects in front of houses after rain.', 27.6870, 85.3370, 'Old Baneshwor', 6],
  ['water', 'medium', 29, 'Dirty water from tap', 'Tap water is muddy and smells. We need testing.', 27.7012, 85.3082, 'Indrachowk', 5],
  ['sanitation', 'medium', 4, 'Open dumping on empty plot', 'People are dumping waste on an empty plot behind the houses.', 27.7250, 85.3352, 'Bishalnagar', 5],
  ['other', 'low', 1, 'Noise from late-night construction', 'Construction continues past 11 pm every night.', 27.7155, 85.3230, 'Naxal', 4],
  ['roads', 'high', 32, 'Missing manhole cover', 'A manhole cover is missing on the main road. Very dangerous at night.', 27.6812, 85.3462, 'Koteshwor', 3],
  ['health', 'medium', 16, 'Mosquito breeding in stagnant water', 'Stagnant water in the open plot has many mosquitoes. Dengue cases are rising.', 27.7205, 85.2975, 'Balaju', 3],
  ['electricity', 'medium', 10, 'Traffic light not working', 'Traffic light at the junction has been off since yesterday.', 27.6895, 85.3390, 'Shantinagar', 2],
  ['water', 'high', 1, 'Water tanker not reaching our tole', 'The ward water tanker skips our tole every week.', 27.7180, 85.3255, 'Naxal', 2],
  ['drainage', 'low', 29, 'Drain cover broken', 'A drain cover is broken in front of the shop.', 27.7030, 85.3101, 'Asan', 1],
  ['sanitation', 'medium', 32, 'Overflowing public bin', 'The public bin at the chowk overflows daily.', 27.6799, 85.3481, 'Koteshwor Chowk', 1],
  ['roads', 'medium', 4, 'Speed breaker needed near school', 'Vehicles speed in front of the school. Please add a speed breaker.', 27.7245, 85.3325, 'Chandol', 0],
];

async function main() {
  const adminToken = await staffLogin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

  const province = await officer(adminToken, {
    role: 'province_officer', firstName: 'Sunita', lastName: 'Adhikari', email: 'province@demo.gov.np',
    designation: 'Chief Administrative Officer', provinceId: 3,
  });
  const district = await officer(adminToken, {
    role: 'district_officer', firstName: 'Bikash', lastName: 'Shrestha', email: 'district@demo.gov.np',
    designation: 'Chief District Officer', districtId: 27,
  });
  const palika = await officer(adminToken, {
    role: 'palika_officer', firstName: 'Anita', lastName: 'Maharjan', email: 'palika@demo.gov.np',
    designation: 'Chief Administrative Officer', jurisdictionId: KTM,
  });
  const wards = {};
  const wardNames = { 1: ['Ramesh', 'Tamang'], 4: ['Gita', 'Karki'], 10: ['Suresh', 'Thapa'], 16: ['Kamala', 'Rai'], 29: ['Hari', 'Bajracharya'], 32: ['Pooja', 'Gurung'] };
  for (const [ward, [firstName, lastName]] of Object.entries(wardNames)) {
    wards[ward] = await officer(palika.token, {
      role: 'ward_officer', firstName, lastName, email: `ward${ward}@demo.gov.np`,
      designation: 'Ward Secretary', jurisdictionId: KTM, wardNo: Number(ward),
    });
  }
  const me = (token) => call('GET', '/auth/me', null, token);
  const wardIds = {};
  for (const ward of Object.keys(wards)) wardIds[ward] = (await me(wards[ward].token)).user.id;

  const citizens = [
    await citizen('9841000101', 'Ram Bahadur Shrestha'),
    await citizen('9801000102', 'Sita Kumari Tamang'),
    await citizen('9851000103', 'Krishna Prasad Poudel'),
  ];

  const created = [];
  for (const [i, [category, priority, wardNo, title, description, lat, lon, address, daysAgo]] of GRIEVANCES.entries()) {
    const g = await call('POST', '/grievances', {
      category, priority, title, description, jurisdictionId: KTM, wardNo, lat, lon, address,
    }, citizens[i % citizens.length]);
    created.push({ ...g, wardNo, daysAgo, citizenToken: citizens[i % citizens.length] });
  }

  // Officer work on the older grievances.
  const act = async (g, token, path, body) => call('POST', `/grievances/${g.id}${path}`, body, token);
  for (const g of created) {
    const ward = wards[g.wardNo];
    if (g.daysAgo >= 9) {
      await act(g, ward.token, '/assign', { staffUserId: wardIds[g.wardNo] });
      await act(g, ward.token, '/status', { status: 'in_progress', note: 'Site inspected. Work order issued to the section.' });
      await act(g, ward.token, '/status', { status: 'resolved', note: 'Work completed and checked on site.' });
      if (g.daysAgo >= 12) {
        await act(g, g.citizenToken, '/confirm', { note: 'Fixed, thank you.' });
        await act(g, g.citizenToken, '/feedback', { rating: g.daysAgo === 13 ? 5 : 4, feedback: 'Quick response from the ward office.' });
      }
    } else if (g.daysAgo >= 6) {
      await act(g, ward.token, '/assign', { staffUserId: wardIds[g.wardNo] });
      await act(g, ward.token, '/status', { status: 'in_progress', note: 'Team will visit this week.' });
    } else if (g.daysAgo >= 4) {
      await act(g, ward.token, '/escalate', { note: 'Needs the Palika engineering section; beyond ward budget.' });
    }
  }
  // One grievance goes all the way to the district.
  const disaster = created.find((g) => g.category === 'disaster_mgmt');
  await act(disaster, wards[disaster.wardNo].token, '/escalate', { note: 'Structural risk; needs Palika engineers.' });
  await act(disaster, palika.token, '/escalate', { note: 'Requesting District Disaster Management Committee support.' });

  // Spread the history over the last two weeks (Nepal time) and recompute deadlines.
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const hours = { critical: 24, high: 48, medium: 72, low: 120 };
  for (const g of created) {
    const shift = `${g.daysAgo} days ${(g.daysAgo * 7) % 9} hours`;
    await db.query(
      `UPDATE "ServiceRequest" SET "createdAt" = "createdAt" - $2::interval,
         "updatedAt" = "updatedAt" - ($2::interval / 2),
         "resolvedAt" = CASE WHEN "resolvedAt" IS NULL THEN NULL ELSE "createdAt" - $2::interval + interval '30 hours' END,
         "slaDueAt" = CASE WHEN "status" IN ('resolved','closed') THEN "slaDueAt"
                           ELSE "createdAt" - $2::interval + ($3 || ' hours')::interval END
       WHERE "id" = $1`,
      [g.id, shift, String(hours[g.priority])]
    );
    await db.query(
      `UPDATE "ServiceRequestComment" SET "createdAt" = "createdAt" - $2::interval WHERE "serviceRequestId" = $1`,
      [g.id, shift]
    );
  }
  await db.end();

  console.log(`Demo data loaded: ${created.length} grievances in Kathmandu Metropolitan City.`);
  console.log(`Officer logins (password ${DEMO_PASSWORD}): province@, district@, palika@, ward1@, ward4@, ward10@, ward16@, ward29@, ward32@ demo.gov.np`);
  console.log(`Citizen logins (password ${DEMO_PASSWORD}): 9841000101, 9801000102, 9851000103`);
  void province; void district;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
