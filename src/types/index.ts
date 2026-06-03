import { Request } from 'express';

// ─── Authenticated Request ────────────────────────────────────────────────────
/**
 * Extends Express Request with a typed `user` property set by the auth middleware.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  requestId: string;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ─── User ─────────────────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWithoutPassword = Omit<User, 'passwordHash'>;

// ─── Meeting ──────────────────────────────────────────────────────────────────
export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TranscriptionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration?: number; // minutes
  status: MeetingStatus;
  organizerId: string;
  participants: string[];
  transcriptionStatus: TranscriptionStatus;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Transcript ───────────────────────────────────────────────────────────────
export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number; // seconds from start
  endTime: number;
  confidence: number; // 0–1
}

export interface Transcript {
  id: string;
  meetingId: string;
  segments: TranscriptSegment[];
  language: string;
  totalDuration: number;
  createdAt: Date;
}

// ─── Action Item ──────────────────────────────────────────────────────────────
export enum ActionItemStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  status: ActionItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Meeting Summary ──────────────────────────────────────────────────────────
export interface MeetingSummary {
  id: string;
  meetingId: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  generatedAt: Date;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

// ─── Service Response ─────────────────────────────────────────────────────────
export interface ServiceResult<T> {
  data: T;
  message?: string;
}
