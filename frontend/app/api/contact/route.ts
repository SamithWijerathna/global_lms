import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { name, email, message } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });


    const adminMail = {
      from: `"Volit Website" <${process.env.SMTP_USER}>`,
      to: "support@volit.lk",
      subject: `New Contact Form Submission - ${name}`,
      html: `
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message}</p>
        <hr/>
        <p>This message was sent from the Volit contact form.</p>
      `,
    };

    const userMail = {
      from: `"Volit Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "We’ve received your message - Volit",
      html: `
        <h3>Hi ${name},</h3>
        <p>Thank you for contacting <strong>Volit</strong>.</p>
        <p>We’ve received your message and our support team will get back to you shortly.</p>
        <blockquote style="border-left:4px solid #ddd;padding-left:8px;margin:10px 0;">
          ${message}
        </blockquote>
        <p>Best regards,<br/>The Volit Support Team<br/><a href="https://volit.lk">volit.lk</a></p>
      `,
    };

    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully!" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to send emails." }),
      { status: 500 }
    );
  }
}
