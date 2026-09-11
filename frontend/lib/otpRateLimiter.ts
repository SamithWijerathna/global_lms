/**
 * OTP Rate Limiter & Progressive Penalty Cooldown
 *
 * Tracks OTP requests per email in MySQL `otp_rate_limits` table:
 *  - 1st send: 60s cooldown (1 min base)
 *  - 2nd send: 120s cooldown (2 min)
 *  - 3rd send: 300s cooldown (5 min penalty)
 *  - 4th send: 600s cooldown (10 min penalty)
 *  - 5th+ send: 900s cooldown (15 min maximum penalty)
 *  - Inactivity window: 1 hour without requests resets back to 60s base cooldown.
 */

export function getPenaltyCooldown(sendCount: number): number {
  if (sendCount <= 1) return 60; // 1 min
  if (sendCount === 2) return 120; // 2 min
  if (sendCount === 3) return 300; // 5 min penalty
  if (sendCount === 4) return 600; // 10 min penalty
  return 900; // 15 min penalty
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
  cooldown?: number;
  sendCount?: number;
  error?: string;
};

export async function checkAndRecordOtpRateLimit(
  db: any,
  rawEmail: string,
  flowType: "signup" | "forgot_password" | "admin_forgot_password" | "general" = "general"
): Promise<RateLimitResult> {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email) {
    return { allowed: false, error: "Email is required for rate limit verification." };
  }

  // Ensure table exists defensively
  await db.query(`
    CREATE TABLE IF NOT EXISTS otp_rate_limits (
      id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      flow_type VARCHAR(50) NOT NULL DEFAULT 'general',
      send_count INT NOT NULL DEFAULT 1,
      cooldown_seconds INT NOT NULL DEFAULT 60,
      last_sent_at DATETIME NOT NULL,
      blocked_until DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_email_flow (email, flow_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows]: any = await db.query(
    "SELECT send_count, cooldown_seconds, last_sent_at, blocked_until FROM otp_rate_limits WHERE email = ? AND flow_type = ? LIMIT 1",
    [email, flowType]
  );

  const now = Date.now();

  if (Array.isArray(rows) && rows.length > 0) {
    const record = rows[0];
    const lastSentTime = new Date(record.last_sent_at).getTime();
    const blockedUntilTime = record.blocked_until ? new Date(record.blocked_until).getTime() : 0;
    const cooldownSeconds = record.cooldown_seconds || 60;
    const cooldownEnd = Math.max(lastSentTime + cooldownSeconds * 1000, blockedUntilTime);

    // Active cooldown penalty check
    if (cooldownEnd > now) {
      const remainingSeconds = Math.max(1, Math.ceil((cooldownEnd - now) / 1000));
      const formattedTime =
        remainingSeconds >= 60
          ? `${Math.ceil(remainingSeconds / 60)} minute(s)`
          : `${remainingSeconds} second(s)`;

      return {
        allowed: false,
        retryAfter: remainingSeconds,
        cooldown: cooldownSeconds,
        sendCount: record.send_count,
        error: `Too many OTP requests. Please wait ${formattedTime} before requesting a new verification code.`,
      };
    }

    // Cooldown elapsed. Check if user was inactive for over 1 hour -> reset
    const ONE_HOUR = 60 * 60 * 1000;
    let newSendCount = 1;
    let nextCooldown = 60;

    if (now - lastSentTime <= ONE_HOUR) {
      newSendCount = (record.send_count || 1) + 1;
      nextCooldown = getPenaltyCooldown(newSendCount);
    }

    await db.query(
      `UPDATE otp_rate_limits 
       SET send_count = ?, cooldown_seconds = ?, last_sent_at = NOW(), blocked_until = DATE_ADD(NOW(), INTERVAL ? SECOND)
       WHERE email = ? AND flow_type = ?`,
      [newSendCount, nextCooldown, nextCooldown, email, flowType]
    );

    return {
      allowed: true,
      cooldown: nextCooldown,
      sendCount: newSendCount,
    };
  }

  // First time request
  const initialCooldown = 60; // 60s
  await db.query(
    `INSERT INTO otp_rate_limits (email, flow_type, send_count, cooldown_seconds, last_sent_at, blocked_until)
     VALUES (?, ?, 1, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))
     ON DUPLICATE KEY UPDATE send_count = 1, cooldown_seconds = ?, last_sent_at = NOW(), blocked_until = DATE_ADD(NOW(), INTERVAL ? SECOND)`,
    [email, flowType, initialCooldown, initialCooldown, initialCooldown, initialCooldown]
  );

  return {
    allowed: true,
    cooldown: initialCooldown,
    sendCount: 1,
  };
}

export async function resetOtpRateLimit(
  db: any,
  rawEmail: string,
  flowType: "signup" | "forgot_password" | "admin_forgot_password" | "general" = "general"
): Promise<void> {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email) return;
  try {
    await db.query(
      "DELETE FROM otp_rate_limits WHERE email = ? AND flow_type = ?",
      [email, flowType]
    );
  } catch (err) {
    console.error("Failed to reset OTP rate limit:", err);
  }
}
