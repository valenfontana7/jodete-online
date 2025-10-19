# 🔐 Implementación de Google OAuth 2.0

## 📋 Plan de Implementación

### Fase 1: Configuración de Google Cloud Console ✅

1. Crear proyecto en Google Cloud
2. Habilitar Google+ API
3. Configurar pantalla de consentimiento OAuth
4. Crear credenciales OAuth 2.0
5. Configurar URLs de redirección

### Fase 2: Backend - Passport.js 🔧

1. Instalar dependencias
2. Configurar Passport con estrategia de Google
3. Crear rutas de autenticación
4. Generar y validar JWT tokens
5. Middleware de autenticación

### Fase 3: Frontend - React 🎨

1. Crear AuthContext
2. Componente LoginButton
3. Manejar callback y guardar token
4. Integrar con Socket.IO
5. Mostrar perfil de usuario

### Fase 4: Integración con Partidas 🎮

1. Asociar partidas con usuarios autenticados
2. Actualizar estadísticas al terminar partidas
3. Permitir juego como invitado (opcional)

---

## 🚀 PASO 1: Configurar Google Cloud Console

### 1.1 Crear Proyecto

1. **Ve a:** https://console.cloud.google.com/
2. **Crear nuevo proyecto:**
   - Nombre: `Jodete Online`
   - Organización: Personal (o la que prefieras)
   - Clic en "Crear"

### 1.2 Habilitar Google+ API

1. **Menú → APIs & Services → Library**
2. **Buscar:** "Google+ API"
3. **Clic en "Enable"**

### 1.3 Configurar Pantalla de Consentimiento

1. **APIs & Services → OAuth consent screen**
2. **Tipo de usuario:** External
3. **Información de la app:**
   - App name: `Jodete Online`
   - User support email: tu email
   - App logo: (opcional, puedes subirlo después)
   - App domain: `https://tu-app.onrender.com`
   - Developer contact: tu email
4. **Scopes:**
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. **Test users:** Agregar tu email (para testing)
6. **Guardar y continuar**

### 1.4 Crear Credenciales OAuth 2.0

1. **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID**
3. **Application type:** Web application
4. **Name:** `Jodete Online Web Client`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://tu-app.onrender.com
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:3001/auth/google/callback
   https://tu-app.onrender.com/auth/google/callback
   ```
7. **Clic en "Create"**
8. **¡IMPORTANTE! Copiar:**
   - Client ID
   - Client Secret

---

## 🔧 PASO 2: Configurar Variables de Entorno

### 2.1 Actualizar `.env` local

```env
# PostgreSQL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jodete_online
DB_USER=postgres
DB_PASSWORD=tu_password
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/jodete_online

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui

# JWT Secret (generar uno aleatorio)
JWT_SECRET=tu_secreto_jwt_super_seguro_aqui

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Node
NODE_ENV=development
```

### 2.2 Generar JWT_SECRET seguro

En tu terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y úsalo como `JWT_SECRET`.

### 2.3 Actualizar `.env.example`

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jodete_online
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://user:pass@host:5432/database

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT
JWT_SECRET=your_jwt_secret_here

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Node
NODE_ENV=development
```

### 2.4 Variables en Render (Producción)

En **Render → Web Service → Environment**, agregar:

```
GOOGLE_CLIENT_ID = tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = tu_client_secret
JWT_SECRET = tu_jwt_secret_seguro
FRONTEND_URL = https://tu-app.onrender.com
BACKEND_URL = https://tu-app.onrender.com
NODE_ENV = production
```

---

## 📦 PASO 3: Instalar Dependencias

```bash
npm install passport passport-google-oauth20 jsonwebtoken cookie-parser cors
```

### Paquetes:

- `passport` - Middleware de autenticación
- `passport-google-oauth20` - Estrategia OAuth 2.0 de Google
- `jsonwebtoken` - Generar y verificar JWT tokens
- `cookie-parser` - Parsear cookies (para guardar token)
- `cors` - Configurar CORS para permitir cookies

---

## 🗂️ Estructura de Archivos

```
server/
  auth/
    passport.js          # Configuración de Passport
    jwt.js              # Funciones para JWT (generar, verificar)
    middleware.js       # Middleware de autenticación
  routes/
    auth.js             # Rutas de autenticación
  index.js              # Actualizar con nuevas rutas

src/
  contexts/
    AuthContext.jsx     # Context para manejar usuario
  components/
    LoginButton.jsx     # Botón de login con Google
    UserProfile.jsx     # Mostrar perfil de usuario
```

---

## 🎯 Próximos Archivos a Crear

1. ✅ `server/auth/passport.js` - Configuración de estrategia de Google
2. ✅ `server/auth/jwt.js` - Generar y verificar tokens JWT
3. ✅ `server/auth/middleware.js` - Middleware para proteger rutas
4. ✅ `server/routes/auth.js` - Rutas de login, callback, logout
5. ✅ Actualizar `server/index.js` - Integrar Passport y rutas
6. ✅ `src/contexts/AuthContext.jsx` - Context de React
7. ✅ `src/components/LoginButton.jsx` - UI de login
8. ✅ Actualizar `src/App.jsx` - Usar AuthContext

---

## 🔐 Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant G as Google

    U->>F: Clic en "Login con Google"
    F->>B: Redirect a /auth/google
    B->>G: Solicitar autorización
    G->>U: Mostrar pantalla de consentimiento
    U->>G: Aprobar permisos
    G->>B: Redirect a /auth/google/callback + code
    B->>G: Intercambiar code por tokens
    G->>B: Enviar profile (email, nombre, foto)
    B->>B: Crear/actualizar User en DB
    B->>B: Generar JWT token
    B->>F: Redirect con token en cookie/query
    F->>F: Guardar token en localStorage
    F->>F: Actualizar AuthContext
    F->>U: Mostrar perfil y estadísticas
```

---

## 📝 Checklist

### Google Cloud Console

- [ ] Crear proyecto "Jodete Online"
- [ ] Habilitar Google+ API
- [ ] Configurar pantalla de consentimiento
- [ ] Crear credenciales OAuth 2.0
- [ ] Configurar redirect URIs (localhost + producción)
- [ ] Copiar Client ID y Client Secret

### Variables de Entorno

- [ ] Agregar GOOGLE_CLIENT_ID en .env
- [ ] Agregar GOOGLE_CLIENT_SECRET en .env
- [ ] Generar y agregar JWT_SECRET
- [ ] Agregar FRONTEND_URL y BACKEND_URL
- [ ] Actualizar .env.example
- [ ] Configurar variables en Render

### Dependencias

- [ ] Instalar passport
- [ ] Instalar passport-google-oauth20
- [ ] Instalar jsonwebtoken
- [ ] Instalar cookie-parser
- [ ] Instalar cors

### Backend

- [ ] Crear server/auth/passport.js
- [ ] Crear server/auth/jwt.js
- [ ] Crear server/auth/middleware.js
- [ ] Crear server/routes/auth.js
- [ ] Actualizar server/index.js

### Frontend

- [ ] Crear AuthContext
- [ ] Crear LoginButton
- [ ] Actualizar App.jsx
- [ ] Integrar con Socket.IO

### Testing

- [ ] Login funciona en local
- [ ] Token se guarda correctamente
- [ ] Perfil se muestra en UI
- [ ] Partidas se asocian con usuarios
- [ ] Estadísticas se actualizan
- [ ] Funciona en producción

---

## 🚀 ¿Listo para Empezar?

Dime cuando estés listo y empezaremos con:

1. Crear las variables de entorno
2. Instalar las dependencias
3. Implementar el backend de autenticación
4. Crear el frontend de login

¿Empezamos? 🎮
