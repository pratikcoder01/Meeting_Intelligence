import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

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
