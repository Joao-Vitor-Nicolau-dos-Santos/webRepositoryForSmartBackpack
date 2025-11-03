"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth"; 

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, authFetch } = useAuth(); // Obtemos authFetch para fazer a chamada à API

  // --- Estado para o número de alertas não lidos ---
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  // --- Fim do estado ---

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Rotas públicas (quando não logado)
  const publicRoutes = [
    { href: "/home", label: "Ínicio" },
    { href: "/login", label: "Login" },
  ];

  // Rotas privadas (quando logado)
  const privateRoutes = [
    { href: "/backpack", label: "Mochilas" },
    { href: "/alerts", label: "Alertas" }, // Vamos adicionar o badge aqui
    { href: "/reports", label: "Relatórios" },
    { href: "/profile", label: "Perfil" },
  ];

  const routes = user ? privateRoutes : publicRoutes;

  // --- useEffect para carregar o número de alertas não lidos ---
  useEffect(() => {
    const fetchUnreadAlertsCount = async () => {
      if (!user) return; // Só busca se o usuário estiver logado

      try {
        // --- CHAMADA PARA A API PARA OBTER O NÚMERO DE ALERTAS NÃO LIDOS ---
        // Endpoint da sua API: GET /alertas/usuario/Enviar
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alertas/usuario/Enviar`
        );
        // --- FIM DA CHAMADA ---

        if (!res.ok) {
          // Se a resposta não for ok, limpa o contador
          console.error("[Header] Erro ao carregar número de alertas não lidos:", res.status);
          setUnreadAlertsCount(0);
          return;
        }

        const rawData = await res.json();
        console.log("[Header] Dados brutos de alertas não lidos:", rawData); // Log para debug

        // A API retorna um array de alertas. O número de alertas não lidos é o tamanho do array.
        const count = Array.isArray(rawData) ? rawData.length : 0;
        setUnreadAlertsCount(count);

      } catch (err) {
        console.error("[Header] Erro ao carregar número de alertas não lidos:", err);
        // Em caso de erro, assume que não há alertas não lidos
        setUnreadAlertsCount(0);
      }
    };

    fetchUnreadAlertsCount();

    // Opcional: Atualizar a cada X segundos
    // const intervalId = setInterval(fetchUnreadAlertsCount, 30000); // 30 segundos
    // return () => clearInterval(intervalId);
  }, [user, authFetch]); // Re-executa se user ou authFetch mudarem
  // --- FIM DO useEffect ---

  return (
    <header className="sticky top-0 left-0 right-0 bg-[#7DFA48] text-white px-6 py-4 shadow-lg z-50 rounded-b-4xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Menu para desktop */}
        <nav className="hidden md:flex flex-1 justify-center">
          <ul className="flex justify-center gap-8"> {/* Distribuição equidistante */}
            {routes.map((route) => {
              // --- LÓGICA PARA ADICIONAR O BADGE AO ITEM "ALERTAS" ---
              if (route.href === "/alerts" && user && unreadAlertsCount > 0) {
                return (
                  <li key={route.href} className="relative">
                    <Link href={route.href}>
                      <span className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base hover:underline">
                        {route.label}
                        {/* --- BADGE VERMELHO --- */}
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                        </span>
                        {/* --- FIM DO BADGE --- */}
                      </span>
                    </Link>
                  </li>
                );
              }
              // --- FIM DA LÓGICA DO BADGE ---

              // Para todos os outros itens do menu, renderiza normalmente
              return (
                <li key={route.href}>
                  <Link href={route.href}>
                    <span className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base hover:underline">
                      {route.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Botão do menu hambúrguer para mobile */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-black text-2xl focus:outline-none"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav>
          <ul className="flex flex-col items-center gap-2 py-4">
            {routes.map((route) => {
              // --- LÓGICA PARA ADICIONAR O BADGE AO ITEM "ALERTAS" NO MOBILE ---
              if (route.href === "/alerts" && user && unreadAlertsCount > 0) {
                return (
                  <li key={route.href} className="w-full relative">
                    <Link href={route.href} onClick={closeMenu}>
                      <span className="block text-black px-4 py-3 cursor-pointer text-center hover:bg-green-200 rounded-lg">
                        {route.label}
                        {/* --- BADGE VERMELHO NO MOBILE --- */}
                        <span className="absolute top-1 right-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                        </span>
                        {/* --- FIM DO BADGE NO MOBILE --- */}
                      </span>
                    </Link>
                  </li>
                );
              }
              // --- FIM DA LÓGICA DO BADGE NO MOBILE ---

              // Para todos os outros itens do menu mobile, renderiza normalmente
              return (
                <li key={route.href} className="w-full">
                  <Link href={route.href} onClick={closeMenu}>
                    <span className="block text-black px-4 py-3 cursor-pointer text-center hover:bg-green-200 rounded-lg">
                      {route.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}