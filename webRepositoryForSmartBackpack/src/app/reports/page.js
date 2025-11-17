"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Link from "next/link";

export default function ReportsHomePage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mochilas, setMochilas] = useState([]);

  useEffect(() => {
    const loadMochilas = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/usuario`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao carregar mochilas.");
        }

        const data = await res.json();
        setMochilas(Array.isArray(data.mochilas) ? data.mochilas : []);
      } catch (err) {
        console.error("[ReportsHomePage] Erro ao carregar mochilas:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMochilas();
  }, [authFetch]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando mochilas...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-red-500 p-4 text-center">
            <p>Erro: {error}</p>
            <button
              onClick={() => router.push("/backpack")}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Voltar para Mochilas
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Relatórios</h1>
          <p className="text-gray-600 text-center mb-8">
            Escolha uma mochila para visualizar seus relatórios
          </p>

          {mochilas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              {mochilas.map((m) => (
                <Link
                  key={m.MochilaCodigo}
                  href={`/reports/${m.MochilaCodigo}?nome=${encodeURIComponent(m.MochilaNome || m.MochilaDescricao)}`}
                  className="block"
                >
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-green-100">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {m.MochilaNome || m.MochilaDescricao}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      Código: ({m.MochilaCodigo})
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Nenhuma mochila vinculada ainda.
              </p>
              <Link href="/backpack" className="text-blue-500 hover:underline">
                Vincular uma mochila
              </Link>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
