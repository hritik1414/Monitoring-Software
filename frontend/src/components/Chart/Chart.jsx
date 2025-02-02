// frontend/src/components/Chart/Chart.jsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import moment from 'moment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const Chart = ({ title, data, predictions, alert, threshold }) => {
  const chartData = {
    datasets: [
      {
        label: 'Actual',
        data: data.map(d => ({
          x: d.timestamp,
          y: d.value
        })),
        borderColor: alert ? 'rgb(255, 99, 132)' : 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4
      },
      {
        label: 'Predicted',
        data: predictions.map(d => ({
          x: d.timestamp,
          y: d.value
        })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderDash: [5, 5],
        tension: 0.4
      },
      {
        label: 'Threshold',
        data: [...data, ...predictions].map(d => ({
          x: d.timestamp,
          y: threshold
        })),
        borderColor: 'rgba(255, 159, 64, 0.8)',
        borderDash: [2, 2],
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            return moment(context[0].raw.x).format('HH:mm:ss');
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.raw.y.toFixed(3)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm:ss'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Concentration'
        }
      }
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2,
        border: alert ? '2px solid #ff4444' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <Line data={chartData} options={options} />
      {alert && (
        <Typography 
          color="error" 
          variant="body2" 
          align="center" 
          sx={{ mt: 1 }}
        >
          Warning: Predicted values exceed threshold!
        </Typography>
      )}
    </Paper>
  );
};

export default Chart;