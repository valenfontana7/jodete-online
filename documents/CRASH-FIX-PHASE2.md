# Actualización de Corrección de Crashes - Fase 2

## Fecha: 13 de octubre de 2025

## Estado Actual

### ✅ Mejoras Implementadas Funcionando

1. **Validaciones de Conexión**: Los logs ahora muestran:

   ```
   Conectado al servidor
   Intentando reconectar a la sala anterior...
   ```

2. **Prevención de Errores**: Ya no hay logs de "Socket no está en ninguna sala" (las validaciones están bloqueando los intentos prematuros)

3. **Reconexión Automática**: El cliente detecta tokens guardados y reintenta la conexión

### ⚠️ Problemas Restantes

**Errores 500 en WebSocket durante Cold Starts:**

```
[GET] 500 jodete-online.onrender.com/socket.io/?EIO=4&transport=websocket
```

**Errores 499 en requests HTTP:**

```
[GET] 499 jodete-online.onrender.com/ (responseTimeMS=3394-420249ms)
```

### Análisis

1. **Error 499**: Client Closed Request - El cliente cierra la conexión antes de recibir respuesta

   - Causado por timeouts del navegador
   - Render.com puede tardar mucho en "despertar" el servidor

2. **Error 500 en WebSocket**: Probablemente relacionado con el tiempo de inicialización

3. **Tiempos de Respuesta Altos**:
   - Hasta 420 segundos (7 minutos) en algunos casos
   - Indica que el servicio está en "sleep mode"

## Mejoras Implementadas en Esta Fase

### 1. Validación de Estado de Conexión

**Todas las acciones ahora verifican:**

```javascript
if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
  console.warn("No se puede ejecutar: no estás en una sala o desconectado");
  return;
}
```

### 2. Condiciones de Habilitación de Botones

```javascript
const canStart =
  socketConnected &&
  hasJoined &&
  isHost &&
  (gameState?.players?.filter((player) => player.connected).length ?? 0) >= 2;

const canDraw =
  socketConnected && hasJoined && gameState?.phase === "playing" && isMyTurn;

const canDeclareLastCard =
  socketConnected &&
  hasJoined &&
  me?.hand?.length === 1 &&
  !me.declaredLastCard;
```

Esto previene que los botones se habiliten antes de estar completamente conectado.

### 3. Preservación de Estado Durante Desconexión

```javascript
instance.on("disconnect", (reason) => {
  console.log("Desconectado:", reason);
  setSocketConnected(false);
  // NO resetear hasJoined aquí
  // Esto previene que el cliente intente acciones antes de reconectarse
});
```

### 4. Logging Mejorado para Debugging

```javascript
console.warn("No se puede iniciar: no estás en una sala o desconectado", {
  socket: !!socket,
  socketConnected,
  hasJoined,
  hasGameState: !!gameState?.me,
});
```

## Recomendaciones para Render.com

### 1. Mantener el Servicio "Activo"

Para evitar cold starts, considera:

**Opción A - Cron Job Externo:**
Usar un servicio como UptimeRobot o cron-job.org para hacer ping cada 10-14 minutos:

```
GET https://jodete-online.onrender.com/api/health
```

**Opción B - Self-Ping Interno:**
Añadir al servidor:

```javascript
// En server/index.js
if (process.env.NODE_ENV === "production") {
  const SELF_URL =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.CLIENT_ORIGINS?.split(",")[0];

  if (SELF_URL) {
    setInterval(() => {
      fetch(`${SELF_URL}/api/health`).catch((err) =>
        console.log("Self-ping error:", err)
      );
    }, 14 * 60 * 1000); // Cada 14 minutos
  }
}
```

### 2. Aumentar Timeouts del Cliente

Ya implementado:

- `reconnectionAttempts: 10`
- `reconnectionDelayMax: 5000`
- `timeout: 20000`

### 3. Plan Render Pagado

El plan gratuito de Render tiene:

- ⏰ Sleep después de 15 minutos de inactividad
- 🐌 Cold start puede tardar 30-60 segundos
- 💾 Memoria limitada

El plan pagado ($7/mes) elimina el sleep mode.

## Comportamiento Esperado Ahora

### ✅ Escenario 1: Primera Conexión

1. Usuario carga la página
2. Socket se conecta
3. Usuario crea/une sala
4. `hasJoined = true`
5. Botones se habilitan
6. Acciones funcionan correctamente

### ✅ Escenario 2: Reconexión Rápida

1. Usuario pierde conexión temporalmente
2. Socket.IO reintenta automáticamente
3. Usuario se reconecta a la sala anterior
4. Estado se restaura
5. Juego continúa

### ✅ Escenario 3: Cold Start

1. Usuario carga página después de 15+ minutos
2. Servidor está dormido
3. Primera conexión WebSocket falla (500)
4. Cliente reintenta automáticamente
5. Servidor despierta (~30-60s)
6. Reconexión exitosa
7. Usuario puede jugar normalmente

### ❌ Escenario que Aún Puede Fallar

1. Usuario espera 7+ minutos durante cold start
2. Browser timeout (499)
3. Usuario debe refrescar página manualmente

**Solución**: Implementar self-ping o upgrade a plan pagado

## Métricas de Éxito

### Antes de las Correcciones:

- ❌ Crashes del servidor con errores no manejados
- ❌ Clientes intentando acciones sin estar en sala
- ❌ Estado inconsistente durante reconexiones

### Después de las Correcciones:

- ✅ Servidor no crashea (errores manejados gracefully)
- ✅ Validaciones previenen acciones prematuras
- ✅ Reconexión automática funciona
- ⚠️ Cold starts causan delay pero no crash

## Próximos Pasos Recomendados

### Alta Prioridad:

1. **Implementar self-ping** para evitar sleep mode
2. **Añadir indicador de "Despertando servidor..."** en UI durante cold start

### Media Prioridad:

3. Considerar upgrade a plan pagado de Render ($7/mes)
4. Implementar retry logic más agresivo para cold starts

### Baja Prioridad:

5. Añadir métricas de performance (tiempo de conexión, reconexiones, etc.)
6. Implementar health check dashboard

## Build Info Actual

```
dist/index.html                   1.82 kB │ gzip:  0.69 kB
dist/assets/index-BbFDdyfc.css   19.53 kB │ gzip:  4.95 kB
dist/assets/index-qNa_f9dC.js   265.21 kB │ gzip: 81.25 kB
✓ built in 985ms
```

## Código de Self-Ping Sugerido

Añadir al final de `server/index.js`:

```javascript
// Keep-alive para evitar sleep mode en Render
if (process.env.NODE_ENV === "production") {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

  if (RENDER_URL) {
    console.log("🔄 Self-ping habilitado para prevenir sleep mode");

    setInterval(async () => {
      try {
        const response = await fetch(`${RENDER_URL}/api/health`);
        if (response.ok) {
          console.log("✓ Self-ping exitoso");
        }
      } catch (error) {
        console.log("⚠️ Self-ping falló:", error.message);
      }
    }, 14 * 60 * 1000); // Cada 14 minutos
  }
}
```

**Variable de Entorno Requerida:**
En Render Dashboard → Environment:

```
RENDER_EXTERNAL_URL=https://jodete-online.onrender.com
NODE_ENV=production
```
