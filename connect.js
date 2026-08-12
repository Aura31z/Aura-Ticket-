const mongoose = require('mongoose');
const config = require('../config');

/**
 * Connect to MongoDB instance using Mongoose
 */
async function connectDatabase() {
    if (!config.mongoUri) {
        console.error('❌ MONGODB_URI is missing from environment variables (.env)');
        process.exit(1);
    }

    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(config.mongoUri);
        console.log('✅ Connected to MongoDB successfully.');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

module.exports = connectDatabase;
