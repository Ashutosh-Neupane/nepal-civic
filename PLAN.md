# Nepal Civic — merge plan

One app for citizen grievances (गुनासो) in Nepal, built from:

- `backend/` — nepal-civic API (Express + PostgreSQL + Sequelize), extended.
- `frontend/` — Civic-Connect React UI, rewired from Supabase/Firebase to the backend API.

## Government structure

Province (7) → District (77) → Palika / local level (753) → Ward (6,743).

- A Palika is a nepal-civic **Jurisdiction**: it owns services (categories), departments (शाखा), staff, SMS/email settings.
- Provinces and districts are reference tables; wards are numbers inside a Palika (`wardCount`).
- Data: `backend/src/data/nepal/` (MIT dataset, see `LICENSE-dataset.txt`).

## Escalation chain

Ward → Palika → District → Province. A grievance starts at `ward` level. When its SLA deadline passes
without resolution it moves up one level (automatic job), or an officer escalates it manually.

SLA hours by priority: critical 24, high 48, medium 72, low 120 (reset at each level).
A resolved grievance auto-closes after 7 days if the citizen does not confirm or reopen it.

## Roles

| Role | Scope |
|---|---|
| citizen | own grievances |
| ward_officer | one ward of one Palika |
| palika_officer | one Palika |
| district_officer | one district |
| province_officer | one province; manages officers in it |
| super_admin | everything |

## Statuses

pending → assigned → in_progress → resolved → closed, plus escalated, rejected, reopened,
blocked, moved (transferred to another Palika), junk (spam).
Closed states: closed, rejected, moved, junk.

## Backend additions

- Migration `40_nepal_federal_structure`: Province, District tables; Jurisdiction location fields;
  ServiceRequest grievance fields; status enum remap; CitizenUser, OtpCode, Notification; staff auth fields.
- Auth: JWT, bcryptjs; citizen register/login with phone OTP (Sparrow SMS); staff login.
- `/grievances` API: scoped list/detail, create, status, assign, escalate, confirm, reopen, feedback, comments, stats.
- `/notifications`, `/geo`, `/admin/staff`.
- Escalation + auto-close scheduler.
- SMS: Sparrow SMS replaces Twilio (outbound + inbound webhook).
- CLI `seed-nepal`: provinces, districts, 753 Palikas, default services and departments.

## Frontend changes

- Supabase/Firebase removed; `src/lib/api.ts` client with JWT.
- Roles and screens: mandal → palika/ward, state → province.
- Languages: English + नेपाली (Telugu/Hindi removed); Bikram Sambat dates.
- Nepal geography for registration, filters and map.
