# Corrección de Crashes en Producción

## Fecha: 13 de octubre de 2025

## Problema Identificado

El servidor en Render.com experimentaba crashes con errores 500 en las conexiones WebSocket. Los logs mostraban:

```
Error en start Error: Necesitas unirte a una sala primero
[GET] 500 jodete-online.onrender.com/socket.io/?EIO=4&transport=websocket
```

### Causas Raíz

1. **Desincronización Cliente-Servidor**: Los clientes intentaban ejecutar acciones (como `start`, `playCard`, etc.) antes de completar el proceso de reconexión a una sala.

2. **Errores No Capturados**: Algunos errores en operaciones de socket no estaban siendo manejados correctamente, causando que el servidor respondiera con 500.

3. **Timeouts en WebSocket**: La configuración por defecto de Socket.IO no era óptima para conexiones a internet con latencia variable.

4. **Estado Inconsistente**: Durante reconexiones, el estado del cliente podía perder sincronización con el servidor.

## Soluciones Implementadas

### 1. Validaciones en el Cliente (`src/App.jsx`)

Añadidas validaciones exhaustivas antes de emitir eventos:

```javascript
const handleStart = useCallback(() => {
  if (!socket || !hasJoined || !gameState?.me) {
    console.warn("No se puede iniciar: no estás en una sala");
    return;
  }
  // ... resto del código
}, [socket, hasJoined, gameState?.me, ...]);
```

**Aplicado a todos los métodos:**

- `handleStart()`
- `handleDraw()`
- `handleDeclareLastCard()`
- `handleCallJodete()`
- `handleReset()`
- `handlePlayCard()`
- `confirmSuitSelection()`

### 2. Mejora en la Configuración de Socket.IO

**Servidor (`server/index.js`):**

```javascript
const io = new Server(httpServer, {
  cors: CLIENT_ORIGINS
    ? { origin: CLIENT_ORIGINS }
    : { origin: "*", credentials: true },
  pingTimeout: 60000, // 60 segundos antes de considerar desconectado
  pingInterval: 25000, // Ping cada 25 segundos
  upgradeTimeout: 30000, // 30 segundos para upgrade
  maxHttpBufferSize: 1e6, // 1MB buffer
  transports: ["websocket", "polling"],
  allowEIO3: true,
});
```

**Cliente (`src/App.jsx`):**

```javascript
const instance = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
```

### 3. Validación Temprana en Acciones de Juego

**Servidor (`server/index.js`):**

```javascript
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
      return; // Prevenir el error antes de llamar a withGame
    }
    manager.withGame(socket.id, (game) => {
      action(game, payload);
    });
  });
};
```

### 4. Protección en Broadcast y GrantState

**Servidor (`server/game.js`):**

```javascript
grantState(socket) {
  try {
    if (socket && socket.connected) {
      socket.emit("state", this.buildStateForPlayer(socket.id));
      this.onStateChange?.();
    }
  } catch (error) {
    console.error(`Error al enviar estado a socket ${socket?.id}:`, error);
  }
}

broadcast() {
  this.players.forEach((player) => {
    try {
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket && socket.connected) {
        socket.emit("state", this.buildStateForPlayer(player.id));
      }
    } catch (error) {
      console.error(`Error al hacer broadcast a jugador ${player.id}:`, error);
    }
  });
  this.onStateChange?.();
}
```

### 5. Manejo de Errores Globales

**Servidor (`server/index.js`):**

```javascript
// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
  // No cerrar el servidor, intentar continuar
});

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada no manejada:", reason);
  // No cerrar el servidor, intentar continuar
});
```

### 6. Mejora en Reconexiones

**Cliente (`src/App.jsx`):**

```javascript
instance.on("connect", () => {
  setSocketConnected(true);
  console.log("Conectado al servidor");

  // Reintentar reconexión automática si había un token y roomId guardados
  const savedToken =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("playerToken")
      : null;
  const savedRoomId =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("lastRoomId")
      : null;

  if (savedToken && savedRoomId) {
    console.log("Intentando reconectar a la sala anterior...");
    autoJoinAttemptedRef.current = false;
  }
});
```

### 7. Logging Mejorado

Añadidos logs más descriptivos en:

- Eventos de conexión/desconexión
- Errores de socket
- Intentos de acción sin sala
- Errores en broadcast

## Resultados Esperados

✅ **Prevención de Crashes**: Las validaciones tempranas previenen que se ejecute código que causaría errores.

✅ **Mejor Recuperación**: Los errores se capturan y logean sin hacer crash del servidor.

✅ **Reconexiones Robustas**: Configuración optimizada de Socket.IO para conexiones inestables.

✅ **Estado Consistente**: Validaciones en cliente y servidor aseguran sincronización.

✅ **Debugging Mejorado**: Logs detallados ayudan a identificar problemas rápidamente.

## Testing Recomendado

1. **Test de Reconexión**:

   - Unirse a una sala
   - Forzar desconexión (cerrar laptop, cambiar red)
   - Verificar reconexión automática

2. **Test de Latencia**:

   - Jugar desde conexiones lentas (3G/4G)
   - Verificar que no haya timeouts prematuros

3. **Test de Múltiples Jugadores**:

   - 4-6 jugadores simultáneos
   - Verificar sincronización de estado

4. **Test de Acciones Rápidas**:
   - Intentar jugar cartas rápidamente
   - Verificar que no se pierdan acciones

## Monitoreo

Revisar logs de Render.com para:

- Errores 500 reducidos o eliminados
- Warnings de "Socket no está en ninguna sala" (indican intentos prevenidos)
- Logs de reconexión exitosa

## Build Info

```
dist/index.html                   1.82 kB │ gzip:  0.69 kB
dist/assets/index-BbFDdyfc.css   19.53 kB │ gzip:  4.95 kB
dist/assets/index-ZnHex_q8.js   264.98 kB │ gzip: 81.20 kB
✓ built in 978ms
```

## Próximos Pasos

Si persisten problemas:

1. Revisar logs específicos del error
2. Considerar añadir rate limiting
3. Implementar health checks más robustos
4. Añadir métricas de performance
