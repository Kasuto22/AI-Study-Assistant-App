"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setIsSubmitted(true);
      toast.success("Reset link sent!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Reset Password
        </h2>

        {isSubmitted ? (
          <div className="text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-6 mt-4">
              If an account exists for <strong>{email}</strong>, we have sent a
              password reset link.
            </p>
            <Link
              href="/auth"
              className="w-full inline-block bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 dark:text-slate-400 mb-6 text-sm">
              Enter the email associated with your account and we will send you
              a link to reset your password.
            </p>

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

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                ← Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
