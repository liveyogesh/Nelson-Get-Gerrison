# Enterprise User Architecture & Access Control Documentation

## 1. Improved User Architecture
The system has been decoupled from simple username-based access into an enterprise model. 
- **Identity Layer (`auth_users`)**: Manages login credentials, password policies, and account lockouts.
- **Business Layer (`hr_employees`)**: Manages real-world organizational properties (designation, department, reporting line).
- **Mapping (`hr_employee_user_mapping`)**: Connects identity to business reality, allowing a single person to transition roles or hold multiple accounts if absolutely necessary, while ensuring business constraints rely on the `employee_id`.

## 2. User-Role Mapping Schema
- `auth_roles`: Holds roles like `SUPER_ADMIN`, `ADMIN`, `SECURITY_HOD`, `HR_MANAGER`, etc.
- `auth_user_roles`: Maps `auth_users.id` to `auth_roles.id`.
- Roles are purely structural, while `auth_permissions` defines the exact actions permitted.

## 3. Employee-User Mapping Schema
- `hr_employee_user_mapping`: Contains `employee_id` and `user_id`.
- All operational tables (gatepass, visitor logs, asset movements) reference `employee_id`, not `user_id`.

## 4. Facility Access Model
- `employee_facility_access`: Links `employee_id` to `facility_id` with an `access_level`.
- Users only see dashboards and approve workflows for their associated facilities. Corporate users (like Super Admins) can be associated with multiple facilities or have a macro-level bypass.

## 5. Department Scoping Logic
- `department_role_assignments`: Maps `employee_id` to `department_id` with specific roles (e.g., `HOD`, `Supervisor`).
- A Head of Department (HOD) is dynamically given approval rights for their specific `department_id` without needing an explicit global "HOD" permission for all departments.

## 6. Shift-based Access Control
- `shift_master` & `employee_shift_assignments` connect employees to active shifts.
- Provides future runway for blocking physical gate access or dashboard access (e.g., for `SECURITY_GUARD` roles) outside of assigned shifts to deter off-hours actions.

## 7. Session Tracking Architecture
- `active_sessions`: Logs active authentication tokens mapped to specific devices and `user_id`.
- `login_history`: Audits login successes, failures, IP addresses, and device fingerprints.

## 8. First-Login Hardening Flow
- `auth_users.password_changed_at` determines if a user relies on a default password.
- At login, if `password_changed_at` is NULL or severely outdated, the user is redirected to a forced credential update flow. 
- `failed_attempts` and `locked_until` prevent brute-force attacks by freezing accounts.

## 9. Seed Scripts
- `seed_enterprise_users.ts` automatically scaffolds facilities, departments, roles, identity mappings, and sample shifts across the 9 primary enterprise personas (`super_admin`, `ADMIN01`, `MGMT01`, `SECHOD01`, `SEC01`, `HOD01`, `HR01`, `EMP01`, `EMP02`).

## 10. Permission Matrix
We use a capability-based matrix (`auth_permissions` -> `auth_role_permissions`).
Examples:
- `VIEW_ALL_SECURITY_OPS`
- `APPROVE_EMERGENCY_MOVEMENT`
- `PROCESS_GATEPASS_MOVEMENT`
- `VIEW_RESTRICTED_ZONES`

## 11. Security Hardening Recommendations
- **MFA Enforcement**: Add a `requires_mfa` flag per role (High for Admins and Security HOD).
- **Time-bound roles**: Temporary role elevation workflows.
- **Biometric API hooks**: Prepare the client for FIDO2/WebAuthn for passwordless terminal access.

## 12. Audit Logging Improvements
- `audit_logs` table records every modification.
- Critical actions (e.g., restricted zone access, emergency override) insert explicit audit trails that are immutable by any role except direct database intervention.
- Admins and HODs cannot delete audit logs.

## Security HOD (SECHOD01) Implementation
The `SECURITY_HOD` role is now distinct from simple supervisors or facility admins. 
- Mapped to user `SECHOD01`.
- Granted specific macro-security permissions (`VIEW_ALL_SECURITY_OPS`, `APPROVE_EMERGENCY_MOVEMENT`, `VIEW_SECURITY_ANALYTICS`) to authorize lockdown procedures and restricted zone overrides.
- Does not possess HR or system administration rights.
