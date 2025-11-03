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

// Dados de exemplo
// const dataExemplo = [
//   { name: 'Seg', peso: 4.3 },
//   { name: 'Ter', peso: 2.5 },
//   { name: 'Qua', peso: 3.8 },
//   { name: 'Qui', peso: 4.1 },
//   { name: 'Sex', peso: 2.9 },
//   { name: 'Sáb', peso: 1.2 },
//   { name: 'Dom', peso: 0.5 },
// ];

const Chart = ({ dados = dataExemplo, titulo = "Relatório de Peso (kg)" }) => {
  // Garante que os dados sejam um array
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
              labelFormatter={(label) => `Dia: ${label}`}
            />
            <Legend />
            <Bar dataKey="peso" name="Peso" fill="#7DFA48" />
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

export default Chart;