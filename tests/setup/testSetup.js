require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.0',
      },
      instance: {
        dbName: 'jest-test',
      },
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.warn('MongoDB Memory Server failed to start, trying alternative setup:', error.message);
    const fallbackUri = process.env.MONGODB_URI;
    try {
      await mongoose.connect(fallbackUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to fallback MongoDB:', fallbackUri);
    } catch (fallbackError) {
      console.error('Failed to connect to MongoDB:', fallbackError.message);
      throw fallbackError;
    }
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (error) {
        console.error('Failed to delete collection:', error.message);
      }
    }
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } catch (error) {
    console.error('Failed to drop database:', error.message);
  }
  
  try {
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
      console.error('Failed to stop MongoDB Memory Server:', error.message);
  }
});

