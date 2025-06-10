import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Charts: React.FC = () => {
  const data = {
    labels: ['Candidate A', 'Candidate B', 'Candidate C'],
    datasets: [
      {
        label: 'Votes',
        data: [12, 19, 3],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Voting Results',
      },
    },
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Estadísticas de Votos</h2>
      <Bar data={data} options={options} />
    </div>
  );
};

export default Charts;