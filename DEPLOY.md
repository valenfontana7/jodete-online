# Jodete Online - Deploy Checklist

## ✅ Pre-Deploy

- [ ] Ejecutar `npm run lint` y corregir errores
- [ ] Probar `npm run build` localmente
- [ ] Verificar que `npm run server` sirva correctamente los archivos de `dist/`
- [ ] Confirmar que Socket.IO funcione en modo producción (mismo puerto)

## 🚀 Deploy Options

### Render.com
- Build: `npm install && npm run build`
- Start: `node server/index.js`
- Port: Auto-detectado por Render
- WebSocket: Soportado nativamente

### Railway.app
- Autodetección de Node.js
- Build/Start automático desde `package.json`
- Variables de entorno opcionales en dashboard

### VPS/Cloud Server
```bash
npm install
npm run build
pm2 start server/index.js --name jodete-online
pm2 save
pm2 startup
```

## 🔧 Variables de Entorno

- `PORT`: Puerto del servidor (default: 3001)
- `CLIENT_ORIGINS`: CORS origins separados por coma (opcional)
- `VITE_SOCKET_URL`: URL del socket para el cliente (opcional, autodetecta)

## 📋 Post-Deploy

- [ ] Verificar que la URL pública cargue la aplicación
- [ ] Probar crear sala y unirse desde múltiples dispositivos
- [ ] Confirmar que Socket.IO sincronice correctamente
- [ ] Validar que las reconexiones funcionen
- [ ] Probar flujo completo de una partida

## 🐛 Troubleshooting

**Socket no conecta:**
- Verificar que el puerto esté expuesto correctamente
- Confirmar CORS si cliente y servidor están en dominios distintos
- Revisar que la plataforma soporte WebSockets (no todos los proxies lo permiten)

**Build falla:**
- Asegurar Node.js 18+
- Verificar que todas las dependencias estén en `dependencies` (no solo `devDependencies`)
- Revisar logs de build en la plataforma

**Cartas no se muestran:**
- Limpiar caché del navegador
- Verificar que `dist/` contenga todos los assets después del build
- Confirmar que Express esté sirviendo correctamente archivos estáticos
