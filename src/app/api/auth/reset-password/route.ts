import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing token." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 1. Verify token exists and is valid
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    // 2. Verify token has not expired
    const hasExpired = new Date() > resetTokenRecord.expires;
    if (hasExpired) {
      // Clean up the expired token
      await prisma.passwordResetToken.delete({
        where: { token },
      }).catch(() => {});

      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Hash the new password with salt factor of 10 (as per security standards)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update the user password and clean up the reset token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetTokenRecord.email },
        data: { hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { token },
      }),
    ]);

    return NextResponse.json(
      { message: "Your password has been reset successfully. You can now log in." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
