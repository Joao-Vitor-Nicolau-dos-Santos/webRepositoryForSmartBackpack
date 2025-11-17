"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";

import mochileiro from "../../../public/mochileiro.png";
import mochileira from "../../../public/mochileira.png";

// Função auxiliar para arredondar
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}

export default function HomeDashboard() {
  const router = useRouter();
  const { authFetch, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [erroConexao, setErroConexao] = useState(false);
  const [mostrarTela, setMostrarTela] = useState(false);

  // Dados do usuário
  const [nomePessoa, setNomePessoa] = useState("");
  const [pessoa, setPessoa] = useState("mochilaSolo");
  const [pesoMaximo, setPesoMaximo] = useState(1);
  const [pesoEsquerdo, setPesoEsquerdo] = useState(0);
  const [pesoDireito, setPesoDireito] = useState(0);
  const [dataUltimaAtualizacao, setDataUltimaAtualizacao] = useState(
    new Date()
  );
  const [pesoTotal, setPesoTotal] = useState(0);
  const [percEsquerdo, setPercEsquerdo] = useState(0);
  const [percDireito, setPercDireito] = useState(0);
  const [temMochila, setTemMochila] = useState(true);
  const [corTextoCirculo, setCorTextoCirculo] = useState("#338136ff");

  const intervalRef = useRef(null);
  const tentativasRef = useRef(0);

  const imagensMochileiros = {
    mochileiro: mochileiro,
    mochileira: mochileira,
  };

  // 🔄 Função para obter dados do usuário (igual ao React Native)
  const obterDadosUsuario = async () => {
    try {
      console.log("📡 Buscando dados do usuário...");

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/id`
      );

      if (!response.ok) {
        console.log(`❌ Erro ${response.status} ao obter dados do usuário`);
        if (response.status === 401) {
          logout();
          router.push("/login");
          return "false";
        }
        return "offline";
      }

      const data = await response.json();
      console.log("✅ Dados do usuário obtidos:", data);
      return data;
    } catch (error) {
      console.log("💥 Erro ao obter dados do usuário:", error);
      return "offline";
    }
  };

  // 🔄 Função principal para buscar dados
  const buscarDados = async () => {
    try {
      console.log("🔄 Buscando dados da home...");
      tentativasRef.current++;

      if (tentativasRef.current > 3) {
        console.log("🚫 Muitas tentativas falhas, parando...");
        setErroConexao(true);
        setLoading(false);
        setMostrarTela(true);
        return;
      }

      setDataUltimaAtualizacao(new Date());

      // 🔄 Obtém dados do usuário (igual ao React Native)
      const dataResponse = await obterDadosUsuario();

      if (dataResponse === "false" || dataResponse === "offline") {
        console.log("❌ Problema com tokens ou conexão");
        if (dataResponse === "false") {
          logout();
          router.push("/login");
        } else {
          setErroConexao(true);
        }
        setLoading(false);
        setMostrarTela(true);
        return;
      }

      // ✅ CORREÇÃO: Extrai os dados do usuário da resposta (igual ao React Native)
      let data;
      if (dataResponse.ok === true && dataResponse.usuario) {
        data = dataResponse.usuario; // Extrai do objeto {ok: true, usuario: {...}}
      } else {
        data = dataResponse; // Já é o objeto do usuário diretamente
      }

      tentativasRef.current = 0;
      setErroConexao(false);

      // Processa dados do usuário (igual ao React Native)
      if (data.UsuarioPeso) {
        setPesoMaximo(
          data.UsuarioPeso * (data.UsuarioPesoMaximoPorcentagem / 100)
        );
      }

      if (data.UsuarioNome) {
        const nomeCompleto = data.UsuarioNome;
        const primeiroNome = nomeCompleto.split(" ")[0];
        setNomePessoa(primeiroNome);
      }

      if (data.UsuarioSexo === "Feminino") {
        setPessoa("mochileira");
      } else if (data.UsuarioSexo === "Masculino") {
        setPessoa("mochileiro");
      }

      // 🔄 Busca dados da mochila (endpoint igual ao React Native)
      const mochilaRes = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/mochilaUso`
      );

      if (!mochilaRes.ok) {
        console.log("❌ Nenhuma mochila em uso ou erro ao buscar");
        setTemMochila(false);
        setPesoTotal(0);
        setPesoEsquerdo(0);
        setPesoDireito(0);
        setPercEsquerdo(0);
        setPercDireito(0);
        setLoading(false);
        setMostrarTela(true);
        return;
      }

      const mochilaData = await mochilaRes.json();
      console.log("🎒 Dados da mochila:", mochilaData);

      if (mochilaData.mochila?.MochilaCodigo) {
        // Busca medições da mochila (endpoint igual ao React Native)
        const medicoesResponse = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/medicoes/atual/${mochilaData.mochila.MochilaCodigo}`
        );

        if (!medicoesResponse.ok) {
          console.log("❌ Erro ao buscar medições");
          setTemMochila(false);
          setPesoTotal(0);
          setPesoEsquerdo(0);
          setPesoDireito(0);
          setPercEsquerdo(0);
          setPercDireito(0);
          return;
        }

        const dataMedicao = await medicoesResponse.json();
        console.log("📊 Dados da medição:", dataMedicao);

        let pesoTotalConta = 0;

        if (dataMedicao.esquerda && dataMedicao.direita) {
          pesoTotalConta = roundTo2(
            Number(dataMedicao.esquerda.MedicaoPeso) +
              Number(dataMedicao.direita.MedicaoPeso)
          );
          setPesoTotal(pesoTotalConta);
          setPesoEsquerdo(Number(dataMedicao.esquerda.MedicaoPeso));
          setPesoDireito(Number(dataMedicao.direita.MedicaoPeso));
          setPercEsquerdo(
            Number(dataMedicao.esquerda.MedicaoPeso) / pesoTotalConta
          );
          setPercDireito(
            Number(dataMedicao.direita.MedicaoPeso) / pesoTotalConta
          );
        } else {
          setPesoTotal(0);
          setPesoEsquerdo(0);
          setPesoDireito(0);
          setPercEsquerdo(0);
          setPercDireito(0);
        }

        setTemMochila(true);

        // Define cor do círculo baseado no peso (igual ao React Native)
        if (pesoTotalConta > 0 && (pesoTotalConta / pesoMaximo) * 100 > 50) {
          setCorTextoCirculo("#bd1c11ff");
        } else {
          setCorTextoCirculo("#338136ff");
        }
      } else {
        setTemMochila(false);
      }
    } catch (error) {
      console.log("💥 Erro geral na busca de dados:", error);
      setErroConexao(true);
    } finally {
      setLoading(false);
      setMostrarTela(true);
    }
  };

  // 🔄 useEffect para inicialização e atualização periódica
  useEffect(() => {
    // Busca dados inicial
    buscarDados();

    // Configura intervalo para atualizações periódicas (20 segundos)
    intervalRef.current = setInterval(() => {
      if (!erroConexao) {
        buscarDados();
      }
    }, 20000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 🔄 Tenta reconectar quando erro de conexão
  const tentarReconectar = () => {
    setErroConexao(false);
    setLoading(true);
    tentativasRef.current = 0;
    buscarDados();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-center">Carregando dados...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return mostrarTela ? (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto">
          {erroConexao ? (
            // Tela de erro de conexão
            <div className="flex flex-col items-center justify-center h-64">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                Erro de Conexão
              </h2>
              <p className="text-center text-gray-600 mb-4">
                Não foi possível conectar ao servidor.{"\n"}
                Verifique sua conexão com a internet.
              </p>
              <button
                onClick={tentarReconectar}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-semibold"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            // Tela normal - mantido igual ao anterior
            <>
              <div className="flex flex-col items-center mb-8">
                <h1 className="text-2xl font-bold text-center">
                  Olá, {nomePessoa}!
                </h1>
                <p className="text-lg text-gray-600 text-center mt-2">
                  Veja seu Peso em Tempo Real
                </p>
                <div className="mt-6">
                  <div className="mt-6">
                    <Image
                      src={imagensMochileiros[pessoa]}
                      alt={`Avatar ${pessoa}`}
                      width={200}
                      height={200}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>

              {temMochila ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 mb-6">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#338136ff"
                        strokeWidth="10"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#bd1c11ff"
                        strokeWidth="10"
                        strokeDasharray="283"
                        strokeDashoffset={
                          283 - 283 * Math.min(pesoTotal / pesoMaximo, 1)
                        }
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-2xl font-bold text-center leading-tight"
                        style={{ color: corTextoCirculo }}
                      >
                        {Math.round((pesoTotal / pesoMaximo) * 100)}%<br />
                        <span className="text-lg">{pesoTotal} Kg</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    Peso máximo permitido: {roundTo2(pesoMaximo)} Kg
                  </p>

                  <div className="w-4/5 max-w-md h-6 border border-gray-800 rounded-md overflow-hidden flex mb-2">
                    <div
                      className="bg-[#F46334]"
                      style={{ flex: percEsquerdo || 0.5 }}
                    ></div>
                    <div
                      className="bg-[#36985B]"
                      style={{ flex: percDireito || 0.5 }}
                    ></div>
                  </div>

                  <div className="flex justify-between w-4/5 max-w-md text-sm font-semibold mb-6">
                    <span style={{ color: "#F46334" }}>
                      Esq.: {Math.round(percEsquerdo * 100)}% ({pesoEsquerdo}{" "}
                      Kg)
                    </span>
                    <span style={{ color: "#36985B" }}>
                      Dir.: {Math.round(percDireito * 100)}% ({pesoDireito} Kg)
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Atualizado {dataUltimaAtualizacao.toLocaleString("pt-BR")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className="text-lg text-gray-600 text-center font-semibold">
                    Nenhuma mochila em uso
                  </p>
                  <p className="text-gray-500 text-center mt-2">
                    Selecione uma para começar
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  ) : null;
}
