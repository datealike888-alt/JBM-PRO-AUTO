# JBM PRO AUTO Remote DB Production Checklist

This runbook is for deploying the app against an external remote MySQL/MariaDB database. Do not point production runtime at a local Docker database, localhost, the Docker service name `db`, or phpMyAdmin-backed local containers.

## 1. Pre-flight

- Confirm the remote database host, username, password, and database name are provided by the VPS environment or secret manager.
- Keep real passwords and secrets out of tracked source files.
- Back up the old local database before any migration.
- Do not delete local containers or volumes until the remote import has been verified.

## 2. Remote Database Import

1. Export the old database with `mysqldump` after confirming the source host.
2. Create the remote database with collation `utf8mb4_unicode_ci`.
3. Import the dump into the remote database.
4. If this is a fresh install, import [jbm-pro-auto-full-schema.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-full-schema.sql), then [jbm-pro-auto-seed.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-seed.sql).
5. Verify table counts and important row counts before switching runtime traffic.

Expected tables after import:

- `admin_users`
- `admin_sessions`
- `vehicles`
- `vehicle_receipts`
- `financial_transactions`
- `employees`
- `employee_positions`
- `employee_attendance`
- `employee_leaves`
- `attendance_settings`
- `stock_categories`
- `stock_products`
- `stock_movements`
- `payment_debts`
- `payment_debt_payments`
- `system_settings`
- `audit_logs`

All required tables use `ENGINE=InnoDB`, `DEFAULT CHARSET=utf8mb4`, and `COLLATE=utf8mb4_unicode_ci`.

## 3. Seed Data Expectations

The clean seed is intentionally limited.

- No smoke-test rows
- No `????` placeholder rows
- No demo vehicle queue
- No financial test transactions
- No customer repair history
- Admin users are created explicitly by an administrator and stored as bcrypt hashes only
- `system_settings` seeded with JBM PRO AUTO shop info

Seeded shop info:

- `JBM PRO AUTO`
- `099 265 1133`
- `Line: @JBMPRO`
- `Facebook: JBM Pro Auto`
- `Instagram: JBM.PRO.AUTO`
- `616/1 ซอยพัฒนาการ 30 แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250`

## 4. Production Environment

Set the real `DATABASE_URL` in the VPS environment or secret manager. Tracked files must keep placeholders only.

```env
DATABASE_URL=mysql://<DB_USER>:<DB_PASSWORD>@<REMOTE_DB_HOST>:3306/<DB_NAME>
NEXT_PUBLIC_APP_URL=https://your-domain.example
APP_URL=https://your-domain.example
SESSION_SECRET=change-me-to-a-long-random-secret
SESSION_COOKIE_SECURE=true
```

Runtime rejects local database hosts including `localhost`, `127.0.0.1`, `db`, `mysql`, `mariadb`, `postgres`, `host.docker.internal`, and `jbm-mysql`.

## 5. Docker / VPS Review

Current compose expectations:

- `web` receives `DATABASE_URL` from the external environment
- compose does not start MySQL, MariaDB, PostgreSQL, or phpMyAdmin services
- compose does not use `depends_on: db`
- uploads/content/data have persistent volumes
- restart policy is `unless-stopped`

Before real domain cutover:

- confirm production `.env` provides real secrets outside the repo
- confirm the domain and cookie security settings are correct

## 6. First Admin Login

No default admin is created automatically. Bootstrap the first administrator explicitly from a trusted server shell:

```powershell
cd D:\lms-main\JBM-MAIN\next-JBM
$env:ADMIN_USERNAME="your-admin-username"
$env:ADMIN_DISPLAY_NAME="Your Admin Name"
$env:ADMIN_PASSWORD="use-a-strong-password-of-at-least-12-chars"
npm run admin:create
```

After login, use normal admin user management for future password changes. Password changes revoke existing sessions for that account.

## 7. Restart and Health Check

After configuring the remote `DATABASE_URL`, restart the app stack and open:

- real domain: [https://your-domain.example/api/health](https://your-domain.example/api/health)

Expected response:

```json
{
  "ok": true,
  "database": "connected",
  "utf8mb4": true
}
```

## 8. Quick Production Smoke Test on Clean DB

Run this after import and restart:

1. Open `/api/health` and confirm `ok: true`.
2. Login as admin.
3. Change the admin password.
4. Add 1 vehicle with Thai data.
5. Confirm public status shows only progress status and no private data leak.
6. Add 1 stock item.
7. Add 1 financial transaction.
8. Add 1 employee.
9. Logout.
10. Verify `audit_logs` has rows.
11. Verify `admin_sessions` has a row and `revoked_at` is set after logout.

## 9. Security Review Before Go-Live

- no plaintext production password in source
- no password hash returned to frontend
- admin session cookie is `HttpOnly`
- logout revokes the session
- `admin_sessions` is actually used
- `audit_logs` is actually written
- `.env` is ignored by git
- phpMyAdmin is protected before public exposure
- phpMyAdmin is not reverse proxied on the public domain by default

## 10. Real-Domain Go-Live Gate

Complete these before pointing the production domain:

- clean DB imported successfully
- admin login works
- admin password changed
- `/api/health` passes
- CRUD smoke test passes
- audit log write confirmed
- session revoke confirmed
- remote database backup confirmed
