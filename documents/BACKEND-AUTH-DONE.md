# ✅ Backend de Autenticación Implementado

## 📦 Dependencias Instaladas

```bash
npm install passport passport-google-oauth20 jsonwebtoken cookie-parser cors
```

- `passport` - Framework de autenticación
- `passport-google-oauth20` - Estrategia OAuth 2.0 de Google
- `jsonwebtoken` - Generar y verificar JWT tokens
- `cookie-parser` - Parsear cookies HTTP
- `cors` - Configurar Cross-Origin Resource Sharing

---

## 🗂️ Archivos Creados

### 1. `server/auth/jwt.js` ✅

**Funciones para manejar JWT tokens:**

- `generateToken(user)` - Genera JWT token con datos del usuario
- `verifyToken(token)` - Verifica y decodifica token
- `extractToken(authHeader)` - Extrae token del header "Bearer TOKEN"

**Configuración:**

- Token válido por 7 días
- Usa `JWT_SECRET` del .env
- Payload incluye: id, email, name, avatar

### 2. `server/auth/middleware.js` ✅

**Middlewares de autenticación:**

#### `requireAuth(req, res, next)`

- Middleware obligatorio - Protege rutas que requieren login
- Verifica token en: Header Authorization, Cookies, Query string
- Devuelve 401 si no hay token o es inválido
- Agrega `req.user` y `req.userId` para usar en las rutas

#### `optionalAuth(req, res, next)`

- Middleware opcional - No falla si no hay token
- Si hay token válido, agrega `req.user`
- Útil para rutas que funcionan con/sin autenticación

### 3. `server/auth/passport.js` ✅

**Configuración de Passport con Google OAuth:**

**Estrategia Google:**

- Verifica credenciales GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
- Callback URL: `${BACKEND_URL}/auth/google/callback`
- Scope: profile + email

**Lógica de autenticación:**

1. Busca usuario por `googleId`
2. Si no existe, busca por `email`
3. Si existe: actualiza datos (nombre, avatar, lastLogin)
4. Si no existe: crea nuevo usuario
5. Retorna usuario para generar JWT

### 4. `server/routes/auth.js` ✅

**Rutas de autenticación:**

#### `GET /auth/google`

- Inicia flujo OAuth con Google
- Redirige a pantalla de consentimiento de Google

#### `GET /auth/google/callback`

- Google redirige aquí después de autorizar
- Genera JWT token
- Redirige a frontend con token: `${FRONTEND_URL}?token=JWT_TOKEN`
- En caso de error: `${FRONTEND_URL}?error=auth_failed`

#### `GET /auth/me` (requiere auth)

- Devuelve datos del usuario autenticado
- Incluye estadísticas completas (partidas, cartas especiales, jodetes)
- Usa middleware `requireAuth`

#### `POST /auth/logout`

- Responde con success (el cliente debe eliminar el token)

#### `GET /auth/status`

- Verifica si Google OAuth está configurado
- Útil para mostrar/ocultar botón de login en frontend

### 5. `server/index.js` ✅ (Actualizado)

**Integraciones agregadas:**

- Import de passport, cookieParser, cors, authRoutes
- Middlewares: `express.json()`, `cookieParser()`, `cors()`, `passport.initialize()`
- Rutas montadas: `app.use("/auth", authRoutes)`
- CORS configurado con FRONTEND_URL

---

## ⚙️ Variables de Entorno

### `.env` (Actualizado)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# JWT Secret
JWT_SECRET=supersecretkey_cambiar_en_produccion

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Node
NODE_ENV=development
```

### `.env.example` (Actualizado)

Agregadas secciones para OAuth, JWT y URLs

---

## 🔄 Flujo de Autenticación Completo

```
1. Usuario → Clic en "Login con Google"
   ↓
2. Frontend → Redirect a /auth/google
   ↓
3. Backend → Redirect a Google OAuth
   ↓
4. Google → Muestra pantalla de consentimiento
   ↓
5. Usuario → Aprueba permisos
   ↓
6. Google → Redirect a /auth/google/callback con código
   ↓
7. Backend → Intercambia código por perfil de Google
   ↓
8. Backend → Busca/crea usuario en PostgreSQL
   ↓
9. Backend → Genera JWT token
   ↓
10. Backend → Redirect a ${FRONTEND_URL}?token=JWT
   ↓
11. Frontend → Captura token del query string
   ↓
12. Frontend → Guarda token en localStorage
   ↓
13. Frontend → Actualiza AuthContext con usuario
   ↓
14. Frontend → Muestra perfil y estadísticas
```

---

## 🧪 Testing del Backend

### 1. Verificar estado de OAuth

```bash
curl http://localhost:3001/auth/status
```

Respuesta esperada:

```json
{
  "configured": false,
  "message": "Google OAuth no está configurado. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env"
}
```

### 2. Probar endpoint protegido sin token

```bash
curl http://localhost:3001/auth/me
```

Respuesta esperada (401):

```json
{
  "error": "No autorizado",
  "message": "No se proporcionó token de autenticación"
}
```

### 3. Probar endpoint protegido con token (después de tener credenciales)

```bash
curl -H "Authorization: Bearer TU_TOKEN_JWT" http://localhost:3001/auth/me
```

---

## 📝 Próximos Pasos

### ✅ Completado:

1. Instalación de dependencias
2. Módulo JWT (generar, verificar, extraer)
3. Middlewares de autenticación (requireAuth, optionalAuth)
4. Configuración de Passport con Google
5. Rutas de autenticación (/google, /callback, /me, /logout, /status)
6. Integración en server/index.js
7. Variables de entorno configuradas

### 🔄 Pendiente:

1. **Obtener credenciales de Google Cloud Console:**

   - Crear proyecto
   - Habilitar Google+ API
   - Configurar pantalla de consentimiento
   - Crear OAuth 2.0 Client ID
   - Copiar Client ID y Client Secret
   - Configurar redirect URIs

2. **Frontend (AuthContext + UI):**

   - Crear `src/contexts/AuthContext.jsx`
   - Crear `src/components/LoginButton.jsx`
   - Actualizar `src/App.jsx` para capturar token
   - Integrar con Socket.IO (enviar token)

3. **Integración con Partidas:**
   - Asociar partidas con userId
   - Actualizar estadísticas al terminar partidas
   - Permitir juego como invitado (sin auth)

---

## 🚀 Para Continuar

**Opción 1: Obtener credenciales de Google**

- Ir a Google Cloud Console
- Seguir guía en `OAUTH-IMPLEMENTATION.md`
- Configurar Client ID y Secret en .env
- Probar flujo completo de OAuth

**Opción 2: Implementar frontend primero**

- Crear AuthContext
- Crear LoginButton (puede ser placeholder)
- Configurar captura de token
- Mostrar perfil de usuario

¿Qué prefieres hacer primero? 🎯
