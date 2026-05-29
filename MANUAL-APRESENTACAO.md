# Manual de Apresentação — qr-abalo (Abalô-Caxi)

Este manual é seu plano B se você precisar abrir o sistema durante a apresentação **sem ajuda do Claude**. Siga os passos na ordem.

---

## URL fixa do sistema

🔗 **https://roamer-frisk-work.ngrok-free.dev**

Essa URL **nunca muda** (domínio reservado no ngrok). Já está cadastrada no Supabase e no Google Cloud, então login com Google funciona direto.

## TL;DR — passo rápido

1. **Clique 2x** em `INICIAR-TUDO.bat` (na pasta do projeto). Pressione qualquer tecla quando pedir.
2. Duas janelas pretas vão abrir: **Servidor (Vite)** e **Ngrok**. Espere ~10 segundos.
3. Abra no navegador: **https://roamer-frisk-work.ngrok-free.dev** — pronto.

> Se algo der errado, vá para a seção **Resolução de problemas** lá embaixo.

---

## O que é o qr-abalo (resumo de 30 segundos pra apresentação)

**Abalô-Caxi** é um PWA (web app que funciona como app no celular) para controle de presença da bateria. Substitui chamada manual.

**Como funciona:**
1. **Direção** cria um "ensaio" no app: nome, horário, local (GPS) e raio de tolerância (ex.: 150m).
2. O sistema gera um **QR code único** para o ensaio.
3. **Membros** abrem o app, apontam a câmera no QR e o sistema:
   - confirma a identidade pelo login,
   - confirma a janela de horário,
   - confirma que o celular está **dentro do raio** do local via GPS,
   - registra a presença.
4. A direção vê a lista de presentes e faltantes **em tempo real** e pode exportar planilha Excel.

**Segurança:**
- Membros só conseguem se cadastrar com e-mail **previamente liberado pela direção** (whitelist).
- Validação de localização é feita **no servidor** (Postgres), não dá pra trapacear no front-end.
- Distância calculada por fórmula de Haversine no servidor.

**Stack:** React + TypeScript + Vite + Tailwind, Supabase (Postgres + Auth + Realtime), PWA com instalação no celular.

---

## Pré-requisitos (já estão prontos nesta máquina)

- ✅ Node.js instalado (verifique com `node -v` no PowerShell)
- ✅ `node_modules` já instalado (`npm install` já rodou)
- ✅ Ngrok instalado e autenticado (token salvo em `~/AppData/Local/ngrok/ngrok.yml`)
- ✅ Build de produção testado (`npm run build` rodou OK)
- ✅ `.env.local` com credenciais do Supabase preenchidas

Se algo nessa lista falhar, veja **Resolução de problemas** no fim.

---

## Opção 1: Clique único (RECOMENDADO)

Na pasta `qr-abalo`, dê **duplo clique** em:

```
INICIAR-TUDO.bat
```

Ele vai:
1. Pedir pra você apertar uma tecla pra confirmar.
2. Abrir **duas janelas** automaticamente:
   - **"qr-abalo - Servidor (Vite)"** → rodando `npm run dev` na porta 5173
   - **"qr-abalo - Ngrok"** → expondo o servidor com uma URL HTTPS pública
3. Esperar 8 segundos entre os dois pra dar tempo do Vite subir.

**O que você vai ver na janela do ngrok:**

```
Session Status   online
Account          enzoferrazbh@gmail.com (Plan: Free)
Region           South America (sa)
Forwarding       https://roamer-frisk-work.ngrok-free.dev -> http://localhost:5173
```

A URL é **sempre a mesma** (domínio reservado). Abra no navegador: **https://roamer-frisk-work.ngrok-free.dev**

⚠️ **Não feche** nenhuma das duas janelas durante a apresentação. Se fechar o servidor, o sistema sai do ar. Se fechar o ngrok, a URL pública para de funcionar (mas localhost continua).

---

## Opção 2: Em duas etapas (se preferir controle manual)

### Etapa A — iniciar o servidor

Duplo clique em:
```
1-iniciar-servidor.bat
```

Espere até aparecer:
```
VITE v8.0.14  ready in 1142 ms
➜  Local:   http://localhost:5173/
```

### Etapa B — iniciar o ngrok

**Em outra janela**, duplo clique em:
```
2-iniciar-ngrok.bat
```

Espere a URL `https://...ngrok-free.app` aparecer. Copie e use.

---

## Opção 3: Manual via PowerShell (último recurso)

Abra **duas** janelas do PowerShell e em cada uma:

**Janela 1 — servidor:**
```powershell
cd "C:\Users\Enzo Ferraz\OneDrive - Sintese Biotecnologia\Documentos\qr-abalo"
npm run dev
```

**Janela 2 — ngrok:**
```powershell
ngrok http 5173
```

---

## Roteiro de demonstração sugerido

Depois que o sistema estiver no ar, sugiro essa sequência pra apresentar:

### 1. Mostre a tela de login (30s)
- Abra a URL ngrok no navegador do PC.
- Mostre as 3 opções de login: Google, Apple, e-mail/senha.
- Comente: **"Só quem está na whitelist da direção consegue criar conta."**

### 2. Logue como direção (1 min)
- Use um e-mail de diretor já cadastrado.
- Você cai no painel da direção: lista de ensaios + botões para "Membros" e "Relatório".

### 3. Crie um ensaio ao vivo (1-2 min)
- Clique em **"+ Novo ensaio"**.
- Preencha nome (ex.: "Ensaio de Demonstração"), horários (início agora, fim em 3h).
- Clique em **"Usar minha localização atual"** — o navegador vai pedir permissão de GPS. Aceite.
- Coloque um raio de 150m.
- Clique em **"Criar ensaio"**.

### 4. Mostre o QR code (30s)
- Apareceu a página do ensaio com o **QR code grande**.
- Comente: **"Esse QR é único pra esse ensaio, ninguém de fora consegue forjar."**
- Mostre os botões: **Copiar link**, **Imprimir QR**, **Exportar planilha**.

### 5. Simule um check-in pelo celular (2 min) — ⭐ momento principal
- Pegue o celular, abra a câmera, **escaneie o QR** projetado.
- O celular abre a URL `https://...ngrok-free.app/checkin/<token>`.
- Faça login no celular (a primeira vez precisa).
- O sistema:
  - mostra "Obtendo sua localização..." (aceite a permissão de GPS)
  - mostra "Registrando presença..."
  - mostra ✅ **"Presença registrada!"** com a distância do local.
- **Volte ao PC** — sem dar refresh, a presença já aparece na lista (Realtime do Supabase).

### 6. Mostre erros amigáveis (opcional, 1 min)
- Tente escanear o mesmo QR de novo → **"Você já marcou presença"**.
- Se quiser mostrar **"Fora do local"**, crie um ensaio com coordenadas longe (mas isso quebra a demo, pule).

### 7. Mostre o painel da direção em tempo real (1 min)
- De volta ao painel do ensaio:
  - aba **Presentes**: quem marcou (com horário e distância).
  - aba **Faltantes**: lista de quem não marcou + botão **"Marcar"** (marcação manual pela direção).
- Clique em **"Exportar planilha"** → baixa um `.xlsx` com toda a presença daquele ensaio.

### 8. Mostre cadastro de membros (opcional, 1 min)
- Volte ao painel, vá em **Membros**.
- Mostre busca, edição e o botão **Importar** (CSV/Excel em lote).

### 9. Mostre o relatório consolidado (1 min)
- Volte ao painel, vá em **Relatório**.
- Mostra estatísticas agregadas: % de presença por membro, total de ensaios etc.

---

## Resolução de problemas

### "npm não é reconhecido"
Node não está no PATH ou não está instalado. Abra `cmd` e teste:
```
node -v
npm -v
```
Se falhar: instale o Node em https://nodejs.org/ (LTS), depois reabra os `.bat`.

### "ngrok não é reconhecido"
O ngrok não está no PATH. Caminho completo nesta máquina:
```
C:\Users\Enzo Ferraz\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe
```
Se precisar rodar direto:
```
"C:\Users\Enzo Ferraz\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe" http 5173
```

### Ngrok pede autenticação (`authtoken required`)
Não deveria acontecer (já está configurado), mas se acontecer:
```
ngrok config add-authtoken 2x5uIgYTgsOEj8qSnSmGM0bD0Dg_2hEnuY1jgqZAW8an6cXKo
```
Depois rode `ngrok http 5173` de novo.

### Vite abre mas o ngrok dá erro "blocked host"
O `vite.config.ts` já permite `.ngrok-free.app` e `.ngrok.app`. Se você usar outro domínio, edite e adicione na lista `allowedHosts` no `vite.config.ts`.

### A câmera do celular não abre / GPS não funciona
- A URL **precisa ser HTTPS**. Ngrok já entrega HTTPS por padrão (`https://...`).
- **Nunca use a URL `http://localhost:5173`** no celular — não vai funcionar com câmera/GPS.
- No iPhone: Safari pede permissão de câmera/GPS — aceite. Se negou, vai em Ajustes > Safari > Câmera/Localização.

### "Missing Supabase env vars"
O `.env.local` sumiu. Crie de novo na pasta do projeto com:
```
VITE_SUPABASE_URL=https://tbcyildrxufnlkrfihcy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_KpW-QI8d3j7QM_X4Mg4EDw_9seGrDZy
```

### Porta 5173 já em uso
Algum Vite ficou rodando. Mate todos os Node:
```powershell
Get-Process node | Stop-Process -Force
```
E inicie de novo.

### URL do ngrok (FIXA)
Este projeto usa um **domínio reservado** do ngrok: `roamer-frisk-work.ngrok-free.dev`. A URL **nunca muda**, não precisa reconfigurar Supabase/Google a cada execução.

Se um dia precisar trocar o domínio, atualize em três lugares:
1. `2-iniciar-ngrok.bat` (linha `ngrok http --url=...`)
2. `INICIAR-TUDO.bat` (mesma linha)
3. Supabase Dashboard → Authentication → URL Configuration → Site URL e Redirect URLs

### "Túnel expirou" durante a apresentação
Plano free do ngrok mata sessões longas. Basta fechar a janela do ngrok e reabrir `2-iniciar-ngrok.bat`. **A URL volta a mesma** (`roamer-frisk-work.ngrok-free.dev`), não precisa atualizar nada.

### Quero rodar só no PC sem ngrok
Funciona, mas câmera/GPS no celular só com HTTPS. Você pode:
- Demonstrar tudo apenas no PC usando `http://localhost:5173` (sem celular real).
- Mostrar o QR mas não tentar escanear pelo celular.

---

## Atalhos úteis durante a apresentação

| Ação | Como |
|---|---|
| Encerrar o servidor | Foque na janela do Vite e aperte `Ctrl+C` (ou feche) |
| Encerrar o ngrok | Foque na janela do Ngrok e aperte `Ctrl+C` (ou feche) |
| Reiniciar tudo | Feche as duas janelas, rode `INICIAR-TUDO.bat` de novo |
| Ver status do ngrok | Abra `http://127.0.0.1:4040` no navegador (painel local) |
| Forçar refresh do PWA | `Ctrl+Shift+R` no navegador |

---

## Estrutura do projeto (rápida referência)

```
qr-abalo/
├── INICIAR-TUDO.bat            ← clique único pra abrir tudo
├── 1-iniciar-servidor.bat      ← só o Vite
├── 2-iniciar-ngrok.bat         ← só o ngrok
├── MANUAL-APRESENTACAO.md      ← este arquivo
├── .env.local                  ← credenciais Supabase (NÃO COMMITAR)
├── src/
│   ├── pages/
│   │   ├── Login.tsx           ← tela de login
│   │   ├── Checkin.tsx         ← página que abre ao escanear QR
│   │   ├── member/             ← área do membro comum
│   │   └── director/           ← área da direção
│   └── lib/
│       ├── auth.tsx            ← contexto de autenticação
│       └── supabase.ts         ← cliente Supabase
└── supabase/migrations/
    ├── 001_init.sql            ← tabelas + RLS + função check_in
    └── 002_realtime.sql        ← realtime para atualização ao vivo
```

---

## Em caso de pânico

1. Respira.
2. Feche tudo, rode `INICIAR-TUDO.bat` de novo, espere as duas janelas estabilizarem.
3. Se nem isso, mostre o código no VS Code e explique a arquitetura — você conhece o sistema, não depende de ele estar no ar pra apresentar a ideia.

Boa apresentação! 🥁
