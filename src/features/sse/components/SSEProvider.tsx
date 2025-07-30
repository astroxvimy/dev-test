"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SSEEvent } from "../types";

interface SSEContextType {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  connect: () => void;
  disconnect: () => void;
  sendEvent: (event: string, data: unknown) => void;
}

const SSEContext = createContext<SSEContextType | null>(null);

interface SSEProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

export function SSEProvider({
  children,
  url = "/api/sse",
  autoConnect = true,
  onConnect,
  onDisconnect,
  onError,
  onMessage,
}: SSEProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = () => {
    if (eventSource) {
      eventSource.close();
    }

    try {
      const source = new EventSource(url);
      setEventSource(source);

      source.onopen = () => {
        setIsConnected(true);
        onConnect?.();
      };

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            event: event.type || "message",
            data,
            id: event.lastEventId || undefined,
          };

          setLastEvent(sseEvent);
          onMessage?.(sseEvent);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      source.onerror = (error) => {
        setIsConnected(false);
        onError?.(error);
        console.error("SSE connection error:", error);
      };

      source.addEventListener("connected", (event) => {
        const sseEvent: SSEEvent = {
          event: "connected",
          data: event.data ? JSON.parse(event.data) : {},
          id: event.lastEventId || undefined,
        };
        setLastEvent(sseEvent);
        onMessage?.(sseEvent);
      });

      source.addEventListener("heartbeat", (event) => {
        const sseEvent: SSEEvent = {
          event: "heartbeat",
          data: event.data ? JSON.parse(event.data) : {},
          id: event.lastEventId || undefined,
        };
        setLastEvent(sseEvent);
        onMessage?.(sseEvent);
      });
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      onError?.(error as Event);
    }
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
      onDisconnect?.();
    }
  };

  const sendEvent = (event: string, data: unknown) => {
    console.warn(
      "SSE is server-to-client only. Use HTTP requests to send data to server.",
    );
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, url]);

  const contextValue: SSEContextType = {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
  };

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
}

export function useSSE(): SSEContextType {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSE must be used within an SSEProvider");
  }
  return context;
}
