import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./auth/passport.js";
import authRoutes from "./routes/auth.js";
import { verifyToken } from "./auth/jwt.js";
import { GameManager } from "./gameManager.js";
import { connectDatabase } from "./db/index.js";

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [FRONTEND_URL];

const app = express();
const httpServer = createServer(app);

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    credentials: true,
  })
);
app.use(passport.initialize());

// Rutas de autenticación
app.use("/auth", authRoutes);

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

// Middleware para autenticar sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log(
    `🔍 [SERVER] Middleware - Socket ${socket.id}, token presente: ${!!token}`
  );

  if (token) {
    try {
      const decoded = verifyToken(token);
      // Soportar tanto tokens antiguos (id) como nuevos (userId)
      socket.userId = decoded.userId || decoded.id || null;
      console.log(
        `✅ Socket ${socket.id} autenticado como userId: ${socket.userId}`
      );
    } catch (err) {
      console.log(
        `❌ Token inválido para socket ${socket.id}: ${err.message}, continuando como invitado`
      );
      socket.userId = null;
    }
  } else {
    console.log(`👤 Socket ${socket.id} sin token, continuando como invitado`);
    socket.userId = null; // Usuario invitado
  }

  next();
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
    try {
      console.log(`[start] Iniciando partida para socket ${socket.id}`);
      game.start({
        requesterId: socket.id,
        cardsPerPlayer: payload.cardsPerPlayer,
      });
      console.log(`[start] Partida iniciada exitosamente`);
    } catch (error) {
      console.error(`[start] Error al iniciar:`, error);
      throw error;
    }
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

// Keep-alive para evitar sleep mode en Render (plan gratuito)
if (process.env.NODE_ENV === "production") {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

  if (RENDER_URL) {
    console.log("🔄 Self-ping habilitado para prevenir sleep mode");

    // Primer ping después de 5 minutos
    setTimeout(() => {
      // Luego cada 14 minutos
      setInterval(async () => {
        try {
          const response = await fetch(`${RENDER_URL}/api/health`);
          if (response.ok) {
            const data = await response.json();
            console.log(
              `✓ Self-ping exitoso - Rooms: ${data.rooms}, Uptime: ${Math.floor(
                process.uptime()
              )}s`
            );
          }
        } catch (error) {
          console.log("⚠️ Self-ping falló:", error.message);
        }
      }, 14 * 60 * 1000);
    }, 5 * 60 * 1000);
  }
}

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
  // No cerrar el servidor, intentar continuar
});

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada no manejada:", reason);
  // No cerrar el servidor, intentar continuar
});

// Conectar a la base de datos y luego iniciar el servidor
connectDatabase().then(async (connected) => {
  if (!connected && process.env.NODE_ENV === "production") {
    console.error("❌ No se pudo conectar a la base de datos en producción");
    process.exit(1);
  }

  if (!connected) {
    console.warn(
      "⚠️  Servidor iniciando sin conexión a base de datos (modo desarrollo sin DB)"
    );
  }

  // Cargar partidas activas si hay conexión a DB
  if (connected) {
    await manager.loadActiveGames();
    manager.startPeriodicCleanup();
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`   Modo: ${process.env.NODE_ENV || "development"}`);
    if (connected) {
      console.log(`   Base de datos: Conectada ✅`);
    }
  });
});
