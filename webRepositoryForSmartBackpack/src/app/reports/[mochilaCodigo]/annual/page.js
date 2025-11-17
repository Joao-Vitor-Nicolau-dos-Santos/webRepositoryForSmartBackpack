"use client";

import { useState, useEffect, use } from "react"; 
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "@/app/hooks/useAuth"; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart";
import StatCard from "@/components/StatCard/StatCard";

// --- FUNÇÃO AUXILIAR PARA ARREDONDAR PARA 2 CASAS DECIMAIS ---
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}
// --- FIM DA FUNÇÃO AUXILIAR ---

export default function AnnualReportPage({ params }) { 
  const router = useRouter();
  const { authFetch } = useAuth();

  const anoAtual = new Date().getFullYear();
  // --- CORREÇÃO AQUI: Usar React.use() para desempacotar params ---
  const { mochilaCodigo } = use(params);
  // --- FIM DA CORREÇÃO ---

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]); // Agora será um array de 12 médias mensais
  const [estatisticas, setEstatisticas] = useState(null);
  const [selectedYear, setSelectedYear] = useState(anoAtual);
  const [refreshing, setRefreshing] = useState(false);

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ANUAL ---
  const loadReport = async (mochilaCodigo, ano) => {
    try {
      if (loading) setLoading(true);
      setError("");
      setEstatisticas(null);
      setChartData(Array(12).fill(0));

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/anual/${ano}/${mochilaCodigo}`
      );

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.mensagem || errorMessage;
        } catch (e) {
          console.error("[AnnualReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("[AnnualReportPage] Dados brutos recebidos da API:", rawData); // <-- LOG DE DIAGNÓSTICO

      // --- PROCESSAMENTO DOS DADOS ---
      let mediasMensais = Array.isArray(rawData.mediasMensais) ? rawData.mediasMensais : Array(12).fill(0);
      console.log("[AnnualReportPage] Array de médias bruto:", mediasMensais); // <-- LOG DE DIAGNÓSTICO

      mediasMensais = Array.from({ length: 12 }, (_, i) => {
        const v = mediasMensais[i];
        const n = typeof v === "number" && Number.isFinite(v) ? v : Number(parseFloat(v));
        const finalValue = Number.isFinite(n) ? roundTo2(n) : 0;
        console.log(`[AnnualReportPage] Média para mês ${i}: ${v} -> ${n} -> ${finalValue}`); // <-- LOG DE DIAGNÓSTICO
        return finalValue;
      });

      const meses = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
      ];
      const dadosParaGrafico = meses.map((nome, index) => ({
        name: nome,
        peso: mediasMensais[index],
      }));

      console.log("[AnnualReportPage] Dados para o gráfico:", dadosParaGrafico); // <-- LOG DE DIAGNÓSTICO

      setChartData(dadosParaGrafico);
      setEstatisticas(rawData.estatisticas || null);
      console.log("[AnnualReportPage] Estatísticas definidas:", rawData.estatisticas || null); // <-- LOG DE DIAGNÓSTICO

    } catch (err) {
      console.error("[AnnualReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório anual.");
      setChartData(Array(12).fill(0));
      setEstatisticas(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mochilaCodigo) {
      loadReport(mochilaCodigo, selectedYear);
    }
  }, [mochilaCodigo, selectedYear]);

  const handleYearChange = (e) => {
    const novoAno = Number(e.target.value);
    setSelectedYear(novoAno);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReport(mochilaCodigo, selectedYear);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório anual...</p>
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
              onClick={() => router.push(`/reports/${mochilaCodigo}`)}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Voltar para Opções
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const possuiDadosGrafico = chartData.some(item => item.peso > 0);
  const temEstatisticas = !!estatisticas;

  if (!possuiDadosGrafico && !temEstatisticas) {
    return (
      <ProtectedRoute>
        <Header />
        <main className="min-h-screen p-6 bg-gray-50 text-black">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-6">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
                aria-label="Voltar"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Relatório Anual</h1>
                <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
              <label htmlFor="yearSelector" className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o Ano
              </label>
              <select
                id="yearSelector"
                value={selectedYear}
                onChange={handleYearChange}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {[...Array(5)].map((_, i) => {
                  const ano = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-500 text-center">Nenhuma medição encontrada. Selecione outro ano.</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
              aria-label="Voltar"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Relatório Anual</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <label htmlFor="yearSelector" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Ano
            </label>
            <select
              id="yearSelector"
              value={selectedYear}
              onChange={handleYearChange}
              className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const ano = new Date().getFullYear() - 2 + i;
                return (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                );
              })}
            </select>
          </div>

          {temEstatisticas && estatisticas ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">Indicadores Estatísticos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard title="Média (kg)" value={estatisticas.media} />
                <StatCard title="Mediana (kg)" value={estatisticas.mediana} />
                <StatCard title="Moda (kg)" value={estatisticas.moda} />
                <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao} />
                <StatCard title="Assimetria" value={estatisticas.assimetria} />
                <StatCard title="Curtose" value={estatisticas.curtose} />
                <StatCard title="Regressão Linear" value={estatisticas.regrLinear || "—"} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <p className="text-gray-500 text-center">Nenhuma medição disponível para cálculo estatístico.</p>
            </div>
          )}

          <div>
            {possuiDadosGrafico ? (
              <Chart
                dados={chartData}
                titulo={`Média de Peso por Mês - ${selectedYear}`}
              />
            ) : (
              <p className="text-gray-500 text-center">Dados insuficientes para gerar o gráfico.</p>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}