# Pulse Analytics — Live Business Analytics Dashboard

A portfolio-ready real-time e-commerce analytics dashboard built with Node.js, Express, Socket.IO, MongoDB, React, Recharts and plain CSS.

## Features

- JWT authentication (register/sign in) and bcrypt password hashing
- Live KPI dashboard: revenue, orders, unique customers and average order value
- Revenue-over-time chart and top-products chart
- Orders table with search
- Product inventory management and low-stock alerts
- Create orders with server-side stock checks
- Socket.IO events trigger analytics refreshes across connected browsers
- Demo data seeding and one-click simulated live order creation
- CSV order export endpoint
- Responsive layout

## Requirements

- Node.js 18+ (Node.js 20 LTS recommended)
- npm
- MongoDB local installation or MongoDB Atlas database

## 1. Configure the database

### Local MongoDB
Start your MongoDB service. The default URI is:
`mongodb://127.0.0.1:27017/live_business_analytics`

### MongoDB Atlas
Create a database user, allow your development IP in Network Access, and copy the Node.js connection string. Never commit the connection string or password.

## 2. Configure environment variables

Copy `.env.example` to `.env` in the project root, then set:
- `MONGODB_URI`
- `JWT_SECRET` to a long random secret
- `CLIENT_URL=http://localhost:5173`
- `DEMO_MODE_ENABLED=true` while developing

Never commit `.env`. It is listed in `.gitignore`.

## 3. Install dependencies

From the project root:

```bash
npm install
npm --prefix client install
```

## 4. Run the application

Open a terminal in the root folder:

```bash
npm run dev
```

- API + Socket.IO: http://localhost:5000
- React app: http://localhost:5173
- Health check: http://localhost:5000/api/health

Register a dashboard account. Then click **Load demo data** once. The app creates sample products and historical orders. Click **Generate live order** to create an order and see the dashboard refresh. Open the app in another browser window to see the multi-client updates.

## API summary

All endpoints except health and register/login require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current session |
| GET | `/api/analytics/overview?range=30d` | Dashboard analytics |
| GET | `/api/analytics/export.csv` | Export up to 5,000 orders |
| GET | `/api/products` | List products |
| POST | `/api/products` | Add product |
| PATCH | `/api/products/:id/stock` | Update stock |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create an order |
| PATCH | `/api/orders/:id/status` | Update order status |
| POST | `/api/demo/seed` | Add initial demo dataset |
| POST | `/api/demo/order` | Create a simulated live order |

To download the CSV from the frontend, you can add a button that requests `/analytics/export.csv` with the bearer token. The API route is implemented.

## Socket.IO events

The server emits:
- `order:created`
- `order:updated`
- `product:updated`
- `analytics:refresh`

The React client listens to these events and reloads the current dashboard data. This starter broadcasts updates to all connected clients; for a multi-tenant production system, add authenticated Socket.IO connections and tenant-specific rooms so users can only receive their own organization's events.

## Important database note

Order creation uses a MongoDB transaction to keep stock and order writes consistent. Transactions require a MongoDB replica set, which Atlas provides. A standalone local MongoDB server may not support transactions. For local development, use a local replica set or use MongoDB Atlas. Do not remove transaction safeguards for a real inventory system.

## Production hardening checklist

Before a public production launch:
- Use HTTPS and a strong unique `JWT_SECRET`.
- Add rate limiting, Helmet, stricter input validation and request logging.
- Authenticate Socket.IO handshakes and authorize rooms.
- Restrict CORS to the deployed frontend domain.
- Disable demo endpoints (`DEMO_MODE_ENABLED=false`).
- Add pagination, automated tests, backup policies and monitoring.
- Configure production environment variables in the hosting provider.
- Use a production database and never use sample customer data as real customer information.

## Deploying

Deploy the API as a Node.js web service and set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` and `DEMO_MODE_ENABLED=false` in the host's environment settings. Deploy the `client` folder as a static Vite app and set:
- `VITE_API_URL=https://YOUR-API-DOMAIN/api`
- `VITE_SOCKET_URL=https://YOUR-API-DOMAIN`

Rebuild the frontend after changing Vite environment variables. Confirm the host supports WebSocket connections for Socket.IO.

## Suggested future improvements

- Admin/analyst permissions and tenant-specific data
- Date comparison and growth percentages
- Product category breakdown
- Automated tests with Vitest/Supertest
- Scheduled email reports
- Pagination and audit logs
- Docker setup and CI workflow

## Author
Vishva MCA Student Project
