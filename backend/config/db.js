const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Mongoose 8: no need for useNewUrlParser / useUnifiedTopology (removed as defaults)
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
