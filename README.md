# Jodete Online

Juego de cartas española "Jodete" con soporte en tiempo real para 2 a 6 jugadores. El proyecto incluye un servidor Node/Express con Socket.IO para sincronización y un cliente React con una interfaz moderna que guía a cada jugador por las reglas especiales del mazo.

## 🚀 Características

- Reglas completas del Jodete con mazo de 40 cartas (1-7, 10-12) y acciones especiales:
  - **2**: acumula +2 cartas para el siguiente jugador (encadenable). Solo se puede responder con otro 2.
  - **4**: salta a la siguiente persona.
  - **11**: el jugador repite con el mismo palo u otro 11.
  - **10**: comodín, se puede jugar EN CUALQUIER MOMENTO (excepto cuando hay doses acumulados). Permite elegir nuevo palo.
  - **12**: invierte el sentido de juego (con 2 jugadores actúa como salto).
  - **Robo del mazo**: Si robás una carta y es jugable, podés jugarla inmediatamente en el mismo turno.
  - Penalizaciones automáticas por jugar fuera de turno o no avisar "última carta".
- Símbolos de palos con **compatibilidad universal**: ◯ Oros, ♥ Copas, ♠ Espadas, ♣ Bastos (funcionan en todos los dispositivos desde 1995).
- Lobby compartido con selección de cartas iniciales según cantidad de participantes.
- Historial en vivo de eventos y acciones destacadas.
- Modal para elegir palo al jugar un 10 y controles rápidos para gritar "¡Jodete!".
- Reconexión: si un jugador se desconecta puede volver con el mismo nombre.

## 📦 Requisitos previos

- Node.js 18 o superior.

## 🧩 Instalación

```bash
npm install
```

## ▶️ Desarrollo en caliente

Ejecuta el servidor de sockets y el cliente de Vite de forma simultánea:

```bash
npm run dev:full
```

- Backend: http://localhost:3001 (puerto configurable con `PORT`).
- Frontend: http://localhost:5173 (servido por Vite).
- El cliente detecta automáticamente la URL del servidor (usa `VITE_SOCKET_URL` si necesitás especificar una URL diferente).

## 🏗️ Build de producción

```bash
npm run build
npm run server
```

El servidor de Node servirá los archivos estáticos generados en `dist/` y mantendrá el canal de Socket.IO en el mismo puerto (3001 por defecto).

### Variables de entorno opcionales

- `PORT`: puerto del servidor HTTP/Socket.IO (por defecto `3001`).
- `CLIENT_ORIGINS`: lista separada por comas de orígenes permitidos para CORS (útil si desplegás el cliente en otro dominio).
- `VITE_SOCKET_URL`: URL del socket que usará el cliente (por defecto autodetecta `<host>:3001`).

## 🎮 Cómo jugar

1. Inicia el servidor (`npm run dev:full` o `npm run server`).
2. Comparte tu IP local y el puerto 3001 con el resto de jugadores.
3. Cada jugador abre el navegador y escribe la IP (ej. `http://192.168.0.10:5173` en modo dev o `http://192.168.0.10:3001` en producción).
4. Ingresan su nombre y esperan en el lobby hasta que al menos 2 jugadores estén listos.
5. El anfitrión elige cuántas cartas repartir y pulsa "Comenzar partida".
6. Durante la partida el sistema indica el turno actual, cartas especiales, penalizaciones y permite gritar "¡Jodete!" si alguien olvida anunciar su última carta.

## 🧹 Scripts útiles

- `npm run lint`: ejecuta ESLint sobre el cliente y el servidor.
- `npm run build`: genera el bundle de Vite listo para producción.
- `npm run server`: levanta únicamente el backend (ideal después del build).
- `npm run test:connection [URL]`: prueba la conectividad Socket.IO a un servidor (local o remoto).

### Probar conectividad

Para verificar que tu servidor sea accesible:

```bash
# Servidor local
npm run test:connection http://localhost:3001

# Servidor en producción
npm run test:connection https://tu-app.onrender.com
```

Este script verifica:

- ✅ Conexión Socket.IO exitosa
- ✅ Transporte utilizado (WebSocket/Polling)
- ✅ Listado de salas disponibles
- ✅ Capacidad de crear sala

## 🛠️ Tecnologías

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [Socket.IO](https://socket.io/) para sincronización en tiempo real
- [Express](https://expressjs.com/) para servir la API y la build
- [ESLint](https://eslint.org/) con configuración diferenciada para cliente y servidor

## 🌐 Deploy a producción

### Opción 1: Render.com (recomendado)

1. Creá una cuenta en [Render](https://render.com)
2. Conectá tu repositorio de GitHub/GitLab
3. Render detectará automáticamente el proyecto Node.js
4. Configurá las siguientes opciones:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server/index.js`
   - **Environment**: `PORT` (Render lo asigna automáticamente)
5. Desplegá y accedé mediante la URL pública asignada

### Opción 2: Railway.app

1. Creá una cuenta en [Railway](https://railway.app)
2. Click en "New Project" → "Deploy from GitHub repo"
3. Seleccioná tu repositorio
4. Railway detectará automáticamente la configuración
5. Variables de entorno opcionales en Settings:
   - `PORT` (ya configurado por Railway)
   - `CLIENT_ORIGINS` (si necesitás restringir CORS)

### Opción 3: Servidor propio (VPS/Cloud)

```bash
# Clonar repositorio
git clone tu-repositorio.git
cd jodete-online

# Instalar dependencias
npm install

# Configurar variables de entorno (opcional)
cp .env.example .env
# Editar .env según tus necesidades

# Build y start
npm run build
npm run server
```

Para mantenerlo corriendo permanentemente, usá **PM2**:

```bash
npm install -g pm2
pm2 start server/index.js --name jodete-online
pm2 save
pm2 startup
```

### Configuración HTTPS (Producción)

Para usar HTTPS (recomendado), configurá un reverse proxy con Nginx o usa plataformas que lo proveen automáticamente (Render, Railway).

Ejemplo de configuración Nginx:

```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Próximos pasos sugeridos

- Añadir persistencia de partidas en memoria o base de datos para reinicios del servidor.
- Incorporar chat en vivo o reacciones rápidas entre jugadores.
- Soporte para espectadores sin mano propia.

¡Listo! Ya podés disfrutar de partidas de Jodete en red con tus amistades. 🃏
