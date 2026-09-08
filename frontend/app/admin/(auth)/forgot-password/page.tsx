"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { RadioGroup, Radio } from "@heroui/radio";
import { Link } from "@heroui/link";
import {InputOtp} from "@heroui/input-otp";

export default function ForgotPasswordFlow() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState("email"); // "email" or "sms"
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Auto-redirect on success
  useEffect(() => {
    if (step === 4 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 4 && countdown === 0) {
      window.location.href = "/admin/login"; // Redirect to admin login
    }
  }, [step, countdown]);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      alert(`OTP sent to ${method === "email" ? email : "your phone"}! (Demo: 123456)`);
    }, 1500);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === "123456") { // Demo OTP
      setStep(3);
    } else {
      alert("Invalid OTP");
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(4);
      setCountdown(5); // 5 seconds redirect
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:via-indigo-900 dark:to-black transition-all duration-500">
      <div className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm" />
      
      <Card className="relative w-full max-w-md p-8 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200/50 dark:border-white/10">
        <CardHeader className="flex flex-col items-center pb-8">
          <h1 className="text-4xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-default-600 mt-3 text-center">Reset your admin password securely</p>
        </CardHeader>
        
        <CardBody className="space-y-6">
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="w-full">
              <Input
                type="email"
                label="Admin Email"
                value={email}
                onValueChange={setEmail}
                placeholder="admin@example.com"
                isRequired
                fullWidth
                className="w-full"
                variant="bordered"
              />
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">Send OTP via:</p>
                <RadioGroup value={method} onValueChange={setMethod}>
                  <Radio value="email">Email</Radio>
                  <Radio value="sms">SMS (Phone)</Radio>
                </RadioGroup>
              </div>
              <Button type="submit" color="primary" size="lg" className="w-full mt-6" isLoading={isLoading}>
                Send OTP
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col justify-center items-center w-full">
              <p className="text-center text-default-600 mb-6">
                OTP sent to {method === "email" ? email : "your phone"}
              </p>
              <div className="flex justify-center w-full">
                <InputOtp className="w-full" type="text" label="Enter 6-digit OTP" value={otp}
                onValueChange={setOtp}  placeholder="123456" isRequired length={6} variant="bordered" />
              </div>
               
           
              <Button type="submit" color="primary" size="lg" className="w-full mt-6">
                Verify OTP
              </Button>
              <Button variant="light" className="w-full mt-3" onClick={() => setStep(1)}>
                Back
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="w-full">
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onValueChange={setNewPassword}
                placeholder="••••••••"
                isRequired
                fullWidth
                className="w-full"
                variant="bordered"
              />
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                placeholder="••••••••"
                isRequired
                fullWidth
                className="w-full mt-4"
                variant="bordered"
              />
              <Button type="submit" color="primary" size="lg" className="w-full mt-6" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          )}

          {step === 4 && (
  <div className="text-center py-12 space-y-8">
    {/* Animated Success Checkmark */}
    <div className="relative inline-block">
      <svg width="100" height="100" viewBox="0 0 200 200" className="animate-fadeIn">
        {/* Circle Stroke (Draw Animation) */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          className="dark:stroke-gray-700"
        />
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeDasharray="565"
          strokeDashoffset="565"
          strokeLinecap="round"
          className="animate-drawCircle"
        />
        
        {/* Checkmark (Draw Animation) */}
        <polyline
          points="50,100 85,135 150,65"
          fill="none"
          stroke="#10b981"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="200"
          strokeDashoffset="200"
          className="animate-drawCheck"
        />
      </svg>
    </div>

    <div className="space-y-4">
      <h3 className="text-3xl font-bold">Password Changed Successfully!</h3>
      <p className="text-default-600 max-w-sm mx-auto">
        Your admin password has been securely updated.<br />
        Redirecting to login in <span className="font-bold text-primary">{countdown}</span> seconds...
      </p>
      <Button as={Link} href="/login" color="primary" size="lg" className="mt-6">
        Go to Login Now
      </Button>
    </div>
  </div>
)}
        </CardBody>
        
        {step < 4 && (
          <CardFooter className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              ← Back to Login
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}