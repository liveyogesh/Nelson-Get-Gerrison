# Nelson Garrison Enterprise Architecture Enhancement Report

## 1. Enterprise Architecture Enhancement Summary
The current database is already well-scaffolded with over 50 normalized tables that track facilities, HR mapping, auth, gatepasses, and logs. To harden this into a multi-facility enterprise system, we need to enforce strict primary/foreign key naming conventions (avoiding generic `id`), enforce strict RBAC via a matrix, ensure immutable `audit_logs`, and isolate all transactions by `facility_id` and `employee_id`.

## 2. Missing Foreign Key Report
Current missing or weak constraints identified:
- `audit_logs`: Requires a foreign key for `facility_id` pointing to `org_facilities(facility_id)`.
- `auth_user_roles`: `role_id` sometimes named `role_id`, should point to `auth_roles(id)`.
- `workflow_approval_matrix`: Needs strict FK constraints to `org_facilities` and `hr_departments`.
- `employee_facility_access`: Requires tight constraints on `employee_id` and `facility_id`.
- `notification_queue`, `system_notifications`: Need foreign keys referencing `auth_users` or `hr_employees`.
- `security_devices`: Requires constraint on `assigned_facility_id` to `org_facilities(facility_id)`.

## 3. Naming Inconsistency Report
**Current State**:
- Generic IDs: Tables like `auth_roles` and `auth_users` use `id` rather than `role_id` and `user_id`.
- `auth_permissions` uses `id`, should use `permission_id`.
**Enhancement Plan**:
- Moving forward, all new tables MUST strictly use the `<entity>_id` pattern.
- Existing tables (like `auth_users.id`) will be kept as-is incrementally to avoid breaking `SELECT id FROM auth_users` in existing queries, but schema documentation will clearly reflect these as aliases for `user_id`.

## 4. Database Normalization Improvement Plan
The `gatepass` domain requires decoupling:
- `gatepass_requests`: Contains metadata, timestamps, reason.
- `gatepass_approvals`: Contains approval layers referencing `workflow_approval_matrix`.
- `gatepass_movements`: Tracks the physical IN/OUT at gates.
- `gatepass_violations`: Tracks anomalies (late return, escort missing).
*Status*: These tables are largely created. We will add indices and missing flags (`override_reason`, `verification_mode`).

## 5. Completed ER / Mappings
- **Identity/Auth**: `auth_users` -> `hr_employee_user_mapping` -> `hr_employees`.
- **RBAC**: `auth_users` -> `auth_user_roles` -> `auth_roles` -> `auth_role_permissions` -> `auth_permissions`.
- **Isolation**: `hr_employees` -> `employee_facility_access` -> `org_facilities`.
- **Department**: `hr_employees` -> `department_role_assignments` -> `hr_departments`.

## 6. Complete RBAC Redesign & 7. Permission Matrix Design
RBAC has evolved beyond static roles. Roles are simply containers for Permissons.
**Capabilities (auth_permissions)**:
- `gatepass.create`, `gatepass.approve`, `gatepass.override`
- `visitor.create`, `visitor.blacklist`
- `audit.view`, `facility.manage`, `incident.close`

## 8. Facility Isolation Architecture
Every operational data row (visitors, gatepasses, devices) has `facility_id`.
Express Middleware `scopeFacility` injects `req.facilities`.
```sql
SELECT * FROM gatepass_requests WHERE facility_id IN (?)
```
Corporate users get a passthrough flag. Local admins are strictly bound to `IN (1, 2)`.

## 9. Delegated Authority Workflow
Table `delegated_authority`:
- `delegation_id` (PK)
- `delegator_employee_id` (FK)
- `delegatee_employee_id` (FK)
- `role_id` (FK)
- `effective_from`
- `effective_to`
- `reason`

## 10. Shift-based Access Architecture
Tables:
- `shift_master`: Defines shift duration (e.g., SHT-M 08:00 to 16:00) per `facility_id`.
- `employee_shift_assignments`: Binds guards to shifts.
- Guards logging in outside their assigned shift times trigger a flag or require `shift_overrides` managerial clearance.

## 11. Workflow Engine Enhancement
`workflow_approval_matrix`:
- `facility_id`, `department_id`, `approval_level`, `assignment_role` (e.g., SECURITY_HOD, HOD).
- Support dual approvals (e.g. `escalation_hours`, `mandatory_flag`).

## 12. Audit Immutability Strategy
`audit_logs`:
- Append-only.
- `action_type`, `old_value_json`, `new_value_json`.
- DB User permissions for the API should `DENY UPDATE, DELETE` on `audit_logs` entirely.

## 13. Notification Queue Architecture
- `notification_templates`: Stored format strings for SMS/Email/WhatsApp.
- `notification_queue`: Pending notifications.
- Columns: `retry_count`, `next_retry_at`, `status` (PENDING, FAILED, SENT).

## 14. Security Device Governance
- `trusted_network` (IP CIDR).
- `heartbeat_timestamp`.
- Remote Disable Support: Update `status = 'DISABLED'`, device must halt.

## 15. Session Management Improvements
- `active_sessions`: JWT token tracking, `fingerprint`, `expires_at`.
- `login_history`: IPs, `failed_attempts` tracking. If `failed_attempts > 5`, user is soft-locked.

## 16. SQL Migration Scripts
Provided in `enterprise_hardening_migration.sql` to apply structural indices and missing columns smoothly.

## 17. Index Optimization Strategy
BTREE indices to be added to:
- `facility_id` across `gatepass_requests`, `visitor_logs`, `audit_logs`.
- `employee_id` across `gatepass_requests`, `hr_employee_user_mapping`.
- `entity_id` & `entity_name` in `audit_logs`.

## 18. Archival Strategy
Table `audit_logs_archive`, `gatepass_movements_archive`.
Nightly Cron:
```sql
INSERT INTO gatepass_movements_archive SELECT * FROM gatepass_movements WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 YEAR);
DELETE FROM gatepass_movements WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 YEAR);
```

## 19. Performance Hardening Recommendations
- Connect to DB using Connection Pools (`mysql.createPool`) - *Already active*.
- JSON columns in `audit_logs` should be kept under 64KB for row fast scans, otherwise out-of-row storage triggers.
- Use explicit `SELECT a, b` instead of `SELECT *` for REST APIs.

## 20. Safe Migration Sequence Plan
1. Stand up new mapping tables (`delegated_authority`, `notification_queue`).
2. Add nullable columns to existing tables (`facility_id` in logs, `verification_mode`).
3. Backfill data using `seed_enterprise_users.ts` and `seed_multi_facility.ts`.
4. Apply FKs, index optimizations.
5. Deprecate legacy application flows dynamically.
