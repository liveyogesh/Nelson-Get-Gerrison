import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Production Promotion Engine
 * Safely inserts cleaned and validated employee records into the core production architecture.
 */
export class HRProductionPromotion {
  private db: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.db = connection;
  }

  /**
   * Promotes fully validated records from a batch into production tables.
   */
  async promoteBatchToProduction(batchId: string, defaultFacilityId: number) {
    // Select only perfectly clean records or records whose mappings have been manually resolved
    const [cleanRecords]: any = await this.db.query(
      `SELECT * FROM stg_employee_cleaned 
       WHERE batch_id = ? 
       AND sync_status = 'PENDING'
       AND is_duplicate = FALSE
       AND invalid_mobile = FALSE
       AND invalid_email = FALSE
       AND invalid_dob = FALSE
       AND unresolved_department = FALSE
       AND unresolved_designation = FALSE
       AND unresolved_supervisor = FALSE`,
      [batchId]
    );

    console.log(`Found ${cleanRecords.length} clean records ready for production promotion.`);

    for (const record of cleanRecords) {
      try {
        await this.db.beginTransaction();

        // 1. Insert Identity Record (hr_employees)
        const employeeUuid = uuidv4();
        const [empResult]: any = await this.db.query(
          `INSERT INTO hr_employees (
            employee_uuid, employee_code, employee_code_normalized, first_name, last_name, 
            gender, DOB, joining_date, mobile, official_email, active_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            employeeUuid,
            record.employee_code_normalized, // using normalized code as official
            record.employee_code_normalized,
            record.first_name,
            record.last_name,
            record.gender,
            record.dob,
            record.doj,
            record.mobile_normalized,
            record.email_normalized
          ]
        );
        const employeeId = empResult.insertId;

        // 2. Audit History: Creation
        await this.logAuditHistory(employeeId, 'CREATION', {}, { code: record.employee_code_normalized });

        // 3. Employee Facility Governance (employee_facility_access)
        await this.db.query(
          `INSERT INTO employee_facility_access (employee_id, facility_id, access_level) 
           VALUES (?, ?, 'PRIMARY')`,
          [employeeId, defaultFacilityId]
        );

        // 4. Employee Posting Redesign (employee_postings)
        // Associates them without mutating their core identity record
        if (record.mapped_department_id && record.mapped_designation_id) {
          await this.db.query(
            `INSERT INTO employee_postings (
              employee_id, facility_id, department_id, designation_id, 
              reporting_manager_employee_id, effective_from, posting_status, primary_posting_flag
            ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', TRUE)`,
            [
              employeeId,
              defaultFacilityId,
              record.mapped_department_id,
              record.mapped_designation_id,
              record.resolved_supervisor_id || null,
              record.doj || new Date()
            ]
          );

          await this.logAuditHistory(employeeId, 'POSTING_CHANGE', {}, { 
            department_id: record.mapped_department_id, 
            designation_id: record.mapped_designation_id 
          });
        }

        // 5. Update Status in staging
        await this.db.query(
          `UPDATE stg_employee_cleaned SET sync_status = 'SYNCED' WHERE cleaned_id = ?`,
          [record.cleaned_id]
        );

        await this.db.commit();
      } catch (error: any) {
        await this.db.rollback();
        // Log error back to staging
        await this.db.query(
          `UPDATE stg_employee_cleaned SET sync_status = 'ERROR', sync_error_log = ? WHERE cleaned_id = ?`,
          [error.message, record.cleaned_id]
        );
      }
    }
  }

  // --- Audit History Governance ---
  private async logAuditHistory(employeeId: number, changeType: string, oldData: any, newData: any) {
    await this.db.query(
      `INSERT INTO employee_change_history (
        employee_id, changed_by_user_id, change_type, old_value_json, new_value_json
      ) VALUES (?, NULL, ?, ?, ?)`,
      [
        employeeId, 
        changeType, 
        JSON.stringify(oldData), 
        JSON.stringify(newData)
      ]
    );
  }
}
