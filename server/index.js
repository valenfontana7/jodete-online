import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { GameManager } from "./gameManager.js";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : null;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: CLIENT_ORIGINS
    ? { origin: CLIENT_ORIGINS }
    : { origin: "*", credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

const manager = new GameManager(io);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "../dist");

// Health check endpoint (útil para monitoreo en producción)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    rooms: manager.rooms.size,
  });
});

app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io/") || req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

function emitError(socket, error) {
  const message = error?.message || "Ocurrió un error inesperado";
  socket.emit("actionError", message);
}

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Manejo de errores del socket
  socket.on("error", (error) => {
    console.error(`Error en socket ${socket.id}:`, error);
  });

  manager.emitRoomsOverview(socket);

  const safeAction = (eventName, handler) => {
    socket.on(eventName, async (payload = {}) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error en ${eventName} para socket ${socket.id}:`, error);
        // Solo emitir error si el socket está conectado
        if (socket.connected) {
          emitError(socket, error);
        }
        try {
          manager.withGame(socket.id, (game) => {
            if (socket.connected) {
              game.grantState(socket);
            }
          });
        } catch (innerError) {
          if (innerError?.message) {
            console.warn(
              `Contexto no disponible tras error en ${eventName}:`,
              innerError.message
            );
          }
        }
      }
    });
  };

  safeAction("createRoom", (payload = {}) => {
    const room = manager.createRoom({ name: payload.roomName });
    manager.joinRoom(socket, {
      roomId: room.id,
      name: payload.playerName,
      token: payload.token,
    });
  });

  safeAction("joinRoom", (payload = {}) => {
    manager.joinRoom(socket, {
      roomId: payload.roomId,
      name: payload.name,
      token: payload.token,
    });
  });

  safeAction("leaveRoom", () => {
    manager.leaveRoom(socket);
    manager.emitRoomsOverview();
  });

  const withGameAction = (eventName, action) => {
    safeAction(eventName, (payload = {}) => {
      const roomId = manager.playerToRoom.get(socket.id);
      if (!roomId) {
        console.warn(
          `[${eventName}] Socket ${socket.id} no está en ninguna sala`
        );
        if (socket.connected) {
          socket.emit("actionError", "Necesitas unirte a una sala primero");
        }
        return;
      }
      manager.withGame(socket.id, (game) => {
        action(game, payload);
      });
    });
  };

  withGameAction("start", (game, payload = {}) => {
    game.start({
      requesterId: socket.id,
      cardsPerPlayer: payload.cardsPerPlayer,
    });
  });

  withGameAction("playCard", (game, payload = {}) => {
    game.handlePlay({
      playerId: socket.id,
      cardId: payload.cardId,
      chosenSuit: payload.chosenSuit,
    });
  });

  withGameAction("drawCard", (game) => {
    game.handleDraw({ playerId: socket.id });
  });

  withGameAction("declareLastCard", (game) => {
    game.handleDeclareLastCard({ playerId: socket.id });
  });

  withGameAction("callJodete", (game, payload = {}) => {
    game.handleCallJodete({
      playerId: socket.id,
      targetId: payload.targetId,
    });
  });

  withGameAction("reset", (game) => {
    game.handleReset({ requesterId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    manager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
  // No cerrar el servidor, intentar continuar
});

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada no manejada:", reason);
  // No cerrar el servidor, intentar continuar
});
