# 🐛 Fix: Validación de userId al guardar GamePlayer

## Problema Encontrado

Al jugar una partida, se produjo el siguiente error:

```
Error guardando partida b37f5f46-5b52-43f3-ae47-58760c1899aa:
la sintaxis de entrada no es válida para tipo uuid: «-iZi1CQSe_Y7N8-uAAAG»
```

### Análisis

- El error indica que se estaba intentando guardar un **socketId** (ej: `-iZi1CQSe_Y7N8-uAAAG`) en el campo `userId` de la tabla `game_players`
- El campo `userId` es de tipo `UUID` en PostgreSQL y solo acepta UUIDs válidos o `NULL`
- Un socketId tiene un formato completamente diferente a un UUID

### Causa Raíz Posible

El campo `player.userId` podría estar recibiendo un valor incorrecto en algún punto del flujo, posiblemente:

1. El socket no tenía `socket.userId` configurado correctamente
2. El token JWT no se envió o no se verificó
3. Alguna reconexión o caché guardó un valor incorrecto

---

## Solución Implementada

### 1. Validación Defensiva en `saveToDatabase()`

**Archivo**: `server/game.js` línea ~880

```javascript
// Crear registros de jugadores
for (let i = 0; i < this.players.length; i++) {
  const player = this.players[i];

  // Validar que userId sea un UUID válido o null
  const isValidUUID =
    player.userId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      player.userId
    );
  const userIdToSave = isValidUUID ? player.userId : null;

  if (player.userId && !isValidUUID) {
    console.warn(
      `⚠️  userId inválido para ${player.name}: ${player.userId} - guardando como null`
    );
  }

  const playerRecord = await GamePlayer.create({
    gameId: this.dbGameId,
    userId: userIdToSave, // ← Valor validado
    playerName: player.name,
    socketId: player.id,
    connected: player.connected,
    position: i + 1,
  });

  this.dbPlayerIds.set(player.id, playerRecord.id);
}
```

### Qué hace esta solución:

✅ **Valida formato UUID**: Usa regex para verificar que el userId sea un UUID v4 válido  
✅ **Fallback seguro**: Si el userId no es válido, guarda `null` (invitado)  
✅ **Log de advertencia**: Registra cuando encuentra un userId inválido para debugging  
✅ **No rompe el juego**: La partida se guarda correctamente aunque el userId sea inválido

---

### 2. Logs de Debug Agregados

Para investigar la causa raíz, se agregaron logs temporales en:

#### `server/index.js` (middleware Socket.IO)

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (token) {
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      console.log(
        `Socket ${socket.id} autenticado como userId: ${decoded.userId}`
      );
    } catch {
      console.log(
        `Token inválido para socket ${socket.id}, continuando como invitado`
      );
      socket.userId = null;
    }
  } else {
    console.log(`Socket ${socket.id} sin token, continuando como invitado`);
    socket.userId = null;
  }

  next();
});
```

#### `server/gameManager.js` (joinRoom)

```javascript
const userId = socket.userId || null;
console.log(
  `🔍 [DEBUG] joinRoom - socket.userId: ${socket.userId}, userId a pasar: ${userId}, name: ${name}`
);
```

#### `server/game.js` (addPlayer)

```javascript
addPlayer(socketId, name, providedToken, userId = null) {
  console.log(`🔍 [DEBUG] addPlayer - socketId: ${socketId}, userId recibido: ${userId}, name: ${name}`);
  // ...
}
```

#### `server/game.js` (saveToDatabase)

```javascript
console.log(
  `🔍 [DEBUG] Guardando jugador - name: ${player.name}, userId: ${player.userId}, socketId: ${player.id}`
);
```

---

## Cómo Verificar que Funciona

### 1. Usuario Autenticado

```bash
# En los logs del servidor deberías ver:
Socket xyz123 autenticado como userId: a1b2c3d4-...
🔍 [DEBUG] joinRoom - socket.userId: a1b2c3d4-..., userId a pasar: a1b2c3d4-...
🔍 [DEBUG] addPlayer - socketId: xyz123, userId recibido: a1b2c3d4-...
🔍 [DEBUG] Guardando jugador - name: Juan, userId: a1b2c3d4-..., socketId: xyz123
💾 Partida abc-def guardada en DB (ID: 123)
```

### 2. Usuario Invitado

```bash
# En los logs del servidor deberías ver:
Socket xyz123 sin token, continuando como invitado
🔍 [DEBUG] joinRoom - socket.userId: null, userId a pasar: null
🔍 [DEBUG] addPlayer - socketId: xyz123, userId recibido: null
🔍 [DEBUG] Guardando jugador - name: Invitado, userId: null, socketId: xyz123
💾 Partida abc-def guardada en DB (ID: 123)
```

### 3. Usuario con userId Inválido (caso de error)

```bash
# En los logs del servidor deberías ver:
🔍 [DEBUG] Guardando jugador - name: Usuario, userId: -iZi1CQSe_Y7N8-uAAAG, socketId: xyz123
⚠️  userId inválido para Usuario: -iZi1CQSe_Y7N8-uAAAG - guardando como null
💾 Partida abc-def guardada en DB (ID: 123)
```

---

## Próximos Pasos

### Investigación Adicional Necesaria

Una vez que juegues otra partida con los logs activados, podremos determinar:

1. **¿El token se está enviando?**
   - Si no ves "Socket xyz autenticado...", el token no se está enviando desde el cliente
2. **¿El token es válido?**
   - Si ves "Token inválido...", el JWT está expirado o malformado
3. **¿El userId llega correctamente?**
   - Si los logs muestran que `userId` es correcto en `addPlayer` pero incorrecto en `saveToDatabase`, hay un problema en la lógica del juego

### Posibles Causas a Investigar

- [ ] El cliente no está enviando el token en `socket.handshake.auth`
- [ ] El token JWT expiró (por defecto expira en 7 días)
- [ ] El usuario no está en la base de datos (el userId del token no existe)
- [ ] Hay alguna mutación del objeto `player` que sobrescribe `userId`
- [ ] El problema solo ocurre con reconexiones (cuando hay `providedToken`)

---

## Limpieza Posterior

Una vez identificada la causa raíz, remover los logs de debug:

```bash
# Buscar y eliminar todos los logs temporales
grep -r "🔍 \[DEBUG\]" server/
```

---

_Implementado el 18 de octubre de 2025_
_Error original: "la sintaxis de entrada no es válida para tipo uuid"_
