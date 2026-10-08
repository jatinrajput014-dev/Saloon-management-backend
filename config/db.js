const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/luxe_salon_db';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.host} / DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Primary connection failed: ${error.message}`);
    console.log(`[MongoDB] Initializing In-Memory MongoDB Server fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[MongoDB] ✅ In-Memory MongoDB Server started at: ${uri}`);
      return conn;
    } catch (memErr) {
      console.error(`[MongoDB] In-Memory server error: ${memErr.message}`);
      mongoose.set('bufferCommands', false);
      return null;
    }
  }
};

module.exports = connectDB;
