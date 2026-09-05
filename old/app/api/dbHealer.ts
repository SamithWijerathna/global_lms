import mysql from "mysql2/promise";

let isHealingFinished = false;
let isHealingInProgress = false;

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
  if (isHealingInProgress) {
    return { success: true, logs: ["Database healing currently in progress..."] };
  }

  isHealingInProgress = true;
  const logs: string[] = [];

  try {
    logs.push("Starting database schema healing...");

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
      }
    ];

    for (const t of tablesToEnsure) {
      const exists = await tableExists(pool, t.name);
      if (!exists) {
        await pool.query(t.sql);
        logs.push(`Created table: ${t.name}`);
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

    isHealingFinished = true;
    logs.push("Database schema healing completed successfully.");
    console.log("[DB HEALER]", logs.join(" | "));
    return { success: true, logs };
  } catch (err: any) {
    logs.push(`Database healing failed: ${err.message}`);
    console.error("[DB HEALER ERROR]", err);
    return { success: false, logs };
  } finally {
    isHealingInProgress = false;
  }
}
