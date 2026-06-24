const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });

        console.log(`MongoDB Atlas connected secure link: ${conn.connection.host}`);

    } catch (error) {
        console.error(`Database connection warning: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('connected', () => {
    console.log('MongoDB Connected');
});

mongoose.connection.on('error', (err) => {
    console.log('MongoDB Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB Disconnected');
});

module.exports = connectDatabase;