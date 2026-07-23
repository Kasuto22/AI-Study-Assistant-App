import { toast } from "sonner";

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
) {
  const token = localStorage.getItem("token");
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000";

  // Automatically attach the token to every request
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // Catch expired tokens globally
  if (response.status === 401) {
    localStorage.removeItem("token");
    toast.error("Session expired. Please log in again.");

    // Hard redirect to the actual auth page
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }

    throw new Error("Session expired");
  }

  return response;
}
