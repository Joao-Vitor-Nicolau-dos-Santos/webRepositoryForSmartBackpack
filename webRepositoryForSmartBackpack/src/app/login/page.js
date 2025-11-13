"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth"; // Importe o hook

export default function LoginPage() {
  const router = useRouter();
  const { syncUserFromStorage } = useAuth(); // Obtenha a função do contexto

  const [form, setForm] = useState({
    UsuarioEmail: "",
    UsuarioSenha: "",
    TipoLogin: "Web",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (error) setError(""); // limpa erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validação simples no frontend
    if (!form.UsuarioEmail.trim() || !form.UsuarioSenha.trim()) {
      setError("E-mail e senha são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao fazer login.");
        return;
      }

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("usuarioEmail", form.UsuarioEmail);
        console.log("Tokens salvos no localStorage.");
      } else {
        throw new Error("Resposta de login inválida: tokens ausentes.");
      }

      // Sincroniza o estado do AuthProvider com o localStorage
      // Isso garante que o ProtectedRoute veja o usuário como logado
      console.log("Sincronizando estado de autenticação...");
      syncUserFromStorage();
      console.log("Estado de autenticação sincronizado.");

      // Redireciona após login bem-sucedido e sincronização
      console.log("Enviando para /backpack");
      router.push("/backpack");
      let message = "Enviado /backpack";
      console.log(message);
    } catch (err) {
      setError(err.message || "Erro de conexão com o servidor.");
      console.error("Erro no login:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#eee]">
      <div className="text-black w-full max-w-md p-8 rounded-2xl shadow-2xl shadow-black/60 bg-[#F2F2F2]">
        <h1 className="text-4xl text-center text-pink-500 ">Olá novamente!</h1>
        <p className="text-center text-gray-600 mb-6">
          Faça login para continuar
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <div>
              <label
                htmlFor="UsuarioEmail"
                className="block text-sm text-black mb-1"
              >
                E-mail
              </label>
              <input
                name="UsuarioEmail"
                placeholder="Seu e-mail"
                type="email"
                className="w-full p-3 rounded-3xl bg-[#f7f7f7ff] focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.UsuarioEmail}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="UsuarioSenha"
              className="block text-sm text-black mb-1"
            >
              Senha
            </label>
            <div>
              <input
                name="UsuarioSenha"
                placeholder="Sua senha"
                type="password"
                className="w-full p-3 rounded-3xl bg-[#f7f7f7ff] focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.UsuarioSenha}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-center text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`bg-[#5CFF5C] hover:scale(1.02) hover:bg-[#40bf5e] transition duration-300 p-3 rounded-3xl text-lg font-medium ${
              loading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <nav className="mt-6 text-center">
          <Link href="/register" className="text-green-600 hover:underline">
            Não tem conta? Criar conta.
          </Link>
        </nav>
      </div>
    </main>
  );
}
