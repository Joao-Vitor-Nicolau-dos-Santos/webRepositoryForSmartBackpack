"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "@/app/hooks/useAuth";
import { ptBR } from "date-fns/locale";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart";
import StatCard from "@/components/StatCard/StatCard";
import ComparisonChart from "@/components/ComparisonChart/ComparisonChart";

// --- FUNÇÃO AUXILIAR PARA ARREDONDAR PARA 2 CASAS DECIMAIS ---
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}
// --- FIM DA FUNÇÃO AUXILIAR ---

export default function MonthlyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params`
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  // --- Estados ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  const [estatisticas, setEstatisticas] = useState(null); // Estatísticas calculadas
  const [maiorMenorMedicao, setMaiorMenorMedicao] = useState(null); // Estatísticas calculadas

  // --- Novos estados para selecionar ano e mês ---
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0')); // Mês atual (01-12)

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano atual

  const [searchLoading, setSearchLoading] = useState(false);

  // --- Estados ---
  const [comparisonChartData, setComparisonChartData] = useState([]);
  // --- Fim dos novos estados ---

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ---
  const loadReport = async (mochilaCodigo, ano, mes) => {
    try {
      setSearchLoading(true);
      setLoading(true);
      setError("");
      setEstatisticas(null);
      setChartData([]);

      console.log("📊 Buscando relatório mensal:", { ano, mes, mochilaCodigo });

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/mensal/${ano}/${mes}/${mochilaCodigo}`
      );

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("[MonthlyReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("📦 Dados recebidos da API:", rawData);

      // --- PROCESSAMENTO SIMPLIFICADO - DADOS JÁ VÊM PRONTOS ---
      if (rawData && rawData.dadosProcessados && rawData.estatisticas) {
        console.log("✅ Dados já processados pela API");

        // Dados para o gráfico principal (médias diárias totais)
        const dadosGraficoPrincipal = rawData.dadosProcessados.dailyLabels.map((label, index) => ({
          name: `Dia ${label}`,
          peso: rawData.dadosProcessados.dailyAvgs[index],
          data: `2025-11-${label.padStart(2, '0')}` // Ajuste conforme o mês/ano
        }));

        // Dados para o gráfico de comparação (esquerda vs direita)
        const dadosGraficoComparacao = rawData.dadosProcessados.dailyLabels.map((label, index) => ({
          name: `Dia ${label}`,
          esquerda: rawData.dadosProcessados.dailyAvgsEsq[index],
          direita: rawData.dadosProcessados.dailyAvgsDir[index]
        }));

        console.log("📈 Dados para gráfico principal:", dadosGraficoPrincipal);
        console.log("⚖️ Dados para gráfico comparação:", dadosGraficoComparacao);

        setChartData(dadosGraficoPrincipal);
        setComparisonChartData(dadosGraficoComparacao);

        // Estatísticas já vêm prontas da API
        // Adiciona dados extras às estatísticas se necessário
        const estatisticasCompletas = {
          ...rawData.estatisticas,
          diasComMedicao: rawData.dadosProcessados.diasComMedicao,
          totalMedicoes: rawData.dadosProcessados.totalMedicoes,
          pesoMaximoPermitido: rawData.dadosProcessados.pesoMaximoPermitido,
          medicoesAcimaLimite: rawData.dadosProcessados.mediçõesAcimaLimite
        };

        // Se você precisa de um estado separado para maior/menor medição
        const maiorMenorMedicao = {
          maiorDir: rawData.dadosProcessados.maiorDir,
          maiorEsq: rawData.dadosProcessados.maiorEsq,
          menorDir: rawData.dadosProcessados.menorDir,
          menorEsq: rawData.dadosProcessados.menorEsq
        };

        setMaiorMenorMedicao(maiorMenorMedicao);
        setEstatisticas(estatisticasCompletas);

        // Salvar dados completos se precisar para outras seções
        setReportData(rawData);

      } else {
        console.error("❌ Estrutura de dados inesperada da API");
        throw new Error("Estrutura de dados inválida da API");
      }

    } catch (err) {
      console.error("[MonthlyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório mensal.");
      setChartData([]);
      setReportData(null);
      setEstatisticas(null);
      setComparisonChartData(null);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO loadReport ---

  // --- Carregar o relatório ao montar ou quando ano/mes/mochilaCodigo mudarem ---
  useEffect(() => {
    if (mochilaCodigo) {
      loadReport(mochilaCodigo, selectedYear, selectedMonth);
    }
  }, [mochilaCodigo]);

  // --- Manipuladores para ano e mês ---
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };
  // --- Fim dos manipuladores ---

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-800">Carregando relatório mensal...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex flex-col items-center">
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

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black flex flex-col ">
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

          {/* Seletores de Ano e Mês */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Selecionar Período</h2>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="yearSelector" className="block text-sm font-medium text-gray-700 mb-2">
                  Ano
                </label>
                <select
                  id="yearSelector"
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {[...Array(10)].map((_, i) => {
                    const ano = new Date().getFullYear() - 5 + i; // Últimos 5 anos e próximos 4
                    return (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="monthSelector" className="block text-sm font-medium text-gray-700 mb-2">
                  Mês
                </label>
                <select
                  id="monthSelector"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="01">Janeiro</option>
                  <option value="02">Fevereiro</option>
                  <option value="03">Março</option>
                  <option value="04">Abril</option>
                  <option value="05">Maio</option>
                  <option value="06">Junho</option>
                  <option value="07">Julho</option>
                  <option value="08">Agosto</option>
                  <option value="09">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período Selecionado
                </label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 font-medium">
                  {selectedMonth}/{selectedYear}
                </div>
              </div>

              {/* Botão para buscar dados manualmente */}
              <button
                onClick={() => loadReport(mochilaCodigo, selectedYear, selectedMonth)}
                disabled={searchLoading}
                className={`bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${searchLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {searchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar Relatório
                  </>
                )}
              </button>
            </div>
          </div>


          {/* --- SEÇÃO DE ESTATÍSTICAS --- */}
          {estatisticas ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">Indicadores Estatísticos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard title="Total Medições" value={estatisticas.totalMedicoes} />
                <StatCard title="Dias c/ Medições" value={estatisticas.diasComMedicao} />
                <StatCard title="Média (kg)" value={estatisticas.media} />
                <StatCard title="Mediana (kg)" value={estatisticas.mediana} />
                <StatCard title="Moda (kg)" value={estatisticas.moda} />
                <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao} />
                <StatCard title="Assimetria" value={estatisticas.assimetria} />
                <StatCard title="Curtose" value={estatisticas.curtose} />
                <StatCard title="Regressão Linear" value={`y = ${estatisticas.regressao.a}x + ${estatisticas.regressao.b}`} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <p className="text-gray-500 text-center">Nenhuma medição disponível para cálculo estatístico.</p>
            </div>
          )}
          {/* --- FIM DA SEÇÃO DE ESTATÍSTICAS --- */}

          {/* Conteúdo do Relatório */}
          <div className="mt-8 space-y-8">
            {/* Gráfico Principal - Médias Diárias */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">📊 Médias Diárias de Peso</h3>
              {chartData && chartData.length > 0 ? (
                <Chart
                  dados={chartData}
                  titulo={`Médias Diárias - ${selectedMonth}/${selectedYear}`}
                />
              ) : (
                <div className="bg-gray-100 p-8 rounded-lg text-center">
                  <p className="text-gray-500">Nenhum dado disponível para o gráfico principal.</p>
                </div>
              )}
            </div>

            {/* Gráfico de Comparação - Esquerda vs Direita */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">⚖️ Comparativo Esquerda vs Direita</h3>
              {comparisonChartData && comparisonChartData.length > 0 ? (
                <ComparisonChart
                  dados={comparisonChartData}
                  titulo={`Comparativo Diário - ${selectedMonth}/${selectedYear}`}
                />
              ) : (
                <div className="bg-gray-100 p-8 rounded-lg text-center">
                  <p className="text-gray-500">Nenhum dado disponível para o gráfico comparativo.</p>
                </div>
              )}
            </div>

            {/* Cards de Maior e Menor Medição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {maiorMenorMedicao.maiorEsq && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                  <h4 className="font-bold text-red-600">📈 Maior Medição (Esquerda)</h4>
                  <p><strong>Data:</strong> {new Date(maiorMenorMedicao.maiorEsq.data).toLocaleString("pt-BR", { locale: ptBR })}</p>
                  <p><strong>Peso:</strong> {maiorMenorMedicao.maiorEsq.peso} kg</p>
                  {estatisticas.pesoMaximoPermitido.toFixed(2) < maiorMenorMedicao.maiorEsq.peso && (
                    <p className="text-red-600 font-bold mt-2">
                      ⚠️ Acima do limite permitido ({estatisticas.pesoMaximoPermitido.toFixed(2)} kg)
                    </p>
                  )}
                </div>
              )}
              {maiorMenorMedicao.maiorDir && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                  <h4 className="font-bold text-red-600">📈 Maior Medição (Direita)</h4>
                  <p><strong>Data:</strong> {new Date(maiorMenorMedicao.maiorDir.data).toLocaleString("pt-BR", { locale: ptBR })}</p>
                  <p><strong>Peso:</strong> {maiorMenorMedicao.maiorDir.peso} kg</p>
                  {estatisticas.pesoMaximoPermitido.toFixed(2) < maiorMenorMedicao.maiorDir.peso && (
                    <p className="text-red-600 font-bold mt-2">
                      ⚠️ Acima do limite permitido ({estatisticas.pesoMaximoPermitido.toFixed(2)} kg)
                    </p>
                  )}
                </div>
              )}
              {maiorMenorMedicao.menorEsq && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                  <h4 className="font-bold text-green-600">📉 Menor Medição (Esquerda)</h4>
                  <p><strong>Data:</strong> {new Date(maiorMenorMedicao.menorEsq.data).toLocaleString("pt-BR", { locale: ptBR })}</p>
                  <p><strong>Peso:</strong> {maiorMenorMedicao.menorEsq.peso} kg</p>
                  {estatisticas.pesoMaximoPermitido.toFixed(2) < maiorMenorMedicao.menorEsq.peso && (
                    <p className="text-red-600 font-bold mt-2">
                      ⚠️ Acima do limite permitido ({estatisticas.pesoMaximoPermitido.toFixed(2)} kg)
                    </p>
                  )}
                </div>
              )}
              {maiorMenorMedicao.menorDir && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                  <h4 className="font-bold text-green-600">📉 Menor Medição (Direita)</h4>
                  <p><strong>Data:</strong> {new Date(maiorMenorMedicao.menorDir.data).toLocaleString("pt-BR", { locale: ptBR })}</p>
                  <p><strong>Peso:</strong> {maiorMenorMedicao.menorDir.peso} kg</p>
                  {estatisticas.pesoMaximoPermitido.toFixed(2) < maiorMenorMedicao.menorDir.peso && (
                    <p className="text-red-600 font-bold mt-2">
                      ⚠️ Acima do limite permitido ({estatisticas.pesoMaximoPermitido.toFixed(2)} kg)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}