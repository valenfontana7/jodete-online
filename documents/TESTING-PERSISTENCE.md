# 🧪 Guía de Testing de Persistencia

## ✅ Estado Actual

- ✅ PostgreSQL local conectado
- ✅ Servidor corriendo en puerto 3001
- ✅ Frontend en puerto 5173
- ✅ Modelos sincronizados
- ✅ Sistema de recuperación activo

## 🎮 Test 1: Crear y Persistir Partida

### Pasos:

1. **Abre dos ventanas del navegador:**

   - Ventana 1: `http://localhost:5173`
   - Ventana 2: `http://localhost:5173` (modo incógnito)

2. **Crear partida (Ventana 1):**

   - Ingresar nombre: "Jugador1"
   - Clic en "Crear Sala"
   - Copiar el código de sala (ej: "ABC123")

3. **Unirse a partida (Ventana 2):**

   - Ingresar nombre: "Jugador2"
   - Ingresar código: "ABC123"
   - Clic en "Unirse a Sala"

4. **Iniciar partida (Ventana 1):**

   - Clic en "Iniciar Partida"

5. **Jugar algunos turnos:**
   - Cada jugador tira 2-3 cartas
   - Observa los logs del servidor

### ✅ Qué verificar:

En los logs del servidor deberías ver:

```bash
# Cuando se crea la partida:
Executing (default): INSERT INTO "games" (...)

# Cuando se crean los jugadores:
Executing (default): INSERT INTO "game_players" (...)

# Cada vez que se juega una carta:
Executing (default): UPDATE "games" SET ...
Executing (default): INSERT INTO "game_actions" (...)

# Cada turno:
Executing (default): UPDATE "games" ...
```

---

## 🔄 Test 2: Recuperación después de Reinicio

### Pasos:

1. **Crear y jugar partida** (como en Test 1)

2. **Sin terminar la partida, detener el servidor:**

   - En la terminal presiona `Ctrl + C`

3. **Reiniciar el servidor:**

   ```bash
   npm run dev:full
   ```

4. **Verificar logs al iniciar:**

   ```bash
   📥 Cargando partidas activas desde base de datos...
      Encontradas X partida(s) activa(s)
      ⚠️ Partida XXXX-XXXX-XXXX marcada como abandonada
   ```

5. **Verificar en la base de datos:**

   ```bash
   # En otra terminal (opcional)
   psql -U postgres -d jodete_online

   # Ver partidas
   SELECT id, "roomId", phase, "startedAt" FROM games;

   # Ver acciones de la última partida
   SELECT "actionType", description, "turnNumber"
   FROM game_actions
   WHERE "gameId" = 'UUID_DE_LA_PARTIDA'
   ORDER BY "turnNumber";
   ```

### ✅ Qué esperar:

- La partida debe estar guardada en la DB
- Fase marcada como 'abandoned'
- Todas las acciones registradas en orden

---

## 📊 Test 3: Verificar Base de Datos

### Conectar a PostgreSQL:

#### Opción A: psql (línea de comandos)

```bash
psql -U postgres -d jodete_online
```

#### Opción B: pgAdmin, DBeaver, etc.

- Host: localhost
- Port: 5432
- Database: jodete_online
- User: postgres
- Password: 255655

### Queries útiles:

```sql
-- Ver todas las partidas
SELECT
  id,
  "roomId",
  phase,
  "cardsPerPlayer",
  "totalTurns",
  "startedAt",
  "finishedAt"
FROM games
ORDER BY "createdAt" DESC;

-- Ver jugadores de una partida
SELECT
  gp."playerName",
  gp.position,
  gp.connected,
  gp."finalCardCount"
FROM game_players gp
WHERE gp."gameId" = 'UUID_AQUI'
ORDER BY gp.position;

-- Ver historial de acciones
SELECT
  ga."turnNumber",
  ga."actionType",
  ga.description,
  ga."cardPlayed",
  ga.timestamp
FROM game_actions ga
WHERE ga."gameId" = 'UUID_AQUI'
ORDER BY ga."turnNumber", ga.timestamp;

-- Ver estado del juego (JSONB)
SELECT
  "roomId",
  "gameState"->'deck' as deck_count,
  "gameState"->'discardPile' as discard_pile,
  "gameState"->'currentSuit' as current_suit
FROM games
WHERE id = 'UUID_AQUI';

-- Estadísticas generales
SELECT
  phase,
  COUNT(*) as count,
  AVG("totalTurns") as avg_turns,
  AVG("duration") as avg_duration_seconds
FROM games
GROUP BY phase;
```

---

## 🎯 Test 4: Partida Completa

### Objetivo: Completar una partida y verificar estadísticas

1. **Crear partida con 2 jugadores**

2. **Jugar hasta que alguien gane**

3. **Verificar en DB:**

   ```sql
   SELECT
     "roomId",
     phase,           -- Debería ser 'finished'
     "winnerId",      -- NULL por ahora (sin auth)
     "totalTurns",
     "duration",
     "finishedAt"
   FROM games
   WHERE phase = 'finished'
   ORDER BY "finishedAt" DESC
   LIMIT 1;
   ```

4. **Ver todas las acciones:**
   ```sql
   SELECT
     "actionType",
     description,
     "turnNumber"
   FROM game_actions
   WHERE "gameId" = (
     SELECT id FROM games
     WHERE phase = 'finished'
     ORDER BY "finishedAt" DESC
     LIMIT 1
   )
   ORDER BY "turnNumber";
   ```

---

## 🐛 Troubleshooting

### Problema: No se guardan las partidas

**Verificar:**

```bash
# En logs del servidor, buscar:
❌ Error guardando partida en base de datos
```

**Solución:**

- Verificar que PostgreSQL esté corriendo
- Verificar .env con DATABASE_URL correcta

### Problema: ERROR: column "xxx" does not exist

**Solución:**

```bash
# Detener servidor y eliminar tablas
psql -U postgres -d jodete_online

DROP TABLE game_actions CASCADE;
DROP TABLE game_players CASCADE;
DROP TABLE games CASCADE;
DROP TABLE users CASCADE;

# Reiniciar servidor (Sequelize recreará todo)
npm run dev:full
```

### Problema: Duplicated key value

**Causa:** roomId duplicado

**Solución:**

- Cada sala debe tener código único
- Verificar que el generador de códigos funcione

---

## 📈 Próximos Pasos

Una vez que verifiques que todo funciona:

1. ✅ **Persistencia funcionando** → Continuar con autenticación
2. ✅ **Datos guardados correctamente** → Implementar sistema de estadísticas
3. ✅ **Recuperación probada** → Implementar reconexión de jugadores

---

## 🎉 Checklist de Prueba

- [ ] Crear partida con 2 jugadores
- [ ] Jugar varios turnos
- [ ] Verificar logs con queries INSERT/UPDATE
- [ ] Ver datos en la base de datos
- [ ] Reiniciar servidor
- [ ] Verificar que partida se marque como abandonada
- [ ] Completar una partida entera
- [ ] Verificar phase = 'finished'
- [ ] Ver historial completo de acciones
- [ ] Limpiar partidas antiguas (esperar o forzar cleanup)

---

¿Listo para probar? 🚀
