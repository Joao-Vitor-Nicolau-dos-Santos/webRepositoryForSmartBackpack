import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const ComparisonChart = ({ dados = [], titulo = "Comparativo de Peso" }) => {
  const chartData = Array.isArray(dados) ? dados : [];

  return (
    <div className="bg-white p-4 rounded-xl shadow-xl w-full h-80">
      <h3 className="text-lg font-semibold text-center mb-4">{titulo}</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis unit=" kg" domain={[0, 'dataMax + 1']} />
            <Tooltip
              formatter={(value) => [`${value} kg`, 'Peso']}
              labelFormatter={(label) => `Horário: ${label}`}
            />
            <Legend />
            <Bar dataKey="esquerda" name="Esquerda" fill="#42be42ff" />
            <Bar dataKey="direita" name="Direita" fill="#43a047" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Nenhum dado disponível para o gráfico.
        </div>
      )}
    </div>
  );
};

export default ComparisonChart;