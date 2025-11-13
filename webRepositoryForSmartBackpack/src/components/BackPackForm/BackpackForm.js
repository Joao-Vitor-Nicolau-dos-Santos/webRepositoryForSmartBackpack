"use client";
import { useState } from "react";

/*
 Props:
 - onSubmit(form) => called with {MochilaCodigo, MochilaDescricao}
 - placeholderCodigo (optional) - placeholder for the code input
 - placeholderDescricao (optional) - placeholder for the alias input
*/
export default function BackpackForm({ onSubmit, placeholderCodigo = "Código da mochila", placeholderDescricao = "Apelido (opcional)" }) {
  const [form, setForm] = useState({
    MochilaCodigo: "",
    MochilaDescricao: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    // Limpa o formulário após o envio
    setForm({ MochilaCodigo: "", MochilaDescricao: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        name="MochilaCodigo"
        value={form.MochilaCodigo}
        onChange={handleChange}
        placeholder={placeholderCodigo}
        required
        className="p-2 rounded bg-green-100"
      />
      <input
        name="MochilaDescricao"
        value={form.MochilaDescricao}
        onChange={handleChange}
        placeholder={placeholderDescricao}
        className="p-2 rounded bg-green-100"
      />
      <button type="submit" className="bg-[#5CFF5C] hover:scale(1.02) hover:bg-[#40bf5e] transition duration-300 p-2 rounded">
        Vincular mochila
      </button>
    </form>
  );
}