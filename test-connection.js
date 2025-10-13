#!/usr/bin/env node
/**
 * Script de prueba de conectividad Socket.IO
 * Uso: node test-connection.js <URL>
 * Ejemplo: node test-connection.js https://tu-app.onrender.com
 */

import { io } from "socket.io-client";

const url = process.argv[2] || "http://localhost:3001";

console.log(`🔍 Probando conexión a: ${url}`);
console.log("━".repeat(50));

const socket = io(url, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 3,
});

let connected = false;

socket.on("connect", () => {
  console.log("✅ Conexión exitosa!");
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transporte: ${socket.io.engine.transport.name}`);
  connected = true;

  // Probar evento de salas
  socket.emit("createRoom", {
    roomName: "Test Room",
    playerName: "TestBot",
    token: `test-${Date.now()}`,
  });

  setTimeout(() => {
    console.log("\n✅ Todo funcionando correctamente");
    console.log("   El servidor está accesible desde esta ubicación");
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error de conexión:");
  console.error(`   ${err.message}`);
  if (!connected) {
    console.log("\n⚠️  Posibles causas:");
    console.log("   - El servidor no está activo");
    console.log("   - URL incorrecta");
    console.log("   - Problema de CORS");
    console.log("   - Firewall bloqueando WebSocket");
    process.exit(1);
  }
});

socket.on("roomsOverview", (rooms) => {
  console.log(`\n📦 Salas disponibles: ${rooms.length}`);
  rooms.slice(0, 3).forEach((room) => {
    console.log(`   - ${room.name} (${room.players}/${room.maxPlayers})`);
  });
});

socket.on("actionError", (msg) => {
  console.log(`\n⚠️  Error del servidor: ${msg}`);
});

setTimeout(() => {
  if (!connected) {
    console.log("\n❌ Timeout: No se pudo conectar en 10 segundos");
    process.exit(1);
  }
}, 10000);
