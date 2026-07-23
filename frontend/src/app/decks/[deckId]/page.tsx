"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/utils/api";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
}

export default function DeckOverviewPage() {
  const params = useParams();
  const deckId = params.deckId as string;
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Grid View State
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Carousel Browse State
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselFlipped, setCarouselFlipped] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<
    Record<string, { front: string; back: string }>
  >({});

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const res = await fetchWithAuth(`/api/decks/${deckId}`);
        if (!res.ok) throw new Error("Failed to load deck details");
        const data = await res.json();
        setDeck(data);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [deckId]);

  // --- Grid & Edit Handlers ---
  const toggleEditMode = () => {
    if (!isEditing && deck) {
      setViewMode("grid"); // Force grid view when editing
      const initialData: Record<string, { front: string; back: string }> = {};
      deck.cards.forEach((card) => {
        initialData[card.id] = { front: card.front, back: card.back };
      });
      setEditFormData(initialData);
    }
    setIsEditing(!isEditing);
  };

  const handleFormChange = (
    cardId: string,
    field: "front" | "back",
    value: string,
  ) => {
    setEditFormData((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], [field]: value },
    }));
  };

  const handleUpdateCard = async (cardId: string) => {
    try {
      const { front, back } = editFormData[cardId];
      const res = await fetchWithAuth(`/api/flashcards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ front, back }),
      });

      if (!res.ok) throw new Error("Failed to update card");

      setDeck((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === cardId ? { ...c, front, back } : c,
              ),
            }
          : null,
      );
      alert("Card updated successfully!");
    } catch (error: unknown) {
      console.error("Update Error:", error);
      alert("Error updating card.");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm("Are you sure you want to delete this card forever?"))
      return;
    try {
      const res = await fetchWithAuth(`/api/flashcards/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete card");

      setDeck((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter((c) => c.id !== cardId),
            }
          : null,
      );
    } catch (error: unknown) {
      console.error("Delete Card Error:", error);
      alert("Error deleting card.");
    }
  };

  const handleDeleteDeck = async () => {
    if (
      !window.confirm(
        "WARNING: This will delete the entire deck forever. Continue?",
      )
    )
      return;
    try {
      const res = await fetchWithAuth(`/api/decks/${deckId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete deck");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Delete Deck Error:", error);
      alert("Error deleting deck.");
    }
  };

  const toggleGridFlip = (cardId: string) => {
    if (isEditing) return;
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) newSet.delete(cardId);
      else newSet.add(cardId);
      return newSet;
    });
  };

  // --- Carousel Handlers ---
  const handleNextCarousel = () => {
    setCarouselFlipped(false);
    setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % (deck?.cards.length || 1));
    }, 150);
  };

  const handlePrevCarousel = () => {
    setCarouselFlipped(false);
    setTimeout(() => {
      setCarouselIndex(
        (prev) =>
          (prev - 1 + (deck?.cards.length || 1)) % (deck?.cards.length || 1),
      );
    }, 150);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-900 dark:text-white">
        Loading deck...
      </div>
    );
  if (error || !deck)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 dark:bg-slate-900">
        {error || "Deck not found"}
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto mt-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition"
        >
          ← Back to Dashboard
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-6 mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {deck.title}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-2">
              {deck.cards.length} cards total
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isEditing && (
              <button
                onClick={handleDeleteDeck}
                className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition"
              >
                Delete Entire Deck
              </button>
            )}

            {!isEditing && (
              <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "grid" ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700"}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("carousel")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "carousel" ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700"}`}
                >
                  Carousel
                </button>
              </div>
            )}

            <button
              onClick={toggleEditMode}
              className={`px-4 py-2 font-medium rounded-lg transition ${
                isEditing
                  ? "bg-gray-800 text-white hover:bg-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600"
                  : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {isEditing ? "Done Editing" : "Edit Cards"}
            </button>

            {!isEditing && (
              <Link
                href={`/study/${deckId}`}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                Study Due Cards
              </Link>
            )}
          </div>
        </div>

        {/* View Router */}
        {viewMode === "carousel" && !isEditing ? (
          /* Normal study mode */
          <div className="flex flex-col items-center mt-12">
            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium tracking-wide uppercase text-sm">
              Card {carouselIndex + 1} of {deck.cards.length}
            </p>

            <div
              className="w-full max-w-2xl aspect-[3/2] cursor-pointer"
              style={{ perspective: "1000px" }}
              onClick={() => setCarouselFlipped(!carouselFlipped)}
            >
              <div
                className="relative w-full h-full shadow-xl rounded-2xl"
                style={{
                  transformStyle: "preserve-3d",
                  transform: carouselFlipped
                    ? "rotateY(180deg)"
                    : "rotateY(0deg)",
                  transition: "transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center p-10 text-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Front
                  </span>
                  <p className="text-2xl text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                    {deck.cards[carouselIndex].front}
                  </p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 bg-blue-50 dark:bg-slate-700 rounded-2xl border border-blue-100 dark:border-slate-600 flex flex-col justify-center items-center p-10 text-center"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-blue-400 dark:text-slate-400">
                    Back
                  </span>
                  <p className="text-xl text-slate-800 dark:text-slate-100 leading-relaxed">
                    {deck.cards[carouselIndex].back}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handlePrevCarousel}
                className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCarouselFlipped(!carouselFlipped)}
                className="px-8 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                Flip Card
              </button>
              <button
                onClick={handleNextCarousel}
                className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          /* Grid overview and edit mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deck.cards.map((card) => {
              const isFlipped = flippedCards.has(card.id);

              if (isEditing) {
                return (
                  <div
                    key={card.id}
                    className="p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-600 flex flex-col gap-3"
                  >
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                        Front (Question)
                      </label>
                      <textarea
                        value={editFormData[card.id]?.front || ""}
                        onChange={(e) =>
                          handleFormChange(card.id, "front", e.target.value)
                        }
                        className="w-full mt-1 p-2 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                        Back (Answer)
                      </label>
                      <textarea
                        value={editFormData[card.id]?.back || ""}
                        onChange={(e) =>
                          handleFormChange(card.id, "back", e.target.value)
                        }
                        className="w-full mt-1 p-2 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleUpdateCard(card.id)}
                        className="px-4 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 font-medium text-sm transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={card.id}
                  onClick={() => toggleGridFlip(card.id)}
                  className={`relative min-h-[200px] p-6 rounded-2xl shadow-sm border cursor-pointer transition-all duration-300 flex items-center justify-center text-center ${
                    isFlipped
                      ? "bg-white dark:bg-slate-800 border-blue-400 dark:border-blue-500"
                      : "bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 hover:shadow-md"
                  }`}
                >
                  <p
                    className={`text-lg ${isFlipped ? "text-gray-800 dark:text-gray-100" : "text-gray-900 dark:text-white font-medium"}`}
                  >
                    {isFlipped ? card.back : card.front}
                  </p>
                  <span className="absolute bottom-3 right-4 text-xs text-gray-400 dark:text-slate-500">
                    {isFlipped ? "Answer" : "Question"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
