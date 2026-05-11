# Enterprise Architecture, Audit, & Migration Report

## 1. Enterprise Gap Analysis
- **Missing Transactions**: Critical movements and approvals lack database transactions, leading to potential race conditions during concurrent check-ins or escalations.
- **Facility Isolation Leaks**: While `facility_id` exists in tables, some global lookup queries might omit strict bounds checks for cross-facility separation.
- **Shift & Session Governance**: `active_sessions` exists but isn't strictly enforcing shift-based concurrency (e.g., guards logging in post-shift).
- **Incident Lockdowns**: No structured schema for emergency lockdowns per gate/facility.
- **Compliance Tracking**: No system to track policy changes and employee acknowledgements.

## 2. Missing Foreign Keys & Index Hardening Plan
**Missing FKs**:
- `notification_queue.template_id` -> `notification_templates(template_id)`
- Assorted linkages from legacy tables before complete normalization.
**Indexes**:
- `idx_gatepass_status` on `gatepass_requests(current_status, facility_id)`
- `idx_gatepass_created` on `gatepass_requests(created_at)`
- `idx_movements_req` on `gatepass_movements(request_id)`

## 3. Workflow Synchronization
- **Priority Override**: Priority requests will instantly fork away from sequential limits, alerting both HOD and HR via `notification_queue`.
- **Sequential Handling**: Standard passes respect the `workflow_approval_matrix` via levels. Active HODs check level 1.
- **Escalation Service**: The watcher sweeps for `current_status = 'PENDING'` and `is_priority = FALSE` surpassing threshold, forcing `action = 'AUTO_ESCALATED'`.

## 4. State Machine: Staff Movement
- **INIT**: `PENDING`
- **APPROVAL**: `APPROVED`
- **PRE-USE EXPIRY**: If time > `expected_return` && state == `APPROVED`, state -> `VOID`. Exit Denied.
- **EXIT**: state -> `OUT`.
- **RE-ENTRY BYPASS**: If state == `OUT`, entry is ALWAYS allowed.
  - If late -> create `gatepass_violations(LATE_RETURN, LOW)`. Do NOT block entry.
- **FINISH**: `RETURNED`.

## 5. Security & Device Governance
- Introduce `emergency_lockdowns` and `lockdown_gate_rules`.
- Active watcher triggers `in-app` broadcast for immediate frontend lockdown overlay.

## 6. Audit & Notification Resilience
- `audit_logs` are protected via MySQL `BEFORE UPDATE`/`BEFORE DELETE` SIGNAL aborts.
- `notification_queue` utilizes exponential backoff for retries: `delay = backoff_base * (2 ^ retry_count)`.

## 7. Migration Execution
- **Step 1**: Table creations (`emergency_lockdowns`, `policy_versions`, etc.).
- **Step 2**: FK and indexing.
- **Step 3**: Rewrite controllers to use `await db.getConnection(); connection.beginTransaction();`.
