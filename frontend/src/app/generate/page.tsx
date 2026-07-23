"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/utils/api"; // <-- Import wrapper

export default function GeneratePage() {
  // State Management
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [level, setLevel] = useState("University");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  // Submit action
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // FastAPI requires at least one of these to be present
    if (!topic.trim() && !text.trim()) {
      setError("You must provide either a Topic or Source Notes.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Build the exact payload the Python microservice expects
      const payload = {
        topic: topic.trim() ? topic.trim() : undefined,
        text: text.trim() ? text.trim() : undefined,
        level: level,
      };

      // Send to Node.js API Gateway using the global auth wrapper
      const res = await fetchWithAuth("/api/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate deck from AI");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto mt-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 mb-8 transition-colors"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
          Generate a Study Deck
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mb-8">
          Provide a topic, paste your notes, and select your target difficulty.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form
          onSubmit={handleGenerate}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-6"
        >
          {/* Target Audience Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Educational Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-colors cursor-pointer"
            >
              <option value="Elementary">Elementary</option>
              <option value="Middle School">Middle School</option>
              <option value="High School">High School</option>
              <option value="University">University</option>
            </select>
          </div>

          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Topic (Optional if providing notes)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The French Revolution"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-colors"
            />
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Source Notes / Textbook Text (Optional if providing topic)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your lecture notes or study material here..."
              className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!topic.trim() && !text.trim())}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center mt-4"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Asking AI to generate cards...
              </span>
            ) : (
              "Generate Flashcards"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
