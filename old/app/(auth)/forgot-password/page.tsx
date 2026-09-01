"use client";

import React, { useState } from "react";
import { Button, Input, Link, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisibleNew, setIsVisibleNew] = useState(false);
  const [isVisibleConfirm, setIsVisibleConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const toggleNew = () => setIsVisibleNew(!isVisibleNew);
  const toggleConfirm = () => setIsVisibleConfirm(!isVisibleConfirm);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgotPassword",
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send reset code");
        return;
      }

      setSuccessMessage("Reset code sent to your email");
      setStep("otp");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verifyOtp",
          email,
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      setSuccessMessage("OTP verified successfully");
      setStep("reset");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPassword",
          email,
          token: otp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccessMessage("Password reset successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-animate">
      {/* Bloom gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-purple-500/30 blur-3xl animate-bloom" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-fuchsia-500/20 blur-3xl animate-bloom-delayed" />
      </div>

      <div className="rounded-large bg-content1 shadow-small flex w-full max-w-md flex-col gap-4 px-8 pt-8 pb-10 relative z-10 items-center">
        <img
          src="/assets/logo.png"
          alt="Lashinigeo Logo"
          className="w-44 h-auto max-h-28 sm:w-52 sm:max-h-32 object-contain mb-1 filter dark:brightness-0 dark:invert transition-all drop-shadow-md"
        />
        <div className="flex flex-col gap-1 text-center w-full">
          <h1 className="text-xl font-semibold">Reset Password</h1>
          <p className="text-small text-default-500">to continue to Lashinigeo</p>
        </div>

        <p className="text-small text-default-500 text-center">
          {step === "email" && "Enter your email address to receive a reset code"}
          {step === "otp" && "Enter the 6-digit code sent to your email"}
          {step === "reset" && "Create a new password for your account"}
        </p>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {/* Email Step */}
        {step === "email" && (
          <Form className="flex flex-col gap-3 w-full" onSubmit={handleSendOtp} validationBehavior="native">
            <Input
              isRequired
              fullWidth
              className="w-full"
              label="Email Address"
              placeholder="Enter your email"
              type="email"
              variant="bordered"
              value={email}
              onValueChange={setEmail}
            />
            <Button className="w-full" color="primary" type="submit" isLoading={isLoading}>
              Send Reset Code
            </Button>
          </Form>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <>
            <Form className="flex flex-col gap-3 w-full" onSubmit={handleVerifyOtp} validationBehavior="native">
              <Input
                isRequired
                fullWidth
                className="w-full"
                label="Verification Code"
                placeholder="000000"
                type="tel"
                inputMode="numeric"
                variant="bordered"
                value={otp}
                onValueChange={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))}
                description="Check your email for the 6-digit code"
              />
              <Button className="w-full" color="primary" type="submit" isLoading={isLoading}>
                Verify Code
              </Button>
            </Form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setSuccessMessage("");
                  setError("");
                }}
                className="text-small text-primary hover:underline"
              >
                Back to email
              </button>
            </div>
          </>
        )}

        {/* Reset Step */}
        {step === "reset" && (
          <Form className="flex flex-col gap-3 w-full" onSubmit={handleResetPassword} validationBehavior="native">
            <Input
              isRequired
              fullWidth
              className="w-full"
              label="New Password"
              placeholder="Enter new password"
              type={isVisibleNew ? "text" : "password"}
              variant="bordered"
              value={newPassword}
              onValueChange={setNewPassword}
              endContent={
                <button className="focus:outline-none" type="button" onClick={toggleNew} aria-label="toggle password visibility">
                  <Icon
                    className="text-2xl text-default-400 pointer-events-none"
                    icon={isVisibleNew ? "solar:eye-closed-linear" : "solar:eye-bold"}
                  />
                </button>
              }
            />

            <Input
              isRequired
              fullWidth
              className="w-full"
              label="Confirm Password"
              placeholder="Confirm new password"
              type={isVisibleConfirm ? "text" : "password"}
              variant="bordered"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              endContent={
                <button className="focus:outline-none" type="button" onClick={toggleConfirm} aria-label="toggle password visibility">
                  <Icon
                    className="text-2xl text-default-400 pointer-events-none"
                    icon={isVisibleConfirm ? "solar:eye-closed-linear" : "solar:eye-bold"}
                  />
                </button>
              }
            />

            <Button className="w-full" color="primary" type="submit" isLoading={isLoading}>
              Reset Password
            </Button>
          </Form>
        )}

        <p className="text-small text-center text-default-500">
          Remember your password?{" "}
          <Link href="/login" size="sm">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}