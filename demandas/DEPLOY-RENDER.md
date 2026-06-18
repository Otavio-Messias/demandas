# 🚀 Guia de Deploy no Render — Passo a Passo

Este guia explica como colocar o sistema online no Render gratuitamente.
Siga na ordem: GitHub → Banco → Backend → Frontend.

---

## PARTE 1 — Criar conta no GitHub

O Render precisa que o código esteja no GitHub para fazer o deploy.

1. Acesse **github.com** e crie uma conta gratuita
2. Após login, clique em **"New repository"** (botão verde)
3. Preencha:
   - **Repository name:** `demandas`
   - Deixe em **Public** (ou Private se preferir)
4. Clique em **"Create repository"**

---

## PARTE 2 — Enviar o código para o GitHub

No VS Code, abra o terminal na pasta raiz `demandas/` e execute:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/demandas.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub.
> Se pedir senha, use um "Personal Access Token" do GitHub (Settings → Developer Settings → Tokens).

---

## PARTE 3 — Criar conta no Render

1. Acesse **render.com**
2. Clique em **"Get Started for Free"**
3. Escolha **"Continue with GitHub"** — assim o Render acessa seu repositório

---

## PARTE 4 — Criar o Banco de Dados PostgreSQL

1. No painel do Render, clique em **"New +"** → **"PostgreSQL"**
2. Preencha:
   - **Name:** `demandas-db`
   - **Region:** `Oregon (US West)` ou o mais próximo do Brasil disponível
   - **Plan:** `Free`
3. Clique em **"Create Database"**
4. Aguarde ~2 minutos até ficar verde ✅
5. **Copie a "Internal Database URL"** — você vai precisar no próximo passo
   - Parece com: `postgresql://usuario:senha@host/banco`

---

## PARTE 5 — Deploy do Backend

1. No painel do Render, clique em **"New +"** → **"Web Service"**
2. Conecte ao repositório `demandas`
3. Preencha:
   - **Name:** `demandas-backend`
   - **Root Directory:** `demandas/backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
4. Clique em **"Advanced"** e depois **"Add Environment Variable"**. Adicione:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (cole a Internal Database URL do passo anterior) |
   | `JWT_SECRET` | (invente uma senha longa, ex: `minha_empresa_sistema_2024_xpto`) |
   | `NODE_ENV` | `production` |

5. Clique em **"Create Web Service"**
6. Aguarde o deploy (~3-5 minutos). Vai aparecer **"Live"** quando terminar ✅
7. **Copie a URL do backend** — parece com `https://demandas-backend.onrender.com`

### Inicializar o banco (criar as tabelas)

Após o deploy do backend, você precisa criar as tabelas no banco:

1. No painel do backend no Render, clique em **"Shell"** (aba no topo)
2. Digite e pressione Enter:
   ```bash
   npm run init-db
   ```
3. Deve aparecer: `✅ Tabelas criadas!` e `✅ Admin criado`

---

## PARTE 6 — Deploy do Frontend

1. No painel do Render, clique em **"New +"** → **"Static Site"**
2. Conecte ao repositório `demandas`
3. Preencha:
   - **Name:** `demandas-frontend`
   - **Root Directory:** `demandas/frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Clique em **"Advanced"** → **"Add Environment Variable"**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | (cole a URL do backend, ex: `https://demandas-backend.onrender.com`) |

5. Clique em **"Create Static Site"**
6. Aguarde o build (~2-3 minutos) ✅
7. **Copie a URL do frontend** — parece com `https://demandas-frontend.onrender.com`

---

## PARTE 7 — Liberar o CORS (conectar frontend ↔ backend)

Agora que você tem a URL do frontend, precisa informar o backend:

1. Vá no serviço `demandas-backend` no Render
2. Clique em **"Environment"**
3. Adicione mais uma variável:

   | Key | Value |
   |-----|-------|
   | `FRONTEND_URL` | `https://demandas-frontend.onrender.com` |

4. Clique em **"Save Changes"** — o backend vai reiniciar automaticamente

---

## ✅ Pronto!

Acesse `https://demandas-frontend.onrender.com` e faça login:
- **Admin:** admin@empresa.com / admin123
- **Troque a senha** pelo sistema assim que entrar!

---

## ⚠️ Atenção — Limitações do plano gratuito

- O backend **"adormece"** após 15 minutos sem uso
- Quando alguém acessar depois de um tempo parado, vai demorar ~30 segundos para o primeiro carregamento
- Isso é normal no plano gratuito — depois que "acorda", fica rápido

---

## 🔄 Como atualizar o sistema depois

Quando você fizer alterações no código e quiser publicar:

```bash
git add .
git commit -m "descrição do que mudou"
git push
```

O Render detecta automaticamente e faz o novo deploy.

---

## ❓ Problemas comuns

**Erro "Cannot connect to database"**
→ Verifique se o `DATABASE_URL` está correto nas variáveis de ambiente do backend

**Tela em branco no frontend**
→ Verifique se o `VITE_API_URL` aponta para a URL correta do backend (sem barra no final)

**Login não funciona**
→ Certifique-se de ter rodado `npm run init-db` no Shell do backend

**CORS error no navegador**
→ Verifique se o `FRONTEND_URL` no backend está exatamente igual à URL do frontend
