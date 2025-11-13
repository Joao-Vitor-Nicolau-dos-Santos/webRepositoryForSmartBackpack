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

export default function DailyReportPage() {
  const router = useRouter();
  const params = useParams(); // Hook para acessar parâmetros dinâmicos da URL
  const { authFetch } = useAuth();
  const { mochilaCodigo } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [medicoes, setMedicoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Data inicial: Hoje
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

  // --- FUNÇÃO PARA BUSCAR O RELATÓRIO ---
  const buscarRelatorio = async (data, codigo) => {
    try {
      setLoading(true);
      setError("");
      setMedicoes([]);
      setEstatisticas(null);

      const resposta = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/dia/${format(data, "yyyy-MM-dd", { locale: ptBR })}/${codigo}`
      );

      if (!resposta.ok) {
        const erroData = await resposta.json();
        throw new Error(erroData.error || `Erro ${resposta.status} ao obter relatório diário`);
      }

      const dados = await resposta.json();
      setMedicoes(dados);

      // --- PROCESSAMENTO DOS DADOS PARA O GRÁFICO E ESTATÍSTICAS ---
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
      buscarRelatorio(selectedDate, mochilaCodigo);
    }
  }, [selectedDate, mochilaCodigo]); // Re-executa se a data ou o código da mochila mudarem
  // --- FIM DO EFEITO ---

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

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório diário...</p>
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
      <main className="min-h-screen p-8 bg-gray-50 text-black">
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
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

          {/* Seletor de Data */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <label htmlFor="dataSelecionada" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Data
            </label>
            <input
              id="dataSelecionada"
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Botão para buscar relatório (opcional, pois já atualiza ao mudar a data) */}
          {/* <button
            onClick={() => buscarRelatorio(selectedDate, mochilaCodigo)}
            className="mb-6 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Buscar Relatório
          </button> */}

          {/* --- BLOCO DE ESTATÍSTICAS --- */}
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
          {/* --- FIM DO BLOCO DE ESTATÍSTICAS --- */}

          {/* Gráfico */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">📊 Média de Peso por Intervalo (3h)</h3>
            <Chart dados={chartData.datasets[0].data} labels={chartData.labels} titulo="Peso Médio por Intervalo" />
          </div>

          {/* Gráfico de Comparação Esquerda x Direita */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">⚖️ Comparativo Esquerda x Direita (3h)</h3>
            <Chart
              dados={[
                {
                  data: horas.map((h, i) => {
                    const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
                    const med = grupos[key];
                    if (!med || med.length === 0) return 0;
                    const esquerda = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("esquerda"));
                    const mediaEsq = esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (esquerda.length || 1);
                    return parseFloat(mediaEsq.toFixed(2));
                  }),
                  color: () => "#F46334",
                  strokeWidth: 2,
                },
                {
                  data: horas.map((h, i) => {
                    const key = `${(i * 3).toString().padStart(2, "0")}:00 - ${((i + 1) * 3).toString().padStart(2, "0")}:00`;
                    const med = grupos[key];
                    if (!med || med.length === 0) return 0;
                    const direita = med.filter((m) => m.MedicaoLocal?.toLowerCase().includes("direita"));
                    const mediaDir = direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) / (direita.length || 1);
                    return parseFloat(mediaDir.toFixed(2));
                  }),
                  color: () => "#36985B",
                  strokeWidth: 2,
                },
              ]}
              labels={horas}
              titulo="Comparativo de Peso por Intervalo"
            />
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
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div
                    className={`p-4 cursor-pointer flex justify-between items-center ${
                      expandedHour === key ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setExpandedHour(expandedHour === key ? null : key)}
                  >
                    <span>{key}</span>
                    <span>{expandedHour === key ? "▼" : "▶"}</span>
                  </div>

                  {expandedHour === key && (
                    <div className="bg-gray-50 p-2">
                      {Object.entries(subGrupos).map(([subHora, lista]) => {
                        const mediasHora = lista.map((item) => ({
                          hora: new Date(item.MedicaoData).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                          pesoEsq: 0, // Será calculado abaixo
                          pesoDir: 0, // Será calculado abaixo
                          total: 0,   // Será calculado abaixo
                          inclinacao: "",
                        }));

                        // Agrupar por lado e calcular médias
                        const esquerda = lista.filter((v) => v.MedicaoLocal?.toLowerCase().includes("esquerda"));
                        const direita = lista.filter((v) => v.MedicaoLocal?.toLowerCase().includes("direita"));

                        const pesoEsq = esquerda.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (esquerda.length || 1);
                        const pesoDir = direita.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (direita.length || 1);
                        const total = pesoEsq + pesoDir;
                        const inclinacao = pesoEsq === pesoDir ? "equilibrado" : pesoEsq > pesoDir ? "esquerda" : "direita";

                        const dadosProcessados = mediasHora.map((m) => ({
                          ...m,
                          pesoEsq: roundTo2(pesoEsq),
                          pesoDir: roundTo2(pesoDir),
                          total: roundTo2(total),
                          inclinacao,
                        }));

                        return (
                          <div key={subHora}>
                            <div
                              className={`p-3 cursor-pointer flex justify-between items-center ${
                                expandedSubHour === subHora ? "bg-gray-200" : "bg-gray-100"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSubHour(expandedSubHour === subHora ? null : subHora);
                              }}
                            >
                              <span>{subHora}:00</span>
                              <span>{expandedSubHour === subHora ? "▼" : "▶"}</span>
                            </div>

                            {expandedSubHour === subHora &&
                              dadosProcessados.map((dado, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 m-2 rounded-lg ${
                                    dado.total > 10 ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300" // Exemplo de cor baseado em peso (ajuste conforme necessário)
                                  } border`}
                                >
                                  <p>Hora: {dado.hora}</p>
                                  <p>Peso Esquerdo: {dado.pesoEsq} kg</p>
                                  <p>Peso Direito: {dado.pesoDir} kg</p>
                                  <p>Total: {dado.total} kg</p>
                                  <p>Inclinação: {dado.inclinacao}</p>
                                  {dado.total > 10 && <p className="text-red-600"> Peso acima do limite!</p>} {/* Exemplo de alerta */}
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}