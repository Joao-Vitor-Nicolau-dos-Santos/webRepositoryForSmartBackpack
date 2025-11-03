"use client";

import Head from "next/head";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@800&family=Roboto:wght@100;300&display=swap"
          rel="stylesheet"
        />
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center bg-[hsl(53,0%,45%)] text-[hsl(0,0%,98%)] perspective-1200 font-roboto">
        <div className="fixed top-0 left-0 bottom-0 right-0 overflow-hidden">
          <div className="h-[250vmax] w-[250vmax] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="h-full w-full origin-[50%_30%] bg-[radial-gradient(40%_40%_at_50%_42%,_transparent,_black_35%)] animate-swingReverse"
              style={{ transform: "rotate(calc(var(--swing-x) * -0.25deg))" }}
            ></div>
          </div>
        </div>

        <div className="relative z-10">
          {" "}
          {/* Ensure content is above the cloak */}
          {/* Camada da sombra (deve vir antes no DOM para ficar atrás) */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 0 }} // Garante que fique atrás do conteúdo real
          >
            <span
              className="text-[hsl(0,0%,0%)] blur-[1.5vmin] scale-105 translate-z-[-10vmin] animate-swing"
              style={{
                transform:
                  "translate3d(0, 0%, -10vmin) translate(calc((var(--swing-x, 0) * 0.05) * 1%), calc((var(--swing-y) * 0.05) * 1%))",
                fontSize: "clamp(5rem, 40vmin, 20rem)",
                fontFamily: "Open Sans, sans-serif",
                margin: 0,
                marginBottom: "1rem",
                letterSpacing: "1rem",
              }}
            >
              404
            </span>
          </div>
          {/* Camada do texto principal (fica na frente) */}
          <h1
            className="text-[clamp(5rem,40vmin,20rem)] font-openSans m-0 mb-4 tracking-[1rem] transform translate-z-0 bg-[radial-gradient(var(--lit-header),var(--header)_45%)] bg-[calc(50%_+_(var(--swing-x)*0.5)*1%)] bg-clip-text text-transparent relative"
            style={{ zIndex: 1 }} // Garante que fique na frente da sombra
          >
            404
          </h1>
          <div className="text-center max-w-[clamp(16rem,90vmin,25rem)] line-height-1.5">
            <h2 className="m-0 mb-4 text-[#7DFA48]">
              Não encontramos essa página (╥﹏╥)
            </h2>
            <Link
              href="/home"
              rel="noreferrer noopener"
              className="uppercase no-underline bg-[#7DFA48] text-black  py-4 px-16 rounded-full text-bold tracking-[0.05rem] inline-block"
            >
              Ínicio
            </Link>
          </div>
        </div>

        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@800&family=Roboto:wght@100;300&display=swap");

          :root {
            --button: hsl(44, 0%, 70%);
            --button-color: hsl(0, 0%, 4%);
            --shadow: hsl(0, 0%, 0%);
            --bg: hsla(0, 0%, 45%, 1.00);
            --header: hsla(123, 30%, 47%, 1.00);
            --color: hsla(130, 100%, 70%, 1.00);
            --lit-header: #7DFA48;
            --speed: 2s;
            --swing-x: 0;
            --swing-y: 0;
          }

          @property --swing-x {
            initial-value: 0;
            inherits: false;
            syntax: "<integer>";
          }

          @property --swing-y {
            initial-value: 0;
            inherits: false;
            syntax: "<integer>";
          }

          .font-roboto {
            font-family: "Roboto", sans-serif;
          }
          .font-openSans {
            font-family: "Open Sans", sans-serif;
          }
          .perspective-1200 {
            perspective: 1200px;
          }
          .line-height-1.5 {
            line-height: 1.5;
          }
          .translate-z-0 {
            transform: translate3d(0, 0, 0vmin);
          }
          .translate-z-\[-10vmin\] {
            transform: translate3d(0, 0, -10vmin);
          }

          @keyframes swing {
            0% {
              --swing-x: -100;
              --swing-y: -100;
            }
            50% {
              --swing-y: 0;
            }
            100% {
              --swing-y: -100;
              --swing-x: 100;
            }
          }

          .animate-swing {
            animation: swing var(--speed) infinite alternate ease-in-out;
          }

          .animate-swingReverse {
            animation: swing var(--speed) infinite alternate-reverse ease-in-out;
          }
        `}</style>
      </main>
    </>
  );
}
