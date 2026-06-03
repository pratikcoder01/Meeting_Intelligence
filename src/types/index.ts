import { Request } from 'express';

// =============================================================================
//  Request Augmentation
// =============================================================================

/**
 * Every request gets a traceId attached by the traceId middleware.
 * All downstream middleware and controllers use this type instead of
 * the plain Express Request.
 */
export interface TraceableRequest extends Request {
  traceId: string;
}

/**
 * A request that has passed through the JWT auth middleware.
 * `user` is guaranteed to be populated.
 */
export interface AuthenticatedRequest extends TraceableRequest {
  user: JwtUserPayload;
}

// =============================================================================
//  JWT
// =============================================================================

/**
 * Shape of the data embedded inside a signed JWT.
 * `sub` follows the JWT standard (RFC 7519 §4.1.2).
 * `userId` is an explicit, human-readable alias for the same value.
 */
export interface JwtTokenPayload {
  sub: string; // userId — JWT "subject" claim (standard)
  userId: string; // explicit alias — always accessible without renaming sub
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

/**
 * What gets attached to `req.user` after the auth middleware validates
 * and decodes the JWT. Role is included so route handlers can do RBAC
 * without a second database round-trip.
 */
export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/** @deprecated Use JwtTokenPayload. Kept to avoid breaking imports. */
export type JwtPayload = JwtTokenPayload;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

// =============================================================================
//  Unified API Response Envelope
// =============================================================================

/**
 * Every successful API response wraps its payload in this shape.
 * `traceId` lets clients correlate frontend errors with server logs.
 */
export interface ApiSuccessResponse<T> {
  traceId: string;
  success: true;
  data: T;
}

/**
 * Every error response — regardless of HTTP status code — uses this shape.
 * `code` is a machine-readable SCREAMING_SNAKE_CASE identifier.
 * `message` is a human-readable description safe to show in a UI.
 * `details` carries field-level validation errors (optional).
 */
export interface ApiErrorResponse {
  traceId: string;
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
//  Domain Enums
// =============================================================================

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

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

export enum ActionItemStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// =============================================================================
//  Domain Interfaces
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPublic = Omit<User, 'passwordHash'>;

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration?: number;
  status: MeetingStatus;
  organizerId: string;
  participants: string[];
  transcriptionStatus: TranscriptionStatus;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface Transcript {
  id: string;
  meetingId: string;
  segments: TranscriptSegment[];
  language: string;
  totalDuration: number;
  createdAt: Date;
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

// =============================================================================
//  Shared Utility Types
// =============================================================================

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

export interface ServiceResult<T> {
  data: T;
  message?: string;
}
