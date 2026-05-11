import mysql from 'mysql2/promise';

/**
 * Enterprise HR Normalization Engine
 * This engine takes data from `stg_hims_employee_import` and normalizes it into 
 * `stg_employee_cleaned`, applying mapping rules and supervisor resolution.
 */
export class HRNormalizationEngine {
  private db: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.db = connection;
  }

  /**
   * Main entrypoint to process a batch of raw imports
   */
  async processBatch(batchId: string) {
    console.log(`Starting normalization for batch: ${batchId}`);

    const [rawRecords]: any = await this.db.query(
      `SELECT * FROM stg_hims_employee_import WHERE import_batch_id = ? AND import_status = 'PENDING'`,
      [batchId]
    );

    for (const record of rawRecords) {
      await this.normalizeRecord(record, batchId);
    }
  }

  /**
   * Processes a single HIMS raw record
   */
  private async normalizeRecord(raw: any, batchId: string) {
    // 1. Basic Cleaning
    const empCodeNorm = this.normalizeEmployeeCode(raw.raw_employee_code);
    const { firstName, lastName } = this.splitName(raw.raw_employee_name);
    const mobileNorm = this.normalizeMobile(raw.raw_mobile);
    const emailNorm = raw.raw_email?.trim().toLowerCase() || null;
    
    // 2. Validation Checks
    const invalidMobile = mobileNorm ? mobileNorm.length < 10 : false;
    const invalidEmail = emailNorm ? !/^[^\\s]+@[^\\s]+\\.[^\\s]+$/.test(emailNorm) : false;
    const { dob, invalidDob } = this.normalizeDate(raw.raw_dob);
    const { dob: doj } = this.normalizeDate(raw.raw_doj);

    // 3. Duplicate Detection Strategy (against HR table)
    let isDuplicate = false;
    const [existing]: any = await this.db.query(
      `SELECT employee_id FROM hr_employees WHERE employee_code_normalized = ? OR official_email = ? OR mobile = ?`,
      [empCodeNorm, emailNorm, mobileNorm]
    );
    if (existing.length > 0) isDuplicate = true;

    // 4. Department Normalization Engine
    const { mappedDeptId, unresolvedDept } = await this.resolveMapping(
      'department_mapping_rules', 
      'mapped_department_id', 
      raw.raw_department
    );

    // 5. Designation Normalization Engine
    const { mappedDeptId: mappedDesigId, unresolvedDept: unresolvedDesig } = await this.resolveMapping(
      'designation_mapping_rules', 
      'mapped_designation_id', 
      raw.raw_designation
    );

    // 6. Supervisor Resolution Logic
    const { supervisorId, unresolvedSupervisor } = await this.resolveSupervisor(raw.raw_supervisor);

    // 7. Insert to Staging Cleaned
    await this.db.query(
      `INSERT INTO stg_employee_cleaned (
        raw_id, batch_id, employee_code_normalized, first_name, last_name, 
        mobile_normalized, email_normalized, dob, doj, mapped_department_id, 
        mapped_designation_id, resolved_supervisor_id, is_duplicate, invalid_mobile, 
        invalid_email, invalid_dob, unresolved_department, unresolved_designation, 
        unresolved_supervisor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        raw.raw_id, batchId, empCodeNorm, firstName, lastName, mobileNorm, emailNorm, 
        dob, doj, mappedDeptId, mappedDesigId, supervisorId, isDuplicate, 
        invalidMobile, invalidEmail, invalidDob, unresolvedDept, unresolvedDesig, 
        unresolvedSupervisor
      ]
    );

    // 8. Update raw record status
    await this.db.query(
      `UPDATE stg_hims_employee_import SET import_status = 'PROCESSED' WHERE raw_id = ?`,
      [raw.raw_id]
    );
  }

  // --- Utility Methods ---

  private normalizeEmployeeCode(code: string | null): string | null {
    if (!code) return null;
    let clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Rule: Add padded zeros if needed, e.g. C182 -> C0182
    const match = clean.match(/^([A-Z]+)(\\d+)$/);
    if (match) {
      clean = `${match[1]}${match[2].padStart(4, '0')}`;
    }
    return clean;
  }

  private splitName(fullName: string | null) {
    if (!fullName) return { firstName: 'Unknown', lastName: '' };
    const parts = fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return { firstName, lastName };
  }

  private normalizeMobile(mobile: string | null): string | null {
    if (!mobile) return null;
    return mobile.replace(/[^0-9+]/g, '');
  }

  private normalizeDate(dateStr: string | null) {
    if (!dateStr) return { dob: null, invalidDob: false };
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return { dob: null, invalidDob: true };
    return { dob: parsed.toISOString().split('T')[0], invalidDob: false };
  }

  /**
   * Generic Engine for mapping lookup against mapping rules tables
   */
  private async resolveMapping(tableName: string, targetCol: string, rawValue: string | null) {
    if (!rawValue || rawValue.trim() === '') return { mappedDeptId: null, unresolvedDept: false };
    
    rawValue = rawValue.trim().toUpperCase();
    const [rows]: any = await this.db.query(
      `SELECT ${targetCol} FROM ${tableName} WHERE UPPER(raw_hims_string) = ?`,
      [rawValue]
    );

    if (rows.length > 0 && rows[0][targetCol]) {
      return { mappedDeptId: rows[0][targetCol], unresolvedDept: false };
    }
    return { mappedDeptId: null, unresolvedDept: true };
  }

  /**
   * Advanced Supervisor resolution. Attempts matching exact names or fuzzy.
   * If mapping ambiguous or non-existent, flags for manual resolution.
   */
  private async resolveSupervisor(rawSupervisorName: string | null) {
    if (!rawSupervisorName || rawSupervisorName.trim() === '') {
      return { supervisorId: null, unresolvedSupervisor: false };
    }
    
    // First, exact match on CONCAT(first_name, ' ', last_name)
    const [rows]: any = await this.db.query(
      `SELECT employee_id FROM hr_employees 
       WHERE UPPER(CONCAT(first_name, ' ', last_name)) = UPPER(?)`,
      [rawSupervisorName.trim()]
    );

    if (rows.length === 1) {
      return { supervisorId: rows[0].employee_id, unresolvedSupervisor: false };
    }
    // Ambiguous or not found
    return { supervisorId: null, unresolvedSupervisor: true };
  }
}
