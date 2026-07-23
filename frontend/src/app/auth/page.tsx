"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // <-- Added this import
import { toast } from "sonner";

const contributors = [
  { name: "Sam", contribution: "Suggested being able to edit the cards" },
  {
    name: "Erika",
    contribution: "Suggested being able to add images or draw on cards",
  },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  // Real-time password validation logic
  const reqs = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[\W_]/.test(password),
  };

  const isPasswordValid =
    reqs.length &&
    reqs.uppercase &&
    reqs.lowercase &&
    reqs.number &&
    reqs.special;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Prevent submission if registering with a weak password
    if (!isLogin && !isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (isLogin) {
        localStorage.setItem("token", data.token);
        toast.success("Login successful!");
        router.push("/dashboard");
      } else {
        toast.success("Registration successful! You can now log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setIsLoading(true);

    const randomId = Math.floor(Math.random() * 100000);
    const guestEmail = `guest_${randomId}@demo.com`;
    // Pass the new backend validation explicitly for the guest account
    const guestPassword = "GuestPassword123!";

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: guestEmail, password: guestPassword }),
      });

      const loginRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: guestEmail, password: guestPassword }),
        },
      );

      const data = await loginRes.json();
      if (!loginRes.ok) throw new Error(data.error || "Guest login failed");

      localStorage.setItem("token", data.token);
      toast.success("Guest account created! You are logged in.");
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen relative items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-10">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* The "Forgot Password?" Link */}
            {isLogin && (
              <div className="flex justify-end mt-2">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
          </div>

          {/* Password Requirements Checklist (Only visible on Sign Up) */}
          {!isLogin && (
            <div className="text-xs space-y-1 mt-2">
              <p
                className={
                  reqs.length
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {reqs.length ? "✔" : "○"} At least 8 characters
              </p>
              <p
                className={
                  reqs.uppercase
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {reqs.uppercase ? "✔" : "○"} One uppercase letter
              </p>
              <p
                className={
                  reqs.lowercase
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {reqs.lowercase ? "✔" : "○"} One lowercase letter
              </p>
              <p
                className={
                  reqs.number
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {reqs.number ? "✔" : "○"} One number
              </p>
              <p
                className={
                  reqs.special
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {reqs.special ? "✔" : "○"} One special character
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (!isLogin && !isPasswordValid)}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center">
          <span className="w-1/5 border-b dark:border-slate-600"></span>
          <span className="text-xs text-center text-gray-500 dark:text-slate-400 uppercase px-2">
            Or
          </span>
          <span className="w-1/5 border-b dark:border-slate-600"></span>
        </div>

        <button
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="mt-6 w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50"
        >
          {isLoading ? "Please wait..." : "Continue as Guest"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>

      {/* Expandable Contributors Footer */}
      <div className="absolute bottom-6 w-full flex justify-center z-0">
        <details className="text-sm text-gray-500 dark:text-slate-400 group cursor-pointer text-center">
          <summary className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors list-none">
            ✨ Special Thanks & Contributors
          </summary>
          <ul className="mt-3 space-y-2 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 text-left mx-auto inline-block">
            {contributors.map((c, idx) => (
              <li key={idx}>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {c.name}:
                </span>{" "}
                {c.contribution}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  );
}
