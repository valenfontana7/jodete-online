# 🔧 Solución: Tablas no existen en Producción

## ❌ Error Actual
```
Error guardando partida: relation "games" does not exist
```

**Causa:** Las tablas de PostgreSQL no se crearon en la base de datos de producción en Render.

---

## ✅ Solución Implementada

He modificado `server/db/index.js` para que en producción también cree las tablas con `sync()` (pero sin `alter: true` para evitar modificaciones automáticas).

### Cambios realizados:

```javascript
// ANTES (no creaba tablas en producción):
if (process.env.NODE_ENV !== "production") {
  await sequelize.sync({ alter: true });
}

// AHORA (crea tablas en producción):
if (isProduction) {
  await sequelize.sync({ alter: false }); // Solo crear, no modificar
} else {
  await sequelize.sync({ alter: true }); // Desarrollo: modificar libremente
}
```

---

## 🚀 Pasos para Desplegar la Solución

### 1️⃣ Hacer commit y push

```bash
git add .
git commit -m "fix: habilitar sync de modelos en producción para crear tablas"
git push origin main
```

### 2️⃣ Verificar el Deploy en Render

1. Ve a **Render Dashboard → Tu Web Service**
2. Espera a que termine el deploy (~2-3 minutos)
3. **Revisa los logs** (debería aparecer):
   ```
   ✅ Conexión a PostgreSQL establecida correctamente
   ✅ Modelos sincronizados con la base de datos (producción)
   ```

### 3️⃣ Verificar las Tablas

Puedes verificar que las tablas se crearon:

1. **En Render → PostgreSQL → Connect → PSQL Command**
2. Copia el comando y ejecútalo en tu terminal:
   ```bash
   PGPASSWORD=xxx psql -h dpg-xxx.render.com -U jodete_user jodete_online_xxx
   ```

3. **Listar tablas:**
   ```sql
   \dt
   ```
   
   Deberías ver:
   ```
   public | game_actions  | table | jodete_user
   public | game_players  | table | jodete_user
   public | games         | table | jodete_user
   public | users         | table | jodete_user
   ```

4. **Ver estructura de una tabla:**
   ```sql
   \d games
   ```

5. **Salir:**
   ```sql
   \q
   ```

---

## 🔄 Opción Alternativa: Script Manual

Si prefieres inicializar la base de datos manualmente (útil para desarrollo o migraciones futuras):

### Localmente:

```bash
# Usar tu DATABASE_URL de Render (External URL)
npm run db:init
```

### Desde Render Shell:

1. **Render Dashboard → Web Service → Shell**
2. Ejecutar:
   ```bash
   node scripts/init-db.js
   ```

---

## 🧪 Verificar que Funciona

Después del deploy:

1. **Crea una partida** en tu app en producción
2. **Los logs de Render** deberían mostrar:
   ```
   Executing (default): INSERT INTO "games" (...)
   Executing (default): INSERT INTO "game_players" (...)
   ```
   
3. **Sin errores** de "relation does not exist"

---

## ⚠️ Importante para el Futuro

### Desarrollo vs Producción

| Entorno | Comportamiento |
|---------|----------------|
| **Desarrollo** (`NODE_ENV !== production`) | `sync({ alter: true })` - Modifica tablas automáticamente |
| **Producción** (`NODE_ENV === production`) | `sync({ alter: false })` - Solo crea tablas nuevas, no las modifica |

### Migraciones (Próximo paso recomendado)

Para cambios futuros en la estructura de la base de datos, es mejor usar **Sequelize Migrations**:

```bash
# Instalar CLI de Sequelize
npm install --save-dev sequelize-cli

# Crear migración
npx sequelize-cli migration:generate --name add-new-field

# Ejecutar migraciones
npx sequelize-cli db:migrate
```

Pero por ahora, `sync()` es suficiente para tu proyecto.

---

## 🐛 Si el Problema Persiste

### 1. Verificar variables de entorno en Render

**Environment Variables que deben estar:**
```
DATABASE_URL = postgresql://jodete_user:PASS@dpg-xxx-a/jodete_online_xxx
NODE_ENV = production
```

### 2. Forzar recreación de tablas (⚠️ BORRA DATOS)

Si necesitas empezar de cero:

**En Render Shell:**
```bash
# Conectar a PSQL
psql $DATABASE_URL

# Eliminar todas las tablas
DROP TABLE IF EXISTS game_actions CASCADE;
DROP TABLE IF EXISTS game_players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

# Salir
\q

# Reiniciar el servicio (Render lo hará automáticamente o manualmente desde Dashboard)
```

Después del reinicio, las tablas se crearán automáticamente.

### 3. Verificar logs detallados

En **Render → Logs**, busca:

✅ **Éxito:**
```
✅ Conexión a PostgreSQL establecida correctamente
✅ Modelos sincronizados con la base de datos (producción)
```

❌ **Error:**
```
❌ Error conectando a PostgreSQL: [detalles]
```

---

## 📋 Checklist de Solución

- [ ] Commit y push de cambios
- [ ] Deploy completado en Render
- [ ] Logs muestran "Modelos sincronizados"
- [ ] Verificar tablas con `\dt` en PSQL
- [ ] Crear partida de prueba
- [ ] Sin errores "relation does not exist"
- [ ] Partida se guarda correctamente

---

## 🎉 Resultado Esperado

Después de estos pasos:

1. ✅ Tablas creadas en PostgreSQL de Render
2. ✅ Partidas se guardan correctamente
3. ✅ Acciones se registran en `game_actions`
4. ✅ Sin errores en logs de producción

---

¿Necesitas ayuda con alguno de estos pasos? 🚀
