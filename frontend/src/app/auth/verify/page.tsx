"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailLogic() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // If the token exists, trigger the API call inside the effect
    if (token) {
      const verifyEmail = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            },
          );

          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Verification failed");

          setStatus("success");
        } catch (err: unknown) {
          setStatus("error");
          if (err instanceof Error) setErrorMessage(err.message);
        }
      };

      verifyEmail();
    }
  }, [token]);

  // If there is no token in the URL at all, catch it immediately before rendering loading state
  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-4 text-red-500">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 mb-6 font-medium">
          No verification token provided.
        </p>
        <Link
          href="/auth"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="text-center animate-pulse">
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Verifying your email...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <div className="mb-4 text-red-500">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 mb-6 font-medium">
          {errorMessage}
        </p>
        <Link
          href="/auth"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-4 text-green-500">
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
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
        Email Verified!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Your account is now active and ready to use.
      </p>
      <Link
        href="/auth"
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
      >
        Log In Now
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
        <Suspense
          fallback={
            <div className="text-center py-4 text-gray-500">Loading...</div>
          }
        >
          <VerifyEmailLogic />
        </Suspense>
      </div>
    </main>
  );
}
