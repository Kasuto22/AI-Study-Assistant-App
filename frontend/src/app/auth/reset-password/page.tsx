"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// We wrap the main content in a component so we can safely use Suspense for the URL params
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Real-time password validation (Same as Registration)
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
    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }
    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mb-6 text-green-500">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          Your password has been securely updated.
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Log In Now
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-center text-gray-600 dark:text-slate-400 mb-6 text-sm">
        Please enter your new password below.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            New Password
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
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Password Requirements Checklist */}
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

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? "Saving..." : "Update Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Create New Password
        </h2>
        {/* Suspense boundary is required by Next.js when using useSearchParams */}
        <Suspense
          fallback={
            <div className="text-center py-4 text-gray-500">
              Loading form...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
