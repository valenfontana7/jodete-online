import { v4 as uuidv4 } from "uuid";
import { Game } from "./game.js";
import { Game as GameModel, GamePlayer } from "./db/index.js";
import { Op } from "sequelize";

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerToRoom = new Map();
  }

  /**
   * Carga partidas activas desde la base de datos al iniciar el servidor
   */
  async loadActiveGames() {
    if (!GameModel) {
      console.log(
        "⚠️  No hay conexión a base de datos, saltando carga de partidas"
      );
      return;
    }

    try {
      console.log("📥 Cargando partidas activas desde base de datos...");

      const activeGames = await GameModel.findAll({
        where: {
          phase: ["lobby", "playing"],
        },
        include: [
          {
            model: GamePlayer,
            as: "players",
          },
        ],
      });

      if (activeGames.length === 0) {
        console.log("   No hay partidas activas para cargar");
        return;
      }

      console.log(`   Encontradas ${activeGames.length} partida(s) activa(s)`);

      for (const gameRecord of activeGames) {
        try {
          // Marcar todas las partidas antiguas como abandonadas
          // (los jugadores se reconectarán si están disponibles)
          await GameModel.update(
            { phase: "abandoned" },
            { where: { id: gameRecord.id } }
          );

          console.log(
            `   ⚠️  Partida ${gameRecord.roomId} marcada como abandonada (requiere reconexión)`
          );
        } catch (error) {
          console.error(
            `   Error procesando partida ${gameRecord.roomId}:`,
            error.message
          );
        }
      }

      console.log("✅ Carga de partidas completada");
    } catch (error) {
      console.error("❌ Error cargando partidas activas:", error.message);
    }
  }

  createRoom({ name }) {
    const roomId = uuidv4();
    const roomName = name?.trim()
      ? name.trim().slice(0, 48)
      : `Sala ${this.rooms.size + 1}`;

    const game = new Game({
      io: this.io,
      roomId,
      roomName,
      onStateChange: () => {
        this.emitRoomsOverview();
      },
    });

    const room = {
      id: roomId,
      name: roomName,
      createdAt: Date.now(),
      game,
    };

    this.rooms.set(roomId, room);
    this.emitRoomsOverview();
    return room;
  }

  ensureRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("La sala seleccionada ya no existe");
    }
    return room;
  }

  listRooms() {
    const rooms = Array.from(this.rooms.values()).map((room) => ({
      ...room.game.getSummary(),
    }));

    // Ordenar: activas primero (con jugadores), luego por fase, luego por fecha
    return rooms.sort((a, b) => {
      // 1. Priorizar salas con jugadores conectados
      if (a.playerCount !== b.playerCount) {
        return b.playerCount - a.playerCount;
      }

      // 2. Priorizar por fase (playing > lobby > finished)
      const phaseOrder = { playing: 3, lobby: 2, finished: 1 };
      const aPhase = phaseOrder[a.phase] || 0;
      const bPhase = phaseOrder[b.phase] || 0;
      if (aPhase !== bPhase) {
        return bPhase - aPhase;
      }

      // 3. Más recientes primero
      return b.createdAt - a.createdAt;
    });
  }

  emitRoomsOverview(targetSocket) {
    const overview = this.listRooms();
    if (targetSocket) {
      targetSocket.emit("rooms", overview);
    } else {
      this.io.emit("rooms", overview);
    }
  }

  joinRoom(socket, { roomId, name, token }) {
    if (!roomId) {
      throw new Error("No seleccionaste una sala");
    }

    const room = this.ensureRoom(roomId);

    const previousRoomId = this.playerToRoom.get(socket.id);
    if (previousRoomId && previousRoomId !== roomId) {
      this.leaveRoom(socket, { suppressEvent: true });
    }

    // Pasar userId del socket autenticado al juego
    const userId = socket.userId || null;
    console.log(
      `🔍 [DEBUG] joinRoom - socket.userId: ${socket.userId}, userId a pasar: ${userId}, name: ${name}`
    );
    const { player, previousId } = room.game.addPlayer(
      socket.id,
      name,
      token,
      userId
    );
    if (previousId && previousId !== socket.id) {
      this.playerToRoom.delete(previousId);
    }

    this.playerToRoom.set(socket.id, roomId);
    socket.join(roomId);

    room.game.grantState(socket);
    room.game.broadcast();
    socket.emit("joinedRoom", { roomId: room.id, roomName: room.name });
    this.emitRoomsOverview();
    return player;
  }

  leaveRoom(socket, { suppressEvent = false, force = false } = {}) {
    try {
      const socketId = typeof socket === "string" ? socket : socket.id;
      const roomId = this.playerToRoom.get(socketId);
      if (!roomId) {
        if (!suppressEvent && typeof socket !== "string" && socket.connected) {
          socket.emit("leftRoom");
        }
        return;
      }

      const room = this.rooms.get(roomId);
      if (!room) {
        this.playerToRoom.delete(socketId);
        if (!suppressEvent && typeof socket !== "string" && socket.connected) {
          socket.emit("leftRoom");
        }
        return;
      }

      // Si force=true, eliminar completamente al jugador (salida voluntaria)
      // Si force=false, solo desconectar (pérdida de conexión involuntaria)
      const result = force
        ? room.game.forceRemovePlayer(socketId)
        : room.game.removePlayer(socketId);

      this.playerToRoom.delete(socketId);
      if (typeof socket !== "string" && socket.connected) {
        socket.leave(roomId);
      }

      if (room.game.isEmpty()) {
        this.rooms.delete(roomId);
      }

      room.game.broadcast();
      if (!suppressEvent && typeof socket !== "string" && socket.connected) {
        socket.emit("leftRoom");
      }
      this.emitRoomsOverview();
      return result;
    } catch (error) {
      console.error(`Error en leaveRoom para socket ${socket?.id}:`, error);
    }
  }

  handleDisconnect(socket) {
    try {
      this.leaveRoom(socket, { suppressEvent: true });
    } catch (error) {
      console.error(
        `Error en handleDisconnect para socket ${socket.id}:`,
        error
      );
    }
  }

  withGame(socketId, handler) {
    const roomId = this.playerToRoom.get(socketId);
    if (!roomId) {
      throw new Error("Necesitas unirte a una sala primero");
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerToRoom.delete(socketId);
      throw new Error("La sala seleccionada ya no existe");
    }
    return handler(room.game, room, roomId);
  }

  /**
   * Limpia partidas abandonadas antiguas de la base de datos
   * Se ejecuta periódicamente
   */
  async cleanupOldGames() {
    if (!GameModel) {
      return;
    }

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const result = await GameModel.destroy({
        where: {
          phase: "abandoned",
          updatedAt: {
            [Op.lt]: threeDaysAgo,
          },
        },
      });

      if (result > 0) {
        console.log(
          `🗑️  Limpiadas ${result} partida(s) abandonada(s) antigua(s)`
        );
      }
    } catch (error) {
      console.error("Error limpiando partidas antiguas:", error.message);
    }
  }

  /**
   * Inicia la limpieza periódica de partidas abandonadas
   * Se ejecuta cada 24 horas
   */
  startPeriodicCleanup() {
    // Limpiar inmediatamente al iniciar
    this.cleanupOldGames();

    // Limpiar cada 24 horas
    setInterval(() => {
      this.cleanupOldGames();
    }, 24 * 60 * 60 * 1000);

    console.log("🔄 Limpieza periódica de partidas activada (cada 24h)");
  }
}

export { GameManager };
