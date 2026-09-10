import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const getResendFrom = (name?: string) => {
  const envFrom = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (envFrom) {
    const emailMatch = envFrom.match(/<([^>]+)>/) || envFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const emailOnly = emailMatch ? emailMatch[1] : envFrom.trim();
    const cleanName = (name || envFrom.replace(/<[^>]+>/, "").replace(/["']/g, "").trim() || "LMS Platform").replace(/["']/g, "");
    return `"${cleanName}" <${emailOnly}>`;
  }
  return `"${name || "LMS Platform"}" <noreply@test.cloudwave.asia>`;
};

export const getEmailBrandHeader = (siteTitle: string, logoPath?: string) => {
  const envFrom = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "";
  const domainMatch = envFrom.match(/@([^>]+)/);
  const sendingDomain = domainMatch ? domainMatch[1].trim().toLowerCase() : "";

  let isAligned = false;
  if (logoPath && logoPath.startsWith("http") && sendingDomain) {
    try {
      const parsed = new URL(logoPath);
      const host = parsed.hostname.toLowerCase();
      if (host === sendingDomain || host.endsWith(`.${sendingDomain}`)) {
        isAligned = true;
      }
    } catch {
      isAligned = false;
    }
  }

  if (isAligned && logoPath) {
    return `<div style="margin-bottom: 12px; text-align: center;">
      <img src="${logoPath}" alt="${siteTitle}" style="max-height: 48px; width: auto; display: inline-block;" />
    </div>`;
  }

  return `<div style="margin-bottom: 8px; text-align: center;">
    <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 20px; border-radius: 8px; font-size: 18px; font-weight: 700; letter-spacing: -0.2px;">
      ${siteTitle}
    </div>
  </div>`;
};

export interface TransactionalEmailOptions {
  siteTitle: string;
  siteShortName?: string;
  logoPath?: string;
  heading: string;
  description: string;
  code: string;
  expiresInText: string;
  securityNote?: string;
  copyrightText?: string;
}

export const buildTransactionalEmailHtml = ({
  siteTitle,
  siteShortName,
  logoPath,
  heading,
  description,
  code,
  expiresInText,
  securityNote,
  copyrightText,
}: TransactionalEmailOptions) => {
  const brandName = siteShortName || siteTitle || "Volit LMS";
  const brandHeader = getEmailBrandHeader(brandName, logoPath);
  const copyright = copyrightText || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%);"></td>
          </tr>

          <!-- Content Padding -->
          <tr>
            <td style="padding: 36px 32px 32px 32px; text-align: center;">
              
              <!-- Brand Header -->
              <div style="margin-bottom: 24px;">
                ${brandHeader}
                <div style="margin-top: 4px; font-size: 13px; font-weight: 600; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
                  Volit LMS System
                </div>
              </div>

              <!-- Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${heading}
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                ${description}
              </p>

              <!-- Code Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 24px; margin: 0 0 20px 0;">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">
                  ${code}
                </div>
                <div style="font-size: 13px; color: #64748b; margin-top: 8px; font-weight: 500;">
                  This code expires in <strong style="color: #0f172a;">${expiresInText}</strong>
                </div>
              </div>

              <!-- Security Note -->
              <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                ${securityNote || "If you did not make this request, please safely ignore this email or contact your administrator."}
              </p>

              <!-- Divider -->
              <div style="margin: 28px 0 20px 0; border-top: 1px solid #f1f5f9;"></div>

              <!-- Footer -->
              <div style="text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                  ${brandName} • Volit LMS System
                </p>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8;">
                  ${copyright}
                </p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                  Developed and Maintained by Cloudwave (Pvt) Ltd
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};