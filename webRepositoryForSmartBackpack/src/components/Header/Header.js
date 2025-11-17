"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'; // Importa useRouter
import { useAuth } from "@/app/hooks/useAuth";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, authFetch } = useAuth();
  const router = useRouter(); // Inicializa o router

  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const publicRoutes = [
    { href: "/start", label: "Ínicio" },
    { href: "/login", label: "Login" },
  ];

  const privateRoutes = [
    { href: "/home", label: "Ínicio" },
    { href: "/backpack", label: "Mochilas" },
    { href: "/alerts", label: "Alertas" },
    { href: "/reports", label: "Relatórios" },
    { href: "/profile", label: "Perfil" },
  ];

  const routes = user ? privateRoutes : publicRoutes;

  // --- useEffect para redirecionamento ---
  useEffect(() => {
    // Se não há usuário (não logado) e a rota atual não é /start, redireciona para /start
    if (!user && typeof window !== 'undefined' && !window.location.pathname.startsWith('/start')) {
      router.replace('/start');
    }
    // Se há usuário (logado) e a rota atual é /start ou /login, redireciona para /home
    else if (user && typeof window !== 'undefined' && (window.location.pathname === '/start' || window.location.pathname === '/login')) {
      router.replace('/home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Executa sempre que o 'user' mudar
  // --- Fim do useEffect de redirecionamento ---

  useEffect(() => {
    const fetchUnreadAlertsCount = async () => {
      if (!user) return;

      try {
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alertas/usuario/Enviar`
        );

        if (!res.ok) {
          console.error("[Header] Erro ao carregar número de alertas não lidos:", res.status);
          setUnreadAlertsCount(0);
          return;
        }

        const rawData = await res.json();
        console.log("[Header] Dados brutos de alertas não lidos:", rawData);

        const count = Array.isArray(rawData) ? rawData.length : 0;
        setUnreadAlertsCount(count);

      } catch (err) {
        console.error("[Header] Erro ao carregar número de alertas não lidos:", err);
        setUnreadAlertsCount(0);
      }
    };

    fetchUnreadAlertsCount();
  }, [user, authFetch]);

  return (
    <header className="sticky top-0 left-0 right-0 bg-[#7DFA48] text-white px-6 py-4 shadow-lg z-50 rounded-b-4xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <nav className="hidden md:flex flex-1 justify-center">
          <ul className="flex justify-center gap-8">
            {routes.map((route) => {
              if (route.href === "/alerts" && user && unreadAlertsCount > 0) {
                return (
                  <li key={route.href} className="relative">
                    <Link href={route.href}>
                      <span className="block text-black px-4 py-2 cursor-pointer text-sm md:text-base hover:underline">
                        {route.label}
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              }
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

        <button
          onClick={toggleMenu}
          className="md:hidden text-black text-2xl focus:outline-none"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-screen opacity-100" : "max-h0 opacity-0"
        }`}
      >
        <nav>
          <ul className="flex flex-col items-center gap-2 py-4">
            {routes.map((route) => {
              if (route.href === "/alerts" && user && unreadAlertsCount > 0) {
                return (
                  <li key={route.href} className="w-full relative">
                    <Link href={route.href} onClick={closeMenu}>
                      <span className="block text-black px-4 py-3 cursor-pointer text-center hover:bg-green-200 rounded-lg">
                        {route.label}
                        <span className="absolute top-1 right-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              }
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