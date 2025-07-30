import { SSEProvider, SSEDisplay } from "@/features/sse";
import { SSETestForm } from "./SSETestForm";

export default function SSETestPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">SSE Test Page</h1>
        <p className="mb-6 text-gray-400">
          This page demonstrates the Server-Sent Events (SSE) functionality.
          Connect to see real-time messages from the server.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SSEProvider>
            <SSEDisplay />
            <SSETestForm />
          </SSEProvider>
        </div>
      </div>
    </div>
  );
}
