import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Mock jose library to avoid ESM parsing issues in CommonJS Jest environment.
// jwtVerify is mocked to REJECT so the auth middleware falls through to the
// local HS256 jwt.verify() path — integration tests sign real tokens that
// must be decoded with the actual secret, not a hardcoded mock payload.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn().mockRejectedValue(new Error('JWKS mock: force HS256 fallback')),
}));


import { prisma } from '../src/services/database.service';

let isDbConnected = false;

beforeAll(async () => {
  try {
    // Connect database before tests
    await prisma.$connect();
    isDbConnected = true;
  } catch (err) {
    console.warn('⚠️ Test database is not reachable. Database-dependent tests will fail.');
  }
});

afterAll(async () => {
  if (isDbConnected) {
    await prisma.$disconnect();
  }
});

beforeEach(async () => {
  if (isDbConnected) {
    // Clear all database tables in sequence to avoid foreign key violations
    await prisma.reminderLog.deleteMany({});
    await prisma.actionItem.deleteMany({});
    await prisma.meetingAnalysis.deleteMany({});
    await prisma.transcriptLine.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.user.deleteMany({});
  }
});
