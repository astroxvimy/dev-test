"use client";

import { useState } from "react";

export function SSETestForm() {
  const [eventName, setEventName] = useState("test-event");
  const [eventData, setEventData] = useState('{"message": "Hello from SSE!"}');
  const [target, setTarget] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");

    try {
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(eventData);
      } catch {
        setResult("Error: Invalid JSON data");
        return;
      }

      const response = await fetch("/api/sse-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventName,
          data: parsedData,
          target,
        }),
      });

      if (response.ok) {
        setResult("Event sent successfully!");
      } else {
        const errorText = await response.text();
        setResult(`Error: ${errorText}`);
      }
    } catch (error) {
      setResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-gray-50 p-4 text-black">
      <h3 className="mb-4 text-lg font-semibold">Send Test Event</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="eventName" className="mb-1 block text-sm font-medium">
            Event Name
          </label>
          <input
            type="text"
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="eventData" className="mb-1 block text-sm font-medium">
            Event Data (JSON)
          </label>
          <textarea
            id="eventData"
            value={eventData}
            onChange={(e) => setEventData(e.target.value)}
            rows={4}
            className="w-full rounded border px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="target" className="mb-1 block text-sm font-medium">
            Target
          </label>
          <select
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="user">Current User</option>
            <option value="broadcast">All Authenticated Users</option>
            <option value="all">All Connected Clients</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isLoading ? "Sending..." : "Send Event"}
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 rounded p-3 text-sm ${
            result.includes("Error")
              ? "border border-red-200 bg-red-100 text-red-700"
              : "border border-green-200 bg-green-100 text-green-700"
          }`}
        >
          {result}
        </div>
      )}

      <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-3">
        <h4 className="mb-2 font-medium text-blue-800">Quick Test Buttons</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEventName("notification");
              setEventData(
                '{"title": "Test Notification", "message": "This is a test notification!"}',
              );
              setTarget("user");
            }}
            className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
          >
            Notification
          </button>
          <button
            onClick={() => {
              setEventName("status-update");
              setEventData('{"status": "processing", "progress": 50}');
              setTarget("user");
            }}
            className="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
          >
            Status Update
          </button>
          <button
            onClick={() => {
              setEventName("broadcast-message");
              setEventData('{"message": "Hello everyone!", "from": "System"}');
              setTarget("broadcast");
            }}
            className="rounded bg-purple-500 px-3 py-1 text-xs text-white hover:bg-purple-600"
          >
            Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
