// src/lib/pusher/server.ts
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function triggerIncomingCall(receiverId: number, data: any) {
//   await pusher.trigger(`private-user-${receiverId}`, "incoming-call", data);
  await pusher.trigger(`user-${receiverId}`, "incoming-call", data);

}

export async function triggerCallResponse(callerId: number, receiverId: number, response: string) {
  await pusher.trigger(`private-user-${callerId}`, "call-response", { receiverId, response });
  
}
