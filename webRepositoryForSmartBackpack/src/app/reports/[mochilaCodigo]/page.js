"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiCalendar,
  FiBarChart2,
  FiActivity,
  FiClock,
  FiBarChart,
} from "react-icons/fi"; // Ícones
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import ReportOptionCard from "@/components/ReportOptionCard/ReportOptionCard";
import { useSearchParams } from 'next/navigation';

export default function MochilaReportOptionsPage({ params }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;
  const searchParams = useSearchParams();
  const nomeMochila = searchParams.get('nome');

  // Mock de dados da mochila (você pode buscá-los via API se necessário)
  const mochila = {
    MochilaCodigo: mochilaCodigo,
    MochilaNome: `${nomeMochila}`,
    // MochilaDescricao: `Descrição da mochila ${mochilaCodigo}`, // Substituir por descrição real se tiver
  };

  const opcoesRelatorio = [
    {
      titulo: "Diário",
      href: `/reports/${mochilaCodigo}/daily`,
      Icon: FiClock,
    },
    {
      titulo: "Semanal",
      href: `/reports/${mochilaCodigo}/weekly`,
      Icon: FiActivity,
    },
    {
      titulo: "Mensal",
      href: `/reports/${mochilaCodigo}/monthly`,
      Icon: FiBarChart2,
    },
    {
      titulo: "Anual",
      href: `/reports/${mochilaCodigo}/annual`,
      Icon: FiCalendar,
    },
    {
      titulo: "Previsão Futura",
      href: `/reports/${mochilaCodigo}/futurePrediction`,
      Icon: FiBarChart,
    },
  ];

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-gray-800">
        <div className="max-w-4xl mx-auto">
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
              <h1 className="text-2xl font-bold">Relatórios</h1>
              <p className="text-gray-600">
                {mochila.MochilaNome || mochila.MochilaDescricao} (
                {mochila.MochilaCodigo})
              </p>
            </div>
          </div>

          {/* Grade de opções */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            {opcoesRelatorio.map((opcao, index) => (
              <ReportOptionCard
                key={index}
                titulo={opcao.titulo}
                href={opcao.href}
                Icon={opcao.Icon}
              />
            ))}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}





