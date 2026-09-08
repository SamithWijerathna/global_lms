import { NextRequest } from "next/server";
import { Server } from "socket.io";
import { getDBConnection } from "../db";

const ioMap = new Map();

export const GET = async (req: NextRequest) => {
  // Start Socket.IO only once
  if (!ioMap.has("io")) {
    const io = new Server(3001, { cors: { origin: "*" } });
    const activeUsers = new Map<string, { socket_id: string }>();

    io.on("connection", async (socket) => {
      const db = await getDBConnection();
      console.log("🟢 Connected:", socket.id);

      socket.on("register", async ({ user_uuid, device_name }) => {
        const ip = socket.handshake.address;

        const existing = activeUsers.get(user_uuid);
        if (existing) {
          io.to(socket.id).emit("loginBlocked", {
            message: "You’re already logged in elsewhere. Please logout first.",
          });
          io.to(existing.socket_id).emit("notifyOtherLogin", {
            ip,
            device_name,
          });
          return;
        }

        activeUsers.set(user_uuid, { socket_id: socket.id });

        await db.query(
          `INSERT INTO user_last_login (user_uuid, device_name, ip_address, last_login)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE device_name = VALUES(device_name),
                                   ip_address = VALUES(ip_address),
                                   last_login = NOW()`,
          [user_uuid, device_name, ip]
        );

        console.log(`✅ ${user_uuid} logged in from ${device_name}`);
      });

      socket.on("logoutUser", ({ user_uuid }) => {
        activeUsers.delete(user_uuid);
      });

      socket.on("disconnect", () => {
        const found = [...activeUsers.entries()].find(
          ([, v]) => v.socket_id === socket.id
        );
        if (found) {
          const [uuid] = found;
          activeUsers.delete(uuid);
          console.log(`🔴 ${uuid} disconnected`);
        }
      });
    });

    ioMap.set("io", io);
    console.log("✅ Socket.IO started on port 3001");
  }

  return new Response("Socket server ready", { status: 200 });
};
