# JBM PRO AUTO Database Import Guide

Use this guide when importing a clean database through phpMyAdmin.

1. Create a new database in phpMyAdmin, for example `jbm_pro_auto_prod`.
2. Set collation to `utf8mb4_unicode_ci`.
3. Select that database before importing anything.
4. Import [jbm-pro-auto-full-schema.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-full-schema.sql).
5. Import [jbm-pro-auto-seed.sql](/D:/lms-main/JBM-MAIN/next-JBM/db/jbm-pro-auto-seed.sql).

Important:

- The schema/seed files are written to import into the database you selected in phpMyAdmin.
- They do not create vehicles, financial transactions, receipts, attendance rows, leave rows, or customer data.
- The seed includes only bootstrap data such as the admin account, employee positions, basic staff rows, stock categories, attendance settings, and JBM PRO AUTO system settings.
- The admin password is stored only as a bcrypt hash.

Use the production runbook for the full post-import checklist:
[README-production-deploy.md](/D:/lms-main/JBM-MAIN/next-JBM/db/README-production-deploy.md)
