"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    UsuarioNome: "",
    UsuarioEmail: "",
    UsuarioSenha: "",
    UsuarioPeso: "",
    UsuarioAltura: "",
    UsuarioDtNascimento: "",
    UsuarioSexo: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Limpa erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Nome
    if (!form.UsuarioNome.trim()) {
      newErrors.UsuarioNome = "Nome é obrigatório.";
    } else if (form.UsuarioNome.trim().length < 3 || form.UsuarioNome.trim().length > 100) {
      newErrors.UsuarioNome = "O nome deve ter entre 3 e 100 caracteres.";
    }

    // E-mail
    if (!form.UsuarioEmail.trim()) {
      newErrors.UsuarioEmail = "E-mail é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.UsuarioEmail)) {
      newErrors.UsuarioEmail = "E-mail inválido.";
    }

    // Senha
    if (!form.UsuarioSenha) {
      newErrors.UsuarioSenha = "Senha é obrigatória.";
    } else {
      const senha = form.UsuarioSenha;
      if (senha.length < 8 || senha.length > 16) {
        newErrors.UsuarioSenha = "A senha deve ter de 8 a 16 caracteres.";
      } else {
        const maiusculas = (senha.match(/[A-Z]/g) || []).length;
        const minusculas = (senha.match(/[a-z]/g) || []).length;
        const numeros = (senha.match(/[0-9]/g) || []).length;
        const especiais = (senha.match(/[^A-Za-z0-9]/g) || []).length;
        if (maiusculas < 2) newErrors.UsuarioSenha = "A senha deve ter pelo menos 2 letras maiúsculas.";
        else if (minusculas < 2) newErrors.UsuarioSenha = "A senha deve ter pelo menos 2 letras minúsculas.";
        else if (numeros < 2) newErrors.UsuarioSenha = "A senha deve ter pelo menos 2 números.";
        else if (especiais < 2) newErrors.UsuarioSenha = "A senha deve ter pelo menos 2 caracteres especiais.";
      }
    }

    // Peso
    const peso = parseFloat(form.UsuarioPeso);
    if (isNaN(peso) || peso === 0) {
      newErrors.UsuarioPeso = "Peso é obrigatório.";
    } else if (peso < 9) {
      newErrors.UsuarioPeso = "Peso mínimo é 9 kg.";
    }

    // Altura
    const altura = parseFloat(form.UsuarioAltura);
    if (isNaN(altura) || altura === 0) {
      newErrors.UsuarioAltura = "Altura é obrigatória.";
    } else if (altura < 0.80) {
      newErrors.UsuarioAltura = "Altura mínima é 0,80 m.";
    }

    // Data de nascimento
    if (!form.UsuarioDtNascimento) {
      newErrors.UsuarioDtNascimento = "Data de nascimento é obrigatória.";
    } else {
      const nascimento = new Date(form.UsuarioDtNascimento);
      const hoje = new Date();
      const idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      const dia = hoje.getDate() - nascimento.getDate();
      if (idade < 3 || (idade === 3 && (mes < 0 || (mes === 0 && dia < 0)))) {
        newErrors.UsuarioDtNascimento = "Você deve ter pelo menos 3 anos.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:3000/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // Se a API retornar erro específico de campo, exibe no campo
        if (data.error?.includes("E-mail já cadastrado")) {
          setErrors({ UsuarioEmail: data.error });
        } else if (data.error?.includes("Nome")) {
          setErrors({ UsuarioNome: data.error });
        } else if (data.error?.includes("Peso")) {
          setErrors({ UsuarioPeso: data.error });
        } else if (data.error?.includes("Altura")) {
          setErrors({ UsuarioAltura: data.error });
        } else if (data.error?.includes("Data de Nacimento")) {
          setErrors({ UsuarioDtNascimento: data.error });
        } else if (data.error?.includes("Sexo")) {
          setErrors({ UsuarioSexo: data.error });
        } else if (data.error?.includes("Senha")) {
          setErrors({ UsuarioSenha: data.error });
        } else {
          setErrors({ general: data.error || "Erro ao registrar." });
        }
        return;
      }

      router.push("/backpack");
    } catch (err) {
      setErrors({ general: "Erro de conexão com o servidor." });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[#ADEBB3] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl p-8 bg-[#F2F2F2] rounded-2xl text-black shadow-lg">
        <h1 className="text-3xl text-center text-pink-500 font-bold mb-2">Seja bem-vindo!</h1>
        <p className="text-center text-gray-600 mb-6">Crie sua conta para começar</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Nome */}
          <div>
            <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Nome</label>

            <input
              id="UsuarioNome"
              name="UsuarioNome"
              placeholder="Digite o nome completo"
              className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.UsuarioNome ? "ring-2 ring-red-500" : ""
              }`}
              value={form.UsuarioNome}
              onChange={handleChange}
            />
            {errors.UsuarioNome && <p className="text-red-600 text-sm mt-1">{errors.UsuarioNome}</p>}
          </div>

          {/* E-mail */}
          <div>
            <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Email</label>

            <input
              id="UsuarioEmail"
              name="UsuarioEmail"
              placeholder="Digite seu e-mail"
              type="email"
              className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.UsuarioEmail ? "ring-2 ring-red-500" : ""
              }`}
              value={form.UsuarioEmail}
              onChange={handleChange}
            />
            {errors.UsuarioEmail && <p className="text-red-600 text-sm mt-1">{errors.UsuarioEmail}</p>}
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Senha</label>

            <input
              id="UsuarioSenha"
              name="UsuarioSenha"
              placeholder="Crie uma senha"
              type="password"
              className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.UsuarioSenha ? "ring-2 ring-red-500" : ""
              }`}
              value={form.UsuarioSenha}
              onChange={handleChange}
            />
            {errors.UsuarioSenha && <p className="text-red-600 text-sm mt-1">{errors.UsuarioSenha}</p>}
          </div>

          {/* Peso e Altura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Peso</label>

              <input
                id="UsuarioPeso"
                name="UsuarioPeso"
                placeholder="Peso (kg)"
                type="number"
                step="0.01"
                min="0"
                className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.UsuarioPeso ? "ring-2 ring-red-500" : ""
                }`}
                value={form.UsuarioPeso}
                onChange={handleChange}
              />
              {errors.UsuarioPeso && <p className="text-red-600 text-sm mt-1">{errors.UsuarioPeso}</p>}
            </div>
            <div>
              <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Altura</label>

              <input
                id="UsuarioAltura"
                name="UsuarioAltura"
                placeholder="Altura (m)"
                type="number"
                step="0.01"
                min="0"
                className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.UsuarioAltura ? "ring-2 ring-red-500" : ""
                }`}
                value={form.UsuarioAltura}
                onChange={handleChange}
              />
              {errors.UsuarioAltura && <p className="text-red-600 text-sm mt-1">{errors.UsuarioAltura}</p>}
            </div>
          </div>

          {/* Data de Nascimento */}
          <div>
            <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Data de nascimento</label>

            <input
              id="UsuarioDtNascimento"
              name="UsuarioDtNascimento"
              type="date"
              className={`w-full p-3 rounded-3xl bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.UsuarioDtNascimento ? "ring-2 ring-red-500" : ""
              }`}
              value={form.UsuarioDtNascimento}
              onChange={handleChange}
            />
            {errors.UsuarioDtNascimento && <p className="text-red-600 text-sm mt-1">{errors.UsuarioDtNascimento}</p>}
          </div>

          {/* Sexo */}
          <div>
            <label htmlFor="UsuarioDtNascimento" className="block text-sm text-gray-600 mb-1">Sexo</label>

            <select
              id="UsuarioSexo"
              name="UsuarioSexo"
              value={form.UsuarioSexo}
              onChange={handleChange}
              className={`w-full p-3 rounded-3xl bg-green-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none ${
                errors.UsuarioSexo ? "ring-2 ring-red-500" : ""
              }`}
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Prefiro não dizer">Prefiro não dizer</option>
            </select>
            {errors.UsuarioSexo && <p className="text-red-600 text-sm mt-1">{errors.UsuarioSexo}</p>}
          </div>

          {/* Erro geral */}
          {errors.general && <p className="text-red-600 text-center">{errors.general}</p>}

          {/* Botão */}
          <button
            type="submit"
            disabled={submitting}
            className={`bg-lime-400 hover:bg-lime-500 transition duration-300 p-3 rounded-3xl text-lg font-medium ${
              submitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? "Cadastrando..." : "Confirmar"}
          </button>
        </form>

        {/* Link de login */}
        <nav className="mt-6 text-center">
          <Link href="/login" className="text-green-600 hover:underline">
            Já tem conta? Faça login.
          </Link>
        </nav>
      </div>
    </main>
  );
}