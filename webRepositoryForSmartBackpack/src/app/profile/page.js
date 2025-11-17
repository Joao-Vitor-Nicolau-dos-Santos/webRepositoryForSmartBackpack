"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";

export default function ProfilePage() {
  const router = useRouter();
  const { authFetch, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userData, setUserData] = useState(null);
  const [form, setForm] = useState({
    UsuarioNome: "",
    UsuarioEmail: "",
    UsuarioPeso: "",
    UsuarioAltura: "",
    UsuarioDtNascimento: "",
    UsuarioSexo: "",
    UsuarioPesoMaximoPorcentagem: "",
  });

  // --- 1. CARREGAR DADOS DO USUÁRIO AO MONTAR ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/id/`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Erro ${res.status} ao carregar perfil.`);
        }

        const data = await res.json();
        console.log("Dados do usuário carregados:", data);
        setUserData(data.usuario);

        // Inicializa o estado do formulário com os dados do usuário
        setForm({
          UsuarioNome: data.usuario.UsuarioNome || "",
          UsuarioEmail: data.usuario.UsuarioEmail || "",
          UsuarioPeso: data.usuario.UsuarioPeso !== undefined ? data.usuario.UsuarioPeso : "",
          UsuarioAltura: data.usuario.UsuarioAltura !== undefined ? data.usuario.UsuarioAltura : "",
          UsuarioDtNascimento: data.usuario.UsuarioDtNascimento ? new Date(data.usuario.UsuarioDtNascimento).toISOString().split('T')[0] : "",
          UsuarioSexo: data.usuario.UsuarioSexo || "",
          UsuarioPesoMaximoPorcentagem: data.usuario.UsuarioPesoMaximoPorcentagem !== undefined ? data.usuario.UsuarioPesoMaximoPorcentagem : "",
        });

      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        setError(`Falha ao carregar perfil: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authFetch]);

  // --- 3. FUNÇÃO PARA SALVAR AS ALTERAÇÕES ---
  const handleSaveClick = async () => {
    setSuccess("");
    setError("");
    try {
      // Validações simples no frontend (opcional, a API também valida)
      if (!form.UsuarioNome.trim()) {
        throw new Error("Nome é obrigatório.");
      }
      if (!form.UsuarioEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.UsuarioEmail)) {
        throw new Error("E-mail inválido.");
      }
      // Validações de peso, altura, etc., podem ser adicionadas aqui

      const payload = {
        ...form,
        // Converter campos numéricos se necessário
        UsuarioPeso: parseFloat(form.UsuarioPeso),
        UsuarioAltura: parseFloat(form.UsuarioAltura),
        UsuarioPesoMaximoPorcentagem: parseFloat(form.UsuarioPesoMaximoPorcentagem),
      };

      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao atualizar perfil.");
      }

      const data = await res.json();
      setSuccess("Perfil atualizado com sucesso!");
      // Atualiza o estado local com os dados salvos (opcional, pode ser feito apenas no carregamento inicial)
      setUserData(prev => ({ ...prev, ...payload }));


    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError(err.message);
    }
  };

  // --- 4. MANIPULADORES DE INPUT ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando perfil...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
          <div className="text-red-500 p-4 text-center">
            <p>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 bg-gray-50 text-black text-center">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Meu Perfil</h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}
          {success && <p className="text-green-500 mb-4">{success}</p>}

          {/* Exibição dos dados ou formulário de edição */}
          <form onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }} className="space-y-4">
            <div>
              <label htmlFor="UsuarioNome" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Nome
              </label>
              <input
                id="UsuarioNome"
                name="UsuarioNome"
                type="text"
                value={form.UsuarioNome}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label htmlFor="UsuarioEmail" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                E-mail
              </label>
              <input
                id="UsuarioEmail"
                name="UsuarioEmail"
                type="email"
                value={form.UsuarioEmail}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="UsuarioPeso" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Peso (kg)
                </label>
                <input
                  id="UsuarioPeso"
                  name="UsuarioPeso"
                  type="number"
                  step="0.01"
                  value={form.UsuarioPeso}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="UsuarioAltura" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Altura (m)
                </label>
                <input
                  id="UsuarioAltura"
                  name="UsuarioAltura"
                  type="number"
                  step="0.01"
                  value={form.UsuarioAltura}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="UsuarioDtNascimento" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Data de Nascimento
              </label>
              <input
                id="UsuarioDtNascimento"
                name="UsuarioDtNascimento"
                type="date"
                value={form.UsuarioDtNascimento}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="UsuarioSexo" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Sexo
              </label>
              <select
                id="UsuarioSexo"
                name="UsuarioSexo"
                value={form.UsuarioSexo}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não dizer">Prefiro não dizer</option>
              </select>
            </div>

            <div>
              <label htmlFor="UsuarioPesoMaximoPorcentagem" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Peso Máximo Permitido (% do seu peso)
              </label>
              <input
                id="UsuarioPesoMaximoPorcentagem"
                name="UsuarioPesoMaximoPorcentagem"
                type="number"
                step="0.01"
                min="1"
                max="100"
                value={form.UsuarioPesoMaximoPorcentagem}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Ex: 10 (significa 10% do seu peso)"
              />
            </div>

            <div className="flex justify-center mt-6 space-x-4 w-full">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md text-white font-medium w-1/2 ${success ? "bg-green-500" : "bg-green-500 hover:bg-green-600"}`}
              >
                Salvar Alterações
              </button>
              <button
                onClick={logout}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 w-1/2"
              >
                Sair da Conta
              </button>
            </div>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
