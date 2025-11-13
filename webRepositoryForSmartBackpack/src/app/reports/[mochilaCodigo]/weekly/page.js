"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/app/hooks/useAuth"; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute"; 
import Header from "@/components/Header/Header"; 
import Chart from "@/components/Chart/Chart"; 
import StatCard from "@/components/StatCard/StatCard"; 

export default function WeeklyReportPage() {
  const router = useRouter();
  const params = useParams();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params` (conforme aviso do Next.js App Router)
  // const resolvedParams = React.use(params);
  const { mochilaCodigo } = params;

  // --- Estados ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [medicoes, setMedicoes] = useState([]); // Medições brutas (usadas apenas no modo semanal)
  const [estatisticas, setEstatisticas] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Data inicial: Semana atual
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedBlockKeys, setExpandedBlockKeys] = useState({});
  const [expandedHourKeys, setExpandedHourKeys] = useState({});
  const [modoGeral, setModoGeral] = useState(false); // Novo estado para modo geral
  const [relatorioGeralAgrupado, setRelatorioGeralAgrupado] = useState([]); // Dados agrupados para modo geral
  const [statsExpanded, setStatsExpanded] = useState(true); // Controle para o bloco de estatísticas
  // --- Fim dos estados ---

  // --- Função auxiliar para arredondar ---
  const roundTo2 = (num) => {
    return Math.round(num * 100) / 100;
  };
  // --- Fim da função auxiliar ---

  // --- Função para calcular estatísticas ---
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

    const acimaDaMedia = valores.filter(v => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    return {
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      totalMedicoes: n,
      totalPeso: roundTo2(somatorio),
      probAcimaMedia: roundTo2(probAcimaMedia * 100), // em %
    };
  };
  // --- Fim da função para calcular estatísticas ---

  // --- Função para calcular regressão linear ---
  const calcularRegressaoLinear = (x, y) => {
    const n = x.length;
    if (n < 2) return null;

    const somaX = x.reduce((a, b) => a + b, 0);
    const somaY = y.reduce((a, b) => a + b, 0);
    const somaXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const somaX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denom = (n * somaX2 - somaX * somaX);
    if (denom === 0) return null;

    const a = (n * somaXY - somaX * somaY) / denom;
    const b = (somaY - a * somaX) / n;

    return { a: roundTo2(a), b: roundTo2(b) };
  };
  // --- Fim da função para regressão linear ---

  // --- Função para buscar o relatório ---
  const buscarRelatorio = async () => {
    try {
      setLoading(true);
      setError("");
      setMedicoes([]);
      setEstatisticas(null);
      setRelatorioGeralAgrupado([]); // Limpa estado do relatório geral

      let url = "";

      if (modoGeral) {
        // 🔹 Modo Relatório Geral
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/geral/${mochilaCodigo}`;
      } else {
        // 🔹 Modo Semana Selecionada
        const inicio = format(startOfWeek(selectedWeek, { locale: ptBR }), "yyyy-MM-dd");
        const fim = format(endOfWeek(selectedWeek, { locale: ptBR }), "yyyy-MM-dd");
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/periodo/${inicio}/${fim}/${mochilaCodigo}`;
      }

      const res = await authFetch(url);

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("[WeeklyReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const dados = await res.json();
      console.log(`[WeeklyReportPage] Dados recebidos da API (${modoGeral ? 'Geral' : 'Semanal'}):`, dados);

      if (modoGeral) {
        // 🟢 NOVO: Consome os dados pré-processados da API para o Relatório Geral
        setRelatorioGeralAgrupado(dados.agrupadoPorDia || []); // Contém os dados para o gráfico e estatísticas
        setEstatisticas(dados.estatisticas || null);

        // Calcular regressão linear com base nos dados agrupados
        const valoresY = dados.agrupadoPorDia.map(d => d.mediaPeso).filter(v => v != null);
        const xVals = valoresY.map((_, i) => i + 1);
        const regressao = calcularRegressaoLinear(xVals, valoresY);
        const regressaoText = regressao ? `y = ${regressao.a}x + ${regressao.b}` : "Regressão não aplicável";

        if (dados.estatisticas) {
          setEstatisticas({
            ...dados.estatisticas,
            regressao: regressaoText
          });
        } else {
          setEstatisticas({ regressao: regressaoText });
        }
      } else {
        // 🔹 Modo Semana Selecionada: Processamento local (necessário para detalhes)
        setMedicoes(dados);

        // Agrupar medições por minuto (hora:minuto) para calcular estatísticas e agrupar por dia/intervalo
        const mapaHoraMinuto = {};
        dados.forEach((item) => {
          const dt = new Date(item.MedicaoData);
          const hora = dt.getHours().toString().padStart(2, "0");
          const minuto = dt.getMinutes().toString().padStart(2, "0");
          const chave = `${hora}:${minuto}`;

          if (!mapaHoraMinuto[chave]) mapaHoraMinuto[chave] = { left: [], right: [], raw: [] };

          const local = (item.MedicaoLocal || "").toString().toLowerCase();
          if (local.includes("esquer")) mapaHoraMinuto[chave].left.push(Number(item.MedicaoPeso || 0));
          else if (local.includes("direit")) mapaHoraMinuto[chave].right.push(Number(item.MedicaoPeso || 0));
          else if (local.includes("amb") || local.includes("cent")) {
            mapaHoraMinuto[chave].left.push(Number(item.MedicaoPeso || 0));
            mapaHoraMinuto[chave].right.push(Number(item.MedicaoPeso || 0));
          } else mapaHoraMinuto[chave].raw.push(Number(item.MedicaoPeso || 0));
        });

        const totais = Object.keys(mapaHoraMinuto).map((k) => {
          const obj = mapaHoraMinuto[k];
          const avgLeft = obj.left.length ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length : 0;
          const avgRight = obj.right.length ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length : 0;
          return roundTo2((avgLeft || 0) + (avgRight || 0));
        });

        const stats = calcularEstatisticas(totais);

        // Calcular regressão linear com base nos totais
        const x = []; // eixo X → índices (1, 2, 3, ...)
        const y = []; // eixo Y → totais válidos

        totais.forEach((valor, i) => {
          if (typeof valor === 'number' && !isNaN(valor)) {
            x.push(i + 1);
            y.push(valor);
          }
        });

        let regressao = null;
        if (x.length >= 2) {
          regressao = calcularRegressaoLinear(x, y);
        }
        const regressaoText = regressao ? `y = ${regressao.a}x + ${regressao.b}` : "Regressão não aplicável";

        setEstatisticas({
          ...stats,
          regressao: regressaoText
        });
      }

    } catch (err) {
      console.error("[WeeklyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório.");
      setMedicoes([]);
      setEstatisticas(null);
      setRelatorioGeralAgrupado([]);
    } finally {
      setLoading(false);
    }
  };
  // --- Fim da função buscarRelatorio ---

  // --- Efeito para carregar dados ao montar ou quando a semana/mochilaCodigo/modoGeral mudarem ---
  useEffect(() => {
    if (mochilaCodigo) {
      buscarRelatorio();
    }
  }, [selectedWeek, mochilaCodigo, modoGeral]); // Re-executa se a semana, mochila ou modo mudarem
  // --- Fim do efeito ---

  // --- Agrupar por dia (usado apenas no modo semanal) ---
  const groupByDaySorted = (lista) => {
    const map = {};
    lista.forEach((m) => {
      const dt = new Date(m.MedicaoData);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(m);
    });

    const sortedKeys = Object.keys(map).sort();

    return sortedKeys.map((k) => {
      const d = new Date(k + "T00:00:00");
      const label = format(d, "EEEE, dd/MM", { locale: ptBR });
      map[k].sort((a, b) => new Date(a.MedicaoData) - new Date(b.MedicaoData));
      return { dateKey: k, label, items: map[k] };
    });
  };

  // --- Agrupar por intervalo de 3h (usado apenas no modo semanal) ---
  const buildDayDetails = (items) => {
    const minuteMap = {};
    items.forEach((m) => {
      const dt = new Date(m.MedicaoData);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      const minuteKey = `${hh}:${mm}`;
      if (!minuteMap[minuteKey]) minuteMap[minuteKey] = { left: [], right: [], other: [], raw: [] };

      const localLower = (m.MedicaoLocal || "").toLowerCase();
      if (localLower.includes("esquer")) minuteMap[minuteKey].left.push(Number(m.MedicaoPeso || 0));
      else if (localLower.includes("direit")) minuteMap[minuteKey].right.push(Number(m.MedicaoPeso || 0));
      else if (localLower.includes("amb") || localLower.includes("cent")) {
        minuteMap[minuteKey].left.push(Number(m.MedicaoPeso || 0));
        minuteMap[minuteKey].right.push(Number(m.MedicaoPeso || 0));
      } else minuteMap[minuteKey].other.push(Number(m.MedicaoPeso || 0));

      minuteMap[minuteKey].raw.push(m);
    });

    const minuteKeys = Object.keys(minuteMap).sort((a, b) => {
      const [hA, mA] = a.split(":").map(Number);
      const [hB, mB] = b.split(":").map(Number);
      return hA === hB ? mA - mB : hA - hB;
    });

    const minuteEntries = minuteKeys.map((key) => {
      const obj = minuteMap[key];
      const avgLeft = obj.left.length > 0 ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length : 0;
      const avgRight = obj.right.length > 0 ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length : 0;
      const total = avgLeft + avgRight;

      return {
        minute: key,
        avgLeft: parseFloat(avgLeft.toFixed(2)),
        avgRight: parseFloat(avgRight.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        raw: obj.raw,
      };
    });

    const blocks = {};
    minuteEntries.forEach((me) => {
      const [hh] = me.minute.split(":").map(Number);
      const blockStart = Math.floor(hh / 3) * 3;
      const hourKey = String(hh).padStart(2, "0");
      if (!blocks[blockStart]) blocks[blockStart] = { start: blockStart, end: blockStart + 3, hours: {}, minutes: [] };
      if (!blocks[blockStart].hours[hourKey]) blocks[blockStart].hours[hourKey] = [];
      blocks[blockStart].hours[hourKey].push(me);
      blocks[blockStart].minutes.push(me);
    });

    Object.keys(blocks).forEach((bk) => {
      const b = blocks[bk];
      const count = b.minutes.length;
      const sum = b.minutes.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
      b.blockMinutesCount = count;
      b.blockSumTotal = parseFloat(sum.toFixed(2));
      b.blockAvgTotal = parseFloat((count > 0 ? sum / count : 0).toFixed(2));
      const hourKeys = Object.keys(b.hours).sort((a, b) => Number(a) - Number(b));
      const hoursSorted = {};
      hourKeys.forEach(hk => {
        hoursSorted[hk] = b.hours[hk].sort((x, y) => {
          const [hA, mA] = x.minute.split(":").map(Number);
          const [hB, mB] = y.minute.split(":").map(Number);
          if (hA === hB) return mA - mB;
          return hA - hB;
        });
      });
      b.hours = hoursSorted;
    });

    const dayMinutesCount = minuteEntries.length;
    const daySumTotal = minuteEntries.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
    const dayAvgTotal = parseFloat((dayMinutesCount > 0 ? daySumTotal / dayMinutesCount : 0).toFixed(2));

    return {
      minuteEntries,
      blocks,
      daySumTotal: parseFloat(daySumTotal.toFixed(2)),
      dayAvgTotal,
    };
  };

  // --- Constrói os grupos para a UI ---
  const buildGroupsForUI = () => {
    if (modoGeral) {
      if (!relatorioGeralAgrupado.length) return [];

      // Agrupa por key para evitar duplicatas
      const groupedByKey = {};
      relatorioGeralAgrupado.forEach(g => {
        if (!groupedByKey[g.key]) {
          groupedByKey[g.key] = g;
        }
      });

      // Ordena os dias da semana corretamente
      const diasOrdenados = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
      return diasOrdenados
        .filter(dia => groupedByKey[dia])
        .map(dia => ({
          key: groupedByKey[dia].key,
          label: groupedByKey[dia].label,
          mediaPeso: groupedByKey[dia].mediaPeso,
          details: {
            dayAvgTotal: groupedByKey[dia].mediaPeso || 0
          }
        }));
    } else {
      // Modo Semana Selecionada
      const filtered = medicoes.filter((m) =>
        // isWithinInterval(logic here if needed, but groupByDaySorted already filters by week)
        true // groupByDaySorted já filtra corretamente
      );
      const days = groupByDaySorted(filtered);
      return days.map(d => {
        const details = buildDayDetails(d.items);
        return { key: d.dateKey, label: d.label, items: d.items, details };
      });
    }
  };

  const groupsForUI = buildGroupsForUI();

  // --- Dados para o gráfico ---
  const chartLabels = groupsForUI.map(g => {
    if (modoGeral) {
      return g.label.split("-")[0].slice(0, 3); // "segunda-feira" -> "seg"
    } else {
      return g.label.split(",")[0].slice(0, 3); // "segunda-feira, 21/10" -> "seg"
    }
  });

  const chartValues = groupsForUI.map(g => {
    if (modoGeral) {
      return g.mediaPeso || 0;
    } else {
      return g.details?.dayAvgTotal || 0;
    }
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        color: () => "#43a047",
        strokeWidth: 2,
      },
    ],
  };

  // --- Manipuladores para expansão ---
  const toggleBlock = (dayKey, blockStart) => {
    const k = `${dayKey}|${blockStart}`;
    setExpandedBlockKeys(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleHour = (dayKey, hour) => {
    const k = `${dayKey}|${hour}`;
    setExpandedHourKeys(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleStats = () => {
    setStatsExpanded(!statsExpanded);
  };

  // --- Manipulador para alterar a data (seletor de semana) ---
  const handleWeekChange = (e) => {
    const newDate = new Date(e.target.value);
    newDate.setDate(newDate.getDate() - (newDate.getDay() - 1 + 7) % 7); // Ajusta para segunda-feira
    setSelectedWeek(newDate);
  };
  // --- Fim do manipulador ---

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório semanal...</p>
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
              <h1 className="text-2xl font-bold">Relatório Semanal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Botões de Modo */}
          <div className="flex justify-center mb-6 space-x-4">
            <button
              onClick={() => setModoGeral(false)}
              className={`px-4 py-2 rounded-lg ${
                !modoGeral ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              📅 Semana Selecionada
            </button>
            <button
              onClick={() => setModoGeral(true)}
              className={`px-4 py-2 rounded-lg ${
                modoGeral ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              📊 Relatório Geral
            </button>
          </div>

          {/* Seletor de Data (apenas no modo semanal) */}
          {!modoGeral && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <label htmlFor="weekSelector" className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a Semana
              </label>
              <input
                id="weekSelector"
                type="week"
                value={format(startOfWeek(selectedWeek, { locale: ptBR }), "yyyy-'W'ww")}
                onChange={handleWeekChange}
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* --- BLOCO DE ESTATÍSTICAS --- */}
          {estatisticas && (
            <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={toggleStats}
              >
                <h2 className="text-xl font-semibold">📈 Indicadores Estatísticos</h2>
                <span>{statsExpanded ? "▼" : "▶"}</span>
              </div>

              {statsExpanded && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Medições" value={estatisticas.totalMedicoes || 0} />
                  <StatCard title="Total Peso" value={`${estatisticas.totalPeso || 0} kg`} />
                  <StatCard title="Média (kg)" value={estatisticas.media || "—"} />
                  <StatCard title="Mediana (kg)" value={estatisticas.mediana || "—"} />
                  <StatCard title="Moda (kg)" value={estatisticas.moda || "—"} />
                  <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao || "—"} />
                  <StatCard title="Assimetria" value={estatisticas.assimetria || "—"} />
                  <StatCard title="Curtose" value={estatisticas.curtose || "—"} />
                  <StatCard title="P(X > μ) (%)" value={`${estatisticas.probAcimaMedia || 0}%`} />
                  <StatCard title="Regressão Linear" value={estatisticas.regressao || "—"} />
                </div>
              )}
            </div>
          )}
          {/* --- FIM DO BLOCO DE ESTATÍSTICAS --- */}

          {/* Gráfico */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              {modoGeral ? "📊 Média Semanal por Dia (Todas as semanas)" : "📊 Média Total Diária (Semana Selecionada)"}
            </h3>
            {chartValues.length > 0 && chartValues.some(v => v > 0) ? (
              <Chart dados={chartData} titulo={modoGeral ? "Média Geral por Dia da Semana" : "Média Diária da Semana"} />
            ) : (
              <p className="text-gray-500 text-center">Nenhum dado disponível para este filtro.</p>
            )}
          </div>

          {/* Detalhes por Dia (apenas no modo semanal) */}
          {!modoGeral && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalhes das Medições (3 em 3 horas)</h3>
              {groupsForUI.map((g) => (
                <div key={g.key} className="border rounded-lg overflow-hidden">
                  <div
                    className={`p-4 cursor-pointer flex justify-between items-center ${
                      expandedDay === g.key ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => setExpandedDay(expandedDay === g.key ? null : g.key)}
                  >
                    <span>{g.label}</span>
                    <span>{expandedDay === g.key ? "▼" : "▶"}</span>
                  </div>

                  {expandedDay === g.key && (
                    <div className="p-4 bg-gray-50">
                      {Object.entries(g.details.blocks).map(([blockStart, block]) => {
                        const blockKey = `${g.key}|${blockStart}`;
                        const isBlockOpen = !!expandedBlockKeys[blockKey];
                        return (
                          <div key={blockStart} className="mb-4">
                            <div
                              className={`p-3 cursor-pointer flex justify-between items-center ${
                                isBlockOpen ? "bg-gray-200" : "bg-gray-100"
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleBlock(g.key, blockStart); }}
                            >
                              <span>{String(Number(blockStart)).padStart(2, '0')}:00 - {String(Number(blockStart) + 3).padStart(2, '0')}:00</span>
                              <span>{isBlockOpen ? "▼" : "▶"}</span>
                            </div>

                            {isBlockOpen && (
                              <div className="p-2 ml-4">
                                {Object.entries(block.hours).map(([hour, hourEntries]) => {
                                  const hourKey = `${g.key}|${hour}`;
                                  const isHourOpen = !!expandedHourKeys[hourKey];
                                  const hourSum = hourEntries.reduce((acc, e) => acc + (Number(e.total) || 0), 0);
                                  const hourAvg = hourEntries.length ? (hourSum / hourEntries.length) : 0;

                                  return (
                                    <div key={hour} className="mb-2">
                                      <div
                                        className={`p-2 cursor-pointer flex justify-between items-center ${
                                          isHourOpen ? "bg-gray-300" : "bg-gray-200"
                                        }`}
                                        onClick={(e) => { e.stopPropagation(); toggleHour(g.key, hour); }}
                                      >
                                        <span>{hour}:00 (média: {hourAvg.toFixed(2)} kg)</span>
                                        <span>{isHourOpen ? "▼" : "▶"}</span>
                                      </div>

                                      {isHourOpen && (
                                        <div className="p-2 ml-4 bg-white rounded border">
                                          {hourEntries.map((minuteEntry, mi) => {
                                            const total = minuteEntry.avgLeft + minuteEntry.avgRight;
                                            // Lógica de cor condicional: positivo ou negativo
                                            const isAboveLimit = total > (pesoUsuario * (porcentagemMaxima / 100));
                                            const cardStyle = isAboveLimit ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300";
                                            return (
                                              <div key={mi} className={`p-3 rounded mb-2 ${cardStyle}`}>
                                                <div className="flex justify-between items-center">
                                                  <span className="font-medium">{minuteEntry.minute}</span>
                                                  {/* Lógica de equilíbrio (simplificada para o Next.js) */}
                                                  {(() => {
                                                    const diferenca = Math.abs(minuteEntry.avgLeft - minuteEntry.avgRight);
                                                    const maiorPeso = Math.max(minuteEntry.avgLeft, minuteEntry.avgRight);
                                                    const percentual = maiorPeso > 0 ? (diferenca / maiorPeso) * 100 : 0;

                                                    let justifyContent = "center";
                                                    let backgroundColor = "#42be42ff"; // Verde

                                                    if (percentual > 5) {
                                                      justifyContent = minuteEntry.avgLeft > minuteEntry.avgRight ? "flex-start" : "flex-end";
                                                      backgroundColor = "red"; // Vermelho
                                                    }

                                                    return (
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          height: 6,
                                                          backgroundColor: "#e0e0e0", // Cor de fundo da linha
                                                          borderRadius: 3,
                                                          overflow: "hidden",
                                                          width: "50%", // Ajuste a largura conforme necessário
                                                        }}
                                                      >
                                                        <div
                                                          style={{
                                                            width: "100%",
                                                            backgroundColor: backgroundColor,
                                                            justifyContent: justifyContent,
                                                            display: "flex",
                                                            alignItems: "center",
                                                          }}
                                                        >
                                                          <div
                                                            style={{
                                                              width: 10,
                                                              height: 10,
                                                              borderRadius: 5,
                                                              backgroundColor: "#fff",
                                                              border: "1px solid #000",
                                                            }}
                                                          />
                                                        </div>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                                <div className="flex justify-between mt-2">
                                                  <span>Esquerda: {minuteEntry.avgLeft.toFixed(2)} kg</span>
                                                  <span>Direita: {minuteEntry.avgRight.toFixed(2)} kg</span>
                                                </div>
                                                <span>Total: {minuteEntry.total.toFixed(2)} kg</span>
                                                {isAboveLimit && <p className="text-red-600 font-medium"> Peso acima do limite!</p>}
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
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mensagem se não houver medições */}
          {(!modoGeral && medicoes.length === 0) || (modoGeral && relatorioGeralAgrupado.length === 0) ? (
            <p className="text-gray-500 text-center">Nenhuma medição encontrada para este período.</p>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}