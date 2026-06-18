# 📋 Sistema de Gerenciamento de Demandas

Sistema Kanban completo para gestão de tarefas internas, com controle de acesso por perfil (admin/usuário) e fluxo de aprovação de conclusões.

---

## 🏗️ Estrutura do Projeto

```
demandas/
├── backend/              # API Node.js + Express
│   ├── src/
│   │   ├── index.js      # Servidor principal
│   │   ├── routes/
│   │   │   ├── auth.js   # Login e autenticação
│   │   │   ├── users.js  # Gerenciamento de usuários
│   │   │   └── tasks.js  # Tarefas, comentários, aprovações
│   │   ├── middleware/
│   │   │   └── auth.js   # Verificação de token JWT
│   │   └── db/
│   │       ├── init.js   # Criação e seed do banco
│   │       └── connection.js
│   ├── demandas.db       # Arquivo SQLite (gerado automaticamente)
│   └── package.json
│
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── BoardPage.jsx   # Quadro Kanban principal
│   │   │   └── UsersPage.jsx   # Gestão de usuários (admin)
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   ├── TaskForm.jsx    # Modal criar/editar tarefa
│   │   │   └── TaskDetail.jsx  # Modal detalhes + comentários
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── api.js        # Instância do Axios
│   │   └── utils.js      # Helpers de status, prioridade, datas
│   └── package.json
│
└── README.md
```

---

## 🚀 Como Instalar e Rodar

### Pré-requisitos
- **Node.js** versão 18 ou superior → [nodejs.org](https://nodejs.org)
- **VS Code** (recomendado)

Para verificar se o Node está instalado:
```bash
node -v   # deve mostrar v18.x.x ou superior
npm -v    # deve mostrar 9.x.x ou superior
```

---

### Passo 1 — Instalar dependências do Backend

Abra o terminal no VS Code (`Ctrl+` ` `) e execute:

```bash
cd backend
npm install
```

### Passo 2 — Inicializar o banco de dados

```bash
npm run init-db
```

Isso vai criar o arquivo `demandas.db` com as tabelas e os usuários iniciais:

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@empresa.com | admin123 | Administrador |
| selma@empresa.com | senha123 | Usuário |
| carlos@empresa.com | senha123 | Usuário |
| sofia@empresa.com | senha123 | Usuário |
| nuno@empresa.com | senha123 | Usuário |
| clara@empresa.com | senha123 | Usuário |

### Passo 3 — Iniciar o Backend

```bash
npm run dev
```

O servidor vai rodar em: `http://localhost:3001`

---

### Passo 4 — Instalar dependências do Frontend

Abra um **segundo terminal** no VS Code e execute:

```bash
cd frontend
npm install
```

### Passo 5 — Iniciar o Frontend

```bash
npm run dev
```

O app vai abrir em: `http://localhost:5173`

---

## 🌐 Rodando os dois ao mesmo tempo

Recomendamos usar dois terminais no VS Code lado a lado:

**Terminal 1 (Backend):**
```bash
cd backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

Abra `http://localhost:5173` no navegador.

---

## 🗃️ Banco de Dados (SQLite)

O banco de dados é um único arquivo: `backend/demandas.db`

**Não é necessário instalar nenhum servidor de banco de dados.**

### Visualizar o banco de dados

Para inspecionar o banco durante o desenvolvimento, recomendamos instalar a extensão **SQLite Viewer** no VS Code:
1. Vá em Extensões (`Ctrl+Shift+X`)
2. Busque por "SQLite Viewer" (autor: Florian Klampfer)
3. Instale e abra o arquivo `demandas.db`

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `tasks` | Tarefas / demandas |
| `comments` | Comentários e histórico das tarefas |

---

## 👥 Gerenciamento de Usuários

### Criar novos usuários (via sistema)

1. Faça login como **admin**
2. Clique em **Usuários** no menu
3. Clique em **+ Novo usuário**
4. Preencha nome, email, senha e perfil

### Criar usuário administrador

No formulário de criação, selecione o perfil **"Administrador"** no campo Perfil.

### Criar usuário via terminal (alternativa)

```bash
cd backend
node -e "
const db = require('./src/db/connection').getDB();
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('NOVA_SENHA', 10);
db.prepare('INSERT INTO users (name, email, password, initials, role, color) VALUES (?,?,?,?,?,?)').run('Nome Completo', 'email@empresa.com', hash, 'NC', 'user', '#7c3aed');
console.log('Usuário criado!');
"
```

### Redefinir senha de um usuário (via terminal)

```bash
cd backend
node -e "
const db = require('./src/db/connection').getDB();
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('NOVA_SENHA', 10);
db.prepare('UPDATE users SET password=? WHERE email=?').run(hash, 'email@usuario.com');
console.log('Senha redefinida!');
"
```

---

## 🔄 Fluxo das Tarefas

```
[Pendente] ──► [Em andamento] ──► [Aguardando retorno]
                    │
                    ▼
            [Aguardando aceite]  ◄── usuário marca como "concluída"
                    │
          ┌─────────┴─────────┐
          ▼ (admin aprova)    ▼ (admin recusa)
       [Concluída]      [Em andamento] ou [Pendente]
                           + motivo da recusa

Qualquer status ──► [Cancelada]  (somente admin)
```

### Regras por perfil

| Ação | Usuário | Admin |
|------|---------|-------|
| Ver tarefas | Próprias | Todas |
| Criar tarefa | ✅ (para si) | ✅ (para qualquer um) |
| Editar tarefa | Próprias | Todas |
| Excluir tarefa | ❌ | ✅ |
| Cancelar tarefa | ❌ | ✅ |
| Aprovar/recusar conclusão | ❌ | ✅ |
| Gerenciar usuários | ❌ | ✅ |
| Ver quadro completo | ❌ | ✅ |

---

## ⚙️ Configurações Avançadas

### Alterar a porta do backend

Edite `backend/src/index.js`:
```js
const PORT = process.env.PORT || 3001; // mude 3001 para outra porta
```

E atualize o proxy em `frontend/vite.config.js`:
```js
proxy: {
  '/api': { target: 'http://localhost:3001' } // mesma porta
}
```

### Alterar o segredo JWT

Edite `backend/src/middleware/auth.js`:
```js
const JWT_SECRET = 'coloque_uma_chave_secreta_forte_aqui';
```

### Adicionar novas colunas (status)

1. Edite `frontend/src/utils.js` — adicione o novo status ao array `STATUSES`
2. O novo status aparece automaticamente no quadro e nos formulários

### Adicionar novos campos às tarefas

1. **Backend** — adicione a coluna no `init.js`:
```js
ALTER TABLE tasks ADD COLUMN novo_campo TEXT DEFAULT '';
```
2. **Backend** — atualize as queries em `routes/tasks.js`
3. **Frontend** — adicione o campo no `TaskForm.jsx` e `TaskDetail.jsx`

---

## 🔧 Dependências Utilizadas

### Backend
| Pacote | Função |
|--------|--------|
| `express` | Framework web |
| `better-sqlite3` | Banco de dados SQLite |
| `bcryptjs` | Criptografia de senhas |
| `jsonwebtoken` | Autenticação JWT |
| `cors` | Liberação de CORS |
| `nodemon` | Reinício automático em dev |

### Frontend
| Pacote | Função |
|--------|--------|
| `react` + `react-dom` | Interface |
| `react-router-dom` | Rotas |
| `axios` | Requisições HTTP |
| `vite` | Build e dev server |
| `date-fns` | Manipulação de datas |

---

## 🛠️ Solução de Problemas

**"Cannot find module 'better-sqlite3'"**
```bash
cd backend && npm install
```

**"EADDRINUSE: address already in use :::3001"**
O backend já está rodando em outro terminal. Feche-o ou mude a porta.

**Tela em branco no frontend**
Verifique se o backend está rodando (`npm run dev` no diretório `/backend`).

**"Token inválido" depois de uma atualização**
Faça logout e login novamente. O token expirou (válido por 8 horas).

**Banco corrompido ou quero resetar tudo**
```bash
cd backend
rm demandas.db
npm run init-db
```

---

## 📦 Para Produção (futuro)

Quando quiser hospedar o sistema:

1. **Build do frontend:**
```bash
cd frontend && npm run build
```

2. **Servir os arquivos estáticos** com o próprio Express:
```js
app.use(express.static('../frontend/dist'));
```

3. **Migrar para PostgreSQL** (opcional, para múltiplos usuários simultâneos):
   - Substitua `better-sqlite3` por `pg` (node-postgres)
   - As queries SQL são praticamente idênticas

---

*Sistema desenvolvido com React + Vite (frontend) e Node.js + Express + SQLite (backend).*
