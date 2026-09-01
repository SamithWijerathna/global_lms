"use client";

import React from "react";
import {Button, Input, Checkbox, Link, Form, Divider} from "@heroui/react";
import {Icon} from "@iconify/react";
import {useRouter} from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "login",
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Store tokens in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
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
          className="w-44 h-auto max-h-28 sm:w-52 sm:max-h-32 object-contain mb-2 filter dark:brightness-0 dark:invert transition-all drop-shadow-md"
        />
        <div className="flex flex-col gap-1 text-center w-full">
          <h1 className="text-xl font-semibold">Sign in to your account</h1>
          <p className="text-small text-default-500">to continue to Lashinigeo</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Form className="flex flex-col gap-3 w-full" validationBehavior="native" onSubmit={handleSubmit}>
          <Input
            isRequired
            fullWidth
            className="w-full"
            label="Email Address"
            name="email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
            value={email}
            onValueChange={setEmail}
          />
          <Input
            isRequired
            fullWidth
            className="w-full"
            endContent={
              <button type="button" onClick={toggleVisibility}>
                {isVisible ? (
                  <Icon
                    className="text-default-400 pointer-events-none text-2xl"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="text-default-400 pointer-events-none text-2xl"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
            label="Password"
            name="password"
            placeholder="Enter your password"
            type={isVisible ? "text" : "password"}
            variant="bordered"
            value={password}
            onValueChange={setPassword}
          />
          <div className="flex w-full items-center justify-between px-1 py-2">
            <Checkbox name="remember" size="sm">
              Remember me
            </Checkbox>
            <Link className="text-default-500" href="/forgot-password" size="sm">
              Forgot password?
            </Link>
          </div>
          <Button className="w-full" color="primary" type="submit" isLoading={isLoading}>
            Sign In
          </Button>
        </Form>
        {/* <div className="flex items-center gap-4 py-2">
          <Divider className="flex-1" />
          <p className="text-tiny text-default-500 shrink-0">OR</p>
          <Divider className="flex-1" />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            startContent={<Icon icon="flat-color-icons:google" width={24} />}
            variant="bordered"
          >
            Continue with Google
          </Button>
          <Button
            startContent={<Icon className="text-default-500" icon="fe:github" width={24} />}
            variant="bordered"
          >
            Continue with Github
          </Button>
        </div> */}
        <p className="text-small text-center">
          Need to create an account?&nbsp;
          <Link href="/signup" size="sm">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
