# 🚀 Configuración de Render PostgreSQL

## 🔑 Paso 1: Obtener las URLs correctas de la Base de Datos

En Render tienes **DOS URLs diferentes**:

### 1️⃣ **Internal Database URL** (Solo para servicios dentro de Render)

```
postgresql://...@dpg-xxxxx-a/database_name
                          ↑ termina en -a
```

- ❌ **NO funciona** desde tu máquina local
- ✅ Solo para Web Services dentro de Render

### 2️⃣ **External Database URL** (Para conexiones externas)

```
postgresql://...@dpg-xxxxx-a.oregon-postgres.render.com/database_name
                          ↑ tiene el dominio completo
```

- ✅ Funciona desde cualquier lugar (local, producción, etc.)
- ✅ Esta es la que necesitas

---

## 📋 Cómo obtener la External Database URL

1. **Ve a tu Dashboard de Render:** https://dashboard.render.com/

2. **Selecciona tu PostgreSQL database** (jodete_online_0ltl o similar)

3. **En la página de la base de datos, busca:**

   - **External Database URL** (no la Internal)
   - Se ve algo así:
     ```
     postgresql://jodete_user:4BwNR1NZDL4ITUSo0m0rYxis0tAdMyeq@dpg-d3q2qac9c44c73cf3eg0-a.oregon-postgres.render.com:5432/jodete_online_0ltl
     ```

4. **Copia esa URL completa** (clic en el icono de copiar)

---

## ⚙️ Paso 2: Configurar Variables de Entorno

### Para desarrollo local (.env):

**Opción A: Conectar a Render desde local** (para probar)

```env
# Comentar las variables locales
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=jodete_online
# DB_USER=postgres
# DB_PASSWORD=255655

# Usar la External Database URL de Render
DATABASE_URL=postgresql://jodete_user:PASS@dpg-XXXXX.oregon-postgres.render.com:5432/jodete_online_0ltl
```

**Opción B: Usar PostgreSQL local** (desarrollo normal)

```env
# PostgreSQL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jodete_online
DB_USER=postgres
DB_PASSWORD=255655

# Comentar DATABASE_URL para usar local
# DATABASE_URL=postgresql://...
```

### Para producción (Render Web Service):

1. **Ve a tu Web Service en Render**
2. **Environment → Add Environment Variable**
3. **Agregar:**

   ```
   Key: DATABASE_URL
   Value: [Pegar la INTERNAL Database URL aquí]
          ↓
          postgresql://...@dpg-xxxxx-a/database_name
   ```

   ⚠️ **IMPORTANTE:**

   - Para el **Web Service en Render**, usa la **Internal URL** (más rápida)
   - Para **desarrollo local**, usa la **External URL**

4. **Agregar también:**

   ```
   Key: NODE_ENV
   Value: production
   ```

5. **Save Changes** → Render hará auto-deploy

---

## 🧪 Paso 3: Probar la Conexión

### Desde local (con External URL):

1. **Actualiza tu `.env`** con la External URL

2. **Reinicia el servidor:**

   ```bash
   npm run server
   ```

3. **Deberías ver:**
   ```
   ✅ Conexión a PostgreSQL establecida correctamente
   ✅ Modelos sincronizados con la base de datos
   📥 Cargando partidas activas desde base de datos...
      No hay partidas activas para cargar
   ✅ Carga de partidas completada
   🔄 Limpieza periódica de partidas activada (cada 24h)
   🚀 Servidor corriendo en puerto 3001
   ```

### En producción (Render):

1. **Push tus cambios a GitHub:**

   ```bash
   git add .
   git commit -m "feat: configurar persistencia PostgreSQL en producción"
   git push
   ```

2. **Render auto-deployará**

3. **Verifica los logs en Render:**
   - Dashboard → Tu Web Service → Logs
   - Deberías ver los mismos mensajes de conexión exitosa

---

## 🔍 Verificar que funciona

### 1. Crear una partida de prueba

Ve a tu app en producción (o local) y crea una partida

### 2. Ver en la base de datos

En **Render → PostgreSQL → Connect → PSQL Command**

Copia el comando que aparece, algo como:

```bash
PGPASSWORD=xxx psql -h dpg-xxx.oregon-postgres.render.com -U jodete_user jodete_online_0ltl
```

Pégalo en tu terminal y ejecuta:

```sql
-- Ver las partidas
SELECT id, "roomId", phase, "startedAt", "createdAt"
FROM games
ORDER BY "createdAt" DESC
LIMIT 5;

-- Ver los jugadores
SELECT gp.id, gp."gameId", gp."userId", gp.position, gp.connected
FROM game_players gp
ORDER BY gp."createdAt" DESC
LIMIT 5;

-- Ver las acciones
SELECT ga.id, ga."gameId", ga."actionType", ga.description, ga."turnNumber"
FROM game_actions ga
ORDER BY ga."createdAt" DESC
LIMIT 10;
```

---

## ⚠️ Errores Comunes

### Error: `ENOTFOUND dpg-xxxxx-a`

- **Causa:** Estás usando la Internal URL desde local
- **Solución:** Usa la External URL (con `.oregon-postgres.render.com`)

### Error: `EADDRINUSE: address already in use`

- **Causa:** Ya hay un servidor corriendo en el puerto 3001
- **Solución:**
  ```bash
  # En Windows (Git Bash):
  netstat -ano | grep 3001
  taskkill /PID <número> /F
  ```

### Error: `password authentication failed`

- **Causa:** Contraseña incorrecta en la URL
- **Solución:** Copia nuevamente la URL completa desde Render

### Error: `SSL connection required`

- **Causa:** Render requiere SSL
- **Solución:** Tu `config.js` ya lo maneja, pero verifica que tenga:
  ```javascript
  dialectOptions: {
    ssl: isProduction ? { require: true, rejectUnauthorized: false } : false;
  }
  ```

---

## 📊 Diferencias Internal vs External URL

| Característica | Internal URL               | External URL                           |
| -------------- | -------------------------- | -------------------------------------- |
| **Formato**    | `dpg-xxx-a`                | `dpg-xxx-a.oregon-postgres.render.com` |
| **Uso**        | Servicios dentro de Render | Desde cualquier lugar                  |
| **Velocidad**  | Más rápida                 | Ligeramente más lenta                  |
| **Local**      | ❌ No funciona             | ✅ Funciona                            |
| **Producción** | ✅ Recomendada             | ✅ También funciona                    |

---

## ✅ Checklist Final

- [ ] Obtener External Database URL de Render
- [ ] Actualizar `.env` local con External URL (para probar)
- [ ] Probar conexión local ejecutando `npm run server`
- [ ] Configurar DATABASE_URL en Render Web Service (Internal URL)
- [ ] Configurar NODE_ENV=production en Render
- [ ] Push a GitHub para trigger deploy
- [ ] Verificar logs de Render
- [ ] Crear una partida de prueba
- [ ] Verificar datos en la base de datos con PSQL
- [ ] ¡Listo! 🎉

---

## 🎯 Siguiente Paso

Una vez que veas:

```
✅ Conexión a PostgreSQL establecida correctamente
```

Tanto en local como en Render, estarás listo para:

1. Probar partidas completas con persistencia
2. Implementar Google OAuth
3. Añadir estadísticas de usuarios

---

¿Necesitas ayuda con alguno de estos pasos? 🚀
