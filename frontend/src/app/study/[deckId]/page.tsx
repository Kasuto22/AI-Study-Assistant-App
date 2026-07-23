"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/utils/api";
interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export default function StudyPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  // State
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Get due cards
  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        // Look how clean this is! The wrapper handles the token, URL, and 401s.
        const res = await fetchWithAuth(`/api/decks/${deckId}/study`);

        if (!res.ok) throw new Error("Failed to load cards");

        const data = await res.json();
        setCards(data);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDueCards();
  }, [deckId]);

  // Grade and next card
  const handleGrade = async (score: number) => {
    if (savingReview) return;
    setSavingReview(true);

    const currentCard = cards[currentIndex];

    try {
      // Cleaned up PUT request
      await fetchWithAuth(`/api/flashcards/${currentCard.id}/review`, {
        method: "PUT",
        body: JSON.stringify({ score }),
      });

      // Move to the next card and flip back to the front
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      alert("Failed to save review. Please try again.");
    } finally {
      setSavingReview(false);
    }
  };

  // Render Logic
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors">
        <p className="text-xl font-semibold dark:text-white animate-pulse">
          Loading study session...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // If there are no cards, or the user finished them all!
  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors p-6">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm text-center max-w-md border border-gray-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🎉 All Caught Up!
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-8">
            You have reviewed all due cards for this deck today. Your brain is
            growing.
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      {/* Header */}
      <div className="w-full max-w-2xl mt-8 mb-6 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          ← Exit Session
        </Link>
        <div className="text-sm font-medium text-gray-500 dark:text-slate-400">
          Card {currentIndex + 1} of {cards.length}
        </div>
      </div>

      {/* The Flashcard */}
      <div
        onClick={() => !isFlipped && setIsFlipped(true)}
        className={`w-full max-w-2xl min-h-[400px] p-8 rounded-3xl shadow-lg flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 ${
          isFlipped
            ? "bg-white dark:bg-slate-800 border-t-4 border-blue-500"
            : "bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white"
        }`}
      >
        <p
          className={`text-2xl md:text-3xl font-medium leading-relaxed ${isFlipped ? "text-gray-800 dark:text-gray-100 mb-12" : ""}`}
        >
          {isFlipped ? currentCard.back : currentCard.front}
        </p>

        {!isFlipped && (
          <p className="text-blue-200 text-sm mt-12 animate-bounce">
            Click to reveal answer
          </p>
        )}
      </div>

      {/* Spaced Repetition Grading Buttons */}
      {isFlipped && (
        <div className="w-full max-w-2xl mt-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-gray-600 dark:text-slate-300 mb-4 font-medium">
            How well did you know this?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <button
              onClick={() => handleGrade(1)}
              disabled={savingReview}
              className="py-3 px-2 rounded-xl font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 transition"
            >
              Forgot
            </button>
            <button
              onClick={() => handleGrade(2)}
              disabled={savingReview}
              className="py-3 px-2 rounded-xl font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60 transition"
            >
              Hard
            </button>
            <button
              onClick={() => handleGrade(3)}
              disabled={savingReview}
              className="py-3 px-2 rounded-xl font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 transition"
            >
              Good
            </button>
            <button
              onClick={() => handleGrade(4)}
              disabled={savingReview}
              className="py-3 px-2 rounded-xl font-semibold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60 transition"
            >
              Easy
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
