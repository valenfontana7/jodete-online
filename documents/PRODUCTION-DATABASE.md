# 🚀 Base de Datos PostgreSQL en Producción

## 📋 Opciones para PostgreSQL en Producción

### Opción 1: Render PostgreSQL (Recomendado) ⭐

**Ventajas:**

- ✅ Integración nativa con Render.com
- ✅ Misma plataforma para todo
- ✅ Backups automáticos diarios
- ✅ SSL habilitado por defecto
- ✅ Fácil configuración

**Desventajas:**

- ❌ Tier gratuito: Solo 90 días (luego $7/mes)
- ❌ 1 GB de almacenamiento en tier gratuito

**Precio:**

- **Gratis**: 90 días de prueba, 1 GB, backups 7 días
- **$7/mes**: 1 GB, backups 90 días
- **$20/mes**: 10 GB, backups 90 días

**Cómo configurar:**

1. **En Render Dashboard:**

   - New → PostgreSQL
   - Name: `jodete-online-db`
   - Database: `jodete_online`
   - User: `jodete_user`
   - Region: Oregon (mismo que tu web service)

2. **Copiar la Internal Database URL:**

   ```
   postgresql://usuario:password@dpg-xxxxx:5432/jodete_online
   ```

3. **En tu Web Service → Environment:**

   ```
   DATABASE_URL = (pegar la Internal Database URL)
   ```

4. **Deploy automático** se activará con la nueva variable

---

### Opción 2: Neon (Serverless PostgreSQL) 🌟

**Ventajas:**

- ✅ **COMPLETAMENTE GRATIS** (tier generoso)
- ✅ 3 GB de almacenamiento
- ✅ Branches de base de datos (como git!)
- ✅ Auto-suspend (ahorra recursos)
- ✅ Excelente para desarrollo y producción pequeña

**Desventajas:**

- ⚠️ Auto-suspend después de 5 min inactividad (en tier gratis)
- ⚠️ Primera query después de suspend puede tardar ~1s

**Precio:**

- **GRATIS**: 3 GB, 1 proyecto, auto-suspend
- **$19/mes**: Sin auto-suspend, 10 GB, más proyectos

**Cómo configurar:**

1. **Ir a [neon.tech](https://neon.tech/)**

2. **Sign up con GitHub**

3. **Create Project:**

   - Name: `jodete-online`
   - Region: US East (cercano a Render Oregon)
   - PostgreSQL Version: 16

4. **Copiar Connection String:**

   ```
   postgresql://usuario:password@ep-xxx-123.us-east-2.aws.neon.tech/jodete_online?sslmode=require
   ```

5. **En Render → Environment Variables:**
   ```
   DATABASE_URL = (pegar connection string de Neon)
   ```

---

### Opción 3: Supabase 🔥

**Ventajas:**

- ✅ Gratis hasta 500 MB
- ✅ No se suspende automáticamente
- ✅ Incluye APIs REST automáticas
- ✅ Realtime subscriptions
- ✅ Dashboard visual excelente

**Desventajas:**

- ⚠️ Solo 500 MB en tier gratis
- ⚠️ Límite de 500 MB transferencia mensual

**Precio:**

- **GRATIS**: 500 MB storage, 2 GB transferencia
- **$25/mes**: 8 GB storage, 50 GB transferencia

**Cómo configurar:**

1. **Ir a [supabase.com](https://supabase.com/)**

2. **New Project:**

   - Organization: Personal
   - Name: `jodete-online`
   - Password: (generar fuerte)
   - Region: East US

3. **Settings → Database → Connection String:**

   - Mode: **Transaction** (importante para Sequelize)
   - Copiar URI

4. **En Render:**
   ```
   DATABASE_URL = (pegar connection string)
   ```

---

### Opción 4: Railway ⚡

**Ventajas:**

- ✅ $5 de crédito mensual gratis
- ✅ Sin auto-suspend
- ✅ Muy fácil de usar
- ✅ Métricas en tiempo real

**Desventajas:**

- ⚠️ Crédito limitado (se acaba rápido si hay tráfico)
- ⚠️ No permanentemente gratis

**Precio:**

- **$5 gratis/mes**: ~500 horas
- **$10/mes**: Uso adicional

---

## 🎯 Recomendación Final

### Para tu caso (Jodete Online):

**Recomiendo: Neon** 🌟

**¿Por qué?**

1. ✅ **Completamente gratis** con 3 GB (suficiente para miles de partidas)
2. ✅ Auto-suspend no es problema (la primera query reconecta rápido)
3. ✅ Fácil setup con Render
4. ✅ Branches de DB útiles para testing
5. ✅ Sin límite de tiempo (a diferencia de Render)

**Plan B:** Si Neon no funciona → Render PostgreSQL (primeros 90 días gratis)

---

## 📝 Configuración Paso a Paso (Neon + Render)

### Paso 1: Crear Base de Datos en Neon

```bash
# 1. Ir a https://neon.tech/
# 2. Sign up with GitHub
# 3. Create Project:
#    - Name: jodete-online
#    - Region: US East
#    - Confirm
```

### Paso 2: Obtener Connection String

En el dashboard de Neon:

```
Database → Connection String → Copy
```

Ejemplo:

```
postgresql://valenfontana7:AbC123xyz@ep-cool-wave-123456.us-east-2.aws.neon.tech/jodete_online?sslmode=require
```

### Paso 3: Configurar en Render

1. **Ir a tu Web Service en Render**

2. **Environment → Add Environment Variable:**

   ```
   Key: DATABASE_URL
   Value: postgresql://usuario:pass@ep-xxx.neon.tech/jodete_online?sslmode=require
   ```

3. **Save Changes** → Deploy automático

### Paso 4: Verificar Conexión

Después del deploy, verifica los logs en Render:

```
✅ Conexión a PostgreSQL establecida correctamente
✅ Modelos sincronizados con la base de datos
📥 Cargando partidas activas desde base de datos...
   No hay partidas activas para cargar
✅ Carga de partidas completada
🔄 Limpieza periódica de partidas activada (cada 24h)
🚀 Servidor corriendo en puerto 10000
```

---

## ⚙️ Configuración de Sequelize para Producción

Tu código actual ya está preparado! En `server/db/config.js`:

```javascript
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "production" ? false : console.log,
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
    // ... resto de config
  });
}
```

✅ SSL ya está configurado
✅ Logging desactivado en producción
✅ Pool de conexiones optimizado

---

## 🔐 Seguridad y Mejores Prácticas

### 1. Variables de Entorno en Render

```bash
# Nunca commitees estas en git!
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=tu_secreto_generado_aleatoriamente
SESSION_SECRET=otro_secreto_diferente
```

### 2. Generar Secretos Seguros

```bash
# En tu terminal local:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Migraciones en Producción

Por ahora usas `sync()`, pero para producción eventualmente considera:

```javascript
// En db/index.js - para producción futura
if (process.env.NODE_ENV === "production") {
  // NO usar sync en producción
  await sequelize.authenticate();
} else {
  await sequelize.sync({ alter: true });
}
```

---

## 📊 Monitoreo y Mantenimiento

### Ver Base de Datos (Neon)

1. **Dashboard de Neon → SQL Editor**
2. **Ejecutar queries:**

```sql
-- Ver todas las partidas
SELECT id, "roomId", phase, "startedAt", "finishedAt"
FROM games
ORDER BY "createdAt" DESC
LIMIT 10;

-- Ver estadísticas
SELECT
  phase,
  COUNT(*) as count
FROM games
GROUP BY phase;

-- Ver espacio usado
SELECT pg_size_pretty(pg_database_size('jodete_online'));
```

### Backups

**Neon:**

- Backups automáticos incluidos
- Restore desde dashboard

**Render:**

- Backups diarios automáticos
- Restore con 1 click

---

## 🧪 Testing antes de Deploy

### 1. Test Local con Neon

Puedes probar la conexión localmente antes de deployar:

```bash
# En .env local
DATABASE_URL=postgresql://...neon.tech/jodete_online?sslmode=require

# Correr servidor
npm run dev:full

# Deberías ver:
# ✅ Conexión a PostgreSQL establecida correctamente
```

### 2. Test en Producción

Después del deploy:

1. Crear una partida
2. Jugar algunos turnos
3. Ir a Neon Dashboard → Tables → `games`
4. Deberías ver el registro de la partida

---

## 💰 Comparación de Costos

| Proveedor    | Gratis  | Storage   | Límite de Tiempo      | Backups |
| ------------ | ------- | --------- | --------------------- | ------- |
| **Neon**     | ✅      | 3 GB      | Ilimitado             | 7 días  |
| **Render**   | 90 días | 1 GB      | 90 días gratis        | 7 días  |
| **Supabase** | ✅      | 500 MB    | Ilimitado             | Manual  |
| **Railway**  | $5/mes  | Según uso | Mientras haya crédito | Sí      |

**Para Jodete Online:**

- Partidas promedio: ~5 KB cada una
- 3 GB = ~600,000 partidas
- Historial: ~1 KB por acción
- **Neon gratis es más que suficiente** 🎉

---

## 🚀 Siguiente Paso

Una vez que elijas tu proveedor:

1. ✅ Crear base de datos
2. ✅ Copiar `DATABASE_URL`
3. ✅ Agregar en Render Environment
4. ✅ Deploy automático
5. ✅ Verificar logs de conexión
6. 🎮 ¡Jugar y ver las partidas guardadas!

---

## 📞 Ayuda

**Si algo no funciona:**

1. Verificar logs en Render
2. Verificar que `DATABASE_URL` esté correcto
3. Verificar que SSL esté habilitado
4. Probar conexión localmente primero

**Errores comunes:**

- `ECONNREFUSED`: URL incorrecta o base de datos no creada
- `SSL error`: Agregar `?sslmode=require` al final de URL
- `password authentication failed`: Contraseña incorrecta en URL

---

¿Quieres que te ayude a configurarlo con alguna de estas opciones? 🚀
