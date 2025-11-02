# B2B Wholesale Portal - Generated Backend

Node.js + Express + Mongoose backend scaffold generated from uploaded OpenAPI spec.

## Features
- JWT auth (register/login)
- User roles: wholesaler / retailer / admin
- Products CRUD (wholesaler)
- Orders (retailer -> wholesaler)
- Invoices
- Reports (sales, inventory, customers)
- Dashboard endpoints
- Simple password change & profile update

## Quick start
1. Write `.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. `npm install`
3. `npm run dev` (requires nodemon) or `npm start`

## Notes
- This is a generated scaffold implementing typical business logic inferred from the OpenAPI file.
- You should add input validation, rate limiting, file uploads, pagination, and production hardening before using in production.

