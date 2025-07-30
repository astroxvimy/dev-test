import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/features/auth";
import { sseManager } from "../../../features/sse";
import type { SSEConnectionContext } from "../../../features/sse/types";

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      headersList.get("host") ??
      "unknown";
    const userAgent = headersList.get("user-agent") ?? "unknown";

    const session = await getSession();
    const userId = session?.user?.id;

    const sessionId = userId ? `${userId}-${Date.now()}` : undefined;

    const context: SSEConnectionContext = {
      request,
      userId,
      sessionId,
      ip,
      userAgent,
    };

    const response = await sseManager.createConnection(context);

    return response;
  } catch (error) {
    console.error("Error establishing SSE connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
