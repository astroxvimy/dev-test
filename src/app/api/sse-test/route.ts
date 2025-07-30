import { type NextRequest } from "next/server";
import { sseService } from "../../../features/sse";
import { getSession } from "@/features/auth";

interface TestEventBody {
  event: string;
  data: unknown;
  target: "user" | "broadcast" | "all";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id ?? "test-user-anonymous";

    const body = (await request.json()) as TestEventBody;
    const { event, data, target = "user" } = body;

    if (!event) {
      return new Response("Event name is required", { status: 400 });
    }

    switch (target) {
      case "user":
        await sseService.notifyUser(userId, event, data);
        break;
      case "broadcast":
        await sseService.broadcast(event, data);
        break;
      case "all":
        await sseService.notifyAll(event, data);
        break;
      default:
        return new Response("Invalid target", { status: 400 });
    }

    return new Response("Event sent successfully", { status: 200 });
  } catch (error) {
    console.error("Error sending SSE event:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = sseService.getStats();
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error getting SSE stats:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
