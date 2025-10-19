# ✅ Frontend de Autenticación Implementado

## 📦 Archivos Creados

### 1. `src/contexts/AuthContext.jsx` ✅

**Context de React para manejar autenticación:**

**Estado:**

- `user` - Datos del usuario autenticado
- `loading` - Indicador de carga
- `error` - Mensajes de error
- `isAuthenticated` - Boolean si hay sesión activa

**Funciones:**

- `login()` - Redirige a Google OAuth (`/auth/google`)
- `logout()` - Elimina token y cierra sesión
- `getToken()` - Obtiene JWT token del localStorage

**Flujo de inicialización:**

1. Verifica si hay token en query string (después del callback)
2. Guarda token en localStorage
3. Limpia URL
4. Verifica token con backend (`/auth/me`)
5. Actualiza estado con datos del usuario

### 2. `src/components/LoginButton.jsx` ✅

**Botón de login/logout con perfil:**

**Estados:**

- Loading: Muestra "Cargando..."
- No autenticado: Botón "Iniciar sesión con Google" (con logo)
- Autenticado: Avatar + nombre + stats + botón "Cerrar sesión"

**Características:**

- Logo de Google SVG
- Avatar del usuario (referrerPolicy="no-referrer")
- Stats: partidas jugadas y tasa de victoria
- Botón de logout con estilo rojo

### 3. `src/components/UserProfile.jsx` ✅

**Componente detallado de perfil:**

**Muestra:**

- Header: Avatar + nombre + email
- Estadísticas generales:
  - Partidas jugadas/ganadas/perdidas
  - Tasa de victoria (destacada)
- Cartas especiales jugadas (2, 4, 10, 11, 12)
- Jodetes: llamados y recibidos
- Tiempo total de juego
- Fecha último acceso

### 4. `src/main.jsx` ✅ (Actualizado)

**Envolvió App con AuthProvider:**

```jsx
<StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
</StrictMode>
```

### 5. `src/App.jsx` ✅ (Actualizado)

**Cambios:**

- Import de `LoginButton`
- Agregado `<LoginButton />` en el header
- Estructura del header actualizada con `header-controls`

### 6. `src/App.css` ✅ (Actualizado)

**Estilos agregados:**

- `.header-controls` - Contenedor flex para badges + login
- `.btn-login` - Botón de Google con hover/active
- `.user-profile` - Perfil en header (compacto)
- `.user-avatar` - Avatar redondo 36px
- `.user-details` - Nombre + stats
- `.btn-logout` - Botón rojo de logout
- `.user-profile-card` - Tarjeta de perfil completa con gradiente
- `.profile-stats` - Grid de estadísticas
- `.special-cards` - Grid 5 columnas para cartas
- `.card-stat` - Cada carta especial
- Media queries para responsive

---

## 🔄 Flujo Completo de Autenticación

### 1. Usuario hace clic en "Iniciar sesión con Google"

```
onClick={login}
  ↓
window.location.href = "http://localhost:3001/auth/google"
```

### 2. Backend redirige a Google OAuth

```
Passport middleware:
  passport.authenticate("google")
    ↓
  Google muestra pantalla de consentimiento
```

### 3. Usuario aprueba permisos

```
Google redirige a:
  http://localhost:3001/auth/google/callback?code=xxx
```

### 4. Backend procesa callback

```
Passport obtiene perfil de Google
  ↓
Busca/crea usuario en PostgreSQL
  ↓
Genera JWT token
  ↓
Redirige a: http://localhost:5173?token=JWT_TOKEN
```

### 5. Frontend captura token

```
AuthContext useEffect detecta token en URL
  ↓
localStorage.setItem("authToken", token)
  ↓
window.history.replaceState(...) // Limpia URL
  ↓
fetch("/auth/me", { Authorization: "Bearer TOKEN" })
  ↓
setUser(userData)
```

### 6. UI se actualiza

```
LoginButton detecta user !== null
  ↓
Muestra avatar + nombre + stats
  ↓
Botón "Cerrar sesión"
```

---

## 🧪 Testing del Frontend

### 1. Verificar que el botón aparece

```
1. Abre http://localhost:5173
2. Deberías ver botón "Iniciar sesión con Google" en el header
3. El botón tiene el logo de Google
```

### 2. Probar flujo de login

```
1. Clic en "Iniciar sesión con Google"
2. Redirige a Google (selecciona cuenta)
3. Aprueba permisos
4. Vuelve a la app con token en URL
5. URL se limpia automáticamente
6. Aparece avatar + nombre en header
```

### 3. Verificar datos guardados

```
1. Abre DevTools → Application → Local Storage
2. Deberías ver: authToken = "eyJ..."
3. Abre DevTools → Network
4. Deberías ver: GET /auth/me con status 200
```

### 4. Probar logout

```
1. Clic en "Cerrar sesión"
2. Avatar desaparece
3. Vuelve a mostrar botón "Iniciar sesión con Google"
4. localStorage.authToken eliminado
```

### 5. Probar persistencia

```
1. Inicia sesión
2. Recarga la página (F5)
3. Deberías seguir autenticado (no pide login otra vez)
4. Esto funciona porque el token está en localStorage
```

---

## 📝 Variables de Entorno Necesarias

### `.env` (Backend)

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
JWT_SECRET=supersecretkey_cambiar_en_produccion
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
NODE_ENV=development
```

### Vite (Frontend - opcional)

```env
VITE_API_URL=http://localhost:3001
```

Si no se define, `AuthContext` usa `http://localhost:3001` por defecto.

---

## ✅ Completado

1. ✅ AuthContext con manejo de token
2. ✅ LoginButton con Google logo
3. ✅ UserProfile con estadísticas detalladas
4. ✅ Integración en App.jsx
5. ✅ Estilos CSS responsive
6. ✅ Flujo completo de OAuth
7. ✅ Persistencia con localStorage
8. ✅ Verificación de token en cada carga

---

## 🔄 Próximos Pasos

### 1. Integrar autenticación con partidas:

- Asociar `userId` con `GamePlayer`
- Actualizar estadísticas al terminar partida
- Permitir reconexión basada en usuario

### 2. Mejorar UX:

- Mostrar perfil completo en modal/página separada
- Animaciones de transición de login
- Feedback visual de errores de autenticación

### 3. Producción:

- Configurar variables en Render
- Actualizar redirect URIs en Google Console para producción
- Configurar dominio real

---

## 🐛 Troubleshooting

### Error: "Unexpected closing header tag"

**Causa:** Problema con estructura de JSX en App.jsx

**Solución:** El código ya está correcto, solo reinicia el servidor

### Error: "useAuth must be used within AuthProvider"

**Causa:** Componente usando useAuth fuera del AuthProvider

**Solución:** Asegúrate de que main.jsx envuelve App con AuthProvider

### Token no se guarda

**Causa:** Redirect URL incorrecta o token no llega

**Solución:**

1. Verifica que FRONTEND_URL en backend sea correcta
2. Revisa Network tab para ver el redirect
3. Verifica que Google Cloud Console tenga el redirect URI correcto

### Avatar no se muestra

**Causa:** Política de referrer de Google

**Solución:** Ya está implementado: `referrerPolicy="no-referrer"`

---

¡Frontend de autenticación completado! 🎉
