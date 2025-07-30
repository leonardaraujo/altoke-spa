import { useUserStore } from "@/store/userStore";
import { useState } from "react";

export function useAuth() {
  const { setUser, logout, loadFromStorage } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user, data.accessToken);
      return data.user;
    } else {
      setError(data.error || "Error desconocido");
      return null;
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", name, email, password, role }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user, data.accessToken ?? "");
      return data.user;
    } else {
      setError(data.error || "Error desconocido");
      return null;
    }
  };

  return { login, register, logout, loadFromStorage, error };
}