# Server-Sent Events (SSE) Feature

This feature provides a comprehensive Server-Sent Events (SSE) layer for real-time, server-to-client notifications across the Nomey application.

## Overview

The SSE system consists of:

- **SSE Manager**: Core service that manages client connections and event dispatching
- **SSE Service**: High-level API for sending notifications to clients
- **SSE Provider**: React context for client-side SSE functionality
- **SSE Components**: UI components for testing and displaying SSE events

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SSE Manager   │    │   SSE Service   │    │  SSE Provider   │
│                 │    │                 │    │                 │
│ • Client Mgmt   │◄──►│ • High-level    │◄──►│ • React Context │
│ • Event Routing │    │   API           │    │ • Connection    │
│ • Heartbeat     │    │ • Notifications │    │   Management    │
│ • Cleanup       │    │ • Broadcasting  │    │ • Event Handling│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │  Backend Code   │    │  React Apps     │
│                 │    │                 │    │                 │
│ • /api/sse      │    │ • Webhooks      │    │ • Real-time UI  │
│ • /api/sse-test │    │ • Job Processors│    │ • Notifications │
│                 │    │ • Background    │    │ • Status Updates│
│                 │    │   Tasks         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Features

### ✅ Implemented

- **Connection Management**: Track active client connections per user/session
- **Event Dispatching**: Send named events with JSON payloads to specific targets
- **Target Types**: User, Session, Client, Broadcast, All
- **Heartbeat System**: Keep connections alive with periodic ping messages
- **Connection Limits**: Prevent resource abuse (max 5 connections per user)
- **Automatic Cleanup**: Remove dead connections and free resources
- **Authentication Integration**: Works with NextAuth.js sessions
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript support with strict typing
- **React Integration**: Provider pattern for easy React integration
- **Testing Support**: Comprehensive test suite and test utilities

### 🎯 Key Capabilities

1. **Real-time Notifications**: Send instant updates to connected clients
2. **User-specific Events**: Target individual users or user groups
3. **Broadcasting**: Send messages to all authenticated users
4. **Connection Monitoring**: Track connection status and statistics
5. **Scalable Architecture**: Designed for production use with proper resource management

## Usage

### Backend Usage

#### 1. Send Notifications to Users

```typescript
import { sseService } from "@/features/sse";

// Send to specific user
await sseService.notifyUser("user-123", "video-ready", {
  videoId: "video-456",
  status: "ready",
  playbackUrl: "https://...",
});

// Send to current user (in webhook handlers, etc.)
await sseService.notifyUser(userId, "upload-complete", {
  uploadId: "upload-789",
  status: "completed",
});
```

#### 2. Broadcast to All Users

```typescript
// Broadcast to all authenticated users
await sseService.broadcast("system-maintenance", {
  message: "Scheduled maintenance in 5 minutes",
  duration: "30 minutes",
});

// Send to all connected clients (including unauthenticated)
await sseService.notifyAll("global-alert", {
  message: "Service interruption detected",
  severity: "warning",
});
```

#### 3. Session-based Events

```typescript
// Send to specific session
await sseService.notifySession("session-abc", "session-expiring", {
  message: "Your session will expire soon",
  remainingTime: "5 minutes",
});
```

#### 4. Custom Event Targeting

```typescript
import { sseService } from "@/features/sse";
import type { SSEEvent, SSETarget } from "@/features/sse";

const event: SSEEvent = {
  event: "custom-event",
  data: { custom: "data" },
  id: "event-123",
  retry: 5000,
};

const target: SSETarget = { type: "user", userId: "user-123" };

await sseService.sendEvent(event, target);
```

### Frontend Usage

#### 1. Basic SSE Provider Setup

```tsx
import { SSEProvider, useSSE } from "@/features/sse";

function App() {
  return (
    <SSEProvider>
      <YourApp />
    </SSEProvider>
  );
}
```

#### 2. Using SSE in Components

```tsx
import { useSSE } from "@/features/sse";

function NotificationComponent() {
  const { isConnected, lastEvent, connect, disconnect } = useSSE();

  useEffect(() => {
    if (lastEvent?.event === "video-ready") {
      // Handle video ready notification
      showNotification("Your video is ready!");
    }
  }, [lastEvent]);

  return (
    <div>
      <p>Connection: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastEvent && <p>Last event: {lastEvent.event}</p>}
    </div>
  );
}
```

#### 3. Custom Event Handlers

```tsx
import { SSEProvider } from "@/features/sse";

function App() {
  const handleConnect = () => {
    console.log("SSE connected");
  };

  const handleMessage = (event) => {
    console.log("Received SSE event:", event);
  };

  return (
    <SSEProvider
      onConnect={handleConnect}
      onMessage={handleMessage}
      onError={(error) => console.error("SSE error:", error)}
    >
      <YourApp />
    </SSEProvider>
  );
}
```

### Testing

#### 1. Test Page

Visit `/sse-test` to test the SSE functionality:

- Connect/disconnect to SSE
- Send test events
- View connection status
- Monitor received events

#### 2. API Testing

```bash
# Get SSE statistics
curl http://localhost:3000/api/sse-test

# Send test event
curl -X POST http://localhost:3000/api/sse-test \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test-event",
    "data": {"message": "Hello SSE!"},
    "target": "user"
  }'
```

## Configuration

### SSE Manager Configuration

```typescript
import { sseManager } from "@/features/sse";

// Configure the manager
sseManager.setLifecycleHooks({
  onConnect: (client) => {
    console.log("Client connected:", client.id);
  },
  onDisconnect: (client) => {
    console.log("Client disconnected:", client.id);
  },
  onError: (client, error) => {
    console.error("SSE error:", error);
  },
  onHeartbeat: (client) => {
    console.log("Heartbeat for client:", client.id);
  },
});
```

### Default Settings

- **Heartbeat Interval**: 30 seconds
- **Max Reconnect Time**: 5 seconds
- **Max Clients Per User**: 5
- **Cleanup Interval**: 1 minute
- **Enable Logging**: true

## Integration Examples

### 1. Mux Webhook Integration

```typescript
// In your Mux webhook handler
import { sseService } from "@/features/sse";

export async function POST(request: NextRequest) {
  const event = await muxWebhookService.verifyWebhookEvent(body, headersList);

  switch (event.type) {
    case "video.asset.ready":
      // Notify user that their video is ready
      await sseService.notifyUser(event.data.userId, "video-ready", {
        videoId: event.data.id,
        status: "ready",
        playbackUrl: event.data.playback_ids[0]?.playback_url,
      });
      break;
  }
}
```

### 2. Background Job Integration

```typescript
// In your background job processor
import { sseService } from "@/features/sse";

export async function processVideoUpload(uploadId: string, userId: string) {
  try {
    // Update progress
    await sseService.notifyUser(userId, "upload-progress", {
      uploadId,
      progress: 25,
      status: "processing",
    });

    // Process video...

    // Complete
    await sseService.notifyUser(userId, "upload-complete", {
      uploadId,
      status: "completed",
      videoId: "video-123",
    });
  } catch (error) {
    await sseService.notifyUser(userId, "upload-error", {
      uploadId,
      error: error.message,
      status: "failed",
    });
  }
}
```

### 3. Real-time UI Updates

```tsx
import { useSSE } from "@/features/sse";

function VideoUploadStatus({ uploadId }: { uploadId: string }) {
  const { lastEvent } = useSSE();
  const [status, setStatus] = useState("uploading");

  useEffect(() => {
    if (
      lastEvent?.event === "upload-progress" &&
      lastEvent.data.uploadId === uploadId
    ) {
      setStatus(`Processing: ${lastEvent.data.progress}%`);
    } else if (
      lastEvent?.event === "upload-complete" &&
      lastEvent.data.uploadId === uploadId
    ) {
      setStatus("Complete!");
    } else if (
      lastEvent?.event === "upload-error" &&
      lastEvent.data.uploadId === uploadId
    ) {
      setStatus("Error: " + lastEvent.data.error);
    }
  }, [lastEvent, uploadId]);

  return <div>Status: {status}</div>;
}
```

## API Reference

### SSE Service Methods

- `notifyUser(userId, event, data, options?)` - Send to specific user
- `notifySession(sessionId, event, data, options?)` - Send to specific session
- `notifyClient(clientId, event, data, options?)` - Send to specific client
- `broadcast(event, data, options?)` - Send to all authenticated users
- `notifyAll(event, data, options?)` - Send to all connected clients
- `sendEvent(event, target)` - Send custom event with full control
- `getStats()` - Get connection statistics

### SSE Provider Props

- `url` - SSE endpoint URL (default: "/api/sse")
- `autoConnect` - Auto-connect on mount (default: true)
- `onConnect` - Connection callback
- `onDisconnect` - Disconnection callback
- `onError` - Error callback
- `onMessage` - Message callback

### SSE Hook Return Value

- `isConnected` - Connection status
- `lastEvent` - Last received event
- `connect()` - Connect to SSE
- `disconnect()` - Disconnect from SSE
- `sendEvent()` - Send event (placeholder)

## Best Practices

1. **Event Naming**: Use descriptive, consistent event names
2. **Data Structure**: Keep event data simple and consistent
3. **Error Handling**: Always handle connection errors gracefully
4. **Resource Management**: Disconnect when components unmount
5. **Rate Limiting**: Don't send too many events too quickly
6. **Security**: Validate event data and user permissions
7. **Monitoring**: Use the statistics API to monitor connection health

## Troubleshooting

### Common Issues

1. **Connection Fails**: Check if the SSE endpoint is accessible
2. **Events Not Received**: Verify user authentication and event targeting
3. **Memory Leaks**: Ensure proper cleanup in React components
4. **Performance Issues**: Monitor connection count and event frequency

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=sse:*
```

## Future Enhancements

- [ ] Redis-based clustering for multiple server instances
- [ ] Event persistence and replay
- [ ] Advanced filtering and subscription management
- [ ] WebSocket fallback for older browsers
- [ ] Event acknowledgment and delivery confirmation
- [ ] Rate limiting per user/event type
- [ ] Event queuing for offline users
