"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Link } from "@heroui/link";

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    form.append("action", "login");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-200 to-white dark:from-gray-800 dark:via-indigo-900 dark:to-black">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <CardHeader className="flex flex-col items-center pb-6">
          <h1 className="text-4xl font-bold">Admin Portal</h1>
          <p className="text-default-600 mt-2">
            Secure access to LMS Dashboard
          </p>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              name="email"
              type="email"
              label="Admin Email"
              isRequired
            />

            <Input
              name="password"
              type="password"
              label="Password"
              isRequired
            />

            <div className="flex items-center justify-between">
              <Checkbox>Remember this device</Checkbox>
              <Link href="/forgot-password" className="text-sm">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Login as Admin
            </Button>
          </form>
        </CardBody>

        <CardFooter className="text-center text-sm text-default-500">
          Need help? Contact support
        </CardFooter>
      </Card>
    </div>
  );
}
