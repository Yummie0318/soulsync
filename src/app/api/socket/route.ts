// src/app/api/socket/route.ts
import { NextResponse } from "next/server";
import { getSocketServer } from "@/lib/socketServer";

export async function GET() {
  const io = getSocketServer();

  return NextResponse.json({
    success: true,
    message: "✅ Socket.IO server is running",
    clients: io.engine.clientsCount,
  });
}
