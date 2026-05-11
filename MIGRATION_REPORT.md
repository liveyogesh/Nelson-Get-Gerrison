# Nelson Garrison - Enterprise Architecture Modernization Report

## 1. Architecture Improvement Report
The current prototype architecture serves well as an MVP but lacks the multi-tenancy and data isolation required for an enterprise deployment spanning multiple physical hospitals. The shift towards an Enterprise-Grade system requires transitioning to a Facility-First domain driven design. The core backend Node.js (Express) + React 18 frontend strategy is solid and should be retained to avoid unnecessary rebuilds. Improvements will focus on hardening state management, asynchronous queueing, auditing, and database normalization.

## 2. Database Refactoring Recommendations
The MVP database mixed authentication boundaries with domain boundaries:
- **Separation of Concerns:** De-coupled `auth_users` from `hr_employees`. Staff identity (Auth) is now logically separate from their HR assignment (Department/Posting/Designation).
- **Facility Isolation:** All business transactions (Gatepass, Visitors) now inherently reference `facility_id` ensuring multi-hospital database multi-tenancy.
- **Normalization:** Gatepasses have been broken down from a massive flat table into `gatepass_requests`, `gatepass_approvals`, `gatepass_movements`, and `gatepass_violations`.

## 3. Missing Enterprise Modules
Based on our architectural review, the following enterprise modules must be developed to achieve full maturity:
- **Device & Asset Management:** Tracking for all tablets, QR scanners, and Biometric terminals across gates.
- **Integration Layer (ESB Strategy):** A unified API wrapper module to allow smooth integration with existing HRMS (SAP/Oracle) and HIMS (Epic/Cerner).
- **Duty Roster & Shift Management:** To govern exactly which guards are operational at which gates during different time periods.

## 4. Scalable Folder Structure Improvements
Currently, the codebase mixes all routes and controllers. Moving forward, a domain-driven folder structure is required:
```text
server/
├── modules/
│   ├── auth/ (Auth, RBAC, Sessions)
│   ├── hr_master/ (Employees, Depts)
│   ├── facility_master/ (Locations, Gates)
│   ├── gatepass/ (Requests, Move, Approvals)
│   ├── visitor/ (Registry, Master)
│   └── integration/ (HIMS/HRMS Adapters)
├── core/
│   ├── db/
│   ├── middleware/ (Audit, Error, Auth)
│   └── jobs/ (Cron, Watchers, Queues)
```

## 5. Security Enhancement Recommendations
- **Strict Device Whitelisting:** Enforcing that entry/exit scans can only occur from recognized MAC/IP addresses using `security_devices`.
- **Session Lifecycle Management:** Adding `active_sessions` table ensures instant global revocation of permissions during a security breach.
- **Role-Based Access Control (RBAC):** Transitioning from hard-coded 'HOD'/'HR' checks in API routes to scalable `auth_permissions` tied to roles.

## 6. Workflow Modernization Strategy
The MVP hardcoded approvals: Employee -> HOD -> HR.
The modernization abstracts this into `workflow_approval_matrix` and `department_role_assignments`. 
- **Dynamic Chains:** Approval chains can be configured per department or per facility. 
- **Escalation Routes:** Auto-escalation tasks bypass blocked approvers safely using the `escalationWatcher.ts` cron worker without breaking data integrity.

## 7. API Improvement Recommendations
- **Pagination Strategy:** Transition all `GET` lists to cursor or offset-based pagination to handle >50,000 records dynamically.
- **DTOs & Validators:** Implement strict Zod/Joi validation schemas on all incoming PUT/POST payloads to prevent nested SQL injection or data corruption.
- **Transaction Safety:** Wrap all multi-step processes (e.g., Request + Approval creation) within MySQL `BEGIN ... COMMIT` blocks.

## 8. SQL Migration Script Recommendation
As outlined in `db.ts`, the migration involves a strict `SET FOREIGN_KEY_CHECKS = 0;` followed by schema definitions for `geo_countries`, `org_facilities`, `hr_employees`, `notification_queue`, etc. It avoids dropping previous tables unexpectedly but layers the enterprise structures on top of the MVP database.

## 9. New Normalized Schema
We have implemented a fully normalized enterprise schema in `server/db.ts` across 7 domains:
1. System & Notifications Domain
2. Geo & Master Domain
3. Authentication Domain
4. Employee & HR Domain
5. Gatepass Domain
6. Visitor Domain
7. Audit & Security Domain

## 10. Entity Relationship Diagram Overview
- `hr_employees` (1:1) -> `auth_users`
- `org_facilities` (1:N) -> `facility_gates`
- `hr_employees` (1:N) -> `gatepass_requests`
- `gatepass_requests` (1:N) -> `gatepass_movements`
- `gatepass_requests` (1:N) -> `gatepass_approvals`
- `gatepass_movements` (1:N) -> `gatepass_violations`
- `visitor_master` (1:N) -> `visitor_visits`

## 11. RBAC Enhancement Logic
The system now maps `auth_users` -> `auth_user_roles` -> `auth_role_permissions`. Instead of validating if an employee "is" a manager, the middleware checks if the user possesses the `can_approve_gatepass` permission dynamically, allowing temporary substitution assignments.

## 12. Notification Queue Architecture
Direct Email/SMS sending blocks the main Node Event Loop. The enterprise architecture utilizes robust queueing logic through the `notification_queue` table. A background worker periodically pulls `status='QUEUED'` tasks, attempts delivery, and updates the `delivery_status` and `retry_count`.

## 13. Audit Middleware Improvements
Our audit middleware (`server/middleware/auth.ts`) comprehensively traps requests, parsing JSON response objects and bodies, successfully storing the historical state change in the `audit_logs` table. Every `PUT/PATCH/DELETE` logs standard metadata (Device IP, Method, User ID, Payload delta).

## 14. Background Watcher Services
The `escalationWatcher.ts` logic securely acts as an independent cron mechanism that checks `gatepass_requests` for stalled requests (`current_status = PENDING` and duration > Threshold). It utilizes a generic 'system' logic bypassing user identities to insert escalation resolutions automatically.

## 15. Admin Panel Enhancement Plan
The dashboard requires expansion beyond simple user lists to a full **Command Center**:
- Form builders for `workflow_approval_matrix`
- Geographic configuration (Adding new Hospitals, Buildings, and Zones)
- Live streaming component mapping to `gatepass_movements` (WebSockets)
- Device whitelisting interfaces syncing with the `security_devices` schema.

## 16. Scalability Hardening Checklist
- [x] Adopt Master-Detail schema layout.
- [x] Configure TimeZone handling directly in DB vs application.
- [x] Switch to multi-tenant facility IDs on ALL transactional records.
- [x] Move to stateless JWT + Active Session capability checking.
- [x] Employ Background workers for Escalations and Notifications.
- [x] Disconnect Identity (Auth) from Organizational Structure (HR).

## 17. Enterprise Deployment Recommendations
- **Dockerization:** Build stateless Docker images of the Node.js application.
- **Load Balancing:** Deploy across clustered pods sitting behind an NGINX or HAProxy loadbalancer to handle localized scanner traffic.
- **Database Replication:** Switch MySQL off a stand-alone VM to a highly available PaaS setup (like AWS RDS Aurora or GCP Cloud SQL) using Read Replicas for analytical reporting (Dashboard Analytics).
- **Redis Cache Layer:** Introduce Redis to cache RBAC permissions and session states to reduce rapid MySQL lookup calls for high-frequency scanner hits.
