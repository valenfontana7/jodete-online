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
});

const manager = new GameManager(io);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io/")) {
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
  manager.emitRoomsOverview(socket);

  const safeAction = (eventName, handler) => {
    socket.on(eventName, async (payload = {}) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error en ${eventName}`, error);
        emitError(socket, error);
        try {
          manager.withGame(socket.id, (game) => {
            game.grantState(socket);
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
