# 🔐 Plan: Autenticación con Google y Persistencia de Partidas

## 📋 Resumen Ejecutivo

Este documento describe el plan completo para implementar:

1. **Autenticación con Google OAuth 2.0**
2. **Persistencia de partidas en base de datos**
3. **Sistema de estadísticas y historial de partidas**

---

## 🎯 Objetivos

- ✅ Permitir login con cuenta de Google
- ✅ Guardar estado de partidas en base de datos
- ✅ Recuperar partidas si el servidor se reinicia
- ✅ Trackear estadísticas de jugadores
- ✅ Mostrar historial de partidas jugadas
- ✅ Permitir reconexión a partidas en progreso

---

## 🗄️ 1. Base de Datos

### Opción A: MongoDB (Recomendado para este proyecto)

**Ventajas:**

- Flexible, sin esquema rígido
- Perfecto para datos de juego que pueden variar
- Fácil de escalar
- Atlas tiene tier gratuito generoso
- Ideal para guardar snapshots de estado completo

**Instalación:**

```bash
npm install mongodb mongoose
```

### Opción B: PostgreSQL

**Ventajas:**

- Relacional, con integridad referencial
- Mejor para queries complejas
- Más robusto para estadísticas agregadas

**Instalación:**

```bash
npm install pg
```

### Recomendación: **MongoDB Atlas** (gratis hasta 512MB)

---

## 📊 2. Esquemas de Base de Datos

### Colección: `users`

```javascript
{
  _id: ObjectId,
  googleId: String,           // ID único de Google
  email: String,              // Email del usuario
  name: String,               // Nombre completo
  avatar: String,             // URL del avatar de Google
  createdAt: Date,
  lastLogin: Date,
  stats: {
    gamesPlayed: Number,
    gamesWon: Number,
    gamesLost: Number,
    winRate: Number,          // Calculado
    specialCardsUsed: {
      '2': Number,            // Doses jugados
      '4': Number,            // Cuatros jugados
      '10': Number,           // Dieces jugados
      '11': Number,           // Onces jugados
      '12': Number            // Doces jugados
    },
    totalPlayTime: Number,    // En minutos
    jodetesCalled: Number,    // ¡Jodete! gritados
    jodetesReceived: Number   // ¡Jodete! recibidos
  }
}
```

### Colección: `games`

```javascript
{
  _id: ObjectId,
  roomId: String,             // ID de la sala
  phase: String,              // 'lobby', 'playing', 'finished', 'abandoned'
  players: [{
    userId: ObjectId,         // Referencia a users
    socketId: String,
    name: String,
    connected: Boolean,
    hand: Array,              // Cartas en mano (solo si está activa)
    cardCount: Number
  }],
  gameState: Object,          // Snapshot completo del estado
  history: [{
    timestamp: Date,
    action: String,           // Descripción de la acción
    playerId: ObjectId,
    cardPlayed: Object        // Detalles de la carta si aplica
  }],
  winnerId: ObjectId,
  startedAt: Date,
  finishedAt: Date,
  duration: Number,           // En segundos
  metadata: {
    cardsPerPlayer: Number,
    totalTurns: Number,
    specialCardsPlayed: Object
  }
}
```

### Colección: `game_snapshots` (Opcional - para replay)

```javascript
{
  _id: ObjectId,
  gameId: ObjectId,
  turnNumber: Number,
  timestamp: Date,
  state: Object               // Estado completo en ese momento
}
```

---

## 🔐 3. Google OAuth 2.0 Setup

### 3.1 Configurar Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear nuevo proyecto o seleccionar existente
3. Habilitar "Google+ API"
4. Ir a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth"
5. Configurar pantalla de consentimiento
6. Agregar URIs de redirección:
   - Desarrollo: `http://localhost:3001/auth/google/callback`
   - Producción: `https://tu-app.onrender.com/auth/google/callback`

### 3.2 Variables de Entorno

Agregar a `.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# JWT para sesiones
JWT_SECRET=una_clave_secreta_muy_segura_generada_aleatoriamente

# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/jodete-online

# Session
SESSION_SECRET=otra_clave_secreta_diferente
```

### 3.3 Dependencias Necesarias

```bash
npm install passport passport-google-oauth20 jsonwebtoken express-session cookie-parser bcrypt
```

---

## 🛠️ 4. Implementación del Backend

### 4.1 Estructura de Archivos Actualizada

```
server/
├── index.js              # Servidor principal (actualizar)
├── game.js               # Lógica del juego (actualizar)
├── gameManager.js        # Gestor de salas (actualizar)
├── auth/
│   ├── passport.js       # Configuración de Passport
│   └── middleware.js     # Middlewares de autenticación
├── db/
│   ├── connection.js     # Conexión a MongoDB
│   └── models/
│       ├── User.js       # Modelo de usuario
│       ├── Game.js       # Modelo de partida
│       └── GameSnapshot.js
└── routes/
    ├── auth.js           # Rutas de autenticación
    └── user.js           # Rutas de usuario/stats
```

### 4.2 Configuración de Passport.js

**`server/auth/passport.js`:**

```javascript
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../db/models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar o crear usuario
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0].value,
            createdAt: new Date(),
            lastLogin: new Date(),
          });
        } else {
          // Actualizar último login
          user.lastLogin = new Date();
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
```

### 4.3 Rutas de Autenticación

**`server/routes/auth.js`:**

```javascript
import express from "express";
import jwt from "jsonwebtoken";
import passport from "../auth/passport.js";

const router = express.Router();

// Iniciar login con Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback de Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failed",
    session: false,
  }),
  (req, res) => {
    // Generar JWT token
    const token = jwt.sign(
      {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirigir al frontend con el token
    res.redirect(`/?token=${token}`);
  }
);

// Logout
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
```

### 4.4 Middleware de Autenticación

**`server/auth/middleware.js`:**

```javascript
import jwt from "jsonwebtoken";
import User from "../db/models/User.js";

export const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);

    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

export const authenticateSocket = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    // Permitir conexión sin autenticación (modo invitado)
    socket.isGuest = true;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.userId = user._id;
    socket.userName = user.name;
    socket.userAvatar = user.avatar;
    socket.isGuest = false;

    next();
  } catch (error) {
    return next(new Error("Invalid token"));
  }
};
```

### 4.5 Actualizar Socket.IO con Autenticación

**`server/index.js` (actualizar):**

```javascript
import { authenticateSocket } from "./auth/middleware.js";

// Middleware de autenticación para Socket.IO
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(
    `Socket conectado: ${socket.id}, Usuario: ${socket.userName || "Invitado"}`
  );

  // El resto del código existente...
});
```

---

## 🎮 5. Actualizar Game Class para Persistencia

### 5.1 Métodos a Agregar en `game.js`

```javascript
import Game from "../db/models/Game.js";

class GameClass {
  // ... código existente ...

  async saveToDatabase() {
    try {
      const gameDoc = await Game.findOne({ roomId: this.roomId });

      const gameData = {
        roomId: this.roomId,
        phase: this.phase,
        players: this.players.map((p) => ({
          userId: p.userId || null,
          socketId: p.socket?.id,
          name: p.name,
          connected: p.connected,
          cardCount: p.hand.length,
          hand: this.phase === "playing" ? p.hand : [],
        })),
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
        winnerId: this.winnerId || null,
        startedAt: this.startedAt,
        finishedAt: this.phase === "finished" ? new Date() : null,
      };

      if (gameDoc) {
        Object.assign(gameDoc, gameData);
        await gameDoc.save();
      } else {
        await Game.create(gameData);
      }
    } catch (error) {
      console.error("Error guardando partida:", error);
    }
  }

  async addToHistory(action, playerId, cardPlayed = null) {
    try {
      await Game.updateOne(
        { roomId: this.roomId },
        {
          $push: {
            history: {
              timestamp: new Date(),
              action,
              playerId,
              cardPlayed,
            },
          },
        }
      );
    } catch (error) {
      console.error("Error agregando al historial:", error);
    }
  }

  static async loadFromDatabase(roomId) {
    try {
      const gameDoc = await Game.findOne({
        roomId,
        phase: { $ne: "finished" },
      });

      if (!gameDoc) {
        return null;
      }

      // Reconstruir instancia de Game desde los datos guardados
      // (Implementación específica según tu lógica)

      return gameDoc;
    } catch (error) {
      console.error("Error cargando partida:", error);
      return null;
    }
  }

  // Llamar después de cada acción importante
  broadcast() {
    // ... código existente ...

    // Guardar estado en DB (async, no bloquear)
    this.saveToDatabase().catch((err) =>
      console.error("Error en saveToDatabase:", err)
    );
  }
}
```

---

## ⚛️ 6. Frontend React - Login con Google

### 6.1 Crear Context de Autenticación

**`src/contexts/AuthContext.jsx`:**

```javascript
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token en la URL (después del callback de Google)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");

    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem("authToken", urlToken);
      window.history.replaceState({}, "", "/");
    }

    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/user/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = "/auth/google";
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 6.2 Componente de Login

**`src/components/LoginButton.jsx`:**

```javascript
import { useAuth } from "../contexts/AuthContext";
import "./LoginButton.css";

export default function LoginButton() {
  const { user, login, logout } = useAuth();

  if (user) {
    return (
      <div className="user-profile">
        <img src={user.avatar} alt={user.name} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <button onClick={logout} className="logout-btn">
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <button onClick={login} className="google-login-btn">
      <svg viewBox="0 0 24 24" width="20" height="20">
        {/* Ícono de Google */}
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Iniciar sesión con Google
    </button>
  );
}
```

### 6.3 Actualizar App.jsx

```javascript
import { AuthProvider } from "./contexts/AuthContext";
import LoginButton from "./components/LoginButton";

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="app-header">
          <LoginButton />
          {/* ... resto del header ... */}
        </header>
        {/* ... resto de la app ... */}
      </div>
    </AuthProvider>
  );
}
```

### 6.4 Conectar Socket con Token

```javascript
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { token } = useAuth();

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        auth: {
          token: token || null,
        },
      });
      // ... resto de la configuración ...
    }
  }, [token]);
}
```

---

## 📈 7. Sistema de Estadísticas

### 7.1 API de Estadísticas

**`server/routes/user.js`:**

```javascript
import express from "express";
import { authenticateToken } from "../auth/middleware.js";
import User from "../db/models/User.js";
import Game from "../db/models/Game.js";

const router = express.Router();

// Obtener perfil del usuario actual
router.get("/me", authenticateToken, (req, res) => {
  res.json(req.user);
});

// Obtener estadísticas del usuario
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Calcular estadísticas adicionales desde games
    const recentGames = await Game.find({
      "players.userId": user._id,
      phase: "finished",
    })
      .sort({ finishedAt: -1 })
      .limit(10);

    res.json({
      ...user.stats,
      recentGames: recentGames.map((g) => ({
        id: g._id,
        date: g.finishedAt,
        winner: g.winnerId.equals(user._id),
        duration: g.duration,
        players: g.players.length,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching stats" });
  }
});

// Obtener historial de partidas
router.get("/games", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const games = await Game.find({
      "players.userId": req.user._id,
      phase: "finished",
    })
      .sort({ finishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("players.userId", "name avatar");

    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "Error fetching games" });
  }
});

export default router;
```

---

## 🚀 8. Deployment

### 8.1 Variables de Entorno en Render

Agregar en el dashboard de Render:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://tu-app.onrender.com/auth/google/callback
JWT_SECRET=...
SESSION_SECRET=...
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
```

### 8.2 Actualizar render.yaml

```yaml
services:
  - type: web
    name: jodete-online
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: MONGODB_URI
        sync: false
```

---

## ✅ Checklist de Implementación

### Fase 1: Base de Datos (2-3 horas)

- [ ] Crear cuenta en MongoDB Atlas
- [ ] Configurar cluster y obtener connection string
- [ ] Crear modelos de User, Game, GameSnapshot
- [ ] Probar conexión desde el servidor

### Fase 2: Autenticación (3-4 horas)

- [ ] Configurar Google Cloud Console
- [ ] Instalar dependencias (passport, jwt, etc.)
- [ ] Implementar rutas de autenticación
- [ ] Crear middleware de autenticación
- [ ] Integrar con Socket.IO

### Fase 3: Frontend Login (2-3 horas)

- [ ] Crear AuthContext
- [ ] Componente LoginButton
- [ ] Integrar en App.jsx
- [ ] Manejar callback y tokens

### Fase 4: Persistencia (4-5 horas)

- [ ] Actualizar Game class con métodos de persistencia
- [ ] Guardar estado en cada acción
- [ ] Implementar recuperación de partidas
- [ ] Manejar reconexiones

### Fase 5: Estadísticas (2-3 horas)

- [ ] API endpoints para stats
- [ ] Actualizar stats después de cada partida
- [ ] Componente de perfil de usuario
- [ ] Historial de partidas

### Fase 6: Testing y Deploy (2-3 horas)

- [ ] Probar flujo completo localmente
- [ ] Configurar variables de entorno en Render
- [ ] Deploy y pruebas en producción
- [ ] Documentar en README

**Tiempo total estimado: 15-21 horas**

---

## 📚 Recursos Útiles

- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Docs](http://www.passportjs.org/)
- [JWT.io](https://jwt.io/)
- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/)

---

## 🎯 Próximos Pasos Sugeridos

1. **Empezar con MongoDB**: Configurar base de datos y modelos básicos
2. **Implementar login**: Más visible para usuarios y motiva el desarrollo
3. **Agregar persistencia**: Una vez que funcione el login
4. **Estadísticas al final**: Es lo más complejo pero menos crítico

¿Por dónde te gustaría empezar? 🚀
