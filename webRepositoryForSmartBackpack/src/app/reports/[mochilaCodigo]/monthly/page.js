"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/app/hooks/useAuth"; // Certifique-se do caminho correto
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute"; // Certifique-se do caminho correto
import Header from "@/components/Header/Header"; // Certifique-se do caminho correto
import Chart from "@/components/Chart/Chart"; // Certifique-se de que o componente Chart aceite os dados corretamente
import StatCard from "@/components/StatCard/StatCard"; // Certifique-se de que o componente StatCard esteja pronto

// --- FUNÇÃO AUXILIAR PARA ARREDONDAR PARA 2 CASAS DECIMAIS ---
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}
// --- FIM DA FUNÇÃO AUXILIAR ---

export default function MonthlyReportPage() {
  const router = useRouter();
  const params = useParams();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params` (conforme o aviso anterior)
  // const resolvedParams = React.use(params);
  const { mochilaCodigo } = params;

  // --- Estados ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  const [estatisticas, setEstatisticas] = useState(null); // Estatísticas calculadas
  const [dadosProcessados, setDadosProcessados] = useState({
    dailyAvgs: [],
    dailyLabels: [],
    dailyAvgsEsq: [],
    dailyAvgsDir: [],
    maiorEsq: null,
    maiorDir: null,
    menorEsq: null,
    menorDir: null,
    totalMedicoes: 0,
    mediçõesAcimaLimite: 0,
    diasComMedicao: 0,
    pesoMaximoPermitido: 0,
  });
  // --- Novos estados para selecionar ano e mês ---
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0')); // Mês atual (01-12)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano atual
  // --- Estado para controle de expansão do bloco de estatísticas ---
  const [statsExpanded, setStatsExpanded] = useState(true);
  // --- Fim dos estados ---

  // --- FUNÇÃO PARA CALCULAR ESTATÍSTICAS (opcional, se a API não calcular) ---
  // Neste exemplo, vamos assumir que a API retorna os dados processados e as estatísticas
  // Se você quiser calcular no frontend, mantenha a função calcularEstatisticas do seu código anterior
  // const calcularEstatisticas = (valoresRaw) => { ... };
  // --- FIM DA FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ---
  const loadReport = async (mochilaCodigo, ano, mes) => {
    try {
      setLoading(true);
      setError("");
      setEstatisticas(null); // Limpa estatísticas anteriores
      setDadosProcessados({
        dailyAvgs: [],
        dailyLabels: [],
        dailyAvgsEsq: [],
        dailyAvgsDir: [],
        maiorEsq: null,
        maiorDir: null,
        menorEsq: null,
        menorDir: null,
        totalMedicoes: 0,
        mediçõesAcimaLimite: 0,
        diasComMedicao: 0,
        pesoMaximoPermitido: 0,
      });

      // --- CONSTRUÇÃO DA URL COM ANO E MÊS ---
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/mensal/${ano}/${mes}/${mochilaCodigo}`
      );
      // --- FIM DA CONSTRUÇÃO ---

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
      console.log("[MonthlyReportPage] Dados brutos recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS ---
      // A API deve retornar um objeto com 'estatisticas' e 'dadosProcessados'
      // Exemplo de estrutura esperada:
      // {
      //   "estatisticas": { "media": 2.5, "mediana": 2.4, ... },
      //   "dadosProcessados": {
      //     "dailyAvgs": [2.1, 2.3, ...], // Média diária total
      //     "dailyLabels": ["01", "02", ...], // Dias do mês
      //     "dailyAvgsEsq": [1.0, 1.1, ...], // Média diária esquerda
      //     "dailyAvgsDir": [1.1, 1.2, ...], // Média diária direita
      //     "maiorEsq": { "MedicaoData": "...", "MedicaoPeso": "...", ... },
      //     ...
      //   }
      // }

      if (rawData.estatisticas) {
        setEstatisticas(rawData.estatisticas);
      }
      if (rawData.dadosProcessados) {
        setDadosProcessados(rawData.dadosProcessados);
      }

      // Se a API NÃO retornar dadosProcessados, podemos tentar processar rawData aqui
      // Mas é melhor que a API já retorne no formato desejado
      if (!rawData.dadosProcessados && Array.isArray(rawData)) {
         console.warn("[MonthlyReportPage] API retornou array. Processando no frontend...");
         // Processamento frontend (similar ao modelo diário, mas adaptado para mês)
         // Agrupar por dia
         const gruposPorDia = {};
         rawData.forEach(item => {
            const data = new Date(item.MedicaoData);
            const dia = data.getDate();
            const chave = `${dia.toString().padStart(2, '0')}`;
            if (!gruposPorDia[chave]) gruposPorDia[chave] = [];
            gruposPorDia[chave].push(item);
         });

         const mediasPorDia = Object.entries(gruposPorDia).map(([dia, lista]) => {
            const esquerda = lista.filter(m => m.MedicaoLocal?.toLowerCase().includes("esquerda"));
            const direita = lista.filter(m => m.MedicaoLocal?.toLowerCase().includes("direita"));

            const mediaEsq = esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (esquerda.length || 1);
            const mediaDir = direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (direita.length || 1);
            const total = mediaEsq + mediaDir;

            return { dia, total: roundTo2(total), esq: roundTo2(mediaEsq), dir: roundTo2(mediaDir) };
         });

         const labels = mediasPorDia.map(m => m.dia);
         const avgs = mediasPorDia.map(m => m.total);
         const avgsEsq = mediasPorDia.map(m => m.esq);
         const avgsDir = mediasPorDia.map(m => m.dir);

         // Dados para o gráfico
         setChartData(labels.map((label, index) => ({
            name: label,
            total: avgs[index],
            esquerda: avgsEsq[index],
            direita: avgsDir[index]
         })));

         // Processar estatísticas com base nos totais diários
         const totais = mediasPorDia.map(m => m.total);
         const stats = calcularEstatisticas(totais);
         if (stats) setEstatisticas(stats);
      } else if (rawData.dadosProcessados) {
         // Dados já processados pela API
         const { dailyAvgs, dailyLabels, dailyAvgsEsq, dailyAvgsDir } = rawData.dadosProcessados;
         setChartData(dailyLabels.map((label, index) => ({
            name: label,
            total: dailyAvgs[index],
            esquerda: dailyAvgsEsq[index],
            direita: dailyAvgsDir[index]
         })));
      }

    } catch (err) {
      console.error("[MonthlyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório mensal.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
      setDadosProcessados({
        dailyAvgs: [],
        dailyLabels: [],
        dailyAvgsEsq: [],
        dailyAvgsDir: [],
        maiorEsq: null,
        maiorDir: null,
        menorEsq: null,
        menorDir: null,
        totalMedicoes: 0,
        mediçõesAcimaLimite: 0,
        diasComMedicao: 0,
        pesoMaximoPermitido: 0,
      });
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO loadReport ---

  // --- Carregar o relatório ao montar ou quando ano/mes/mochilaCodigo mudarem ---
  useEffect(() => {
    if (mochilaCodigo) {
      loadReport(mochilaCodigo, selectedYear, selectedMonth);
    }
  }, [mochilaCodigo, selectedYear, selectedMonth]);
  // --- Fim do useEffect ---

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
              onClick={() => router.push(`/reports/${mochilaCodigo}`)} // Volta para as opções de relatório da mochila
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Voltar para Opções
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const {
    dailyAvgs,
    dailyLabels,
    dailyAvgsEsq,
    dailyAvgsDir,
    maiorEsq,
    maiorDir,
    menorEsq,
    menorDir,
    totalMedicoes,
    mediçõesAcimaLimite,
    diasComMedicao,
    pesoMaximoPermitido,
  } = dadosProcessados;

  // Cálculo do percentual de medições acima do limite (se necessário)
  const percentualAcimaLimite = totalMedicoes > 0 ? roundTo2((mediçõesAcimaLimite / totalMedicoes) * 100) : 0;

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black">
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
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
          <div className="mb-6 p-4 bg-gray-100 rounded-lg flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="monthSelector" className="block text-sm font-medium text-gray-700 mb-1">
                Mês
              </label>
              <select
                id="monthSelector"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {[...Array(12)].map((_, i) => {
                  const mesNum = i + 1;
                  const mesStr = mesNum.toString().padStart(2, '0');
                  const nomeMes = new Date(0, i).toLocaleString('pt-BR', { month: 'long' });
                  return (
                    <option key={mesStr} value={mesStr}>
                      {nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ({mesStr})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="yearSelector" className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                id="yearSelector"
                value={selectedYear}
                onChange={handleYearChange}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {[...Array(5)].map((_, i) => {
                  const ano = new Date().getFullYear() - 2 + i; // Ex: de 2023 a 2027
                  return (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* --- SEÇÃO DE ESTATÍSTICAS EXPANSÍVEL --- */}
          <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setStatsExpanded(!statsExpanded)}
            >
              <h2 className="text-xl font-semibold">📈 Indicadores Estatísticos</h2>
              <span>{statsExpanded ? "▼" : "▶"}</span>
            </div>

            {statsExpanded && estatisticas && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Medições" value={estatisticas.totalMedicoes || 0} />
                <StatCard title="Dias c/ Medição" value={estatisticas.diasComMedicao || 0} />
                <StatCard title="Média Total (kg)" value={estatisticas.media || "—"} />
                <StatCard title="Mediana (kg)" value={estatisticas.mediana || "—"} />
                <StatCard title="Moda (kg)" value={estatisticas.moda || "—"} />
                <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao || "—"} />
                <StatCard title="Assimetria" value={estatisticas.assimetria || "—"} />
                <StatCard title="Curtose" value={estatisticas.curtose || "—"} />
                <StatCard
                  title="Regressão Linear"
                  value={
                    estatisticas.regressao
                      ? `y = ${estatisticas.regressao.a}x + ${estatisticas.regressao.b}`
                      : "Não aplicável"
                  }
                />
              </div>
            )}
            {statsExpanded && !estatisticas && (
              <p className="text-gray-500 text-center mt-2">Nenhum dado disponível para cálculo estatístico.</p>
            )}
          </div>
          {/* --- FIM DA SEÇÃO DE ESTATÍSTICAS --- */}

          {/* Gráfico de Média Diária Total */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">📊 Média Diária do Mês</h3>
            {dailyAvgs.length > 0 ? (
              <Chart
                dados={dailyAvgs.map((peso, index) => ({ name: dailyLabels[index] || `Dia ${index + 1}`, peso }))}
                titulo="Média Diária do Mês"
              />
            ) : (
              <p className="text-gray-500 text-center">Gráfico da Média Diária indisponível.</p>
            )}
          </div>

          {/* Gráfico Comparativo Esquerda x Direita */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">⚖️ Comparativo Esquerda x Direita (por dia)</h3>
            {(dailyAvgsEsq.length > 0 && dailyAvgsDir.length > 0) ? (
              <Chart
                dados={[
                  { name: "Esquerda", data: dailyAvgsEsq, color: "#F46334" },
                  { name: "Direita", data: dailyAvgsDir, color: "#36985B" }
                ]}
                labels={dailyLabels}
                titulo="Comparativo de Peso por Dia"
              />
            ) : (
              <p className="text-gray-500 text-center">Gráfico Comparativo indisponível ou dados insuficientes.</p>
            )}
          </div>

          {/* Cards de Maior e Menor Medição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {maiorEsq && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                <h4 className="font-bold text-red-600">📈 Maior Medição (Esquerda)</h4>
                <p><strong>Data:</strong> {new Date(maiorEsq.MedicaoData).toLocaleString("pt-BR", { locale: ptBR })}</p>
                <p><strong>Peso:</strong> {maiorEsq.MedicaoPeso} kg</p>
                <p><strong>Local:</strong> {maiorEsq.MedicaoLocal}</p>
              </div>
            )}
            {maiorDir && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                <h4 className="font-bold text-red-600">📈 Maior Medição (Direita)</h4>
                <p><strong>Data:</strong> {new Date(maiorDir.MedicaoData).toLocaleString("pt-BR", { locale: ptBR })}</p>
                <p><strong>Peso:</strong> {maiorDir.MedicaoPeso} kg</p>
                <p><strong>Local:</strong> {maiorDir.MedicaoLocal}</p>
              </div>
            )}
            {menorEsq && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                <h4 className="font-bold text-green-600">📉 Menor Medição (Esquerda)</h4>
                <p><strong>Data:</strong> {new Date(menorEsq.MedicaoData).toLocaleString("pt-BR", { locale: ptBR })}</p>
                <p><strong>Peso:</strong> {menorEsq.MedicaoPeso} kg</p>
                <p><strong>Local:</strong> {menorEsq.MedicaoLocal}</p>
              </div>
            )}
            {menorDir && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                <h4 className="font-bold text-green-600">📉 Menor Medição (Direita)</h4>
                <p><strong>Data:</strong> {new Date(menorDir.MedicaoData).toLocaleString("pt-BR", { locale: ptBR })}</p>
                <p><strong>Peso:</strong> {menorDir.MedicaoPeso} kg</p>
                <p><strong>Local:</strong> {menorDir.MedicaoLocal}</p>
              </div>
            )}
          </div>

          {/* Mensagem se não houver medições */}
          {totalMedicoes === 0 && (
            <p className="text-gray-500 text-center">Nenhuma medição encontrada para este mês.</p>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}