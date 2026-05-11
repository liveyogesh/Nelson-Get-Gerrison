# Multi-Facility Governance Architecture

## 1. Governance Model
- The \`org_facilities\` schema now supports a hierarchy with \`parent_facility_id\` and regional grouping.
- Corporate Office (CORP-HQ) manages regional hospitals (e.g., HQ01) and clinics (ND-01) or specific institutes (NCI-01).
- Added \`corporate_managed_flag\` to identify corporate oversight units.

## 2. Facility Scoping
- Modules such as Gatepasses, Visitors, Incidents, Restricted Zones, and Audits all inherently bind to a \`facility_id\`.
- All backend routes must restrict fetching by \`WHERE facility_id = ?\` mapping to the logged-in user's active facility, UNLESS they hold Corporate privileges.

## 3. Employee Facility Access & Isolation
- \`employee_facility_access\` table controls permissions. Users cannot view cross-facility data without an entry linking them to that \`facility_id\` or a corporate override.
- \`temporary_deputation_flag\` and \`valid_until\` support borrowing floating staff, locum doctors, and emergency response teams across locations without permanent role assignments.

## 4. Multi-Facility Workflow & Rules
- \`workflow_approval_matrix\` has \`facility_isolation\` boolean to ensure escalation hierarchies don't accidentally leak cross-branch.

## 5. Security & Devices
- \`facility_security_policies\` store specific operational directives like gate timings on a per-facility basis (JSON payloads).
- \`security_devices\` now support tracking networks and offline alerting capabilities.

## 6. Corporate Oversight Dashboard
A dedicated Corporate Dashboard UI provides:
- Enterprise-wide aggregate metrics.
- Heatmaps of violations and movement across hospital chains.
- Facility comparisons and uptime overviews.

## 7. Reporting Architecture
- **Facility-wise queries**: By injecting \`facility_id\` constraints to aggregated SQL queries, we segregate data naturally.
- **Cross-Facility movement**: Reports will now filter endpoints using JOINs on \`employee_postings\` and \`employee_facility_access\` against the Gatepass tracking logic.

## 8. Multi-facility Workflow Enhancements
- Approvals can now skip or escalate based on `workflow_approval_matrix` facility flags (`facility_isolation`), routing to Corporate HR if required by the priority layer.

## 9. Scalability Recommendations
- **Partitioning**: Partition large tables (like `restricted_zone_access_logs` and `gatepass_movements`) by `facility_id` and date.
- **Database Sharding**: As the enterprise grows to 50+ facilities, shard active tables by geography (e.g. `regional_group` field).
- **Read Replicas**: Separate operational writes from corporate dashboard analytics queries. Corporate Dashboard should hit read replicas.

## 10. Deployment Recommendations
- Separate services conceptually into local API gateways and corporate API gateways.
- Scale frontend statically over a CDN.
- Use Dockerized instances for each hospital site if complete local offline endurance is required, synchronizing the central "Corporate DB" using replication.
