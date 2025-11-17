export default function StatCard({ title, value }) {
  return (
    <div className="bg-green-100 p-4 rounded-lg border border-green-200 shadow-md">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}