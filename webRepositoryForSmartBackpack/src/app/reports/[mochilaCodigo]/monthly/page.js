"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart";
import { useAuth } from "@/app/hooks/useAuth";

// --- FUNÇÃO AUXILIAR PARA ARREDONDAR PARA 2 CASAS DECIMAIS ---
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}
// --- FIM DA FUNÇÃO AUXILIAR ---

export default function MonthlyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth(); // Obtém authFetch do contexto de autenticação
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---

  // --- FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---
  const calcularEstatisticas = (valoresRaw) => {
    // 1. Filtrar valores válidos (números)
    const valores = valoresRaw
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (valores.length === 0) {
      return null; // Não há dados para calcular
    }

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    // 2. Mediana
    const sorted = [...valores].sort((a, b) => a - b);
    const mediana = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // 3. Moda (pode haver mais de uma)
    const freq = {};
    valores.forEach(v => {
      const key = roundTo2(v).toString(); // Agrupar por valor arredondado
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq)
      .filter(k => freq[k] === maxFreq)
      .map(k => parseFloat(k));

    // 4. Desvio Padrão (populacional)
    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    // 5. Assimetria (Fisher-Pearson)
    // Para evitar divisão por zero
    const denomSkew = Math.pow(desvioPadrao, 3) || 1;
    const assimetria =
      (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;

    // 6. Curtose (Excesso de curtose: kurtosis - 3)
    const denomKurt = Math.pow(desvioPadrao, 4) || 1;
    const curtose =
      (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

    // 7. Probabilidades (ex: P(X > media))
    const acimaDaMedia = valores.filter(v => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    // 8. Regressão Linear (Peso vs. Índice do Array)
    // y = a + bx
    const xVals = valores.map((_, i) => i); // índices 0, 1, 2, ...
    const yVals = valores; // pesos

    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((sum, xi, i) => sum + xi * yVals[i], 0);
    const sumXX = xVals.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.map(v => roundTo2(v)).join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      probAcimaMedia: roundTo2(probAcimaMedia * 100), // em %
      regressao: {
        slope: roundTo2(slope),
        intercept: roundTo2(intercept),
        equacao: `y = ${roundTo2(intercept)} + ${roundTo2(slope)}x`
      }
    };
  };
  // --- FIM DA FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---

  useEffect(() => {
    const fetchMonthlyReport = async () => {
      try {
        setLoading(true);
        setError("");
        setEstatisticas(null); // Limpa estatísticas anteriores

        // --- OBTENÇÃO DE ANO E MÊS ---
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth() + 1; // getMonth() retorna 0-11, então soma 1 para 1-12

        // --- CHAMADA PARA A API ---
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/medicoes/mensal/${ano}/${mes}/${mochilaCodigo}`
        );

        if (!res.ok) {
          let errorMessage = `Erro ${res.status} ao carregar relatório.`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error(
              "[MonthlyReportPage] Erro ao parsear JSON de erro da API:",
              e
            );
          }
          throw new Error(errorMessage);
        }

        const rawData = await res.json();
        console.log(
          "[MonthlyReportPage] Dados brutos recebidos da API:",
          rawData
        );

        console.log("[MonthlyReportPage] Estrutura dos dados brutos:", rawData);

        // --- PROCESSAMENTO DOS DADOS ---
        let dadosParaGrafico = [];
        let pesosParaEstatisticas = []; // Array de números para calcular estatísticas

        // Se rawData for um array (como os dados colados)
        if (Array.isArray(rawData)) {
          // Mapeia cada objeto do array para um novo objeto com os campos desejados
          dadosParaGrafico = rawData.map((medicao) => {
            const pesoNum = parseFloat(medicao.MedicaoPeso);
            pesosParaEstatisticas.push(pesoNum); // Adiciona ao array para estatísticas
            return {
              name: new Date(medicao.MedicaoData).toLocaleDateString("pt-BR"), // Converte a data para string legível
              peso: pesoNum, // Converte string para número
              local: medicao.MedicaoLocal,
              status: medicao.MedicaoStatus,
            };
          });
        } else {
          // Caso fallback: se não for um array, tenta extrair de um objeto
          console.warn(
            "[MonthlyReportPage] Resposta da API não é um array. Tentando processar como objeto."
          );
          if (rawData && typeof rawData === "object") {
            // Exemplo: se a resposta for { esquerda: {...}, direita: {...} }
            for (const [key, medicao] of Object.entries(rawData)) {
              if (medicao && medicao.MedicaoData) {
                const pesoNum = parseFloat(medicao.MedicaoPeso);
                pesosParaEstatisticas.push(pesoNum);
                dadosParaGrafico.push({
                  name: key, // ou use new Date(medicao.MedicaoData).toLocaleDateString('pt-BR')
                  peso: pesoNum,
                  local: medicao.MedicaoLocal,
                  status: medicao.MedicaoStatus,
                });
              }
            }
          }
        }

        setChartData(dadosParaGrafico);
        setReportData(rawData); // Para uso futuro (tabela, etc.)

        // --- CALCULAR ESTATÍSTICAS ---
        const stats = calcularEstatisticas(pesosParaEstatisticas);
        setEstatisticas(stats);
        // --- FIM DO CÁLCULO DAS ESTATÍSTICAS ---

      } catch (err) {
        console.error("[MonthlyReportPage] Erro ao carregar relatório:", err);
        setError(err.message);
        setChartData([]);
        setReportData([]);
        setEstatisticas(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyReport();
  }, [authFetch, mochilaCodigo]); // Re-executa se authFetch ou mochilaCodigo mudarem

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório mensal...</p>
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
              onClick={() => router.push(`/reports/${mochilaCodigo}`)} // Volta para as opções
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Opções
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black">
        <div className="max-w-6xl mx-auto">
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
              <h1 className="text-2xl font-bold">Relatório Mensal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="mt-8 space-y-8">
            {/* Gráfico */}
            <Chart dados={chartData} titulo="Relatório Mensal" />

            {/* --- SEÇÃO DE ESTATÍSTICAS --- */}
            {estatisticas ? (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Indicadores Estatísticos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Média" value={`${estatisticas.media} kg`} />
                  <StatCard title="Mediana" value={`${estatisticas.mediana} kg`} />
                  <StatCard title="Moda" value={estatisticas.moda} />
                  <StatCard title="Desvio Padrão" value={`${estatisticas.desvioPadrao} kg`} />
                  <StatCard title="Assimetria" value={estatisticas.assimetria} />
                  <StatCard title="Curtose" value={estatisticas.curtose} />
                  <StatCard title="Regressão" value={estatisticas.regressao.equacao} />
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center">Nenhuma medição disponível para cálculo estatístico.</p>
            )}
            {/* --- FIM DA SEÇÃO DE ESTATÍSTICAS --- */}

            {/* Tabela de Dados (Exemplo) */}
            {/* 
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Dados Detalhados</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.MedicaoData).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.MedicaoPeso}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.MedicaoLocal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.MedicaoStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            */}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}