"use client"
import { Mail, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Home() {
  const { login, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirige si ya hay accessToken en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        router.replace("/pos");
      } else {
        setCheckingAuth(false);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await login(email, password);
    setLoading(false);
    if (user) {
      router.push("/pos");
    }
  };

  if (checkingAuth) {
    // Spinner de carga centrado
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-blue-600 font-semibold">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <form
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-center mb-2">Iniciar sesión</h1>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Correo electrónico"
              className="pl-10 pr-3 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Contraseña"
              className="pl-10 pr-3 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {error && <p className="text-red-500 text-center">{error}</p>}
      </form>
    </div>
  );
}