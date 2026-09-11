"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { InputOtp } from "@heroui/input-otp";
import { Link } from "@heroui/link";
import { useRouter } from "next/navigation";
import { useSystemSettings } from "@/src/lib/useSystemSettings";
import { ArrowLeft, CheckCircle2, ShieldCheck, KeyRound, Mail } from "lucide-react";

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const { settings } = useSystemSettings();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatCooldown = (seconds: number) => {
    if (seconds <= 0) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}m ${s < 10 ? "0" : ""}${s}s`;
    }
    return `${s}s`;
  };

  // Auto-redirect on success
  useEffect(() => {
    if (step === 4) {
      setCountdown(4);
    }
  }, [step]);

  useEffect(() => {
    if (step === 4 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 4 && countdown === 0) {
      router.push("/admin/login");
    }
  }, [step, countdown, router]);

  const handleSendOTP = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();

    if (resendCooldown > 0) {
      setError(`Please wait ${formatCooldown(resendCooldown)} before requesting another code.`);
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgotPassword",
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setResendCooldown(Number(data.retryAfter));
        }
        setError(data.error || "Failed to send reset code.");
        return;
      }

      setSuccessMessage("Verification code sent to your admin email.");
      setResendCooldown(data.cooldown || 60);
      setStep(2);
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!otp || otp.length < 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verifyOtp",
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid or expired verification code.");
        return;
      }

      setSuccessMessage("Code verified successfully.");
      setStep(3);
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPassword",
          email: email.trim(),
          token: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setStep(4);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      <div className="absolute inset-0 bg-black/5 dark:bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      <Card className="relative w-full max-w-md p-6 sm:p-8 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-2xl">
        <CardHeader className="flex flex-col items-center pb-6 text-center">
          <img
            src={settings.site_logo_url || "/assets/logo.png"}
            alt={settings.site_title || "Logo"}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/assets/logo.png";
            }}
            className="w-16 h-16 object-contain mb-3 drop-shadow-sm"
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Portal Security
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {step === 1 && "Reset Admin Password"}
            {step === 2 && "Enter Verification Code"}
            {step === 3 && "Set New Password"}
            {step === 4 && "Password Reset Complete"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            {step === 1 && "Enter your administrator email address to receive a secure reset code."}
            {step === 2 && `We've sent a 6-digit code to ${email}.`}
            {step === 3 && "Create a strong new password for your admin account."}
            {step === 4 && "Your administrator password has been updated securely."}
          </p>
        </CardHeader>

        <CardBody className="space-y-4 pt-0">
          {error && (
            <div className="p-3 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-center animate-in fade-in">
              {error}
            </div>
          )}

          {successMessage && step !== 4 && (
            <div className="p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-center animate-in fade-in">
              {successMessage}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <Input
                type="email"
                label="Administrator Email"
                placeholder="admin@yourdomain.com"
                value={email}
                onValueChange={setEmail}
                isRequired
                variant="bordered"
                startContent={<Mail className="w-4 h-4 text-gray-400" />}
                className="w-full"
              />

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full font-semibold"
                isLoading={isLoading}
              >
                Send Reset Code
              </Button>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="flex flex-col items-center justify-center py-2">
                <InputOtp
                  length={6}
                  value={otp}
                  onValueChange={setOtp}
                  isRequired
                  variant="bordered"
                  className="font-mono text-lg"
                />
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full font-semibold"
                isLoading={isLoading}
              >
                Verify Code
              </Button>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading || resendCooldown > 0}
                  className={`font-semibold ${
                    resendCooldown > 0
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "text-primary hover:underline"
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatCooldown(resendCooldown)}`
                    : "Resend Code"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="password"
                label="New Admin Password"
                placeholder="••••••••"
                value={newPassword}
                onValueChange={setNewPassword}
                isRequired
                variant="bordered"
                startContent={<KeyRound className="w-4 h-4 text-gray-400" />}
              />

              <Input
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                isRequired
                variant="bordered"
                startContent={<KeyRound className="w-4 h-4 text-gray-400" />}
              />

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full font-semibold"
                isLoading={isLoading}
              >
                Update Password
              </Button>
            </form>
          )}

          {/* STEP 4: Success & Redirect */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Password Updated!
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Redirecting to admin login in {countdown} seconds...
                </p>
              </div>

              <Button
                color="primary"
                onClick={() => router.push("/admin/login")}
                className="w-full font-semibold"
              >
                Go to Admin Login Now
              </Button>
            </div>
          )}

          {/* Back to Login Link */}
          {step !== 4 && (
            <div className="pt-2 text-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Admin Login
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}