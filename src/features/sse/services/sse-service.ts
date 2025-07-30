import { sseManager } from "./sse-manager";
import type { SSEEvent, SSETarget } from "../types";

export const sseService = {
  /**
   * Send a notification to a specific user
   * @param userId - The user ID to send the notification to
   * @param event - The event name
   * @param data - The event data
   * @param options - Additional options like event ID and retry
   */
  async notifyUser(
    userId: string,
    event: string,
    data: unknown,
    options: { id?: string; retry?: number } = {},
  ): Promise<void> {
    await sseManager.sendEvent(
      { event, data, ...options },
      { type: "user", userId },
    );
  },

  /**
   * Send a notification to a specific session
   * @param sessionId - The session ID to send the notification to
   * @param event - The event name
   * @param data - The event data
   * @param options - Additional options like event ID and retry
   */
  async notifySession(
    sessionId: string,
    event: string,
    data: unknown,
    options: { id?: string; retry?: number } = {},
  ): Promise<void> {
    await sseManager.sendEvent(
      { event, data, ...options },
      { type: "session", sessionId },
    );
  },

  /**
   * Send a notification to a specific client
   * @param clientId - The client ID to send the notification to
   * @param event - The event name
   * @param data - The event data
   * @param options - Additional options like event ID and retry
   */
  async notifyClient(
    clientId: string,
    event: string,
    data: unknown,
    options: { id?: string; retry?: number } = {},
  ): Promise<void> {
    await sseManager.sendEvent(
      { event, data, ...options },
      { type: "client", clientId },
    );
  },

  /**
   * Broadcast a notification to all authenticated users
   * @param event - The event name
   * @param data - The event data
   * @param options - Additional options like event ID and retry
   */
  async broadcast(
    event: string,
    data: unknown,
    options: { id?: string; retry?: number } = {},
  ): Promise<void> {
    await sseManager.sendEvent(
      { event, data, ...options },
      { type: "broadcast" },
    );
  },

  /**
   * Send a notification to all connected clients (including unauthenticated)
   * @param event - The event name
   * @param data - The event data
   * @param options - Additional options like event ID and retry
   */
  async notifyAll(
    event: string,
    data: unknown,
    options: { id?: string; retry?: number } = {},
  ): Promise<void> {
    await sseManager.sendEvent({ event, data, ...options }, { type: "all" });
  },

  /**
   * Send a custom event with full control over the target
   * @param event - The SSE event object
   * @param target - The target specification
   */
  async sendEvent(event: SSEEvent, target: SSETarget): Promise<void> {
    await sseManager.sendEvent(event, target);
  },

  /**
   * Get SSE manager statistics
   */
  getStats() {
    return sseManager.getStats();
  },
};
