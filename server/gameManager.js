import { v4 as uuidv4 } from "uuid";
import { Game } from "./game.js";

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerToRoom = new Map();
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
    return Array.from(this.rooms.values()).map((room) => ({
      ...room.game.getSummary(),
    }));
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

    const { player, previousId } = room.game.addPlayer(socket.id, name, token);
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

  leaveRoom(socket, { suppressEvent = false } = {}) {
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

      const result = room.game.removePlayer(socketId);
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
}

export { GameManager };
