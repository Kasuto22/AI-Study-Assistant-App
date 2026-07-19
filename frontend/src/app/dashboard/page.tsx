"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Define what a "Deck" looks like so TypeScript is happy
interface Deck {
  id: string;
  title: string;
  createdAt: string;
  cards: { id: string }[];
}

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check for the token when the page loads
    const token = localStorage.getItem("token");

    if (!token) {
      // If no token, kick them to the login page
      router.push("/auth");
      return;
    }

    // Fetch the user's decks from the backend
    const fetchDecks = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/decks`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch decks");

        const data = await res.json();
        setDecks(data);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDecks();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
        <p className="text-xl font-semibold animate-pulse">
          Loading your decks...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto mt-12">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Your Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition"
          >
            Log Out
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Decks Grid */}
        {decks.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-2">
              No decks yet!
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Let&apos;s generate your first study deck using AI.
            </p>
            <Link
              href="/generate"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              + Create New Deck
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Map over the fetched decks and display them as cards */}
            {decks.map((deck) => (
              <Link
                href={`/decks/${deck.id}`}
                key={deck.id}
                className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-48"
              >
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {deck.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {deck.cards.length}{" "}
                    {deck.cards.length === 1 ? "card" : "cards"}
                  </p>
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Study Now →
                </div>
              </Link>
            ))}

            {/* The "Create New" Card */}
            <Link
              href="/generate"
              className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition min-h-[12rem]"
            >
              <span className="text-3xl mb-2">+</span>
              <span className="font-semibold">Generate New Deck</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
