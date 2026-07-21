import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import ThemeToggle from "./ThemeToggle";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Study Assistant",
  description: "Generate flashcards instantly with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-slate-900 transition-colors duration-300`}
      >
        <Providers>
          {/* A floating button in the top right corner */}
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggle />
          </div>

          {children}

          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
