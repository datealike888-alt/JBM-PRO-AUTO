# JBM PRO AUTO Production Clean DB + Final Deploy Checklist

This runbook is for a fresh production database only. Do not point it at an old test/smoke database.

## 1. Pre-flight

- Confirm you are using a brand-new database, for example `jbm_pro_auto_prod`.
- Do not import any old test, smoke, or mojibake-corrupted data.
- Keep real passwords and secrets only in `.env`, never in tracked source files.
- Keep phpMyAdmin off the public domain by default. Only open it temporarily through localhost plus SSH tunnel, VPN, or equivalent private access.

## 2. Clean Database Import in phpMyAdmin

1. Open phpMyAdmin.
2. Click `New`.
3. Create database `jbm_pro_auto_prod`.
4. Set collation to `utf8mb4_unicode_ci`.
5. Select `jbm_pro_auto_prod`.
6. Import [jbm-pro-auto-full-schema.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-full-schema.sql).
7. Import [jbm-pro-auto-seed.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-seed.sql).

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
- Admin user stored as bcrypt hash only
- `system_settings` seeded with JBM PRO AUTO shop info

Seeded shop info:

- `JBM PRO AUTO`
- `099 265 1133`
- `Line: @JBMPRO`
- `Facebook: JBM Pro Auto`
- `Instagram: JBM.PRO.AUTO`
- `616/1 ซอยพัฒนาการ 30 แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250`

## 4. Production `.env`

Copy [`.env.example`](/D:/lms-main/JBM-MAIN/next-JBM/.env.example) to `.env` and set real secrets there.

Production VPS / Docker Compose:

```env
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-root-password
DB_NAME=jbm_pro_auto_prod
DATABASE_URL=mysql://root:your-mysql-root-password@db:3306/jbm_pro_auto_prod
NEXT_PUBLIC_APP_URL=https://your-domain.example
APP_URL=https://your-domain.example
SESSION_SECRET=change-me-to-a-long-random-secret
SESSION_COOKIE_SECURE=true
VEHICLE_ADMIN_TOKEN=change-me-admin-token
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD_HASH=<bcrypt-hash>
```

Windows local Next.js against Docker local DB:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=jbm_pro_auto
DATABASE_URL=mysql://root:root@127.0.0.1:3307/jbm_pro_auto
```

Do not hardcode `localhost` or `127.0.0.1` inside production code paths.

## 5. Docker / VPS Review

Current compose expectations:

- `web` connects to DB with `DB_HOST=db`
- internal MySQL port is `3306`
- DB data uses a dedicated volume
- uploads/content/data have persistent volumes
- restart policy is `unless-stopped`
- `phpmyadmin` is started only through the optional `admin` compose profile
- when started, `phpmyadmin` binds only to `127.0.0.1:${PHPMYADMIN_PORT:-8083}`
- Caddy does not reverse proxy phpMyAdmin by default

Before real domain cutover:

- confirm production `.env` provides real secrets outside the repo
- confirm phpMyAdmin is not publicly reachable
- confirm the domain and cookie security settings are correct

To open phpMyAdmin only when needed:

```bash
docker compose -f docker-compose.prod.yml --profile admin up -d phpmyadmin
```

Then access it from the server itself or through an SSH tunnel to:

```text
http://127.0.0.1:8083
```

When finished, stop it again:

```bash
docker compose -f docker-compose.prod.yml --profile admin stop phpmyadmin
```

## 6. First Admin Login

- Username: `admin`
- Documented initial password: `ChangeMe123!`

Warnings:

- change the admin password immediately after first login
- do not keep the default password on production
- `password_hash` must always remain a bcrypt hash

To generate a replacement bcrypt hash:

```powershell
cd D:\lms-main\JBM-MAIN\next-JBM
node .\scripts\generate-admin-hash.cjs "NewStrongPasswordHere"
```

Then update `ADMIN_DEFAULT_PASSWORD_HASH` in `.env`, or update `admin_users.password_hash` directly in the production database.

## 7. Restart and Health Check

After configuring `.env`, restart the app stack and open:

- local Docker web: [http://localhost:8080/api/health](http://localhost:8080/api/health)
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
- phpMyAdmin protection confirmed
