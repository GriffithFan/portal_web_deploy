# 🔒 Solución: Persistencia de Usuarios (No se pierden en updates)

## 🚨 Problema Actual

Cada `git pull` sobrescribe `backend/src/tecnicos.json`, eliminando usuarios creados por admin.

---

## ✅ Solución 1: SQLite (RECOMENDADA - Simple y Robusta)

### Por qué SQLite
- ✅ Base de datos en archivo (no requiere servidor)
- ✅ Transacciones ACID (datos seguros)
- ✅ No se sobrescribe con `git pull`
- ✅ Fácil de respaldar (1 archivo)
- ✅ Sin configuración compleja

### Implementación

#### 1. Instalar dependencias
```bash
cd ~/portal-meraki-deploy/backend
npm install better-sqlite3
```

#### 2. Crear archivo de base de datos
```javascript
// backend/src/database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Base de datos en directorio data/ (fuera de src/)
const dbPath = path.join(__dirname, '../../data/usuarios.db');
const db = new Database(dbPath);

// Crear tabla de usuarios
db.exec(`
  CREATE TABLE IF NOT EXISTS tecnicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

// Migrar usuarios existentes de tecnicos.json (solo primera vez)
function migrateFromJSON() {
  const count = db.prepare('SELECT COUNT(*) as count FROM tecnicos').get();
  
  if (count.count === 0) {
    console.log('Migrando usuarios de tecnicos.json...');
    const jsonPath = path.join(__dirname, '../tecnicos.json');
    
    if (require('fs').existsSync(jsonPath)) {
      const oldUsers = require('../tecnicos.json');
      const insert = db.prepare('INSERT INTO tecnicos (username, password) VALUES (?, ?)');
      
      for (const user of oldUsers) {
        try {
          insert.run(user.username, user.password);
          console.log(`✓ Migrado: ${user.username}`);
        } catch (err) {
          console.error(`✗ Error migrando ${user.username}:`, err.message);
        }
      }
      console.log(`✅ ${oldUsers.length} usuarios migrados a SQLite`);
    }
  }
}

// Ejecutar migración
migrateFromJSON();

// ===== FUNCIONES DE USUARIO =====

function getAllTecnicos() {
  return db.prepare('SELECT username, created_at, last_login FROM tecnicos ORDER BY username').all();
}

function getTecnicoByUsername(username) {
  return db.prepare('SELECT * FROM tecnicos WHERE username = ?').get(username);
}

function createTecnico(username, password) {
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  try {
    const insert = db.prepare('INSERT INTO tecnicos (username, password) VALUES (?, ?)');
    const result = insert.run(username, hashedPassword);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return { success: false, error: 'Usuario ya existe' };
    }
    throw err;
  }
}

function deleteTecnico(username) {
  const result = db.prepare('DELETE FROM tecnicos WHERE username = ?').run(username);
  return result.changes > 0;
}

function updateLastLogin(username) {
  db.prepare('UPDATE tecnicos SET last_login = CURRENT_TIMESTAMP WHERE username = ?').run(username);
}

function getTecnicosCount() {
  return db.prepare('SELECT COUNT(*) as count FROM tecnicos').get().count;
}

module.exports = {
  getAllTecnicos,
  getTecnicoByUsername,
  createTecnico,
  deleteTecnico,
  updateLastLogin,
  getTecnicosCount,
  db // Para backups
};
```

#### 3. Modificar auth.js para usar SQLite
```javascript
// backend/src/auth.js
const crypto = require('crypto');
const { getTecnicoByUsername, updateLastLogin } = require('./database/db');

function verificarTecnico(username, password) {
  const user = getTecnicoByUsername(username);
  
  if (!user) {
    return false;
  }
  
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  if (user.password === hashedPassword) {
    // Actualizar último login
    updateLastLogin(username);
    return true;
  }
  
  return false;
}

module.exports = { verificarTecnico };
```

#### 4. Modificar rutas de admin
```javascript
// backend/src/servidor.js (o routes/admin.js si está modularizado)

const { 
  getAllTecnicos, 
  createTecnico, 
  deleteTecnico, 
  getTecnicosCount 
} = require('./database/db');

// GET /api/tecnicos
app.get('/api/tecnicos', requireAdmin, (req, res) => {
  try {
    const tecnicos = getAllTecnicos();
    res.json(tecnicos);
  } catch (error) {
    logger.error('Error obteniendo técnicos:', error);
    res.status(500).json({ error: 'Error obteniendo técnicos' });
  }
});

// POST /api/tecnicos
app.post('/api/tecnicos', requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password requeridos' });
  }
  
  // Límite de 40 técnicos
  const count = getTecnicosCount();
  if (count >= 40) {
    return res.status(400).json({ error: 'Límite de 40 técnicos alcanzado' });
  }
  
  const result = createTecnico(username, password);
  
  if (result.success) {
    logger.logAdmin('create_tecnico', { username, admin: req.adminKey });
    res.json({ success: true, message: 'Técnico creado' });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// DELETE /api/tecnicos/:username
app.delete('/api/tecnicos/:username', requireAdmin, (req, res) => {
  const { username } = req.params;
  
  const deleted = deleteTecnico(username);
  
  if (deleted) {
    logger.logAdmin('delete_tecnico', { username, admin: req.adminKey });
    res.json({ success: true, message: 'Técnico eliminado' });
  } else {
    res.status(404).json({ error: 'Técnico no encontrado' });
  }
});
```

#### 5. Agregar data/ al .gitignore
```bash
# backend/.gitignore
node_modules/
logs/
data/usuarios.db      # ← Base de datos NO se sube a Git
data/usuarios.db-shm  # ← Archivos temporales de SQLite
data/usuarios.db-wal
.env
```

#### 6. Crear directorio data/
```bash
mkdir -p ~/portal-meraki-deploy/backend/data
```

#### 7. Script de backup automático
```javascript
// backend/scripts/backup-usuarios.js
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/usuarios.db');
const backupDir = path.join(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupPath = path.join(backupDir, `usuarios-${timestamp}.db`);

fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup creado: ${backupPath}`);

// Eliminar backups mayores a 30 días
const files = fs.readdirSync(backupDir);
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

files.forEach(file => {
  const filePath = path.join(backupDir, file);
  const stats = fs.statSync(filePath);
  
  if (stats.mtimeMs < thirtyDaysAgo) {
    fs.unlinkSync(filePath);
    console.log(`🗑️ Backup antiguo eliminado: ${file}`);
  }
});
```

```bash
# Cron job para backup diario (en el servidor)
crontab -e

# Agregar línea:
0 3 * * * cd /root/portal-meraki-deploy/backend && node scripts/backup-usuarios.js
```

---

## ✅ Solución 2: Mover tecnicos.json fuera de src/ (Rápida pero menos robusta)

### Implementación

#### 1. Crear directorio data/
```bash
mkdir -p ~/portal-meraki-deploy/backend/data
```

#### 2. Mover tecnicos.json
```bash
# En el servidor
cd ~/portal-meraki-deploy/backend
mv src/tecnicos.json data/tecnicos.json
```

#### 3. Modificar auth.js
```javascript
// backend/src/auth.js
const path = require('path');

// ANTES: const tecnicosPath = path.join(__dirname, 'tecnicos.json');
// DESPUÉS:
const tecnicosPath = path.join(__dirname, '../data/tecnicos.json');

function cargarTecnicos() {
  if (fs.existsSync(tecnicosPath)) {
    return JSON.parse(fs.readFileSync(tecnicosPath, 'utf8'));
  }
  return [];
}

function guardarTecnicos(tecnicos) {
  fs.writeFileSync(tecnicosPath, JSON.stringify(tecnicos, null, 2), 'utf8');
}
```

#### 4. Actualizar .gitignore
```bash
# backend/.gitignore
data/tecnicos.json  # ← No se sube a Git
```

#### 5. Crear tecnicos.json inicial (solo si no existe)
```javascript
// backend/src/servidor.js (al inicio)
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const tecnicosPath = path.join(dataDir, 'tecnicos.json');

// Crear directorio si no existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Crear tecnicos.json inicial si no existe
if (!fs.existsSync(tecnicosPath)) {
  const defaultUsers = [
    { username: "tecnico1@empresa.com", password: "9010e72389a80487d473017425c6ec7951068abed82a4df32459c91f0e45d2ea" },
    { username: "tecnico2@empresa.com", password: "998aab960cd9f809b09dd12eade1de4a2985f62335d8ff45a775a598ead09b06" }
  ];
  fs.writeFileSync(tecnicosPath, JSON.stringify(defaultUsers, null, 2), 'utf8');
  console.log('✅ Archivo data/tecnicos.json creado con usuarios por defecto');
}
```

---

## ✅ Solución 3: Variables de Entorno (Solo para usuarios iniciales)

Para usuarios que nunca deben perderse (admin inicial):

```bash
# backend/.env
ADMIN_USERS=admin@empresa.com:hashedpass1,tech@empresa.com:hashedpass2
```

```javascript
// backend/src/auth.js
function cargarUsuariosIniciales() {
  const adminUsers = process.env.ADMIN_USERS?.split(',') || [];
  
  return adminUsers.map(user => {
    const [username, password] = user.split(':');
    return { username, password };
  });
}
```

---

## 📊 Comparación de Soluciones

| Característica | SQLite | JSON en data/ | Variables Env |
|----------------|--------|---------------|---------------|
| **Persistencia** | ✅✅✅ | ✅✅ | ✅ |
| **No se pierde en git pull** | ✅ | ✅ | ✅ |
| **Transacciones seguras** | ✅ | ❌ | N/A |
| **Concurrencia** | ✅ | ❌ | N/A |
| **Backups fáciles** | ✅ | ✅ | ❌ |
| **Auditoría (created_at)** | ✅ | ❌ | ❌ |
| **Escalabilidad** | ✅✅✅ | ✅ | ❌ |
| **Complejidad** | Media | Baja | Muy baja |

---

## 🚀 Plan de Migración Recomendado

### Fase 1: SQLite (Solución definitiva)
```bash
# Tiempo: 2 horas

1. Instalar better-sqlite3
2. Crear backend/src/database/db.js
3. Migración automática de tecnicos.json
4. Actualizar auth.js y rutas de admin
5. Testing en local
6. Deploy a producción
7. Verificar que usuarios persisten después de git pull
```

### Fase 2: Backups automáticos
```bash
# Tiempo: 30 minutos

1. Crear script de backup
2. Configurar cron job diario
3. Probar restauración desde backup
```

---

## 🧪 Testing

```bash
# En el servidor (después de implementar)

# 1. Crear un usuario nuevo
curl -X POST https://portalmeraki.info/api/tecnicos \
  -H "X-Admin-Key: tu_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"username":"test@test.com","password":"test123"}'

# 2. Hacer git pull (simular actualización)
cd ~/portal-meraki-deploy
git pull origin main
pm2 restart portal-meraki-backend

# 3. Verificar que el usuario sigue existiendo
curl https://portalmeraki.info/api/tecnicos \
  -H "X-Admin-Key: tu_admin_key"

# ✅ Si aparece "test@test.com" → Solución funciona
# ❌ Si no aparece → Datos se perdieron
```

---

## 📝 Checklist de Implementación

- [ ] Elegir solución (SQLite recomendada)
- [ ] Backup manual de tecnicos.json actual
- [ ] Implementar código de base de datos
- [ ] Actualizar auth.js
- [ ] Actualizar rutas de admin
- [ ] Agregar data/ a .gitignore
- [ ] Testing en local
- [ ] Deploy a producción
- [ ] Verificar migración de usuarios
- [ ] Probar crear/eliminar usuarios
- [ ] Hacer git pull y verificar persistencia
- [ ] Configurar backups automáticos

---

## 🆘 Recuperación de Datos Perdidos

Si ya perdiste usuarios, puedes recuperarlos de:

1. **Logs de Winston** (si guardaste creación de usuarios)
```bash
grep "create_tecnico" ~/portal-meraki-deploy/backend/logs/admin-*.log
```

2. **Backup manual** (si lo hiciste antes)
```bash
# Buscar en backups
find / -name "tecnicos.json" -type f 2>/dev/null
```

3. **Git history** (si commiteaste accidentalmente)
```bash
git log --all --full-history -- "**/tecnicos.json"
git show <commit_hash>:backend/src/tecnicos.json
```

---

## ✅ Mejor Práctica Final

**SQLite + Backups diarios + Git ignore**

Esto garantiza:
- ✅ Usuarios nunca se pierden en updates
- ✅ Base de datos transaccional segura
- ✅ Backups automáticos para disaster recovery
- ✅ Auditoría de creación y último login
- ✅ Escalable a 1000+ usuarios sin problemas
