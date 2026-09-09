import mysql from "mysql2/promise";

const healedDatabases = new Set<string>();
const activeHealingPromises = new Map<string, Promise<{ success: boolean; logs: string[] }>>();

async function tableExists(pool: mysql.Pool, table: string): Promise<boolean> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    return false;
  }
}

async function columnExists(pool: mysql.Pool, table: string, column: string): Promise<boolean> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    return false;
  }
}

export async function healDatabase(pool: mysql.Pool, force = false): Promise<{ success: boolean; logs: string[] }> {
  let dbName = "default";
  try {
    const [rows] = await pool.query<any[]>("SELECT DATABASE() as db");
    if (Array.isArray(rows) && rows[0]?.db) {
      dbName = rows[0].db;
    }
  } catch (e) {
    // ignore query failure if pool cannot yet query
  }

  if (!force && healedDatabases.has(dbName)) {
    return { success: true, logs: [`Database '${dbName}' already verified and healed.`] };
  }

  if (activeHealingPromises.has(dbName)) {
    return await activeHealingPromises.get(dbName)!;
  }

  const healingPromise = (async () => {
    const logs: string[] = [];
    try {
      logs.push(`Starting database schema healing for '${dbName}'...`);

    // 1. Check and create missing tables
    const tablesToEnsure = [
      {
        name: "quizzes",
        sql: `CREATE TABLE IF NOT EXISTS quizzes (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(255) NOT NULL UNIQUE,
          title VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          is_timed TINYINT(1) DEFAULT '1',
          default_duration INT DEFAULT '30',
          allow_toggle_timing TINYINT(1) DEFAULT '1',
          min_duration INT DEFAULT '10',
          max_duration INT DEFAULT '60',
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "questions",
        sql: `CREATE TABLE IF NOT EXISTS questions (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(255) NOT NULL UNIQUE,
          quiz_uuid VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          question_text TEXT NOT NULL,
          explanation TEXT DEFAULT NULL,
          image_url VARCHAR(255) DEFAULT NULL,
          points DOUBLE DEFAULT '5',
          positive_points DOUBLE DEFAULT '1',
          negative_points DOUBLE DEFAULT '1',
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_quiz_uuid (quiz_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "question_options",
        sql: `CREATE TABLE IF NOT EXISTS question_options (
          id INT NOT NULL AUTO_INCREMENT,
          question_uuid VARCHAR(255) NOT NULL,
          letter VARCHAR(10) NOT NULL,
          text TEXT,
          image_url VARCHAR(255) DEFAULT NULL,
          is_correct TINYINT(1) DEFAULT '0',
          PRIMARY KEY (id),
          KEY idx_question_uuid (question_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "question_statements",
        sql: `CREATE TABLE IF NOT EXISTS question_statements (
          id INT NOT NULL AUTO_INCREMENT,
          question_uuid VARCHAR(255) NOT NULL,
          \`index\` INT NOT NULL,
          text TEXT,
          is_correct TINYINT(1) DEFAULT '0',
          PRIMARY KEY (id),
          KEY idx_question_uuid (question_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "quiz_attempts",
        sql: `CREATE TABLE IF NOT EXISTS quiz_attempts (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(255) NOT NULL UNIQUE,
          quiz_uuid VARCHAR(255) NOT NULL,
          student_uuid VARCHAR(255) NOT NULL,
          score DOUBLE NOT NULL DEFAULT '0',
          total_points DOUBLE NOT NULL DEFAULT '0',
          total_possible DOUBLE NOT NULL DEFAULT '0',
          time_taken INT DEFAULT NULL,
          answers_json LONGTEXT DEFAULT NULL,
          answers LONGTEXT DEFAULT NULL,
          completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_student_quiz (student_uuid, quiz_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "batches",
        sql: `CREATE TABLE IF NOT EXISTS batches (
          id INT NOT NULL AUTO_INCREMENT,
          batch_code VARCHAR(50) NOT NULL UNIQUE,
          batch_name VARCHAR(150) NOT NULL,
          description VARCHAR(255) DEFAULT NULL,
          is_active TINYINT(1) DEFAULT '1',
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "class_types",
        sql: `CREATE TABLE IF NOT EXISTS class_types (
          id INT NOT NULL AUTO_INCREMENT,
          type_code VARCHAR(50) NOT NULL UNIQUE,
          type_name VARCHAR(150) NOT NULL,
          description VARCHAR(255) DEFAULT NULL,
          is_active TINYINT(1) DEFAULT '1',
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "bank_accounts",
        sql: `CREATE TABLE IF NOT EXISTS bank_accounts (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(255) NOT NULL UNIQUE,
          bank_name VARCHAR(150) NOT NULL,
          account_name VARCHAR(150) NOT NULL,
          account_number VARCHAR(100) NOT NULL,
          branch_name VARCHAR(150) DEFAULT NULL,
          account_type VARCHAR(100) DEFAULT NULL,
          instructions TEXT DEFAULT NULL,
          is_active TINYINT(1) DEFAULT '1',
          display_order INT DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "system_settings",
        sql: `CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
          setting_value TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "admin_users",
        sql: `CREATE TABLE IF NOT EXISTS admin_users (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(255) NOT NULL UNIQUE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          user_email VARCHAR(191) NOT NULL UNIQUE,
          user_password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          permission_id INT DEFAULT 1,
          theme_preference VARCHAR(50) DEFAULT 'light',
          profile_photo VARCHAR(255) DEFAULT NULL,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "users",
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INT NOT NULL AUTO_INCREMENT,
          uuid VARCHAR(150) DEFAULT NULL,
          student_id VARCHAR(150) DEFAULT NULL,
          first_name VARCHAR(255) DEFAULT NULL,
          last_name VARCHAR(255) DEFAULT NULL,
          user_email VARCHAR(150) DEFAULT NULL,
          user_address VARCHAR(255) DEFAULT NULL,
          phone VARCHAR(20) DEFAULT NULL,
          birthday DATE DEFAULT NULL,
          id_number VARCHAR(20) DEFAULT NULL,
          batch VARCHAR(20) DEFAULT NULL,
          user_password VARCHAR(255) DEFAULT NULL,
          gid VARCHAR(150) DEFAULT NULL,
          profile_url VARCHAR(255) DEFAULT NULL,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          setup_token VARCHAR(36) DEFAULT NULL,
          token_expiry DATETIME DEFAULT NULL,
          profile_completed TINYINT(1) DEFAULT '0',
          PRIMARY KEY (id),
          UNIQUE KEY idx_users_uuid (uuid),
          UNIQUE KEY idx_users_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "class_list",
        sql: `CREATE TABLE IF NOT EXISTS class_list (
          id INT NOT NULL AUTO_INCREMENT,
          class_id VARCHAR(50) DEFAULT NULL UNIQUE,
          class_title VARCHAR(150) DEFAULT NULL,
          class_description TEXT DEFAULT NULL,
          class_price VARCHAR(50) DEFAULT NULL,
          class_type VARCHAR(50) DEFAULT NULL,
          renew_type VARCHAR(50) DEFAULT NULL,
          batch VARCHAR(50) DEFAULT NULL,
          class_code VARCHAR(50) DEFAULT NULL,
          class_imageurl VARCHAR(255) DEFAULT NULL,
          display_order INT DEFAULT 0,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "payments",
        sql: `CREATE TABLE IF NOT EXISTS payments (
          id INT NOT NULL AUTO_INCREMENT,
          payment_uuid VARCHAR(255) DEFAULT NULL,
          student_uuid VARCHAR(255) DEFAULT NULL,
          amount INT DEFAULT NULL,
          item_type VARCHAR(50) DEFAULT NULL,
          item_id VARCHAR(50) DEFAULT NULL,
          bank VARCHAR(50) DEFAULT NULL,
          transaction_proof VARCHAR(250) DEFAULT NULL,
          status VARCHAR(50) DEFAULT NULL,
          approved_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "class_material_list",
        sql: `CREATE TABLE IF NOT EXISTS class_material_list (
          id INT NOT NULL AUTO_INCREMENT,
          material_id VARCHAR(50) DEFAULT NULL,
          material_description VARCHAR(150) DEFAULT NULL,
          material_imageurl VARCHAR(150) DEFAULT NULL,
          material_title VARCHAR(150) DEFAULT NULL,
          material_type VARCHAR(150) DEFAULT NULL,
          material_video_url VARCHAR(150) DEFAULT NULL,
          material_pdf_url VARCHAR(150) DEFAULT NULL,
          material_link VARCHAR(150) DEFAULT NULL,
          class_id VARCHAR(50) DEFAULT NULL,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          downloadable VARCHAR(50) DEFAULT NULL,
          view_count_enabled TINYINT DEFAULT '0',
          view_limit INT DEFAULT NULL,
          expire_hours VARCHAR(20) DEFAULT NULL,
          display_order INT DEFAULT 0,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "permission",
        sql: `CREATE TABLE IF NOT EXISTS permission (
          id INT NOT NULL AUTO_INCREMENT,
          role_name VARCHAR(50) DEFAULT NULL,
          data LONGTEXT,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "paper_predefine",
        sql: `CREATE TABLE IF NOT EXISTS paper_predefine (
          id INT NOT NULL AUTO_INCREMENT,
          paper_id VARCHAR(50) DEFAULT NULL,
          paper_name VARCHAR(255) NOT NULL,
          paper_cover_image VARCHAR(255) DEFAULT NULL,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "students_marks",
        sql: `CREATE TABLE IF NOT EXISTS students_marks (
          id INT NOT NULL AUTO_INCREMENT,
          student_uuid VARCHAR(150) DEFAULT NULL,
          paper_id VARCHAR(50) DEFAULT NULL,
          mark_a DOUBLE DEFAULT NULL,
          mark_b DOUBLE DEFAULT NULL,
          update_at DATE DEFAULT NULL,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "quiz_list",
        sql: `CREATE TABLE IF NOT EXISTS quiz_list (
          id INT NOT NULL AUTO_INCREMENT,
          quiz_id VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          batch VARCHAR(20) NOT NULL,
          expire_date DATETIME DEFAULT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY quiz_id (quiz_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "quiz_questions",
        sql: `CREATE TABLE IF NOT EXISTS quiz_questions (
          id INT NOT NULL AUTO_INCREMENT,
          quiz_id VARCHAR(20) NOT NULL,
          question_text TEXT NOT NULL,
          options JSON NOT NULL,
          correct_answer INT NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY quiz_id (quiz_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "student_quiz_attempts",
        sql: `CREATE TABLE IF NOT EXISTS student_quiz_attempts (
          id INT NOT NULL AUTO_INCREMENT,
          student_uuid VARCHAR(150) NOT NULL,
          quiz_id VARCHAR(20) NOT NULL,
          answers JSON NOT NULL,
          score DECIMAL(5,2) NOT NULL,
          attempted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_attempt (student_uuid, quiz_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "studypack_list",
        sql: `CREATE TABLE IF NOT EXISTS studypack_list (
          id INT NOT NULL AUTO_INCREMENT,
          studypack_id VARCHAR(50) DEFAULT NULL,
          studypack_description VARCHAR(150) DEFAULT NULL,
          studypack_imageurl VARCHAR(150) DEFAULT NULL,
          studypack_title VARCHAR(150) DEFAULT NULL,
          studypack_type VARCHAR(50) DEFAULT NULL,
          studypack_code VARCHAR(50) DEFAULT NULL,
          batch VARCHAR(50) DEFAULT NULL,
          price INT DEFAULT NULL,
          display_order INT DEFAULT 0,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "studypack_material_list",
        sql: `CREATE TABLE IF NOT EXISTS studypack_material_list (
          id INT NOT NULL AUTO_INCREMENT,
          material_id VARCHAR(50) DEFAULT NULL,
          material_description VARCHAR(150) DEFAULT NULL,
          material_title VARCHAR(150) DEFAULT NULL,
          material_imageurl VARCHAR(150) DEFAULT NULL,
          material_type VARCHAR(50) DEFAULT NULL,
          material_video_url VARCHAR(150) DEFAULT NULL,
          material_pdf_url VARCHAR(150) DEFAULT NULL,
          material_link VARCHAR(150) DEFAULT NULL,
          studypack_id VARCHAR(50) DEFAULT NULL,
          display_order INT DEFAULT 0,
          create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "user_last_login",
        sql: `CREATE TABLE IF NOT EXISTS user_last_login (
          id INT NOT NULL AUTO_INCREMENT,
          user_uuid VARCHAR(100) NOT NULL,
          device_name VARCHAR(255) DEFAULT NULL,
          ip_address VARCHAR(100) DEFAULT NULL,
          last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY user_uuid (user_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "video_views",
        sql: `CREATE TABLE IF NOT EXISTS video_views (
          id BIGINT NOT NULL AUTO_INCREMENT,
          user_uuid VARCHAR(36) NOT NULL,
          material_id VARCHAR(255) NOT NULL,
          view_count INT DEFAULT '0',
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_user_material (user_uuid, material_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "email_otps",
        sql: `CREATE TABLE IF NOT EXISTS email_otps (
          email VARCHAR(255) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          PRIMARY KEY (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: "password_resets",
        sql: `CREATE TABLE IF NOT EXISTS password_resets (
          id BIGINT NOT NULL AUTO_INCREMENT,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      }
    ];

    for (const t of tablesToEnsure) {
      const exists = await tableExists(pool, t.name);
      if (!exists) {
        await pool.query(t.sql);
        logs.push(`Created table: ${t.name}`);
      }
    }

    // Seed initial system settings if empty

    if (await tableExists(pool, "system_settings")) {
      const [settingRows] = await pool.query<any[]>("SELECT COUNT(*) as count FROM system_settings WHERE setting_key = 'monthly_target'");
      if (settingRows && settingRows[0]?.count === 0) {
        await pool.query(`
          INSERT INTO system_settings (setting_key, setting_value) VALUES ('monthly_target', '500000')
        `);
        logs.push("Seeded initial monthly_target into table 'system_settings'");
      }
    }

    // Seed initial batches if empty
    if (await tableExists(pool, "batches")) {
      const [batchRows] = await pool.query<any[]>("SELECT COUNT(*) as count FROM batches");
      if (batchRows && batchRows[0]?.count === 0) {
        await pool.query(`
          INSERT INTO batches (batch_code, batch_name, description) VALUES
          ('2026AL', '2026 A/L', 'Batch for 2026 Advanced Level students'),
          ('2027AL', '2027 A/L', 'Batch for 2027 Advanced Level students')
        `);
        logs.push("Seeded initial default batches into table 'batches'");
      }
      // Remove 2027OL and 2028OL if present
      await pool.query("DELETE FROM batches WHERE batch_code IN ('2027OL', '2028OL')");
    }

    // Seed initial class types if empty
    if (await tableExists(pool, "class_types")) {
      const [typeRows] = await pool.query<any[]>("SELECT COUNT(*) as count FROM class_types");
      if (typeRows && typeRows[0]?.count === 0) {
        await pool.query(`
          INSERT INTO class_types (type_code, type_name, description) VALUES
          ('theory', 'Theory', 'Theory Class'),
          ('revision', 'Revision', 'Revision Class'),
          ('physical', 'Paper', 'Paper Class'),
          ('revision+paper', 'Revision + Paper', 'Combined Revision & Paper Class'),
          ('other', 'Other', 'Other Special Class')
        `);
        logs.push("Seeded initial default class types into table 'class_types'");
      }
    }

    // 2. Check and add missing columns to existing tables
    const columnsToEnsure = [
      {
        table: "paper_predefine",
        column: "paper_id",
        sql: `ALTER TABLE paper_predefine ADD COLUMN paper_id VARCHAR(50) DEFAULT NULL`
      },
      {
        table: "paper_predefine",
        column: "paper_cover_image",
        sql: `ALTER TABLE paper_predefine ADD COLUMN paper_cover_image VARCHAR(255) DEFAULT NULL`
      },
      {
        table: "admin_users",
        column: "theme_preference",
        sql: `ALTER TABLE admin_users ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'light'`
      },
      {
        table: "admin_users",
        column: "profile_photo",
        sql: `ALTER TABLE admin_users ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL`
      },
      {
        table: "video_views",
        column: "last_view_at",
        sql: `ALTER TABLE video_views ADD COLUMN last_view_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`
      },
      {
        table: "class_list",
        column: "display_order",
        sql: `ALTER TABLE class_list ADD COLUMN display_order INT DEFAULT 0`
      },
      {
        table: "class_material_list",
        column: "section_name",
        sql: `ALTER TABLE class_material_list ADD COLUMN section_name VARCHAR(150) DEFAULT 'General'`
      },
      {
        table: "class_material_list",
        column: "display_order",
        sql: `ALTER TABLE class_material_list ADD COLUMN display_order INT DEFAULT 0`
      },
      {
        table: "materials",
        column: "section_name",
        sql: `ALTER TABLE materials ADD COLUMN section_name VARCHAR(150) DEFAULT 'General'`
      },
      {
        table: "materials",
        column: "display_order",
        sql: `ALTER TABLE materials ADD COLUMN display_order INT DEFAULT 0`
      }
    ];

    for (const c of columnsToEnsure) {
      if (await tableExists(pool, c.table)) {
        const hasCol = await columnExists(pool, c.table, c.column);
        if (!hasCol) {
          await pool.query(c.sql);
          logs.push(`Added missing column '${c.column}' to table '${c.table}'`);
        }
      }
    }

    // 3. Modify description column types to TEXT to support long Sinhala / detailed descriptions
    const alterTables = ["class_list", "class_material_list", "studypack_list", "studypack_material_list"];
    const colMap: Record<string, string> = {
      class_list: "class_description",
      class_material_list: "material_description",
      studypack_list: "studypack_description",
      studypack_material_list: "material_description"
    };

    for (const tbl of alterTables) {
      if (await tableExists(pool, tbl)) {
        const col = colMap[tbl];
        if (await columnExists(pool, tbl, col)) {
          try {
            await pool.query(`ALTER TABLE \`${tbl}\` MODIFY COLUMN \`${col}\` TEXT DEFAULT NULL`);
            logs.push(`Updated column type of '${tbl}.${col}' to TEXT`);
          } catch (e: any) {
            console.error(`[DB HEALER] Failed modifying ${tbl}.${col} type:`, e.message);
          }
        }
      }
    }

      healedDatabases.add(dbName);
      logs.push("Database schema healing completed successfully.");
      console.log("[DB HEALER]", logs.join(" | "));
      return { success: true, logs };
    } catch (err: any) {
      logs.push(`Database healing failed: ${err.message}`);
      console.error("[DB HEALER ERROR]", err);
      return { success: false, logs };
    } finally {
      activeHealingPromises.delete(dbName);
    }
  })();

  activeHealingPromises.set(dbName, healingPromise);
  return await healingPromise;
}
