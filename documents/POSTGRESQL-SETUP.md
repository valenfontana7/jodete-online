# 🗄️ Configuración de PostgreSQL - Guía Rápida

## 📦 Instalación Local

### Windows

**Opción 1: Instalador oficial**

1. Descargar desde [postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Ejecutar instalador
3. Durante instalación, recordar la contraseña de `postgres`
4. Usar puerto por defecto: `5432`

**Opción 2: Docker (recomendado)**

```bash
docker run --name postgres-jodete -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### macOS

```bash
brew install postgresql@14
brew services start postgresql@14
```

### Linux

```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## 🔧 Configuración Inicial

### 1. Crear Base de Datos

**Usando psql:**

```bash
# Conectar como superusuario
psql -U postgres

# Crear base de datos
CREATE DATABASE jodete_online;

# Salir
\q
```

**Usando pgAdmin (GUI):**

1. Abrir pgAdmin
2. Right-click en "Databases" → "Create" → "Database"
3. Nombre: `jodete_online`
4. Save

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# PostgreSQL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jodete_online
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
```

**O usar URL completa:**

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/jodete_online
```

---

## ✅ Probar Conexión

```bash
npm run server
```

Deberías ver:

```
✅ Conexión a PostgreSQL establecida correctamente
✅ Modelos sincronizados con la base de datos
🚀 Servidor corriendo en puerto 3001
   Modo: development
   Base de datos: Conectada ✅
```

---

## 🌐 Base de Datos en Producción (Gratis)

### Opción 1: Neon (Recomendado)

1. Ir a [neon.tech](https://neon.tech/)
2. Sign up (GitHub/Google)
3. Crear nuevo proyecto
4. Copiar connection string
5. Agregar en Render:
   ```
   DATABASE_URL=postgresql://usuario:password@ep-xxx.neon.tech/jodete_online
   ```

**Tier Gratis:**

- 3 GB almacenamiento
- Sin límite de queries
- Auto-suspend después de 5 min inactividad

### Opción 2: Supabase

1. Ir a [supabase.com](https://supabase.com/)
2. New Project
3. Settings → Database → Connection String
4. Modo: Transaction (mejor para Sequelize)

**Tier Gratis:**

- 500 MB almacenamiento
- Hasta 500 MB transferencia mensual

### Opción 3: Railway

1. [railway.app](https://railway.app/)
2. New Project → Provision PostgreSQL
3. Copiar connection string

**Tier Gratis:**

- $5 de crédito mensual
- ~500 horas/mes

---

## 🔍 Comandos Útiles

### Verificar que PostgreSQL está corriendo

**Windows:**

```bash
# CMD/PowerShell
Get-Service postgresql*

# O con Docker
docker ps | findstr postgres
```

**macOS/Linux:**

```bash
pg_isready
# O
brew services list | grep postgresql
```

### Conectar a la base de datos

```bash
psql -U postgres -d jodete_online
```

### Ver tablas creadas

```sql
\dt
```

Deberías ver:

```
Schema |     Name       | Type  |  Owner
--------+----------------+-------+----------
public | games          | table | postgres
public | game_actions   | table | postgres
public | game_players   | table | postgres
public | users          | table | postgres
```

### Ver estructura de una tabla

```sql
\d users
```

---

## 🐛 Troubleshooting

### Error: "password authentication failed"

```bash
# Editar pg_hba.conf y cambiar método de autenticación
# Ubicación común:
# Windows: C:\Program Files\PostgreSQL\14\data\pg_hba.conf
# macOS: /usr/local/var/postgresql@14/pg_hba.conf
# Linux: /etc/postgresql/14/main/pg_hba.conf

# Cambiar esta línea:
# local   all   all   peer
# Por:
# local   all   all   md5

# Reiniciar PostgreSQL
```

### Error: "no se pudo conectar al servidor"

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql  # Linux
brew services list                # macOS
Get-Service postgresql*           # Windows

# Iniciar si está detenido
sudo systemctl start postgresql   # Linux
brew services start postgresql    # macOS
```

### Error: "database does not exist"

```bash
psql -U postgres
CREATE DATABASE jodete_online;
\q
```

---

## 📚 Recursos Adicionales

- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [Sequelize Docs](https://sequelize.org/docs/v6/)
- [Neon Docs](https://neon.tech/docs/introduction)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)

---

## 🚀 Siguiente Paso

Una vez configurada la base de datos, continuar con:

1. Actualizar `Game` class para persistencia
2. Probar guardado de partidas
3. Implementar recuperación al reiniciar servidor
