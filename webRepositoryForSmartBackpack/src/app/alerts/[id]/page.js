"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth"; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header"; 

export default function DetalhesAlertaPage() {
  const params = useParams(); // Hook para acessar parâmetros dinâmicos da URL
  const router = useRouter(); // Hook para navegação
  const { authFetch } = useAuth(); // Hook para requisições autenticadas
  const alertaId = params.id; // Extrai o 'id' da URL (/alertas/[id])

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    const fetchAlerta = async () => {
      // Verificação inicial do ID
      if (!alertaId) {
        setError("ID do alerta não fornecido na URL.");
        setLoading(false);
        return;
      }

      const idNumero = Number(alertaId);
      if (isNaN(idNumero)) {
        setError("ID do alerta inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // --- CHAMADA PARA A API PARA OBTER O ALERTA POR ID ---
        // Endpoint da sua API: GET /alertas/:id
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alertas/${idNumero}`
        );
        // --- FIM DA CHAMADA ---

        if (!res.ok) {
          // Tenta ler o corpo como JSON para obter mensagem de erro
          let errorMessage = `Erro ${res.status} ao carregar alerta.`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // Se falhar ao parsear JSON, pode ser HTML (erro 404/500 do servidor)
            console.error("[DetalhesAlertaPage] Erro ao parsear JSON de erro da API:", parseError);
            // Mesmo assim, lançamos o erro com o status
          }
          throw new Error(errorMessage);
        }

        const data = await res.json();
        console.log("[DetalhesAlertaPage] Dados brutos recebidos da API:", data); // Log para debug
        setAlerta(data); // A API retorna o objeto do alerta diretamente

      } catch (err) {
        console.error("[DetalhesAlertaPage] Erro ao carregar alerta:", err);
        setError(err.message || "Falha ao carregar os detalhes do alerta.");
        setAlerta(null); // Limpa dados anteriores em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchAlerta();
  }, [authFetch, alertaId]); // Re-executa se authFetch ou alertaId mudarem

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando detalhes do alerta...</p>
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
              onClick={() => router.push('/alerts')} // Volta para a lista de alertas
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Alertas
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Se não estiver carregando e não houver erro, mas também não houver alerta, mostra mensagem
  if (!alerta) {
     return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-500 p-4 text-center">
            <p>Alerta não encontrado.</p>
            <button
              onClick={() => router.push('/alerts')} // Volta para a lista de alertas
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Alertas
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
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
          {/* Cabeçalho com botão de voltar e título */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
              aria-label="Voltar"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes do Alerta</h1>
              <p className="text-gray-600">ID: {alerta.AlertaId}</p>
            </div>
          </div>

          {/* Conteúdo do Alerta */}
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">{alerta.AlertaTitulo}</h2>
              <p className="text-gray-700">{alerta.AlertaDescricao}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-1">Data/Hora</h3>
                <p className="text-gray-600">
                  {new Date(alerta.AlertaData).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Nível</h3>
                <p className="text-gray-600">{alerta.AlertaNivel}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Status</h3>
                <p className="text-gray-600">{alerta.AlertaStatus}</p>
              </div>
              {/* Adicione outros campos relevantes se existirem na resposta da API */}
            </div>
          </div>

          {/* Botão Voltar */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => router.push('/alerts')} // Ou router.back()
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Voltar para Lista
            </button>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

// Componente para o ícone de seta para trás (se não estiver usando react-icons)
function FiArrowLeft({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );
}