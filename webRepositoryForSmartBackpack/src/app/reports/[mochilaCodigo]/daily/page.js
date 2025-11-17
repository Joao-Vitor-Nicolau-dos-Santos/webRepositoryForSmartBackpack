"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart";
import StatCard from "@/components/StatCard/StatCard";
import ComparisonChart from "@/components/ComparisonChart/ComparisonChart"; // Adicione esta linha

export default function DailyReportPage() {
  const router = useRouter();
  const params = useParams(); // Hook para acessar parâmetros dinâmicos da URL
  const { authFetch } = useAuth();
  const { mochilaCodigo } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [medicoes, setMedicoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [comparisonChartData, setComparisonChartData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const hoje = new Date();
    // formata para yyyy-MM-dd manualmente, sem timezone
    return hoje.toISOString().split("T")[0];
  })
  const [expandedHour, setExpandedHour] = useState(null);
  const [expandedSubHour, setExpandedSubHour] = useState(null);
  const [statsExpanded, setStatsExpanded] = useState(true); // Controle para o bloco de estatísticas
  const animVal = useRef(); // Ref para animação (não usaremos animação no Next.js, mas mantemos para lógica de expansão)

  // --- FUNÇÃO PARA ARREDONDAR ---
  const roundTo2 = (num) => {
    return Math.round(num * 100) / 100;
  };
  // --- FIM DA FUNÇÃO ---

  // --- FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---
  const calcularEstatisticas = (valoresRaw) => {
    const valores = valoresRaw.filter((v) => typeof v === "number" && !isNaN(v));
    if (!valores.length) return null;

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    const sorted = [...valores].sort((a, b) => a - b);
    const mediana = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    const freq = {};
    valores.forEach((v) => {
      const key = roundTo2(v).toString();
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq).filter((k) => freq[k] === maxFreq).map((k) => Number(k));

    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
    const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

    const assimetria = (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;
    const curtose = (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

    return {
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      totalMedicoes: n,
      totalPeso: roundTo2(somatorio),
    };
  };
  // --- FIM DA FUNÇÃO ---

  // --- FUNÇÃO PARA CALCULAR REGRESSÃO LINEAR ---
  const calcularRegressaoLinear = (valoresRaw) => {
    const valores = valoresRaw.filter((v) => typeof v === "number" && Number.isFinite(v));
    const n = valores.length;
    if (n < 2) return null;

    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = valores;

    const somaX = x.reduce((a, b) => a + b, 0);
    const somaY = y.reduce((a, b) => a + b, 0);
    const somaXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const somaX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denom = n * somaX2 - somaX * somaX;
    if (denom === 0) return null;

    const a = (n * somaXY - somaX * somaY) / denom;
    const b = (somaY - a * somaX) / n;

    return { a: roundTo2(a), b: roundTo2(b) };
  };
  // --- FIM DA FUNÇÃO ---

  const formatToApiDate = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d; // já no formato yyyy-MM-dd
    // se vier Date, converte
    return format(d, "yyyy-MM-dd", { locale: ptBR });
  };

  // --- FUNÇÃO PARA BUSCAR O RELATÓRIO ---
  const buscarRelatorio = async (data, codigo) => {
    try {
      setLoading(true);
      setError("");
      setMedicoes([]);
      setEstatisticas(null);
      setChartData(null);
      setComparisonChartData(null);

      const dataStr = formatToApiDate(data);
      const resposta = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/dia/${dataStr}/${codigo}`
      );

      if (!resposta.ok) {
        const erroData = await resposta.json();
        throw new Error(erroData.error || `Erro ${resposta.status} ao obter relatório diário`);
      }

      const dados = await resposta.json();
      setMedicoes(dados);

      if (dados.length === 0) {
        setError("Nenhuma medição encontrada para esta data.");
        return;
      }

      // Calcular estatísticas (mantenha sua lógica original)
      const mapaHoraMinuto = {};
      dados.forEach((item) => {
        const d = new Date(item.MedicaoData);
        const hora = d.getHours().toString().padStart(2, "0");
        const minuto = d.getMinutes().toString().padStart(2, "0");
        const chave = `${hora}:${minuto}`;

        if (!mapaHoraMinuto[chave]) mapaHoraMinuto[chave] = [];
        mapaHoraMinuto[chave].push(item);
      });

      const totais = Object.values(mapaHoraMinuto).map((lista) => {
        const esquerda = lista.filter((v) => v.MedicaoLocal?.toLowerCase().includes("esquerda"));
        const direita = lista.filter((v) => v.MedicaoLocal?.toLowerCase().includes("direita"));

        const pesoEsq = esquerda.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (esquerda.length || 1);
        const pesoDir = direita.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (direita.length || 1);

        return roundTo2(pesoEsq + pesoDir);
      });

      const stats = calcularEstatisticas(totais);
      const regressao = calcularRegressaoLinear(totais);
      const regressaoText = regressao ? `y = ${regressao.a}x + ${regressao.b}` : "Regressão não aplicável";

      if (stats) {
        setEstatisticas({
          ...stats,
          regressao: regressaoText,
        });
      } else {
        setEstatisticas({ regressao: regressaoText });
      }

    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
      setError(err.message || "Erro ao conectar no servidor.");
      setMedicoes([]);
      setEstatisticas(null);
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO ---

  // --- EFEITO PARA CARREGAR OS DADOS AO MONTAR ---
  useEffect(() => {
    if (mochilaCodigo) {
      buscarRelatorio(selectedDate, mochilaCodigo); // passar string
    }
  }, [mochilaCodigo]); // deixa apenas mochilaCodigo, como já está
  // --- FIM DO EFEITO ---

  // --- EFEITO PARA PROCESSAR GRÁFICOS QUANDO AS MEDIÇÕES MUDAREM ---
  useEffect(() => {
    if (medicoes.length > 0) {

      const grupos = agruparPorIntervalo();
      const horas = Array.from({ length: 8 }, (_, i) => `${(i * 3).toString().padStart(2, "0")}:00`);

      // Dados para o primeiro gráfico (total) - FORMATO RECHARTS
      const dadosTotal = horas.map((h, i) => {
        const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
        const med = grupos[key];
        if (!med || med.length === 0) return { name: h, peso: 0 };

        const esquerda = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("esquerda"));
        const direita = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("direita"));

        const mediaEsq = esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (esquerda.length || 1);
        const mediaDir = direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (direita.length || 1);

        const total = mediaEsq + mediaDir;
        return {
          name: h,
          peso: parseFloat(total.toFixed(2))
        };
      });

      // Dados para o gráfico de comparação - FORMATO RECHARTS
      const dadosComparacao = horas.map((h, i) => {
        const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
        const med = grupos[key];

        const baseData = { name: h };

        if (!med || med.length === 0) {
          return {
            ...baseData,
            esquerda: 0,
            direita: 0
          };
        }

        const esquerda = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("esquerda"));
        const direita = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("direita"));

        const mediaEsq = esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (esquerda.length || 1);
        const mediaDir = direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (direita.length || 1);

        return {
          ...baseData,
          esquerda: parseFloat(mediaEsq.toFixed(2)),
          direita: parseFloat(mediaDir.toFixed(2))
        };
      });

      // Configurar dados para os gráficos
      setChartData(dadosTotal);
      setComparisonChartData(dadosComparacao);
    }
  }, [medicoes]);

  // --- FUNÇÃO PARA AGRUPAR POR INTERVALO ---
  const agruparPorIntervalo = () => {
    const grupos = {};
    medicoes.forEach((item) => {
      const hora = new Date(item.MedicaoData).getHours();
      const intervalo = Math.floor(hora / 3) * 3;
      const key = `${intervalo.toString().padStart(2, "0")}:00 - ${(intervalo + 3).toString().padStart(2, "0")}:00`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });
    return grupos;
  };
  // --- FIM DA FUNÇÃO ---

  const grupos = agruparPorIntervalo();

  // --- DADOS PARA O GRÁFICO ---
  const horas = Array.from({ length: 8 }, (_, i) => `${(i * 3).toString().padStart(2, "0")}:00`);
  const medias = horas.map((h, i) => {
    const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
    const med = grupos[key];
    if (!med || med.length === 0) return 0;

    const esquerda = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("esquerda"));
    const direita = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("direita"));

    const mediaEsq = esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (esquerda.length || 1);
    const mediaDir = direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (direita.length || 1);

    const total = mediaEsq + mediaDir;
    return parseFloat(total.toFixed(2));
  });

  /*
  const chartData = {
    labels: horas,
    datasets: [
      {
        data: medias,
        color: () => "#43a047",
        strokeWidth: 2,
      },
    ],
  };
  */

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-200">
          <p className="text-gray-800">Carregando relatório diário...</p>
        </div>
      </ProtectedRoute>
    );
  }

  /*
  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-red-500 p-4 text-center">
            <p>{error}</p>
            <button
              onClick={() => router.push(`/reports/${mochilaCodigo}`)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Opções
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  */

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 bg-gray-50 text-black">
        <div className="max-w-6xl mx-auto">
          {/* Cabeçalho com botão de voltar */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
              aria-label="Voltar"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Relatório Diário</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8">
            <div className="flex flex-col sm:flex-row items-end gap-4">

              {/* Seletor de Data - Largura reduzida */}
              <div className="w-full sm:w-auto">
                <label htmlFor="dataSelecionada" className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione a Data
                </label>
                <input
                  id="dataSelecionada"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Botão com ícone à esquerda */}
              <button
                onClick={() => buscarRelatorio(selectedDate, mochilaCodigo)}
                className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar Relatório
              </button>
            </div>
            {error ? (
                <div>
                  <br></br>
                  <p className="font-medium">{error}</p>
                </div>
              ) : (
                <></>
              )}
          </div>


          {/* Se houver erro, exibe somente a mensagem e interrompe o restante */}
          {error ? (
            <div></div>
          ) : (
            <>

              {/* --- BLOCO DE ESTATÍSTICAS --- */}
              <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8">
                <div className="mb-8 bg-gray-50 p-4 rounded-xl">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setStatsExpanded(!statsExpanded)}
                  >
                    <h3 className="text-xl font-bold">📈 Indicadores Estatísticos</h3>
                    <span>{statsExpanded ? "▼" : "▶"}</span>
                  </div>

                  {statsExpanded && estatisticas && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard title="Total Medições" value={estatisticas.totalMedicoes} />
                      <StatCard title="Total Peso" value={`${estatisticas.totalPeso} kg`} />
                      <StatCard title="Média (kg)" value={estatisticas.media} />
                      <StatCard title="Mediana (kg)" value={estatisticas.mediana} />
                      <StatCard title="Moda (kg)" value={estatisticas.moda} />
                      <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao} />
                      <StatCard title="Assimetria" value={estatisticas.assimetria} />
                      <StatCard title="Curtose" value={estatisticas.curtose} />
                      <StatCard title="Regressão Linear" value={estatisticas.regressao} />
                    </div>
                  )}
                  {statsExpanded && !estatisticas && (
                    <p className="text-gray-500 text-center mt-2">Nenhum dado disponível para cálculo estatístico.</p>
                  )}
                </div>
              </div>
              {/* --- FIM DO BLOCO DE ESTATÍSTICAS --- */}

              {/* Gráfico Principal */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">📊 Média de Peso por Intervalo (3h)</h3>
                {chartData && chartData.some(item => item.peso > 0) ? (
                  <Chart
                    dados={chartData}
                    titulo="Peso Médio por Intervalo"
                  />
                ) : (
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <p className="text-gray-500">Nenhum dado disponível para o gráfico principal.</p>
                  </div>
                )}
              </div>

              {/* Gráfico de Comparação - PRECISAMOS DE UM COMPONENTE ESPECÍFICO */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">⚖️ Comparativo Esquerda x Direita (3h)</h3>
                {comparisonChartData && comparisonChartData.some(item => item.esquerda > 0 || item.direita > 0) ? (
                  <ComparisonChart
                    dados={comparisonChartData}
                    titulo="Comparativo de Peso por Intervalo"
                  />
                ) : (
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <p className="text-gray-500">Nenhum dado disponível para o gráfico comparativo.</p>
                  </div>
                )}
              </div>

              {/* Detalhes por Intervalo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detalhes das Medições (3 em 3 horas)</h3>
                {horas.map((h, i) => {
                  const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
                  const itens = grupos[key];

                  if (!itens || itens.length === 0) return null;

                  const subGrupos = {};
                  itens.forEach((item) => {
                    const hora = new Date(item.MedicaoData).getHours().toString().padStart(2, "0");
                    if (!subGrupos[hora]) subGrupos[hora] = [];
                    subGrupos[hora].push(item);
                  });

                  return (
                    <div key={key} className="mb-4 bg-white rounded-lg shadow-md overflow-hidden">
                      <div
                        className={`p-4 cursor-pointer flex justify-between items-center ${expandedHour === key ? "bg-gray-100" : "bg-white"
                          }`}
                        onClick={() => setExpandedHour(expandedHour === key ? null : key)}
                      >
                        <span>{key}</span>
                        <span>{expandedHour === key ? "▼" : "▶"}</span>
                      </div>

                      {expandedHour === key && (
                        <div className="bg-gray-50 p-4">
                          {/* 🔹 CORREÇÃO 1: Ordenar as horas */}
                          {Object.entries(subGrupos)
                            .sort(([horaA], [horaB]) => horaA.localeCompare(horaB)) // Ordena as horas
                            .map(([subHora, lista]) => {

                              // 🔹 CORREÇÃO 2: Agrupar por minuto para calcular esquerda + direita juntas
                              const minutosAgrupados = {};

                              lista.forEach((item) => {
                                const data = new Date(item.MedicaoData);
                                const minuto = String(data.getMinutes()).padStart(2, "0");
                                const minutoKey = `${subHora}:${minuto}`;

                                if (!minutosAgrupados[minutoKey]) {
                                  minutosAgrupados[minutoKey] = {
                                    horaMinuto: `${subHora}:${minuto}`,
                                    esquerda: [],
                                    direita: []
                                  };
                                }

                                const local = item.MedicaoLocal?.toLowerCase();
                                const peso = Number(item.MedicaoPeso || 0);

                                if (local.includes("esquerda")) {
                                  minutosAgrupados[minutoKey].esquerda.push(peso);
                                } else if (local.includes("direita")) {
                                  minutosAgrupados[minutoKey].direita.push(peso);
                                }
                              });

                              return (
                                <div key={subHora} className="mb-3">
                                  {/* Cabeçalho da Hora */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedSubHour(expandedSubHour === subHora ? null : subHora);
                                    }}
                                    className={`w-full flex justify-between items-center p-2 text-left hover:bg-gray-100 transition-colors rounded ${expandedSubHour === subHora ? 'bg-gray-100' : 'bg-white'
                                      }`}
                                  >
                                    <span className="font-medium text-gray-700">
                                      {subHora}:00
                                    </span>
                                    <span className="text-gray-500">
                                      {expandedSubHour === subHora ? '▼' : '▶'}
                                    </span>
                                  </button>

                                  {/* Detalhes dos Minutos */}
                                  {expandedSubHour === subHora && (
                                    <div className="mt-2 space-y-2">
                                      {/* 🔹 CORREÇÃO 3: Ordenar os minutos e processar agrupado */}
                                      {Object.values(minutosAgrupados)
                                        .sort((a, b) => a.horaMinuto.localeCompare(b.horaMinuto)) // Ordena minutos
                                        .map((minutoData, index) => {

                                          // Calcular médias para o minuto
                                          const avgLeft = minutoData.esquerda.length > 0
                                            ? minutoData.esquerda.reduce((acc, peso) => acc + peso, 0) / minutoData.esquerda.length
                                            : 0;

                                          const avgRight = minutoData.direita.length > 0
                                            ? minutoData.direita.reduce((acc, peso) => acc + peso, 0) / minutoData.direita.length
                                            : 0;

                                          const total = avgLeft + avgRight;
                                          const isAlert = total > 10;

                                          // Calcular equilíbrio
                                          const diferenca = Math.abs(avgLeft - avgRight);
                                          const maiorPeso = Math.max(avgLeft, avgRight);
                                          const percentual = maiorPeso > 0 ? (diferenca / maiorPeso) * 100 : 0;

                                          return (
                                            <div
                                              key={index}
                                              className={`p-3 rounded-lg border ${isAlert
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-white border-gray-200'
                                                }`}
                                            >
                                              <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-blue-600">
                                                  {minutoData.horaMinuto}
                                                </span>
                                                {/* Indicador de Equilíbrio */}
                                                <div className="flex items-center">
                                                  <div className={`w-16 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                                                    <div
                                                      className={`h-full ${percentual > 5
                                                        ? 'bg-red-500'
                                                        : 'bg-green-500'
                                                        }`}
                                                      style={{
                                                        width: `${Math.min(percentual, 100)}%`,
                                                        marginLeft: avgLeft > avgRight ? '0' : 'auto'
                                                      }}
                                                    ></div>
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="text-sm">
                                                  <span className="font-medium">Esquerda:</span>{' '}
                                                  {avgLeft.toFixed(2)} kg
                                                </div>
                                                <div className="text-sm">
                                                  <span className="font-medium">Direita:</span>{' '}
                                                  {avgRight.toFixed(2)} kg
                                                </div>
                                              </div>

                                              <div className="flex justify-between items-center">
                                                <span className="font-semibold">
                                                  Total: {total.toFixed(2)} kg
                                                </span>
                                                {isAlert && (
                                                  <span className="text-red-600 font-semibold text-sm">
                                                    ⚠️ Peso Excedido!
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}