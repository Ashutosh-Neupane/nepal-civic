# Nepal Civic API

Express + TypeScript + PostgreSQL backend for Nepal Civic. Setup, demo data and screenshots are in the [project README](../README.md).

## Main endpoints

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/otp`, `POST /auth/citizen/register`, `POST /auth/citizen/login`, `POST /auth/citizen/reset-password`, `POST /auth/staff/login`, `GET/PATCH /auth/me`, `POST /auth/change-password` |
| Grievances | `GET /grievances`, `GET /grievances/stats`, `GET /grievances/meta`, `GET /grievances/public`, `GET /grievances/:id`, `GET /grievances/reference/:ref`, `POST /grievances`, `POST /grievances/:id/{status,assign,escalate,comments,confirm,reopen,feedback}` |
| Officers | `GET/POST /admin/staff`, `PATCH /admin/staff/:id`, `POST /admin/staff/:id/reset-password` |
| Geography | `GET /geo/provinces`, `/geo/districts`, `/geo/districts/:id/local-levels`, `/geo/local-levels/:id` |
| Other | `/notifications`, `/storage`, `/open311/v2` |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the API server |
| `npm run migrate up` | Apply database migrations |
| `npm run seed-nepal` | Load provinces, districts, Palikas, wards and categories |
| `npm run create-super-admin -- <email> <first> <last>` | Create the national administrator (password from `SUPER_ADMIN_PASSWORD`) |
| `npm run seed-demo` | Load Kathmandu demo officers, citizens and grievances |
| `npm test` | Run the test suite |

More background on the workflow engine, email and SMS channels is in [`docs/`](docs/).
