"use client";

import Header from "@/components/Header/Header";
import Reveal from "@/components/Reveal/Reveal";
import Footer from "@/components/Footer/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Header />

      <Reveal direction="up" delay={0.1} duration={0.6}>
        {/* Seção principal */}
        <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col md:flex-row items-center gap-8">
          {/* Coluna esquerda: texto e botão */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl  text-gray-800 leading-tight mb-6">
              INTELIGENTE POR DENTRO,
              <br />
              ㅤESTILOSA POR FORA.
            </h1>
            <button
              className="px-6 py-3 border-4 border-[#7DFA48] rounded-full text-black font-medium hover:bg-[#7DFA48] hover:text-white transition-all duration-300 shadow-md"
              onClick={() => {
                document
                  .getElementById("part2")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              CONHEÇA NOSSA MOCHILA
            </button>
          </div>

          <Reveal direction="up" delay={0.2} duration={0.6}>
            <div className="flex-1 relative w-full max-w-lg overflow-hidden hover:scale-101 transition-transform duration-500">
              <div className="absolute inset-0 top-0 bg-[#7DFA48] rounded-3xl p-0 right-0"></div>
              <Reveal direction="up" delay={0.4} duration={0.8}>
                <div className="relative w-full h-auto p-6">
                  <img
                    src="/backpack-base-img.png"
                    alt="Mochila inteligente"
                    className="w-full h-auto object-cover transform -scale-x-100"
                    style={{
                      filter: "drop-shadow(0 60px 20px rgba(0, 0, 0, 0.34))",
                      transform: "translateY(5px)",
                    }}
                  />
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.3} duration={0.6}>
        <div className="flex flex-col md:flex-row items-center w-screen justify-center gap-8 max-w-full mx-auto px-6 py-12 bg-[#ADEBB3] rounded-3xl">
          <div className="flex-1 relative w-full max-w-lg">
            <div className="absolute inset-0 top-0 bg-white rounded-full p-0 right-0"></div>

            <div className="relative w-full h-auto p-8 hover:scale-101 transition-transform duration-500">
              <img
                src="/backpack-functions-img.png"
                alt="Mochila inteligente"
                className="w-full h-auto object-contain transform -scale-x-100"
                style={{
                  filter: "drop-shadow(0 60px 20px rgba(0, 0, 0, 0.20))",
                  transform: "translateY(5px)",
                }}
                id="part2"
              />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl  text-gray-800 leading-tight mb-6">
              DESIGN QUE IMPRESSIONA,
              <br />
              ㅤESPAÇO QUE SURPREENDE.
            </h1>
            <h2 className="text-2xl"> ◌ Nossa mochila foca na sua saúde.</h2>
            <h2 className="text-2xl">
              {" "}
              ㅤㅤ◌ Não queremos peso algum sobre você.
            </h2>
            <h2 className="text-2xl">
              {" "}
              ㅤㅤㅤㅤ◌ Caso seu fardo seja pesado, te avisaremos.
            </h2>
          </div>
        </div>
      </Reveal>

      {/* <Reveal direction="right" delay={0.5} duration={0.6}>
        <div className="max-w-full bg-[#7DFA48] h-[600px] rounded-3xl overflow-hidden relative">
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-white rounded-full z-0 "></div>
          <Reveal direction="up" delay={0.6} duration={0.6}>
            <img
              src="/backpack-back.png"
              alt="Mochila"
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-auto object-contain  hover:scale-105 transition-transform duration-500"
              style={{
                filter: "drop-shadow(0 60px 20px rgba(0, 0, 0, 0.30))",
              }}
            />
          </Reveal>
        </div>
      </Reveal> */}

      <Reveal direction="right" delay={0.5} duration={0.6}>
        <div className="max-w-full bg-[#7DFA48] h-[600px] rounded-3xl overflow-hidden relative flex items-center justify-center p-8">
          {/* Círculo branco com sombra */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 bg-white rounded-full shadow-lg z-0"></div>
          </div>

          {/* Imagem da mochila - sobre o círculo */}
          <img
            src="/backpack-back.png"
            alt="Mochila"
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-auto object-contain hover:scale-105 transition-transform duration-500"
            style={{
              filter: "drop-shadow(0 60px 20px rgba(0, 0, 0, 0.30))",
            }}
          />

          {/* Texto à esquerda */}
          <div className="absolute left-8 text-left text-black  text-xl">
            <h1 className="text-4xl  text-gray-800 leading-tight mb-6">
            SEMPRE
            <br />
            LEVE
            <br />
            COM VOCÊ.
            </h1>
          </div>

          {/* Texto à direita */}
          <div className="absolute right-8 text-right text-black  text-xl">
            <h1 className="text-4xl  text-gray-800 leading-tight mb-6">
            ELEGANTE,
            <br />
            PRÁTICA
            <br />E LEVE.
            </h1>
          </div>
        </div>
      </Reveal>

      <Footer />
    </main>
  );
}
