import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists (to prevent enumeration, we silently return success, but we only create a token if the user exists)
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (user) {
      // 1. Generate secure random token
      const token = crypto.randomBytes(32).toString("hex");
      
      // 2. Expiration: 1 hour
      const expires = new Date(Date.now() + 3600000);

      // 3. Delete any existing password reset tokens for this email to keep db clean
      await prisma.passwordResetToken.deleteMany({
        where: { email: trimmedEmail },
      });

      // 4. Store the reset token in the database
      await prisma.passwordResetToken.create({
        data: {
          email: trimmedEmail,
          token,
          expires,
        },
      });

      // 5. Construct reset link URL
      // Use dynamic host extraction to ensure the link matches the active domain
      const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetLink = `${origin}/reset-password?token=${token}`;

      // 6. Create SMTP transporter using Resend credentials
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.resend.com",
        port: parseInt(process.env.SMTP_PORT || "465", 10),
        secure: parseInt(process.env.SMTP_PORT || "465", 10) === 465, // true for port 465 (SSL)
        auth: {
          user: process.env.SMTP_USER || "resend",
          pass: process.env.SMTP_PASSWORD || "",
        },
      });

      const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  background-color: #F9FAFB;
                  color: #1F2937;
                  margin: 0;
                  padding: 0;
                  -webkit-font-smoothing: antialiased;
                }
                .container {
                  max-width: 500px;
                  margin: 40px auto;
                  padding: 32px;
                  background-color: #FFFFFF;
                  border-radius: 16px;
                  border: 1px solid #E5E7EB;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
                }
                .header {
                  text-align: center;
                  margin-bottom: 24px;
                }
                .logo-wrapper {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  background-color: #EA580C;
                  width: 48px;
                  height: 48px;
                  border-radius: 12px;
                  margin-bottom: 16px;
                }
                .logo-text {
                  font-size: 20px;
                  font-weight: 800;
                  color: #111827;
                  letter-spacing: -0.025em;
                  margin: 0;
                }
                .title {
                  font-size: 22px;
                  font-weight: 700;
                  color: #111827;
                  margin: 0 0 12px 0;
                  text-align: center;
                }
                .description {
                  font-size: 15px;
                  line-height: 1.6;
                  color: #4B5563;
                  margin: 0 0 24px 0;
                  text-align: center;
                }
                .btn-wrapper {
                  text-align: center;
                  margin-bottom: 24px;
                }
                .btn {
                  display: inline-block;
                  background-color: #EA580C;
                  color: #FFFFFF !important;
                  text-decoration: none;
                  padding: 12px 28px;
                  font-size: 15px;
                  font-weight: 700;
                  border-radius: 12px;
                  transition: background-color 0.2s;
                  box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2);
                }
                .btn:hover {
                  background-color: #D97706;
                }
                .divider {
                  height: 1px;
                  background-color: #E5E7EB;
                  margin: 24px 0;
                }
                .footer {
                  font-size: 12px;
                  line-height: 1.5;
                  color: #9CA3AF;
                  text-align: center;
                }
                .footer a {
                  color: #EA580C;
                  text-decoration: none;
                }
                .break-word {
                  word-break: break-all;
                  font-size: 12px;
                  color: #9CA3AF;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo-wrapper">
                    <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="36" height="36" rx="9" fill="transparent"/>
                      <rect x="9" y="10.5" width="7" height="1.75" rx="0.875" fill="white"/>
                      <path d="M19 11.5L21 13.5L25.5 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="9" y="17" width="7" height="1.75" rx="0.875" fill="white"/>
                      <path d="M19 18L21 20L25.5 15.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="9" y="23.5" width="7" height="1.75" rx="0.875" fill="white"/>
                      <path d="M19 24.5L21 26.5L25.5 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h1 class="logo-text">Life-OS</h1>
                </div>
                
                <h2 class="title">Reset Your Password</h2>
                <p class="description">
                  We received a request to reset your password. Click the button below to choose a new one. This reset link is valid for <strong>1 hour</strong>.
                </p>
                
                <div class="btn-wrapper">
                  <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
                </div>
                
                <p class="description" style="font-size: 13px;">
                  If the button does not work, copy and paste this URL into your browser:
                </p>
                <div class="break-word" style="text-align: center; margin-bottom: 24px;">
                  <a href="${resetLink}" target="_blank" style="color: #EA580C;">${resetLink}</a>
                </div>
                
                <div class="divider"></div>
                
                <div class="footer">
                  If you did not request a password reset, you can safely ignore this email. No changes have been made to your account.<br><br>
                  &copy; ${new Date().getFullYear()} Life-OS. All rights reserved.
                </div>
              </div>
            </body>
          </html>
        `;

      // 7. Send the email via Resend SMTP
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Life-OS Support'}" <${process.env.SMTP_FROM_EMAIL || 'support@lifeos.app'}>`,
        to: trimmedEmail,
        subject: "Reset Your Life-OS Password",
        text: `Hello,\n\nYou requested to reset your password for Life-OS. Please reset it by clicking the link below (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nThe Life-OS Team`,
        html: emailHtml,
      });
    }

    // Always return a generic success message to prevent user enumeration attacks
    return NextResponse.json(
      { message: "If an account exists with that email, a password reset link has been sent." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
