// src/lib/socketServer.ts
import { Server } from "socket.io";

let io: Server | null = null;

export function getSocketServer() {
  if (!io) {
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("🟢 User connected:", socket.id);

      // ✅ Join a private room for a conversation
      socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`🏠 Socket ${socket.id} joined room: ${roomId}`);
      });

      // ✅ When a user sends a message, broadcast it to their specific room only
      socket.on("message:new", (msg) => {
        console.log("📨 Server received message:", msg);

        const { sender_id, receiver_id } = msg;
        if (!sender_id || !receiver_id) return;

        // Create consistent room name (same for both users)
        const roomId =
          Number(sender_id) < Number(receiver_id)
            ? `${sender_id}-${receiver_id}`
            : `${receiver_id}-${sender_id}`;

        console.log(`📡 Broadcasting message to room: ${roomId}`);

        // Send message to everyone in that room except sender
        socket.to(roomId).emit("message:new", msg);

        // Acknowledge sender (optional)
        socket.emit("message:ack", { success: true });
      });

      socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
      });
    });
  }

  return io;
}
