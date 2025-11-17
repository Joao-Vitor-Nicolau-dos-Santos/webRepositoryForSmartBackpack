"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "@/app/hooks/useAuth";
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

export default function WeeklyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params`
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  const [dataLoaded, setDataLoaded] = useState(false); // Indica se os dados foram carregados

  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---

  // --- Estados para controle da semana ---
  const [selectedWeekStart, setSelectedWeekStart] = useState(null); // Data do início da semana selecionada (segunda-feira)
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(null); // Data do fim da semana selecionada (domingo)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // --- Fim dos estados para controle da semana ---

  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modoGeral, setModoGeral] = useState(false); // ← NOVO ESTADO

  // --- Estados para controle do detalhamento ---
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedBlockKeys, setExpandedBlockKeys] = useState({});
  const [expandedHourKeys, setExpandedHourKeys] = useState({});
  const [detalhesDias, setDetalhesDias] = useState({}); // Armazena os detalhes processados por dia
  // --- Fim dos estados para controle do detalhamento ---

  const [isClient, setIsClient] = useState(false);

  // --- EFEITO PARA LIMPAR DADOS AO TROCAR DE MODO ---
  useEffect(() => {
    console.log("🔄 Modo alterado para:", modoGeral ? "GERAL" : "SEMANAL");

    // Limpar todos os dados
    setChartData([]);
    setComparisonChartData([]);
    setEstatisticas(null);
    setReportData([]);
    setDataLoaded(false);
    setError("");
    setDetalhesDias({});

    console.log("🧹 Dados limpos - aguardando nova busca");
  }, [modoGeral]);

  // --- Função para calcular a data de início (DOMINGO) de uma semana a partir de uma data ---
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // DOMINGO = 0, SEGUNDA = 1, ..., SÁBADO = 6
    const diff = d.getDate() - day; // Subtrai os dias para chegar no domingo
    return new Date(d.setDate(diff));
  };

  // --- Função para calcular a data de fim (SÁBADO) de uma semana a partir de uma data ---
  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Adiciona 6 dias para chegar ao sábado
    return end;
  };

  // --- Função para formatar data como YYYY-MM-DD ---
  const formatDateISO = (date) => {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };
  // --- Fim das funções auxiliares ---

  // --- Manipulador para selecionar uma data específica (SEM buscar automaticamente) ---
  const handleDateChange = (event) => {
    const novaData = new Date(event.target.value);
    setSelectedDate(novaData);

    const inicioSemana = getStartOfWeek(novaData);
    const fimSemana = getEndOfWeek(novaData);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);
  };

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ---
  const loadReport = async (mochilaCodigo, inicio, fim) => {
    try {
      setSearchLoading(true);
      setLoading(true);
      setError("");
      setEstatisticas(null);
      setChartData([]);
      setComparisonChartData([]);

      let url = "";

      if (modoGeral) {
        // 🔹 Modo Relatório Geral
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/geral/${mochilaCodigo}`;
        console.log("📊 Buscando relatório GERAL");
      } else {
        // 🔹 Modo Semana Selecionada
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/periodo/${inicio}/${fim}/${mochilaCodigo}`;
      }

      const res = await authFetch(url);

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error(
            "[WeeklyReportPage] Erro ao parsear JSON de erro da API:",
            e
          );
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("📦 Dados recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS CONFORME O MODO ---
      if (modoGeral) {
        processarDadosModoGeral(rawData);
      } else {
        processarDadosModoSemanal(rawData);
      }

      setDataLoaded(true);
    } catch (err) {
      console.error("[WeeklyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
      setDataLoaded(false);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // --- FUNÇÃO CORRIGIDA PARA PROCESSAR DADOS DO MODO GERAL ---
  const processarDadosModoGeral = (rawData) => {
    console.log("📦 Dados brutos do modo geral:", rawData);

    if (rawData && rawData.agrupadoPorDia && rawData.estatisticas) {
      console.log("✅ Dados processados pela API (Modo Geral)");

      // Processar dados para gráfico principal (igual ao mobile)
      const dadosGraficoPrincipal = rawData.agrupadoPorDia.map((dia) => ({
        name: dia.label.split("-")[0].slice(0, 3), // "seg", "ter", "qua", etc.
        peso: dia.mediaPeso,
      }));

      console.log("📊 Dados para gráfico principal:", dadosGraficoPrincipal);

      // 🔹 FORMATAR AS ESTATÍSTICAS COM A REGRESSÃO LINEAR CORRETA
      const estatisticasFormatadas = {
        ...rawData.estatisticas,
        // Converter a regressão de {a, b} para a equação y = a + bx
        regressao: rawData.estatisticas.regressao
          ? {
              equacao: `y = ${roundTo2(
                rawData.estatisticas.regressao.a
              )} + ${roundTo2(rawData.estatisticas.regressao.b)}x`,
              a: rawData.estatisticas.regressao.a,
              b: rawData.estatisticas.regressao.b,
            }
          : null,
      };

      console.log("📈 Estatísticas formatadas:", estatisticasFormatadas);
      console.log("🔢 Regressão linear:", estatisticasFormatadas.regressao);

      // 🔹 DEFINIR OS ESTADOS COM OS DADOS FORMATADOS
      setChartData(dadosGraficoPrincipal);
      setEstatisticas(estatisticasFormatadas); // ← USA AS ESTATÍSTICAS FORMATADAS
      setReportData(rawData);

      // 🔹 NO MODO GERAL, NÃO MOSTRAMOS GRÁFICO DE COMPARAÇÃO
      setComparisonChartData([]);
    } else {
      console.error("❌ Estrutura de dados inválida no modo geral:", rawData);
      setError("Estrutura de dados inválida do servidor");

      // Limpar estados em caso de erro
      setChartData([]);
      setEstatisticas(null);
      setReportData([]);
      setComparisonChartData([]);
    }
  };

  // --- FUNÇÃO PARA PROCESSAR DADOS DO MODO SEMANAL ---
  const processarDadosModoSemanal = (rawData) => {
    let dadosParaGrafico = [];
    let totaisParaEstatisticas = [];
    let dadosComparacaoEsquerda = []; // ← NOVO: Dados para o gráfico de comparação
    let dadosComparacaoDireita = []; // ← NOVO: Dados para o gráfico de comparação

    if (Array.isArray(rawData)) {
      // 🔹 LÓGICA DO GRÁFICO (mantém a atual)
      const dadosPorDia = {};

      // 🔹 LÓGICA DAS ESTATÍSTICAS E COMPARAÇÃO
      const minuteMap = {};
      const comparacaoPorDia = {}; // ← NOVO: Para agrupar comparação por dia

      (rawData || []).forEach((m) => {
        try {
          const dt = new Date(m.MedicaoData);
          const diaKey = dt.toLocaleDateString("pt-BR");
          const hh = String(dt.getHours()).padStart(2, "0");
          const mm = String(dt.getMinutes()).padStart(2, "0");
          const key = `${hh}:${mm}`;

          if (!minuteMap[key]) minuteMap[key] = { left: [], right: [] };
          if (!comparacaoPorDia[diaKey])
            comparacaoPorDia[diaKey] = { left: [], right: [] }; // ← NOVO

          const local = (m.MedicaoLocal || "").toString().toLowerCase();
          const peso = Number(m.MedicaoPeso || 0);

          if (local.includes("esquer")) {
            minuteMap[key].left.push(peso);
            comparacaoPorDia[diaKey].left.push(peso); // ← NOVO
          } else if (local.includes("direit")) {
            minuteMap[key].right.push(peso);
            comparacaoPorDia[diaKey].right.push(peso); // ← NOVO
          } else if (local.includes("amb") || local.includes("cent")) {
            minuteMap[key].left.push(peso);
            minuteMap[key].right.push(peso);
            comparacaoPorDia[diaKey].left.push(peso); // ← NOVO
            comparacaoPorDia[diaKey].right.push(peso); // ← NOVO
          }
        } catch (e) {
          // ignore malformed dates
        }
      });

      // 🔹 CALCULAR TOTAIS POR MINUTO (para estatísticas)
      totaisParaEstatisticas = Object.keys(minuteMap).map((k) => {
        const obj = minuteMap[k];
        const avgLeft = obj.left.length
          ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length
          : 0;
        const avgRight = obj.right.length
          ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length
          : 0;
        return roundTo2((avgLeft || 0) + (avgRight || 0));
      });

      // 🔹 PROCESSAMENTO PARA O GRÁFICO PRINCIPAL (mantém o atual)
      rawData.forEach((medicao) => {
        const data = new Date(medicao.MedicaoData);
        const diaKey = data.toLocaleDateString("pt-BR");
        const pesoNum = parseFloat(medicao.MedicaoPeso);

        if (!dadosPorDia[diaKey]) {
          dadosPorDia[diaKey] = {
            name: diaKey,
            pesos: [],
            total: 0,
            count: 0,
          };
        }

        dadosPorDia[diaKey].pesos.push(pesoNum);
        dadosPorDia[diaKey].total += pesoNum;
        dadosPorDia[diaKey].count++;
      });

      // ORDENAR DIAS CRONOLOGICAMENTE
      const diasOrdenados = Object.keys(dadosPorDia).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split("/").map(Number);
        const [diaB, mesB, anoB] = b.split("/").map(Number);
        const dataA = new Date(anoA, mesA - 1, diaA);
        const dataB = new Date(anoB, mesB - 1, diaB);
        return dataA - dataB;
      });

      // Calcular média por dia para gráfico principal
      dadosParaGrafico = diasOrdenados.map((dataKey) => {
        const dia = dadosPorDia[dataKey];
        return {
          name: dataKey,
          peso: dia.count > 0 ? roundTo2((dia.total / dia.count) * 2) : 0,
        };
      });

      // 🔹 PREPARAR DADOS PARA GRÁFICO DE COMPARAÇÃO
      const diasComparacaoOrdenados = Object.keys(comparacaoPorDia).sort(
        (a, b) => {
          const [diaA, mesA, anoA] = a.split("/").map(Number);
          const [diaB, mesB, anoB] = b.split("/").map(Number);
          const dataA = new Date(anoA, mesA - 1, diaA);
          const dataB = new Date(anoB, mesB - 1, diaB);
          return dataA - dataB;
        }
      );

      // Calcular médias de comparação por dia
      const dadosGraficoComparacao = diasComparacaoOrdenados.map((dataKey) => {
        const dia = comparacaoPorDia[dataKey];
        const mediaEsq =
          dia.left.length > 0
            ? dia.left.reduce((a, b) => a + b, 0) / dia.left.length
            : 0;
        const mediaDir =
          dia.right.length > 0
            ? dia.right.reduce((a, b) => a + b, 0) / dia.right.length
            : 0;

        return {
          name: dataKey,
          esquerda: roundTo2(mediaEsq),
          direita: roundTo2(mediaDir),
        };
      });

      // Na função processarDadosModoSemanal, adicione:
      const gruposDetalhados = groupByDaySorted(rawData);
      const detalhesPorDia = {};

      gruposDetalhados.forEach((dia) => {
        detalhesPorDia[dia.dateKey] = {
          label: dia.label,
          details: buildDayDetails(dia.items),
        };
      });

      setDetalhesDias(detalhesPorDia);

      // Separar dados para o ComparisonChart
      dadosComparacaoEsquerda = dadosGraficoComparacao.map(
        (dia) => dia.esquerda
      );
      dadosComparacaoDireita = dadosGraficoComparacao.map((dia) => dia.direita);
    }

    setChartData(dadosParaGrafico);
    setReportData(rawData);

    // 🔹 CONFIGURAR DADOS PARA O GRÁFICO DE COMPARAÇÃO
    // 🔹 CONFIGURAR DADOS PARA O GRÁFICO DE COMPARAÇÃO (CORRIGIDO)
    if (
      dadosComparacaoEsquerda.length > 0 &&
      dadosComparacaoDireita.length > 0
    ) {
      const labelsComparacao = dadosParaGrafico.map((dia) => {
        // Formata o label para ser mais curto (apenas dia/mês)
        const [diaNum, mesNum, anoNum] = dia.name.split("/");
        return `${diaNum}/${mesNum}`;
      });

      // 🔹 FORMATO CORRETO para o ComparisonChart
      const dadosFormatados = labelsComparacao.map((label, index) => ({
        name: label,
        esquerda: dadosComparacaoEsquerda[index],
        direita: dadosComparacaoDireita[index],
      }));

      setComparisonChartData(dadosFormatados);
    } else {
      setComparisonChartData([]); // Array vazio em vez de null
    }

    // 🔹 USAR TOTAIS POR MINUTO para estatísticas
    const stats = calcularEstatisticas(totaisParaEstatisticas);
    setEstatisticas(stats);
  };

  // --- Função para calcular estatísticas ---
  const calcularEstatisticas = (valoresRaw) => {
    // Usar a filtragem mais robusta do Mobile
    const valores = valoresRaw.filter(
      (v) => typeof v === "number" && !isNaN(v)
    );

    if (!valores.length) return null;

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    const sorted = [...valores].sort((a, b) => a - b);
    const mediana =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Moda - igual ao Mobile
    const freq = {};
    valores.forEach((v) => {
      const key = roundTo2(v).toString();
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq)
      .filter((k) => freq[k] === maxFreq)
      .map((k) => Number(k));

    // Variância e desvio padrão
    const variancia =
      valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    // CORREÇÃO CRÍTICA: Prevenir divisão por zero como no Mobile
    const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
    const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

    const assimetria =
      valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n / denomSkew;
    const curtose =
      valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n / denomKurt -
      3;

    // Cálculos extras da Web (opcionais, mas úteis)
    const acimaDaMedia = valores.filter((v) => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    // Regressão Linear (opcional)
    const xVals = valores.map((_, i) => i);
    const yVals = valores;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((sum, xi, i) => sum + xi * yVals[i], 0);
    const sumXX = xVals.reduce((sum, xi) => sum + xi * xi, 0);

    let regressao = null;
    const denominador = n * sumXX - sumX * sumX;

    if (denominador !== 0) {
      // Evitar divisão por zero
      const slope = (n * sumXY - sumX * sumY) / denominador;
      const intercept = (sumY - slope * sumX) / n;
      regressao = {
        slope: roundTo2(slope),
        intercept: roundTo2(intercept),
        equacao: `y = ${roundTo2(intercept)} + ${roundTo2(slope)}x`,
      };
    }

    return {
      totalMedicoes: n,
      totalPeso: roundTo2(somatorio),
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      probAcimaMedia: roundTo2(probAcimaMedia * 100), // em %
      regressao: regressao, // Pode ser null se não foi possível calcular
    };
  };
  // --- FIM DA FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---

  // --- FUNÇÕES AUXILIARES PARA DETALHAMENTO ---

  const localSide = (local) => {
    if (!local) return "outro";
    const l = local.toString().toLowerCase();
    if (l.includes("esquer") || l.includes("esq")) return "esquerda";
    if (l.includes("direit") || l.includes("dir")) return "direita";
    if (l.includes("amb") || l.includes("cent")) return "ambos";
    return "outro";
  };

  const buildDayDetails = (items) => {
    const minuteMap = {};
    items.forEach((m) => {
      const dt = new Date(m.MedicaoData);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      const minuteKey = `${hh}:${mm}`;
      if (!minuteMap[minuteKey])
        minuteMap[minuteKey] = { left: [], right: [], other: [], raw: [] };
      const side = localSide(m.MedicaoLocal);
      if (side === "esquerda")
        minuteMap[minuteKey].left.push(Number(m.MedicaoPeso || 0));
      else if (side === "direita")
        minuteMap[minuteKey].right.push(Number(m.MedicaoPeso || 0));
      else if (side === "ambos") {
        minuteMap[minuteKey].left.push(Number(m.MedicaoPeso || 0));
        minuteMap[minuteKey].right.push(Number(m.MedicaoPeso || 0));
      } else {
        minuteMap[minuteKey].other.push(Number(m.MedicaoPeso || 0));
      }
      minuteMap[minuteKey].raw.push(m);
    });

    const minuteKeys = Object.keys(minuteMap).sort((a, b) => {
      const [hA, mA] = a.split(":").map(Number);
      const [hB, mB] = b.split(":").map(Number);
      return hA === hB ? mA - mB : hA - hB;
    });

    const minuteEntries = minuteKeys.map((key) => {
      const obj = minuteMap[key];
      const avgLeft =
        obj.left.length > 0
          ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length
          : 0;
      const avgRight =
        obj.right.length > 0
          ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length
          : 0;
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
      const [hh, mm] = me.minute.split(":").map(Number);
      const blockStart = Math.floor(hh / 3) * 3;
      const hourKey = String(hh).padStart(2, "0");
      if (!blocks[blockStart])
        blocks[blockStart] = {
          start: blockStart,
          end: blockStart + 3,
          hours: {},
          minutes: [],
        };
      if (!blocks[blockStart].hours[hourKey])
        blocks[blockStart].hours[hourKey] = [];
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
      const hourKeys = Object.keys(b.hours).sort(
        (a, b) => Number(a) - Number(b)
      );
      const hoursSorted = {};
      hourKeys.forEach((hk) => {
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
    const daySumTotal = minuteEntries.reduce(
      (acc, m) => acc + (Number(m.total) || 0),
      0
    );
    const dayAvgTotal = parseFloat(
      (dayMinutesCount > 0 ? daySumTotal / dayMinutesCount : 0).toFixed(2)
    );

    return {
      minuteEntries,
      blocks,
      daySumTotal: parseFloat(daySumTotal.toFixed(2)),
      dayAvgTotal,
    };
  };

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
      const label = d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      map[k].sort((a, b) => new Date(a.MedicaoData) - new Date(b.MedicaoData));
      return { dateKey: k, label, items: map[k] };
    });
  };

  // Funções para toggle
  const toggleBlock = (dayKey, blockStart) => {
    const k = `${dayKey}|${blockStart}`;
    setExpandedBlockKeys((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const toggleHour = (dayKey, hour) => {
    const k = `${dayKey}|${hour}`;
    setExpandedHourKeys((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // --- Configurar semana atual ao montar, mas NÃO carregar dados automaticamente ---
  useEffect(() => {
    if (mochilaCodigo) {
      const hoje = new Date();
      const inicioSemana = getStartOfWeek(hoje);
      const fimSemana = getEndOfWeek(hoje);

      // Limpar todos os dados
      setChartData([]);
      setComparisonChartData([]);
      setEstatisticas(null);
      setReportData([]);
      setDataLoaded(false);
      setError("");
      setDetalhesDias({});

      setSelectedWeekStart(inicioSemana);
      setSelectedWeekEnd(fimSemana);
      setSelectedDate(hoje);

      setLoading(false); // ← Garante que loading seja false após configurar as datas
    }
  }, [mochilaCodigo]); // Remove modoGeral das dependências

  // --- Manipulador para selecionar a semana atual ---
  const handleCurrentWeek = () => {
    const hoje = new Date();
    setSelectedDate(hoje); // Atualiza o seletor para hoje

    const inicioSemana = getStartOfWeek(hoje);
    const fimSemana = getEndOfWeek(hoje);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);

    const inicioISO = formatDateISO(inicioSemana);
    const fimISO = formatDateISO(fimSemana);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-800">Carregando relatório semanal...</p>
        </div>
      </ProtectedRoute>
    );
  }

  {
    /* Mensagem quando não há dados carregados */
  }
  {
    !modoGeral && !dataLoaded && !loading && (
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-blue-600 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-blue-800 mb-2">
          Selecione uma semana
        </h3>
        <p className="text-blue-700 mb-4">
          Escolha uma data e clique em "Buscar Semana" para visualizar os dados
        </p>
        <p className="text-sm text-blue-600">
          Semana atual: {selectedWeekStart?.toLocaleDateString("pt-BR")} a{" "}
          {selectedWeekEnd?.toLocaleDateString("pt-BR")}
        </p>
      </div>
    );
  }

  {
    /* Mensagem de erro real (problemas de conexão, etc) */
  }
  {
    error && (
      <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={handleCurrentWeek}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black flex flex-col">
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
              <h1 className="text-2xl font-bold">Relatório Semanal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Botões de Modo */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Tipo de Relatório Semanal
            </h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button
                onClick={() => setModoGeral(false)}
                className={`px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-3 text-lg ${
                  !modoGeral
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Semana Selecionada
              </button>

              <button
                onClick={() => setModoGeral(true)}
                className={`px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-3 text-lg ${
                  modoGeral
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Relatório Geral
              </button>
            </div>
          </div>

          {/* Seletor de Semana - Mais Largo */}
          {!modoGeral && selectedWeekStart && selectedWeekEnd && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                {/* Seletor de Data - Mais Largo */}
                <div className="flex-1 min-w-[300px]">
                  <label
                    htmlFor="weekSelector"
                    className="block text-lg font-medium text-gray-700 mb-3"
                  >
                    Selecione uma data na semana:
                  </label>
                  <input
                    id="weekSelector"
                    type="date"
                    value={
                      selectedDate
                        ? selectedDate.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={handleDateChange}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>

                {/* Display da semana - Mais Largo */}
                <div className="flex-1 min-w-[300px] text-center">
                  <p className="text-lg font-medium text-gray-600 mb-2">
                    Semana selecionada:
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedWeekStart.toLocaleDateString("pt-BR")} a{" "}
                    {selectedWeekEnd.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    (
                    {selectedWeekStart.toLocaleDateString("pt-BR", {
                      weekday: "long",
                    })}{" "}
                    a{" "}
                    {selectedWeekEnd.toLocaleDateString("pt-BR", {
                      weekday: "long",
                    })}
                    )
                  </p>
                </div>

                {/* Botão de busca - Mais Largo */}
                <div className="flex-1 min-w-[250px]">
                  <button
                    onClick={() => {
                      const inicioISO = formatDateISO(selectedWeekStart);
                      const fimISO = formatDateISO(selectedWeekEnd);
                      loadReport(mochilaCodigo, inicioISO, fimISO);
                    }}
                    disabled={searchLoading}
                    className={`w-full bg-green-500 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-3 text-lg ${
                      searchLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-green-600 shadow-md"
                    }`}
                  >
                    {searchLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        Buscar Semana
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modo Geral - Sem limitação de largura */}
          {modoGeral && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                  {/* Coluna 1 - Título (ocupando espaço igual às outras colunas) */}
                  <div className="flex-1 min-w-[300px]">
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Relatório Geral:
                    </label>
                    <p className="text-gray-600 text-lg">
                      Todas as semanas disponíveis
                    </p>
                  </div>

                  {/* Coluna 2 - Informações (ocupando espaço igual) */}
                  <div className="flex-1 min-w-[300px] text-center">
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      Período Completo
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      Dados Consolidadados
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Médias gerais por dia da semana
                    </p>
                  </div>

                  {/* Coluna 3 - Botão (ocupando espaço igual) */}
                  <div className="flex-1 min-w-[250px]">
                    <button
                      onClick={() => {
                        loadReport(mochilaCodigo, null, null);
                      }}
                      disabled={searchLoading}
                      className={`w-full bg-green-500 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-3 text-lg ${
                        searchLoading
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-green-600 shadow-md"
                      }`}
                    >
                      {searchLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Buscar Relatório
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo do Relatório - Só mostra se há dados carregados */}
          {((modoGeral && estatisticas) || dataLoaded) && (
            <div className="mt-8 space-y-8">
              {/* --- SEÇÃO DE ESTATÍSTICAS --- */}
              {estatisticas ? (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                  <h2 className="text-xl font-semibold mb-4">
                    Indicadores Estatísticos
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Medições"
                      value={estatisticas.totalMedicoes}
                    />
                    <StatCard
                      title="Total Peso (kg)"
                      value={estatisticas.totalPeso}
                    />
                    <StatCard title="Média (kg)" value={estatisticas.media} />
                    <StatCard
                      title="Mediana (kg)"
                      value={estatisticas.mediana}
                    />
                    <StatCard title="Moda (kg)" value={estatisticas.moda} />
                    <StatCard
                      title="Desvio Padrão (kg)"
                      value={estatisticas.desvioPadrao}
                    />
                    <StatCard
                      title="Assimetria"
                      value={estatisticas.assimetria}
                    />
                    <StatCard title="Curtose" value={estatisticas.curtose} />
                    <StatCard
                      title="Regressão Linear"
                      value={estatisticas.regressao.equacao}
                    />
                  </div>
                </div>
              ) : (
                dataLoaded &&
                !loading && (
                  <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <p className="text-gray-500 text-center">
                      Nenhuma medição disponível para cálculo estatístico.
                    </p>
                  </div>
                )
              )}

              {/* Gráfico Principal */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {modoGeral
                    ? "📊 Médias por Dia da Semana (Geral)"
                    : "📊 Médias Diárias da Semana"}
                </h3>
                {chartData && chartData.length > 0 ? (
                  <Chart
                    dados={chartData}
                    titulo={
                      modoGeral
                        ? "Médias Gerais por Dia"
                        : `Médias da Semana - ${selectedWeekStart?.toLocaleDateString(
                            "pt-BR"
                          )} a ${selectedWeekEnd?.toLocaleDateString("pt-BR")}`
                    }
                  />
                ) : (
                  dataLoaded &&
                  !loading && (
                    <div className="bg-gray-100 p-8 rounded-lg text-center">
                      <p className="text-gray-500">
                        {modoGeral
                          ? "Nenhum dado disponível para o relatório geral."
                          : "Nenhum dado disponível para esta semana."}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Gráfico de Comparação - Só mostra no modo SEMANA SELECIONADA e se houver dados */}
              {!modoGeral &&
                comparisonChartData &&
                comparisonChartData.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">
                      ⚖️ Comparativo Esquerda vs Direita
                    </h3>
                    <ComparisonChart
                      dados={comparisonChartData}
                      titulo={`Comparativo - ${selectedWeekStart?.toLocaleDateString(
                        "pt-BR"
                      )} a ${selectedWeekEnd?.toLocaleDateString("pt-BR")}`}
                    />
                  </div>
                )}
            </div>
          )}

          {/* Seção de Detalhamento - Só mostra no modo SEMANA SELECIONADA */}
          {!modoGeral && dataLoaded && Object.keys(detalhesDias).length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6 text-center">
                📋 Detalhamento por Dia
              </h3>

              {Object.keys(detalhesDias).map((dateKey) => {
                const dia = detalhesDias[dateKey];
                const isDayExpanded = expandedDay === dateKey;

                return (
                  <div
                    key={dateKey}
                    className="mb-4 bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    {/* Cabeçalho do Dia */}
                    <button
                      onClick={() =>
                        setExpandedDay(isDayExpanded ? null : dateKey)
                      }
                      className={`w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors ${
                        isDayExpanded
                          ? "bg-green-50 border-b border-green-200"
                          : "bg-white"
                      }`}
                    >
                      <span className="font-semibold text-lg text-gray-800">
                        {dia.label}
                      </span>
                      <span className="text-gray-600">
                        {isDayExpanded ? "▼" : "▶"}
                      </span>
                    </button>

                    {/* Conteúdo Expandido do Dia */}
                    {isDayExpanded && (
                      <div className="p-4 bg-gray-50">
                        {/* Resumo do Dia */}
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <p className="font-semibold text-green-800 text-center">
                            Média do dia: {dia.details.dayAvgTotal.toFixed(2)}{" "}
                            kg
                          </p>
                        </div>

                        {/* Blocos de 3 horas */}
                        {Object.keys(dia.details.blocks).map((blockStart) => {
                          const block = dia.details.blocks[blockStart];
                          const blockKey = `${dateKey}|${blockStart}`;
                          const isBlockOpen = !!expandedBlockKeys[blockKey];

                          return (
                            <div
                              key={blockStart}
                              className="mb-3 bg-green-50 rounded-lg overflow-hidden"
                            >
                              {/* Cabeçalho do Bloco */}
                              <button
                                onClick={() => toggleBlock(dateKey, blockStart)}
                                className={`w-full flex justify-between items-center p-3 text-left hover:bg-green-100 transition-colors ${
                                  isBlockOpen ? "bg-green-100" : "bg-green-50"
                                }`}
                              >
                                <span className="font-medium text-green-800">
                                  {String(block.start).padStart(2, "0")}:00 -{" "}
                                  {String(block.end).padStart(2, "0")}:00
                                </span>
                                <span className="text-green-600">
                                  {isBlockOpen ? "▼" : "▶"}
                                </span>
                              </button>

                              {/* Conteúdo do Bloco */}
                              {isBlockOpen && (
                                <div className="p-3 bg-white">
                                  {/* Horas dentro do bloco */}
                                  {Object.keys(block.hours).map((hourKey) => {
                                    const hourEntries = block.hours[hourKey];
                                    const hourKeyFull = `${dateKey}|${hourKey}`;
                                    const isHourOpen =
                                      !!expandedHourKeys[hourKeyFull];

                                    return (
                                      <div key={hourKey} className="mb-2">
                                        {/* Cabeçalho da Hora */}
                                        <button
                                          onClick={() =>
                                            toggleHour(dateKey, hourKey)
                                          }
                                          className={`w-full flex justify-between items-center p-2 text-left hover:bg-gray-100 transition-colors rounded ${
                                            isHourOpen
                                              ? "bg-gray-100"
                                              : "bg-white"
                                          }`}
                                        >
                                          <span className="font-medium text-gray-700">
                                            {hourKey}:00
                                          </span>
                                          <span className="text-gray-500">
                                            {isHourOpen ? "▼" : "▶"}
                                          </span>
                                        </button>

                                        {/* Detalhes dos Minutos */}
                                        {isHourOpen && (
                                          <div className="mt-2 space-y-2">
                                            {hourEntries.map(
                                              (minuteEntry, index) => {
                                                const pesoTotal =
                                                  minuteEntry.avgLeft +
                                                  minuteEntry.avgRight;
                                                const isAlert = pesoTotal > 7.5; // Ajuste conforme necessário

                                                return (
                                                  <div
                                                    key={`${minuteEntry.minute}-${index}`}
                                                    className={`p-3 rounded-lg border ${
                                                      isAlert
                                                        ? "bg-red-50 border-red-200"
                                                        : "bg-white border-gray-200"
                                                    }`}
                                                  >
                                                    <div className="flex justify-between items-start mb-2">
                                                      <span className="font-semibold text-blue-600">
                                                        {minuteEntry.minute}
                                                      </span>
                                                      {/* Indicador de Equilíbrio */}
                                                      <div className="flex items-center">
                                                        <div
                                                          className={`w-16 h-2 bg-gray-200 rounded-full overflow-hidden`}
                                                        >
                                                          <div
                                                            className={`h-full ${
                                                              Math.abs(
                                                                minuteEntry.avgLeft -
                                                                  minuteEntry.avgRight
                                                              ) > 0.5
                                                                ? "bg-red-500"
                                                                : "bg-green-500"
                                                            }`}
                                                            style={{
                                                              width: `${Math.min(
                                                                (Math.abs(
                                                                  minuteEntry.avgLeft -
                                                                    minuteEntry.avgRight
                                                                ) /
                                                                  Math.max(
                                                                    minuteEntry.avgLeft,
                                                                    minuteEntry.avgRight
                                                                  )) *
                                                                  100,
                                                                100
                                                              )}%`,
                                                              marginLeft:
                                                                minuteEntry.avgLeft >
                                                                minuteEntry.avgRight
                                                                  ? "0"
                                                                  : "auto",
                                                            }}
                                                          ></div>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                      <div className="text-sm">
                                                        <span className="font-medium">
                                                          Esquerda:
                                                        </span>{" "}
                                                        {minuteEntry.avgLeft.toFixed(
                                                          2
                                                        )}{" "}
                                                        kg
                                                      </div>
                                                      <div className="text-sm">
                                                        <span className="font-medium">
                                                          Direita:
                                                        </span>{" "}
                                                        {minuteEntry.avgRight.toFixed(
                                                          2
                                                        )}{" "}
                                                        kg
                                                      </div>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                      <span className="font-semibold">
                                                        Total:{" "}
                                                        {minuteEntry.total.toFixed(
                                                          2
                                                        )}{" "}
                                                        kg
                                                      </span>
                                                      {isAlert && (
                                                        <span className="text-red-600 font-semibold text-sm">
                                                          ⚠️ Peso Excedido!
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                            )}
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
                );
              })}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
