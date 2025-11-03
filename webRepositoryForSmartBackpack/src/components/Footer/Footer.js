export default function Footer() {
  return (
    <footer className="bg-[#ADEBB3] text-black py-6">
      <div className="max-w-7xl mx-auto px-6 rounded-t-3xl">
        <p className="text-center text-xl text-black font-bold">
          CJL Corporate and Educational Union.
          </p>
          <p className="text-center">
            Desenvolvido por Claudio de Melo, João Vitor Nicolau e Luiz.
          </p>
          <p className="text-center">
            &copy; {new Date().getFullYear() } Todos os direitos reservados.
          </p>
        </div>
      </footer>
  );
}
