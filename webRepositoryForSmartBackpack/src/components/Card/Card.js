export default function Card({ title, description, extra, children }) {
  return (
    <div className="bg-gray-100 rounded-2xl shadow-md p-4 w-full max-w-md text-center hover:scale-102 hover:bg-gray-200 transition-transform duration-700">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
      {extra && <div className="mt-3">{extra}</div>}
      {children}
    </div>
  );
}