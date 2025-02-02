// backend/src/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const AnalysisService = require('./services/analysisService');
const DataLoader = require('./utils/dataloader');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial data
  const currentData = DataLoader.getCurrentWindowData();
  if (currentData.length > 0) {
    socket.emit('initialData', {
      timestamp: new Date(),
      readings: currentData[currentData.length - 1],
      predictions: [],
      alerts: { Nickel: false, Cobalt: false, NH3: false }
    });
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const startSystem = async () => {
  try {
    await connectDB();
    
    const datasetPath = path.resolve(__dirname, '..', process.env.DATASET_PATH);
    console.log(`Loading dataset from: ${datasetPath}`);
    await DataLoader.loadData(datasetPath);

    await AnalysisService.initialize();

    // Start real-time data processing
    let processCount = 0;
    setInterval(async () => {
      try {
        const reading = DataLoader.getNextReading();
        if (reading) {
          processCount++;
          console.log(`Processing reading #${processCount} at ${reading.timestamp}`);
          
          const processedData = await AnalysisService.processReading(reading);
          
          io.emit('analysisData', {
            ...processedData,
            metadata: {
              processCount,
              totalReadings: DataLoader.size(),
              currentIndex: DataLoader.getCurrentIndex()
            }
          });
        }
      } catch (error) {
        console.error('Error processing reading:', error);
      }
    }, 1000); // Update every second for testing

    console.log('Real-time data processing started');
  } catch (error) {
    console.error('Error starting system:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSystem();
});