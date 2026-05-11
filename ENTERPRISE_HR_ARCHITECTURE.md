# Enterprise HR Migration & Architecture Toolkit

This package provides a comprehensive, risk-free pipeline to import raw HIMS employee data, normalize it, and safely integrate it into the existing Nelson Garrison database without breaking RBAC, workflows, or current data.

The architecture uses a **3-Stage Import Layer**:
1. **Raw Staging (`stg_hims_employee_import`)**: Immutable record of CSV data.
2. **Normalized Staging (`stg_employee_cleaned`)**: Cleansed data with flags.
3. **Production Mapping**: Safe insertion to `hr_employees`, `employee_postings`, `auth_users`, etc.

---

## 1. Employee Architecture Enhancement Report
The existing `hr_employees` is flat and overloaded. We are enhancing it by:
- Creating isolation between identity (`hr_employees`) and operational assignment (`employee_postings`).
- Removing direct login dependencies by using `hr_employee_user_mapping`.
- Extracting roles/categories into `employee_category_master`, `employment_type_master`, and `employment_status_master` to ensure data integrity over free-text fields.

## 2. Missing Employee Fields Report
Comparing HIMS export parameters with the ideal enterprise structure, we identified missing fields in the existing schema that will be added:
- `employee_uuid`
- `employee_code_normalized`
- `official_email` & `personal_email` (split)
- `blood_group` & `emergency_contact`
- `biometric_code`
- Categorical references: `employee_category_id`, `employment_type_id`, `employment_status_id`.

## 3. Staging Import Schema & 4. Data Cleansing Architecture
*See SQL migration scripts for schemas.*
The cleansing architecture isolates raw data and normalizes spaces, emails, phones, and dates before moving to the `stg_employee_cleaned` table.

## 5. Department Normalization Engine
Instead of blindly importing HIMS text, `department_mapping_rules` Maps raw text (e.g., "Cardio", "Cardiology Dept") to a canonical `department_id` in `hr_departments`.

## 6. Designation Normalization Engine
Likewise, `designation_mapping_rules` translates raw titles ("Sr. Nurse", "Staff Nurse (ICU)") to definitive IDs in `hr_designations`.

## 7. Supervisor Resolution Logic
Since reporting managers come as text names in HIMS, the `stg_employee_cleaned` table attempts to find matching internal `employee_id`s. Unresolved managers are flagged for manual review via `unresolved_supervisor` = true.

## 8. Employee Posting Redesign
`employee_postings` detaches an employee's assignment from their identity record. This allows tracking transfers, deputations, and historical operational roles safely.

## 9. Employee Facility Governance
Managed via `employee_facility_access`. A posting links an employee to a `facility_id` for duty, while this table controls security and RBAC scopes across multiple facility boundaries.

## 10. Shift Governance Enhancements
Added robust support for shift restrictions and overrides via `shift_master` and `employee_shift_assignments`. Linkage is governed via `effective_from` and `effective_to` dates.

## 11. Employee Onboarding Workflow
1. Raw HIMS CSV -> `stg_hims_employee_import`.
2. Cleanse job -> `stg_employee_cleaned`.
3. Validation checks resolve mappings; if clean -> Proceed to Prod.
4. Insert `hr_employees`.
5. Insert `employee_postings`.
6. Apply `employee_facility_access` and `employee_shift_assignments`.

## 12. Duplicate Detection Strategy
- Check `mobile` and `official_email`.
- Compare normalized `employee_code`.
If duplicates exist, mark `is_duplicate = true` in staging. Production insert is blocked until manually resolved.

## 13. Validation Engine
The cleansing logic flags:
- `invalid_email` (regex check)
- `invalid_mobile` (length/character check)
- `unresolved_department` & `unresolved_supervisor`
- `invalid_dob`

## 14. Audit History Architecture
Every change directly triggers a history record in `employee_change_history`.

---

## 16. Safe Import Sequence
1. Upload HIMS CSV directly into `stg_hims_employee_import` without validations.
2. Execute the Cleansing Stored Procedure / Logic to populate `stg_employee_cleaned`.
3. HR Admin reviews the errors via an UI (unresolved departments, invalid emails).
4. HR Admin resolves mapping tables (`department_mapping_rules`, etc.).
5. Re-run Cleansing Logic.
6. Execute Production Promotion logic to insert into core tables.

## 17. Rollback Plan
- The staging tables keep all batch `import_batch_id` data intact.
- Rollback can be done simply by querying records with a specific `batch_id` and deleting from `hr_employees`, `employee_postings`, etc., and resetting the `stg_employee_cleaned.import_status`.
- Data is strictly additive, so `DELETE` by `batch_id` safely undoes accidental imports.

## 18. Production-Safe Deployment Order
1. Apply the Migration Script (Creates tables, alters tables, adds indexes).
2. Deploy backend service enhancements for mapping endpoints.
3. Import HIMS mapping rules.
4. Execute Dry-Run of HIMS data into Staging tables.
5. Review validation outputs.
6. Commit to production mapping layer.
