"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Added a loading state so the button feels responsive

  const router = useRouter();

  // Standard Login and Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      // This ALWAYS runs — success, error, or thrown exception —
      // so the button can never get stuck disabled again.
      setIsLoading(false);
    }
  };

  // Guest login (mainly for recruiters)
  const handleGuestLogin = async () => {
    setError("");
    setIsLoading(true);

    // Generate a random dummy email and password
    const randomId = Math.floor(Math.random() * 100000);
    const guestEmail = `guest_${randomId}@demo.com`;
    const guestPassword = "guestpassword123";

    try {
      // Register the fake user invisibly
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: guestEmail, password: guestPassword }),
      });

      // Log them in immediately to get the token
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

      // Save token and let them in
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
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

        {/* The Magic Recruiter Button */}
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
    </main>
  );
}
