// backend/src/utils/dataLoader.js
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class DataLoader {
  constructor() {
    this.data = [];
    this.currentIndex = 0;
    this.historicalWindow = 30; // 30 minutes
  }

  async loadData(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      if (!fs.existsSync(filePath)) {
        reject(new Error(`Dataset file not found at: ${filePath}`));
        return;
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            // Parse the timestamp and values
            const reading = {
              timestamp: moment(data.Timestamp, 'YYYY-MM-DD HH:mm:ss').toDate(),
              Nickel: parseFloat(data.Nickel),
              Cobalt: parseFloat(data.Cobalt),
              NH3: parseFloat(data.NH3)
            };

            if (this.isValidReading(reading)) {
              results.push(reading);
            }
          } catch (error) {
            console.error('Error parsing row:', error);
          }
        })
        .on('end', () => {
          if (results.length === 0) {
            reject(new Error('No valid data found in dataset'));
            return;
          }

          // Sort data by timestamp
          this.data = results.sort((a, b) => a.timestamp - b.timestamp);
          console.log(`Loaded ${results.length} valid records`);
          console.log('First record:', this.data[0]);
          console.log('Last record:', this.data[this.data.length - 1]);
          resolve(this.data);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  isValidReading(reading) {
    return (
      reading.timestamp instanceof Date &&
      !isNaN(reading.timestamp) &&
      !isNaN(reading.Nickel) &&
      !isNaN(reading.Cobalt) &&
      !isNaN(reading.NH3)
    );
  }

  getNextReading() {
    if (this.data.length === 0) return null;
    
    const reading = this.data[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.data.length;
    return reading;
  }

  getCurrentWindowData() {
    const endIndex = this.currentIndex;
    const startIndex = Math.max(0, endIndex - this.historicalWindow);
    return this.data.slice(startIndex, endIndex);
  }

  getInitialTrainingData() {
    return this.data.slice(0, Math.min(60, this.data.length)); // First hour of data
  }

  size() {
    return this.data.length;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }
}

module.exports = new DataLoader();