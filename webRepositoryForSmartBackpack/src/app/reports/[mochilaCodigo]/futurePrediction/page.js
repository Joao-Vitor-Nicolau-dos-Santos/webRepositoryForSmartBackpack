"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import StatCard from "@/components/StatCard/StatCard";

export default function FuturePredictionPage() {
    const router = useRouter();
    const params = useParams();
    const { authFetch } = useAuth();
    const { mochilaCodigo } = params;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => {
        const hoje = new Date();
        return hoje.toISOString().split("T")[0];
    });
    const [resultadoPrevisao, setResultadoPrevisao] = useState(null);
    const [motivoNaoCalcular, setMotivoNaoCalcular] = useState("");
    const [estatisticas, setEstatisticas] = useState(null);
    const [statsExpanded, setStatsExpanded] = useState(true);

    // --- FUNÇÃO PARA ARREDONDAR ---
    const roundTo2 = (num) => {
        return Math.round(num * 100) / 100;
    };

    // --- FUNÇÃO CORRIGIDA PARA BUSCAR PREVISÃO ---
    const calcularPrevisaoPorDiaSemana = async () => {
        try {
            setLoading(true);
            setError("");
            setResultadoPrevisao(null);
            setMotivoNaoCalcular("");
            setEstatisticas(null);

            // 🔹 CORREÇÃO: Criar data sem fuso horário para evitar discrepâncias
            const dataSelecionada = new Date(selectedDate);

            // 🔹 CORREÇÃO: Usar UTC para garantir consistência com a API
            const ano = dataSelecionada.getUTCFullYear();
            const mes = String(dataSelecionada.getUTCMonth() + 1).padStart(2, '0');
            const dia = String(dataSelecionada.getUTCDate()).padStart(2, '0');

            const dataFormatada = `${ano}-${mes}-${dia}`;

            console.log("📅 Data enviada para API:", {
                selectedDate,
                dataFormatada,
                diaDaSemana: dataSelecionada.getUTCDay(), // 0 = Domingo, 1 = Segunda, etc.
                diaDaSemanaLocal: dataSelecionada.getDay(),
                dataUTC: dataSelecionada.toUTCString(),
                dataLocal: dataSelecionada.toString()
            });

            const response = await authFetch(
                `${process.env.NEXT_PUBLIC_API_URL}/medicoes/previsao/${mochilaCodigo}/${dataFormatada}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro ${response.status} ao calcular previsão`);
            }

            const dados = await response.json();

            console.log("📊 Resposta da API:", dados);

            if (dados.error) {
                setError(dados.error);
                return;
            }

            setEstatisticas(dados.estatisticas);

            if (dados.previsao) {
                setResultadoPrevisao(dados.previsao);
            } else {
                setMotivoNaoCalcular(dados.motivo || "Não foi possível gerar a previsão.");
            }

        } catch (err) {
            console.error("Erro ao calcular previsão:", err);
            setError(err.message || "Erro ao conectar no servidor.");
        } finally {
            setLoading(false);
        }
    };

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
                            <h1 className="text-2xl font-bold">Previsão de Peso por Dia</h1>
                            <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
                        </div>
                    </div>

                    {/* Container Principal */}
                    <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8">

                        {/* Seletor de Data e Botão */}
                        <div className="flex flex-col sm:flex-row items-end gap-4 mb-6">

                            {/* Seletor de Data */}
                            <div className="w-full sm:w-auto">
                                <label htmlFor="dataSelecionada" className="block text-sm font-medium text-gray-700 mb-2">
                                    Selecione a Data para Previsão
                                </label>
                                <input
                                    id="dataSelecionada"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Botão de Calcular Previsão */}
                            <button
                                onClick={calcularPrevisaoPorDiaSemana}
                                disabled={loading}
                                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Calculando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Calcular Previsão
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Mensagem de Erro */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Resultado da Previsão */}
                        {resultadoPrevisao && (
                            <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="text-xl font-bold text-green-800 mb-3">
                                    Previsão para {format(new Date(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </h3>

                                <div className="text-3xl font-bold text-green-600 mb-4">
                                    {resultadoPrevisao.media} kg
                                </div>

                                <p className="text-green-700 mb-4">
                                    Base: média populacional de {resultadoPrevisao.n} dias (mesmo dia da semana).
                                </p>

                                {estatisticas && (
                                    <div className="mt-4 p-4 bg-white rounded-lg">
                                        <h4 className="font-bold text-gray-700 mb-2">Indicadores usados:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <p>• Média: {estatisticas.media} kg</p>
                                            <p>• Desvio padrão: {estatisticas.desvioPadrao} kg</p>
                                            <p>• Assimetria: {estatisticas.assimetria}</p>
                                            <p>• Curtose: {estatisticas.curtose}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Motivo por não calcular */}
                        {motivoNaoCalcular && (
                            <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h3 className="text-xl font-bold text-yellow-800 mb-3">
                                    Não foi possível gerar a previsão
                                </h3>
                                <p className="text-yellow-700">{motivoNaoCalcular}</p>

                                {estatisticas && (
                                    <div className="mt-4 p-4 bg-white rounded-lg">
                                        <h4 className="font-bold text-gray-700 mb-2">Estatísticas parciais:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <p>• Observações (dias): {estatisticas.totalMedicoes}</p>
                                            <p>• Média (se houver): {estatisticas.media ?? "—"} kg</p>
                                            <p>• Assimetria: {estatisticas.assimetria ?? "—"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mensagem inicial */}
                        {!resultadoPrevisao && !motivoNaoCalcular && !error && !loading && (
                            <div className="text-center p-8 bg-gray-50 rounded-lg">
                                <p className="text-gray-600">
                                    Escolha uma data e clique em "Calcular Previsão" para obter a previsão de peso.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Indicadores Estatísticos */}
                    {estatisticas && (
                        <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8">
                            <div className="mb-6">
                                <div
                                    className="flex justify-between items-center cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={() => setStatsExpanded(!statsExpanded)}
                                >
                                    <h3 className="text-xl font-bold text-green-700">📈 Indicadores Estatísticos</h3>
                                    <span className="text-green-600">{statsExpanded ? "Ocultar" : "Mostrar"}</span>
                                </div>

                                {statsExpanded && (
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        <StatCard
                                            title="Observações (dias)"
                                            value={estatisticas?.totalMedicoes ?? "—"}
                                        />
                                        <StatCard
                                            title="Média"
                                            value={estatisticas?.media ? `${estatisticas.media} kg` : "—"}
                                        />
                                        <StatCard
                                            title="Desvio Padrão"
                                            value={estatisticas?.desvioPadrao ? `${estatisticas.desvioPadrao} kg` : "—"}
                                        />
                                        <StatCard
                                            title="Assimetria"
                                            value={estatisticas?.assimetria ?? "—"}
                                        />
                                        <StatCard
                                            title="Curtose"
                                            value={estatisticas?.curtose ?? "—"}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </ProtectedRoute>
    );
}