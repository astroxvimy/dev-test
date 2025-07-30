"use client";

import { useSSE } from "./SSEProvider";
import { useState, useEffect } from "react";

export function SSEDisplay() {
  const { isConnected, lastEvent, connect, disconnect } = useSSE();
  const [eventHistory, setEventHistory] = useState<
    Array<{
      id: string;
      event: string;
      data: unknown;
      timestamp: Date;
    }>
  >([]);

  useEffect(() => {
    if (lastEvent) {
      setEventHistory((prev) => [
        {
          id: lastEvent.id || `event-${Date.now()}`,
          event: lastEvent.event,
          data: lastEvent.data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [lastEvent]);

  return (
    <div className="rounded-lg border bg-gray-50 p-4 text-black">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">SSE Connection Status</h3>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={connect}
          disabled={isConnected}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Connect
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Disconnect
        </button>
      </div>

      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3">
        <div className="text-sm">
          <span className="font-medium">Total Events Received:</span>{" "}
          {eventHistory.length}
        </div>
        {lastEvent && (
          <div className="mt-1 text-xs text-blue-600">
            Last event: {lastEvent.event} at {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="mb-4 space-y-2">
        <h4 className="font-medium">Latest Event:</h4>
        {lastEvent ? (
          <div className="rounded border bg-white p-3 text-sm">
            <div className="mb-2">
              <span className="font-medium">Event:</span> {lastEvent.event}
            </div>
            {lastEvent.id && (
              <div className="mb-2">
                <span className="font-medium">ID:</span> {lastEvent.id}
              </div>
            )}
            <div>
              <span className="font-medium">Data:</span>
              <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs">
                {JSON.stringify(lastEvent.data, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded border bg-white p-3 text-sm text-gray-500">
            No events received yet
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Event History (Last 10):</h4>
        {eventHistory.length > 0 ? (
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {eventHistory.map((event, index) => (
              <div
                key={event.id}
                className="rounded border bg-white p-2 text-xs"
              >
                <div className="mb-1 flex items-start justify-between">
                  <span className="font-medium text-blue-600">
                    {event.event}
                  </span>
                  <span className="text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className="overflow-auto rounded bg-gray-50 p-1 text-xs">
                  {JSON.stringify(event.data, null, 1)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border bg-white p-3 text-sm text-gray-500">
            No events in history
          </div>
        )}
      </div>
    </div>
  );
}
