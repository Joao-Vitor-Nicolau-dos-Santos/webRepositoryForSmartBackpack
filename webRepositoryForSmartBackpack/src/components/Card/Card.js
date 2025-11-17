export default function Card({ 
  title, 
  description, 
  extra, 
  children,
  nome,
  codigoMochila,
  descricao,
  data 
}) {
  return (
    <div className="bg-gray-100 rounded-2xl shadow-md p-4 w-full max-w-md text-center hover:scale-102 hover:bg-gray-200 transition-transform duration-700">
      {/* Nome */}
      {nome && <h2 className="text-xl font-bold text-gray-800">{nome}</h2>}
      
      {/* Código da Mochila */}
      {codigoMochila && <p className="text-gray-700 font-medium mt-1">Código: {codigoMochila}</p>}
      
      {/* Descrição */}
      {descricao && <p className="text-gray-600 mt-2">{descricao}</p>}
      
      {/* Data */}
      {data && <p className="text-gray-500 text-sm mt-1">{data}</p>}
      
      {/* Conteúdo original (mantido para compatibilidade) */}
      {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
      {description && <p className="text-gray-600 mt-2">{description}</p>}
      {extra && <div className="mt-3">{extra}</div>}
      {children}
    </div>
  );
}