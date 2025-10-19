# 🗄️ Persistencia con PostgreSQL + Sequelize

## 📋 Fase 1: Configuración y Modelos

### 1. Instalación de Dependencias

```bash
npm install pg sequelize
npm install --save-dev sequelize-cli
```

### 2. Variables de Entorno

Agregar a `.env`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://usuario:password@localhost:5432/jodete_online
# O para desarrollo local:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jodete_online
DB_USER=postgres
DB_PASSWORD=tu_password
```

### 3. Estructura de Archivos

```
server/
├── db/
│   ├── config.js           # Configuración de Sequelize
│   ├── index.js            # Conexión y sincronización
│   └── models/
│       ├── User.js         # Modelo de usuario
│       ├── Game.js         # Modelo de partida
│       ├── GamePlayer.js   # Relación game-player
│       └── GameAction.js   # Historial de acciones
├── game.js                 # Actualizar con persistencia
└── gameManager.js          # Actualizar para cargar partidas
```

---

## 📊 Esquemas de Base de Datos

### Tabla: `users`

- **id**: UUID (PK)
- **googleId**: STRING (UNIQUE, nullable para usuarios invitados)
- **email**: STRING (UNIQUE, nullable)
- **name**: STRING
- **avatar**: STRING (nullable)
- **gamesPlayed**: INTEGER (default: 0)
- **gamesWon**: INTEGER (default: 0)
- **gamesLost**: INTEGER (default: 0)
- **specialCards2**: INTEGER (default: 0)
- **specialCards4**: INTEGER (default: 0)
- **specialCards10**: INTEGER (default: 0)
- **specialCards11**: INTEGER (default: 0)
- **specialCards12**: INTEGER (default: 0)
- **totalPlayTime**: INTEGER (default: 0, en minutos)
- **jodetesCalled**: INTEGER (default: 0)
- **jodetesReceived**: INTEGER (default: 0)
- **createdAt**: TIMESTAMP
- **updatedAt**: TIMESTAMP
- **lastLogin**: TIMESTAMP (nullable)

### Tabla: `games`

- **id**: UUID (PK)
- **roomId**: STRING (UNIQUE)
- **phase**: ENUM('lobby', 'playing', 'finished', 'abandoned')
- **winnerId**: UUID (FK to users, nullable)
- **cardsPerPlayer**: INTEGER (nullable)
- **totalTurns**: INTEGER (default: 0)
- **gameState**: JSONB (estado completo serializado)
- **startedAt**: TIMESTAMP (nullable)
- **finishedAt**: TIMESTAMP (nullable)
- **duration**: INTEGER (en segundos, nullable)
- **createdAt**: TIMESTAMP
- **updatedAt**: TIMESTAMP

### Tabla: `game_players`

- **id**: UUID (PK)
- **gameId**: UUID (FK to games)
- **userId**: UUID (FK to users, nullable para invitados)
- **playerName**: STRING
- **socketId**: STRING (nullable)
- **connected**: BOOLEAN (default: true)
- **finalCardCount**: INTEGER (nullable)
- **position**: INTEGER (orden en la partida)
- **createdAt**: TIMESTAMP
- **updatedAt**: TIMESTAMP

### Tabla: `game_actions`

- **id**: UUID (PK)
- **gameId**: UUID (FK to games)
- **gamePlayerId**: UUID (FK to game_players, nullable)
- **actionType**: ENUM('play', 'draw', 'declare', 'jodete', 'start', 'finish')
- **description**: TEXT
- **cardPlayed**: JSONB (nullable)
- **turnNumber**: INTEGER
- **timestamp**: TIMESTAMP
- **createdAt**: TIMESTAMP

---

## 🚀 Implementación Paso a Paso

### Paso 1: Configurar Sequelize

**`server/db/config.js`:**

```javascript
import { Sequelize } from "sequelize";
import process from "node:process";

const sequelize = new Sequelize(
  process.env.DATABASE_URL || {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "jodete_online",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "production" ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
```

### Paso 2: Crear Modelos

**`server/db/models/User.js`:**

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gamesPlayed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gamesWon: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gamesLost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards2: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards4: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards10: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards11: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards12: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalPlayTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "En minutos",
    },
    jodetesCalled: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    jodetesReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// Método virtual para calcular win rate
User.prototype.getWinRate = function () {
  if (this.gamesPlayed === 0) return 0;
  return ((this.gamesWon / this.gamesPlayed) * 100).toFixed(2);
};

export default User;
```

**`server/db/models/Game.js`:**

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const Game = sequelize.define(
  "Game",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    phase: {
      type: DataTypes.ENUM("lobby", "playing", "finished", "abandoned"),
      defaultValue: "lobby",
      allowNull: false,
    },
    winnerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    cardsPerPlayer: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalTurns: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gameState: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Estado completo del juego serializado",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duración en segundos",
    },
  },
  {
    tableName: "games",
    timestamps: true,
  }
);

export default Game;
```

**`server/db/models/GamePlayer.js`:**

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const GamePlayer = sequelize.define(
  "GamePlayer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "games",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    playerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    socketId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    connected: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    finalCardCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Orden del jugador en la partida (1, 2, 3...)",
    },
  },
  {
    tableName: "game_players",
    timestamps: true,
  }
);

export default GamePlayer;
```

**`server/db/models/GameAction.js`:**

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const GameAction = sequelize.define(
  "GameAction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "games",
        key: "id",
      },
    },
    gamePlayerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "game_players",
        key: "id",
      },
    },
    actionType: {
      type: DataTypes.ENUM(
        "play",
        "draw",
        "declare",
        "jodete",
        "start",
        "finish"
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cardPlayed: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Detalles de la carta jugada si aplica",
    },
    turnNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "game_actions",
    timestamps: true,
    createdAt: true,
    updatedAt: false,
  }
);

export default GameAction;
```

### Paso 3: Establecer Relaciones

**`server/db/index.js`:**

```javascript
import sequelize from "./config.js";
import User from "./models/User.js";
import Game from "./models/Game.js";
import GamePlayer from "./models/GamePlayer.js";
import GameAction from "./models/GameAction.js";

// Relaciones
Game.belongsTo(User, { as: "winner", foreignKey: "winnerId" });
User.hasMany(Game, { as: "gamesWon", foreignKey: "winnerId" });

Game.hasMany(GamePlayer, { foreignKey: "gameId" });
GamePlayer.belongsTo(Game, { foreignKey: "gameId" });

User.hasMany(GamePlayer, { foreignKey: "userId" });
GamePlayer.belongsTo(User, { foreignKey: "userId" });

Game.hasMany(GameAction, { foreignKey: "gameId" });
GameAction.belongsTo(Game, { foreignKey: "gameId" });

GamePlayer.hasMany(GameAction, { foreignKey: "gamePlayerId" });
GameAction.belongsTo(GamePlayer, { foreignKey: "gamePlayerId" });

// Función para conectar y sincronizar
export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a PostgreSQL establecida correctamente");

    // Sincronizar modelos (en desarrollo)
    // ⚠️ En producción usar migraciones
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅ Modelos sincronizados con la base de datos");
    }

    return true;
  } catch (error) {
    console.error("❌ Error conectando a PostgreSQL:", error);
    return false;
  }
}

export { sequelize, User, Game, GamePlayer, GameAction };
```

### Paso 4: Actualizar servidor principal

**`server/index.js` (agregar al inicio):**

```javascript
import { connectDatabase } from "./db/index.js";

// ... código existente ...

// Conectar a la base de datos antes de iniciar el servidor
connectDatabase().then((connected) => {
  if (!connected) {
    console.error("No se pudo conectar a la base de datos");
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
});
```

---

## 🎮 Actualizar Game Class

### Métodos a Agregar en `server/game.js`

```javascript
import { Game as GameModel, GamePlayer, GameAction } from "./db/index.js";

class Game {
  constructor(roomId) {
    // ... código existente ...
    this.dbGameId = null; // ID en la base de datos
    this.dbPlayerIds = new Map(); // Map de socketId -> gamePlayerId
    this.turnNumber = 0;
  }

  // Guardar partida en DB
  async saveToDatabase() {
    try {
      const gameData = {
        roomId: this.roomId,
        phase: this.phase,
        cardsPerPlayer: this.cardsPerPlayer,
        totalTurns: this.turnNumber,
        gameState: {
          deck: this.deck,
          discardPile: this.discardPile,
          currentPlayerIndex: this.currentPlayerIndex,
          pendingDraw: this.pendingDraw,
          direction: this.direction,
          topCard: this.topCard,
          currentSuitOverride: this.currentSuitOverride,
          repeatConstraint: this.repeatConstraint,
        },
        startedAt: this.startedAt,
        finishedAt: this.phase === "finished" ? new Date() : null,
        winnerId: this.winnerId || null,
      };

      if (this.startedAt && gameData.finishedAt) {
        gameData.duration = Math.floor(
          (gameData.finishedAt - this.startedAt) / 1000
        );
      }

      if (this.dbGameId) {
        // Actualizar partida existente
        await GameModel.update(gameData, {
          where: { id: this.dbGameId },
        });
      } else {
        // Crear nueva partida
        const gameRecord = await GameModel.create(gameData);
        this.dbGameId = gameRecord.id;

        // Crear registros de jugadores
        for (let i = 0; i < this.players.length; i++) {
          const player = this.players[i];
          const playerRecord = await GamePlayer.create({
            gameId: this.dbGameId,
            userId: player.userId || null,
            playerName: player.name,
            socketId: player.socket?.id,
            connected: player.connected,
            position: i + 1,
          });
          this.dbPlayerIds.set(player.socket?.id || player.id, playerRecord.id);
        }
      }

      console.log(`💾 Partida ${this.roomId} guardada en DB`);
    } catch (error) {
      console.error("Error guardando partida:", error);
    }
  }

  // Agregar acción al historial
  async addAction(actionType, playerId, description, cardPlayed = null) {
    if (!this.dbGameId) {
      console.warn("No se puede agregar acción: partida no guardada en DB");
      return;
    }

    try {
      const gamePlayerId = this.dbPlayerIds.get(playerId);

      await GameAction.create({
        gameId: this.dbGameId,
        gamePlayerId: gamePlayerId || null,
        actionType,
        description,
        cardPlayed,
        turnNumber: this.turnNumber,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error agregando acción:", error);
    }
  }

  // Cargar partida desde DB
  static async loadFromDatabase(roomId) {
    try {
      const gameRecord = await GameModel.findOne({
        where: {
          roomId,
          phase: ["lobby", "playing"],
        },
        include: [
          {
            model: GamePlayer,
            include: [{ model: User, required: false }],
          },
        ],
      });

      if (!gameRecord) {
        return null;
      }

      // Reconstruir instancia de Game
      // (Implementar según necesidades específicas)

      return gameRecord;
    } catch (error) {
      console.error("Error cargando partida:", error);
      return null;
    }
  }

  // Modificar broadcast() existente
  broadcast() {
    // ... código existente ...

    // Guardar en DB de forma asíncrona
    this.saveToDatabase().catch((err) =>
      console.error("Error en saveToDatabase:", err)
    );
  }

  // Modificar métodos de acciones para guardar en historial
  async handlePlay({ playerId, cardId, chosenSuit }) {
    // ... código existente ...

    // Después de jugar la carta
    await this.addAction("play", playerId, message, card);

    // ... resto del código ...
  }

  // Similar para handleDraw, handleDeclareLastCard, etc.
}
```

---

## ✅ Checklist de Implementación

- [ ] Instalar pg y sequelize
- [ ] Crear archivo de configuración de Sequelize
- [ ] Crear modelo User
- [ ] Crear modelo Game
- [ ] Crear modelo GamePlayer
- [ ] Crear modelo GameAction
- [ ] Establecer relaciones entre modelos
- [ ] Conectar base de datos en index.js
- [ ] Agregar métodos de persistencia a Game class
- [ ] Probar guardado de partidas
- [ ] Probar recuperación de partidas
- [ ] Actualizar .env.example con variables de DB

---

## 🧪 Pruebas Locales

### 1. Instalar PostgreSQL localmente

**macOS:**

```bash
brew install postgresql
brew services start postgresql
createdb jodete_online
```

**Windows:**

- Descargar desde [postgresql.org](https://www.postgresql.org/download/)
- O usar Docker:

```bash
docker run --name postgres-jodete -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### 2. Probar conexión

```bash
npm run server
```

Debe mostrar:

```
✅ Conexión a PostgreSQL establecida correctamente
✅ Modelos sincronizados con la base de datos
🚀 Servidor corriendo en puerto 3001
```

### 3. Probar persistencia

1. Crear una partida
2. Jugar algunos turnos
3. Reiniciar el servidor
4. Verificar que la partida se recupere

---

## 🚀 Próximos Pasos

Una vez que la persistencia funcione:

1. **Implementar reconexión de jugadores**
2. **Agregar autenticación con Google**
3. **Integrar estadísticas**
4. **Deploy en producción con Neon/Supabase**
