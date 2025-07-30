import type { NextRequest } from "next/server";

/**
 * Represents a connected SSE client
 */
export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  controller: ReadableStreamDefaultController;
  isAlive: boolean;
}

/**
 * SSE event structure
 */
export interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSEMessage {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
  timestamp: Date;
}

export type SSETarget =
  | { type: "user"; userId: string }
  | { type: "session"; sessionId: string }
  | { type: "client"; clientId: string }
  | { type: "broadcast" }
  | { type: "all" };

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  heartbeatInterval?: number;
  maxReconnectTime?: number;
}

export interface SSEManagerConfig {
  heartbeatInterval: number;
  maxReconnectTime: number;
  maxClientsPerUser: number;
  cleanupInterval: number;
  enableLogging: boolean;
}

export interface SSEConnectionContext {
  request: NextRequest;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
}

export type SSEEventHandler = (
  event: SSEEvent,
  client: SSEClient,
) => void | Promise<void>;

export interface SSELifecycleHooks {
  onConnect?: (client: SSEClient) => void | Promise<void>;
  onDisconnect?: (client: SSEClient) => void | Promise<void>;
  onError?: (client: SSEClient, error: Error) => void | Promise<void>;
  onHeartbeat?: (client: SSEClient) => void | Promise<void>;
}
