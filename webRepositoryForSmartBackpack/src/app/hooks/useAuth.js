"use client";

import { useState, useEffect, useContext, createContext } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (email, senha, tipoLogin = "App") => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UsuarioEmail: email,
          UsuarioSenha: senha,
          TipoLogin: tipoLogin,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao fazer login");
    }

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("usuarioEmail", email);
    // Atualiza o estado do contexto imediatamente após o login
    setUser({ token: data.accessToken, email });

    return data;
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuarioEmail");
    setUser(null);
    router.push("/login");
  };

  const authFetch = async (url, options = {}) => {
    let token = localStorage.getItem("accessToken");

    const config = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    };

    let response = await fetch(url, config);

    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          console.log("Tentando renovar token..."); // Log de debug
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/token/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: refreshToken }),
            }
          );

          const refreshContentType = refreshRes.headers.get("content-type");
          if (
            !refreshRes.ok ||
            !refreshContentType ||
            !refreshContentType.includes("application/json")
          ) {
            console.error(
              "Erro na resposta de refresh (não JSON):",
              refreshRes.status,
              refreshContentType
            );
            const errorText = await refreshRes.text();
            console.error("Corpo da resposta (erro refresh):", errorText);
            logout();
            // Em vez de retornar a resposta 401 original, podemos redirecionar ou lançar um erro mais específico
            // Por exemplo, lançar um erro que o componente possa tratar
            throw new Error("Sessão expirada. Faça login novamente."); // <<<--- MUDANÇA
            // OU
            // router.push('/login?error=session_expired'); // Se tiver acesso ao router aqui (não é comum em hooks)
            return response; // Fallback, mas o throw acima é preferível
          }

          const refreshData = await refreshRes.json();

          if (refreshRes.ok) {
            console.log("Token renovado com sucesso!");
            localStorage.setItem("accessToken", refreshData.accessToken);
            const newConfig = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
                "Content-Type": "application/json",
              },
            };
            response = await fetch(url, newConfig);
          } else {
            // --- TRATAMENTO ESPECÍFICO PARA ERRO DE REFRESH ---
            if (
              refreshData.error &&
              (refreshData.error.includes("inválido") ||
                refreshData.error.includes("expirado"))
            ) {
              console.warn(
                "Refresh token inválido/expirado detectado. Fazendo logout e sugerindo novo login."
              );
              logout();
              // Lança um erro específico que o componente chamador pode reconhecer
              throw new Error("Sessão expirada. Faça login novamente.");
              // OU, se quiser mais controle no componente:
              // return { status: 401, redirectedToLogin: true }; // Flag personalizada
            } else {
              console.error(
                "Falha na renovação do token (resposta JSON com erro):",
                refreshData
              );
              logout();
            }
            // --- FIM DO TRATAMENTO ESPECÍFICO ---
          }
        } catch (e) {
          console.error("Erro crítico ao renovar token:", e);
          logout();
          // Relança o erro para que o componente chamador (ex: ProfilePage) possa mostrar uma mensagem amigável
          throw e; // <<<--- MUDANÇA
        }
      } else {
        console.error("Nenhum refreshToken encontrado, fazendo logout.");
        logout();
      }
    }

    return response;
  };

  // Função para sincronizar o estado do contexto com o localStorage
  const syncUserFromStorage = () => {
    const token = localStorage.getItem("accessToken");
    const email = localStorage.getItem("usuarioEmail");
    if (token && email) {
      setUser({ token, email });
    } else {
      setUser(null);
    }
  };

  // O useEffect inicial carrega o estado uma vez na montagem
  useEffect(() => {
    syncUserFromStorage();
    setLoading(false); // Indica que o estado inicial foi carregado
  }, []);

  // O contexto agora também fornece a função syncUserFromStorage
  // Isso permite que o LoginPage force uma atualização do estado após login
  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, authFetch, syncUserFromStorage }}
    >
      {children}
    </AuthContext.Provider>
  );
}
