// frontend/src/components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import Chart from '../Chart/Chart';
import SocketService from '../../services/socket';
import moment from 'moment';

const THRESHOLDS = {
  Nickel: 1.0,
  Cobalt: 0.8,
  NH3: 25.0
};

const Dashboard = () => {
  const [data, setData] = useState({
    Nickel: { values: [], predictions: [], alert: false },
    Cobalt: { values: [], predictions: [], alert: false },
    NH3: { values: [], predictions: [], alert: false }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    const socket = SocketService.connect();

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      setError(null);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setError('Unable to connect to server. Please check if the server is running.');
      setLoading(false);
    });

    socket.on('initialData', (initialData) => {
      console.log('Received initial data:', initialData);
      updateData(initialData);
      setLoading(false);
    });

    socket.on('analysisData', (newData) => {
      console.log('Received new data:', newData);
      updateData(newData);
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateData = (newData) => {
    setData(prevData => {
      const updatedData = { ...prevData };
      
      ['Nickel', 'Cobalt', 'NH3'].forEach(element => {
        // Add new reading
        if (newData.readings && newData.readings[element] !== undefined) {
          updatedData[element].values.push({
            timestamp: moment(newData.timestamp).toDate(),
            value: newData.readings[element]
          });

          // Keep only last 30 minutes of data
          const thirtyMinutesAgo = moment().subtract(30, 'minutes');
          updatedData[element].values = updatedData[element].values.filter(
            reading => moment(reading.timestamp).isAfter(thirtyMinutesAgo)
          );
        }

        // Update predictions
        if (newData.predictions && newData.predictions.length > 0) {
          updatedData[element].predictions = newData.predictions.map(pred => ({
            timestamp: moment(pred.timestamp).toDate(),
            value: pred[element]
          }));
        }

        // Update alert status
        if (newData.alerts) {
          updatedData[element].alert = newData.alerts[element];
        }
      });

      return updatedData;
    });

    setLastUpdate(moment());
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {connectionStatus === 'connecting' 
            ? 'Connecting to server...' 
            : 'Loading data...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Typography 
        variant="h4" 
        component="h1" 
        align="center" 
        gutterBottom
        sx={{ mb: 4 }}
      >
        Industrial Environment Monitoring
      </Typography>

      <Grid container spacing={3}>
        {Object.entries(data).map(([element, elementData]) => (
          <Grid item xs={12} md={6} lg={4} key={element}>
            <Chart
              title={`${element} Concentration`}
              data={elementData.values}
              predictions={elementData.predictions || []}
              alert={elementData.alert}
              threshold={THRESHOLDS[element]}
            />
          </Grid>
        ))}
      </Grid>

      {lastUpdate && (
        <Typography 
          variant="caption" 
          align="center" 
          display="block" 
          sx={{ mt: 2 }}
        >
          Last updated: {lastUpdate.format('HH:mm:ss')}
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;