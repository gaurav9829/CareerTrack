// MongoDB connection helper. In production this points to MongoDB Atlas;
// in tests it points to a throwaway in-memory MongoDB.
const mongoose = require('mongoose');

async function connectDB(uri) {
  const mongoUri = uri || require('./env').MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env first.');
  }
  // Idempotent: reusing an open connection (server bootstrap, seed helpers) must
  // not reconnect or clobber the existing state.
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000, // fail fast instead of hanging
  });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
