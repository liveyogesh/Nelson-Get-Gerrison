# Enterprise Role-Based Control & Operational Governance

## 1. Enterprise Role Hierarchy
Detailed role hierarchy mapped to modules and operational scope.

### A. System Level Roles
- **Super Admin**: Platform Owner. Full system access. Restrictions: Cannot delete audit logs.
- **Corporate Admin**: Corporate HQ oversight. Multi-facility reporting. Cannot modify core security policies.

### B. Facility Level Roles
- **Facility Admin**: Operational admin for a single hospital. Facility config, localized reporting.
- **Facility IT Admin**: Device/session monitoring, hardware management. No HR/Pass access.
- **Facility Security Officer**: Security operations, gate tracking, zones. No HR modification.

### C. HR & Department Roles
- **HR Manager**: Compliance, employee movements, violation tracking. No system config.
- **HOD (Head of Department)**: Approvals within department bounds. Limited visibility.
- **Supervisor**: Frontline operational approvers. Lower-tier approval.
- **Escalation Officer**: Fallback approval authority for timed-out/emergency requests.

### D. Security Operational Roles
- **Security Guard**: Gate operations, scanning, verification. No HR data access.
- **Security Supervisor**: Overlook guard activities, manual overrides, logging.

### E. Audit & Compliance
- **Audit Officer**: Data integrity, read-only compliance views.
- **Compliance Officer**: Policy, workflow adherence, escalation checks.

### F. Operational Support Roles
- **Reception Desk**, **Biomedical Coordinator**, **Transport Coordinator**.

## 2. Permission Matrix System
Instead of roles answering all questions, `Role + Permission` sets the rules.
Example permissions:
- `gatepass.create`
- `gatepass.approve`
- `gatepass.override`
- `visitor.create`
- `visitor.blacklist`
- `audit.view`
- `workflow.edit`
- `security.lockdown`
- `facility.manage`

## 3. Scoped Data Visibility Contols
Each user gets injected with a `Scope Level` at auth.
- Corporate: `all`
- Facility: `assigned_facility_id`
- Department: `department_id`
- Staff: `employee_id`

## 4. Delegated Authority System
Implementation via `delegated_role_assignments` table. Handles scenarios like " ভারপ্রাপ্ত HOD" or shift replacements. Timed validity (`effective_from` -> `effective_to`).

## 5. Shift-Based Access Control
Tables `active_shift_sessions`. User capabilities unlock only during assigned shifts.

## 6. Restricted Action Controls & Four-Eye Principle
High-risk operations (e.g., lockdown mode, force close emergency gatepass) require secondary validation (four-eye) or strict reason inputs logged cleanly into `audit_logs`.

## 7. Session & Device Controls
- `trusted_devices` to bind sessions to validated MACs/IPs.
- `active_sessions` handles concurrent limits and force logoffs.

## 8. Role-Based Dashboards
The frontend `Dashboard.tsx` checks user roles/scopes to render distinct modules:
- Security Guard -> Quick Scan UI
- HR -> Violations timeline
- Admin -> System metrics

## 9. Future-Ready Identity Architecture
- SSO readiness mappings
- Biometric hooks
- Conditional Access (Geo/Time)
