const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'smart_repair_assistant',
      retryWrites: true,
      w: 'majority'
    });
    console.log('[OK] MongoDB Connected: ' + conn.connection.host);
    return conn;
  } catch (error) {
    console.error('[ERROR] Database Connection Failed: ' + error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
