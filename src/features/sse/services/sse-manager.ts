import { randomUUID } from "crypto";
import { createServiceContext } from "@/utils/service-utils";
import type {
  SSEClient,
  SSEEvent,
  SSEMessage,
  SSETarget,
  SSEManagerConfig,
  SSEConnectionContext,
  SSELifecycleHooks,
} from "../types";
import { error } from "console";

const { log, handleError } = createServiceContext("SSEManager");

const DEFAULT_CONFIG: SSEManagerConfig = {
  heartbeatInterval: 30000,
  maxReconnectTime: 5000,
  maxClientsPerUser: 5,
  cleanupInterval: 60000,
  enableLogging: true,
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map<string, SSEClient>();
  private userClients: Map<string, Set<string>> = new Map<
    string,
    Set<string>
  >();
  private sessionClients: Map<string, Set<string>> = new Map<
    string,
    Set<string>
  >();
  private config: SSEManagerConfig;
  private lifecycleHooks: SSELifecycleHooks = {};
  private cleanupInterval?: NodeJS.Timeout;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map<
    string,
    NodeJS.Timeout
  >();

  constructor(config: Partial<SSEManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  setLifecycleHooks(hooks: SSELifecycleHooks): void {
    this.lifecycleHooks = hooks;
  }

  async createConnection(context: SSEConnectionContext): Promise<Response> {
    const clientId = randomUUID();
    const { userId, sessionId, ip, userAgent } = context;

    if (
      userId &&
      this.getUserConnectionCount(userId) >= this.config.maxClientsPerUser
    ) {
      log.warn(`User ${userId} has too many connections`, {
        current: this.getUserConnectionCount(userId),
        max: this.config.maxClientsPerUser,
      });
      return new Response("Too many connections", { status: 429 });
    }

    const client: SSEClient = {
      id: clientId,
      userId,
      sessionId,
      ip,
      userAgent,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      controller: null as unknown as ReadableStreamDefaultController, // Will be set by the stream
      isAlive: true,
    };

    const stream = new ReadableStream({
      start: (controller) => {
        client.controller = controller;
        this.addClient(client);

        // Send initial connection event
        void this.sendToClient(client, {
          event: "connected",
          data: { clientId, timestamp: new Date().toISOString() },
          id: clientId,
        });

        this.startHeartbeat(client);

        void this.lifecycleHooks.onConnect?.(client);
      },
      cancel: () => {
        this.removeClient(clientId);
      },
    });

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-SSE-Client-ID": clientId,
    });

    return new Response(stream, { headers });
  }

  async sendEvent(event: SSEEvent, target: SSETarget): Promise<void> {
    const message: SSEMessage = {
      ...event,
      timestamp: new Date(),
    };

    try {
      switch (target.type) {
        case "user":
          await this.sendToUser(target.userId, message);
          break;
        case "session":
          await this.sendToSession(target.sessionId, message);
          break;
        case "client":
          await this.sendToClientById(target.clientId, message);
          break;
        case "broadcast":
          await this.broadcast(message);
          break;
        case "all":
          await this.sendToAll(message);
          break;
      }
    } catch (error) {
      handleError("sending SSE event", error);
    }
  }

  private async sendToUser(userId: string, message: SSEMessage): Promise<void> {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) {
      log.debug(`No clients found for user ${userId}`);
      return;
    }

    const clients = Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter(
        (client): client is SSEClient => client !== undefined && client.isAlive,
      );

    await Promise.all(
      clients.map((client) => this.sendToClient(client, message)),
    );

    log.debug(`Sent event to ${clients.length} clients for user ${userId}`, {
      event: message.event,
      userId,
    });
  }

  private async sendToSession(
    sessionId: string,
    message: SSEMessage,
  ): Promise<void> {
    const clientIds = this.sessionClients.get(sessionId);
    if (!clientIds) {
      log.debug(`No clients found for session ${sessionId}`);
      return;
    }

    const clients = Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter(
        (client): client is SSEClient => client !== undefined && client.isAlive,
      );

    await Promise.all(
      clients.map((client) => this.sendToClient(client, message)),
    );

    log.debug(
      `Sent event to ${clients.length} clients for session ${sessionId}`,
      {
        event: message.event,
        sessionId,
      },
    );
  }

  private async sendToClientById(
    clientId: string,
    message: SSEMessage,
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.isAlive) {
      log.debug(`Client ${clientId} not found or not alive`);
      return;
    }

    await this.sendToClient(client, message);
    log.debug(`Sent event to client ${clientId}`, { event: message.event });
  }

  private async broadcast(message: SSEMessage): Promise<void> {
    const authenticatedClients = Array.from(this.clients.values()).filter(
      (client) => client.userId && client.isAlive,
    );

    await Promise.all(
      authenticatedClients.map((client) => this.sendToClient(client, message)),
    );

    log.debug(
      `Broadcasted event to ${authenticatedClients.length} authenticated clients`,
      {
        event: message.event,
      },
    );
  }

  private async sendToAll(message: SSEMessage): Promise<void> {
    const aliveClients = Array.from(this.clients.values()).filter(
      (client) => client.isAlive,
    );

    await Promise.all(
      aliveClients.map((client) => this.sendToClient(client, message)),
    );

    log.debug(`Sent event to all ${aliveClients.length} clients`, {
      event: message.event,
    });
  }

  private async sendToClient(
    client: SSEClient,
    message: SSEEvent,
  ): Promise<void> {
    try {
      const sseMessage = this.formatSSEMessage(message);
      client.controller.enqueue(new TextEncoder().encode(sseMessage));
      client.lastHeartbeat = new Date();
    } catch (error) {
      log.error(`Failed to send message to client ${client.id}`, error);
      this.removeClient(client.id);
    }
  }

  private formatSSEMessage(message: SSEEvent): string {
    let sseMessage = "";

    if (message.id) {
      sseMessage += `id: ${message.id}\n`;
    }

    if (message.event) {
      sseMessage += `event: ${message.event}\n`;
    }

    if (message.retry) {
      sseMessage += `retry: ${message.retry}\n`;
    }

    const data =
      typeof message.data === "string"
        ? message.data
        : JSON.stringify(message.data);

    const dataLines = data.split("\n");
    for (const line of dataLines) {
      sseMessage += `data: ${line}\n`;
    }

    sseMessage += "\n";
    return sseMessage;
  }

  private addClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    if (client.userId) {
      if (!this.userClients.has(client.userId)) {
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)?.add(client.id);
    }

    if (client.sessionId) {
      if (!this.sessionClients.has(client.sessionId)) {
        this.sessionClients.set(client.sessionId, new Set());
      }
      this.sessionClients.get(client.sessionId)?.add(client.id);
    }

    log.info(`Client connected`, {
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      ip: client.ip,
      totalClients: this.clients.size,
    });
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isAlive = false;

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      userClients?.delete(clientId);
      if ((userClients?.size ?? 0) === 0) {
        this.userClients.delete(client.userId);
      }
    }

    if (client.sessionId) {
      const sessionClients = this.sessionClients.get(client.sessionId);
      sessionClients?.delete(clientId);
      if ((sessionClients?.size ?? 0) === 0) {
        this.sessionClients.delete(client.sessionId);
      }
    }

    this.clients.delete(clientId);

    const heartbeatInterval = this.heartbeatIntervals.get(clientId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(clientId);
    }

    void this.lifecycleHooks.onDisconnect?.(client);

    log.info(`Client disconnected`, {
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      totalClients: this.clients.size,
    });
  }

  private startHeartbeat(client: SSEClient): void {
    const interval = setInterval(() => {
      try {
        if (!client.isAlive) {
          clearInterval(interval);
          this.heartbeatIntervals.delete(client.id);
          return;
        }

        // Send heartbeat
        void this.sendToClient(client, {
          event: "heartbeat",
          data: { timestamp: new Date().toISOString() },
        });

        void this.lifecycleHooks.onHeartbeat?.(client);
      } catch (error) {
        log.error(`Heartbeat failed for client ${client.id}`, error);
        this.removeClient(client.id);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(client.id, interval);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadConnections();
    }, this.config.cleanupInterval);
  }

  private cleanupDeadConnections(): void {
    const deadClients = Array.from(this.clients.values()).filter(
      (client) => !client.isAlive,
    );

    for (const client of deadClients) {
      this.removeClient(client.id);
    }

    if (deadClients.length > 0) {
      log.info(`Cleaned up ${deadClients.length} dead connections`);
    }
  }

  private getUserConnectionCount(userId: string): number {
    return this.userClients.get(userId)?.size ?? 0;
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      activeClients: Array.from(this.clients.values()).filter((c) => c.isAlive)
        .length,
      totalUsers: this.userClients.size,
      totalSessions: this.sessionClients.size,
      heartbeatIntervals: this.heartbeatIntervals.size,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch (error) {
        throw error;
      }
    }

    this.clients.clear();
    this.userClients.clear();
    this.sessionClients.clear();
    this.heartbeatIntervals.clear();

    log.info("SSE Manager destroyed");
  }
}

export const sseManager = new SSEManager();
