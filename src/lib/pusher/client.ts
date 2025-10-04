import Pusher from "pusher-js";

let pusher: Pusher | null = null;

export const pusherClient = (userId: number) => {
  if (!pusher) {
    pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }

  const channel = pusher.subscribe(`user-${userId}`);
  return channel;
};
