import Link from "next/link";

export default function Home() {
  return (
    // Added dark:bg-slate-900 and transition classes here
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white p-6 transition-colors duration-300">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight text-gray-900 dark:text-white">
          AI Study Assistant
        </h1>
        {/* Added dark:text-gray-300 for the subtitle */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          Generate flashcards instantly with AI and master them using spaced
          repetition.
        </p>

        <Link
          href="/auth"
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
