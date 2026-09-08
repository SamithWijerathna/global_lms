const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "samith",
  });

  await conn.query("CREATE DATABASE IF NOT EXISTS `cloudwave_lms_central` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await conn.query("USE `cloudwave_lms_central`");

  await conn.query("DROP TABLE IF EXISTS `SaaSInvoice`");
  await conn.query("DROP TABLE IF EXISTS `SaaSUserRouting`");
  await conn.query("DROP TABLE IF EXISTS `TenantRouting`");
  await conn.query("DROP TABLE IF EXISTS `TenantDomain`");
  await conn.query("DROP TABLE IF EXISTS `SaaSTenant`");
  await conn.query("DROP TABLE IF EXISTS `SaaSAdmin`");

  await conn.query(`
    CREATE TABLE \`SaaSAdmin\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`email\` VARCHAR(191) NOT NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(100) NOT NULL,
      \`role\` VARCHAR(50) DEFAULT 'Super Admin',
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE \`SaaSTenant\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`name\` VARCHAR(191) NOT NULL,
      \`slug\` VARCHAR(64) NOT NULL UNIQUE,
      \`email\` VARCHAR(191) NOT NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`phone\` VARCHAR(30) DEFAULT NULL,
      \`plan\` VARCHAR(50) DEFAULT 'Starter',
      \`monthlyPrice\` VARCHAR(50) DEFAULT 'LKR 5,000',
      \`status\` ENUM('active', 'suspended', 'trial', 'cancelled') DEFAULT 'active',
      \`dbName\` VARCHAR(100) NOT NULL UNIQUE,
      \`maxStorageMb\` INT DEFAULT 5000,
      \`licenseKey\` VARCHAR(100) UNIQUE,
      \`startDate\` DATE,
      \`expiryDate\` DATE,
      \`offlineGraceDays\` INT DEFAULT 30,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE \`TenantDomain\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`tenantId\` VARCHAR(64) NOT NULL,
      \`domain\` VARCHAR(191) NOT NULL UNIQUE,
      \`type\` ENUM('subdomain', 'custom_domain') NOT NULL DEFAULT 'subdomain',
      \`cnameTarget\` VARCHAR(191) NOT NULL DEFAULT 'cname.globallms.com',
      \`verificationToken\` VARCHAR(64) NOT NULL,
      \`isVerified\` TINYINT(1) DEFAULT 0,
      \`isPrimary\` TINYINT(1) DEFAULT 0,
      \`sslStatus\` ENUM('pending', 'active', 'failed') DEFAULT 'pending',
      \`lastCheckedAt\` DATETIME DEFAULT NULL,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`tenantId\`) REFERENCES \`SaaSTenant\`(\`id\`) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE \`TenantRouting\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`domain\` VARCHAR(191) NOT NULL UNIQUE,
      \`tenantId\` VARCHAR(64) NOT NULL,
      \`tenantSlug\` VARCHAR(64) NOT NULL,
      \`tenantDbName\` VARCHAR(100) NOT NULL,
      \`status\` VARCHAR(30) DEFAULT 'active',
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE \`SaaSUserRouting\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`email\` VARCHAR(191) NOT NULL UNIQUE,
      \`tenantId\` VARCHAR(64) NOT NULL,
      \`tenantDbName\` VARCHAR(100) NOT NULL,
      \`userRole\` VARCHAR(50) DEFAULT 'user',
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE \`SaaSInvoice\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`tenantId\` VARCHAR(64) NOT NULL,
      \`invoiceNumber\` VARCHAR(50) NOT NULL UNIQUE,
      \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      \`currency\` VARCHAR(10) NOT NULL DEFAULT 'LKR',
      \`status\` ENUM('paid', 'unpaid', 'overdue', 'cancelled') DEFAULT 'unpaid',
      \`dueDate\` DATE NOT NULL,
      \`paidAt\` DATETIME DEFAULT NULL,
      \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`tenantId\`) REFERENCES \`SaaSTenant\`(\`id\`) ON DELETE CASCADE
    )
  `);

  const hash = bcrypt.hashSync("Samith@071", 10);
  await conn.execute(
    "INSERT INTO `SaaSAdmin` (`id`, `email`, `password`, `name`, `role`) VALUES (?, ?, ?, ?, ?)",
    ["admin-001", "0wsamithaw0@gmail.com", hash, "System Super Admin", "Super Admin"]
  );

  console.log("✅ Central Database Tables created and Super Admin account initialized!");
  await conn.end();
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
