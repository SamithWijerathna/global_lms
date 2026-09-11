"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Link } from "@heroui/link";
import { Icon } from "@iconify/react";
import { useSystemSettings } from "@/src/lib/useSystemSettings";

export default function AdminLoginPage() {
  const { settings } = useSystemSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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
          <img
            src={settings.site_logo_url || "/assets/logo.png"}
            alt={settings.site_title || "Logo"}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/assets/logo.png";
            }}
            className="w-28 h-auto max-h-24 object-contain mb-3 filter dark:brightness-0 dark:invert drop-shadow-md"
          />
          <h1 className="text-3xl font-bold text-center">{settings.site_short_name || "Admin"} Portal</h1>
          <p className="text-default-600 mt-1 text-sm text-center">
            Secure access to {settings.site_title || "LMS"} Admin
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
              type={isVisible ? "text" : "password"}
              label="Password"
              placeholder="Enter your password"
              variant="bordered"
              isRequired
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={() => setIsVisible(!isVisible)}
                  aria-label="toggle password visibility"
                >
                  <Icon
                    className="text-2xl text-default-400 pointer-events-none"
                    icon={isVisible ? "solar:eye-closed-linear" : "solar:eye-bold"}
                  />
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <Checkbox>Remember this device</Checkbox>
              <Link href="/admin/forgot-password" className="text-sm">
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
