'use client';

import { useAuth } from '@/app/hooks/useAuth'; 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth(); // Agora também pegamos o 'loading'
  const router = useRouter();

  useEffect(() => {
    // Apenas redireciona se o carregamento do auth terminou e não há usuário
    if (!authLoading && !user) {
      console.log("ProtectedRoute: Nenhum usuário encontrado, redirecionando para /login");
      router.push('/login');
    } else if (authLoading) {
      console.log("ProtectedRoute: Ainda carregando autenticação...");
    } else {
      console.log("ProtectedRoute: Usuário encontrado, renderizando children.");
    }
  }, [user, authLoading, router]); // Adicionamos 'authLoading' às dependências

  // Enquanto o estado de autenticação está sendo carregado, você pode mostrar um loader
  if (authLoading) {
    return <div>Verificando autenticação...</div>;
  }

  // Se o usuário estiver autenticado (user !== null/undefined), renderiza os filhos
  return user ? children : null;
}