# INSTRUÇÃO PARA CLAUDE CODE — AMO Inbox + AMO Scan PWA

## Contexto

Este projeto é o `amo-gestao`, um app Next.js 14 (App Router) com TypeScript, Tailwind CSS, Prisma ORM (PostgreSQL) e Supabase Storage. Deploy na Vercel.

Na raiz do projeto existe um arquivo `amo-inbox-implementacao.zip` contendo os arquivos de implementação. Siga todos os passos abaixo na ordem exata.

---

## PASSO 1: Extrair o ZIP

```bash
unzip amo-inbox-implementacao.zip -d amo-inbox-temp
```

Copie APENAS estes arquivos para as pastas corretas do projeto:

```bash
cp amo-inbox-temp/src/app/api/inbox/route.ts src/app/api/inbox/route.ts
cp amo-inbox-temp/src/app/api/inbox/\[id\]/route.ts src/app/api/inbox/\[id\]/route.ts
cp amo-inbox-temp/src/app/inbox/page.tsx src/app/inbox/page.tsx
cp amo-inbox-temp/src/app/scan/layout.tsx src/app/scan/layout.tsx
cp amo-inbox-temp/src/app/scan/page.tsx src/app/scan/page.tsx
cp amo-inbox-temp/public/manifest-scan.json public/manifest-scan.json
cp amo-inbox-temp/public/sw-scan.js public/sw-scan.js
```

Crie as pastas antes se não existirem:

```bash
mkdir -p src/app/api/inbox/\[id\]
mkdir -p src/app/inbox
mkdir -p src/app/scan
mkdir -p public/icons
```

Depois limpe os temporários:

```bash
rm -rf amo-inbox-temp
rm amo-inbox-implementacao.zip
```

---

## PASSO 2: Editar o schema.prisma

Abra `prisma/schema.prisma` e faça DUAS edições:

### 2A — Adicionar relação no model Usuario existente

Encontre o `model Usuario { ... }` e adicione esta linha dentro dele, logo após a linha `tokensReset TokenResetSenha[]`:

```prisma
  inboxDocumentos   InboxDocumento[]
```

### 2B — Adicionar o model InboxDocumento no final do arquivo

Cole este bloco INTEIRO no final do `schema.prisma`, depois do último model:

```prisma
// ============================================
// INBOX DE DOCUMENTOS
// ============================================
model InboxDocumento {
  id                String   @id @default(cuid())
  descricao         String
  dataVencimento    DateTime
  nomeArquivo       String
  tipoArquivo       String
  tamanhoArquivo    Int
  urlArquivo        String
  pathArquivo       String?
  origemCaptura     String   @default("upload")
  status            String   @default("pendente")
  enviadoPorId      String
  enviadoPorNome    String
  enviadoPorEmail   String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  enviadoPor        Usuario  @relation(fields: [enviadoPorId], references: [id])
}
```

---

## PASSO 3: Editar o Sidebar.tsx

Abra `src/components/Sidebar.tsx`.

Adicione o import do ícone Inbox do lucide-react (no bloco de imports existente do lucide-react):

```tsx
import { Inbox } from 'lucide-react'
```

Se `Inbox` já estiver importado junto com outros ícones, não duplique.

Encontre o array de itens de navegação do menu lateral (pode ser um array de objetos com `name`, `href`, `icon` ou estrutura similar). Adicione este item no local mais adequado (preferencialmente após o item "Configurações" ou no final da seção principal):

```tsx
{ name: 'Inbox', href: '/inbox', icon: Inbox },
```

IMPORTANTE: Analise o padrão exato do array de navegação no Sidebar.tsx e adapte o formato do item para ser idêntico ao dos itens existentes. O campo pode se chamar `label` em vez de `name`, ou `path` em vez de `href` — use os mesmos nomes de campo.

---

## PASSO 4: Configurar limite de upload no Next.js

Abra `next.config.js` e adicione (ou atualize) a configuração para permitir uploads de até 10 MB. Mantenha toda configuração existente e adicione:

```js
experimental: {
  serverActions: {
    bodySizeLimit: '10mb',
  },
},
```

Se já existir um bloco `experimental`, apenas adicione `serverActions` dentro dele.

---

## PASSO 5: Registrar o Service Worker no scan/page.tsx

Abra `src/app/scan/page.tsx` e verifique se dentro do primeiro `useEffect` (o que faz o fetch para `/api/auth/me`) existe o registro do service worker. Se NÃO existir, adicione no final desse useEffect (dentro do `.finally`):

```tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-scan.js').catch(() => {})
}
```

---

## PASSO 6: Criar ícones placeholder para o PWA

Crie dois arquivos SVG simples como placeholder (serão substituídos depois por ícones reais):

`public/icons/scan-192.png` e `public/icons/scan-512.png`

Se não conseguir gerar PNGs, crie um arquivo de texto `public/icons/README.md` com este conteúdo:

```md
# Ícones do AMO Scan PWA

Substituir por ícones PNG reais:
- scan-192.png (192x192 pixels)
- scan-512.png (512x512 pixels)

Sugestão: logotipo AMO com ícone de scanner/câmera.
```

---

## PASSO 7: Executar Prisma

```bash
npx prisma db push
```

Se der erro de conexão com o banco, verifique se as variáveis `DATABASE_URL` e `DIRECT_URL` estão configuradas no `.env`.

---

## PASSO 8: Testar localmente

```bash
npm run dev
```

Verificar:
- Acessar `http://localhost:3000/inbox` → deve exibir a página do Inbox (vazia, sem documentos)
- Acessar `http://localhost:3000/scan` → deve redirecionar para login (se não autenticado) ou mostrar a interface do AMO Scan
- O item "Inbox" deve aparecer no menu lateral

---

## PASSO 9: Fazer commit e deploy

```bash
git add .
git commit -m "feat: inbox de documentos + AMO Scan PWA"
git push
```

---

## Resumo dos arquivos

| Ação | Arquivo |
|------|---------|
| NOVO | `src/app/api/inbox/route.ts` |
| NOVO | `src/app/api/inbox/[id]/route.ts` |
| NOVO | `src/app/inbox/page.tsx` |
| NOVO | `src/app/scan/layout.tsx` |
| NOVO | `src/app/scan/page.tsx` |
| NOVO | `public/manifest-scan.json` |
| NOVO | `public/sw-scan.js` |
| EDITAR | `prisma/schema.prisma` (adicionar model + relação) |
| EDITAR | `src/components/Sidebar.tsx` (adicionar item Inbox) |
| EDITAR | `next.config.js` (limite upload 10mb) |
| CRIAR | `public/icons/` (ícones PWA) |
