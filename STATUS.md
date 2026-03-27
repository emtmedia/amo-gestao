# AMO Gestão — Status do Projeto

**Última atualização:** 2026-03-25
**Branch principal:** `main`
**Deploy:** Vercel → `amo-gestao-sigma.vercel.app`
**Commit atual:** `1d0499c`

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| ORM | Prisma + PostgreSQL (Supabase) |
| Storage | Supabase Storage |
| PDF (server-side) | pdfkit |
| Deploy | Vercel |
| Auth | Session customizada (`/lib/session`) com OTP |

---

## Módulos Implementados

### Cadastros Gerais
| Módulo | Rota | Status |
|--------|------|--------|
| Projetos Filantrópicos | `/cadastros/projetos` | Ativo — exclusão restrita a Admin/SuperAdmin com extrato PDF |
| Eventos | `/cadastros/eventos` | Ativo — exclusão restrita a Admin/SuperAdmin com extrato PDF |
| Voluntários AMO | `/cadastros/voluntarios-amo` | Ativo |
| Voluntários por Projeto | `/cadastros/voluntarios-projeto` | Ativo |
| Voluntários por Evento | `/cadastros/voluntarios-evento` | Ativo |
| Contas Bancárias | `/cadastros/contas-bancarias` | Ativo |
| Departamentos | `/cadastros/departamentos` | Ativo |
| Fornecedores | `/cadastros/fornecedores` | Ativo (com categorias e subcategorias) |
| Auxiliares (Métodos, etc.) | `/cadastros/auxiliares` | Ativo |
| UF / Cidades | `/cadastros/uf-cidades` | Ativo |
| Imóveis | `/cadastros/imoveis` | Ativo |
| Cheque-Recibo | `/cadastros/cheque-recibo` | Ativo |
| Aquisições | `/cadastros/aquisicoes` | Ativo |

### Despesas
| Módulo | Rota | Status |
|--------|------|--------|
| Conservação / Zeladoria | `/cadastros/despesas/conservacao` | Ativo |
| Contas de Consumo | `/cadastros/despesas/consumo` | Ativo |
| Copa e Cozinha | `/cadastros/despesas/copa-cozinha` | Ativo |
| Locação de Equipamentos | `/cadastros/despesas/locacao` | Ativo |
| Prebenda | `/cadastros/despesas/prebenda` | Ativo (novo — 2026-03-25) |
| Serviços Digitais | `/cadastros/despesas/digital` | Ativo |
| Serviços Externos | `/cadastros/despesas/externos` | Ativo |

### Receitas
| Módulo | Rota | Status |
|--------|------|--------|
| Cursos | `/cadastros/receitas/cursos` | Ativo |
| Eventos | `/cadastros/receitas/eventos` | Ativo |
| Outras | `/cadastros/receitas/outras` | Ativo |
| Pessoa Física | `/cadastros/receitas/pessoa-fisica` | Ativo |
| Pessoa Jurídica | `/cadastros/receitas/pessoa-juridica` | Ativo |
| Produtos | `/cadastros/receitas/produtos` | Ativo |
| Receita Pública | `/cadastros/receitas/publica` | Ativo |
| Serviços | `/cadastros/receitas/servicos` | Ativo |

### Consolidações
| Módulo | Rota | Status |
|--------|------|--------|
| Consolidação de Projetos | `/cadastros/consolidacoes/projetos` | Ativo |
| Consolidação de Eventos | `/cadastros/consolidacoes/eventos` | Ativo |
| Relatório Projetos | `/cadastros/consolidacoes/projetos/relatorio` | Ativo |
| Relatório Eventos | `/cadastros/consolidacoes/eventos/relatorio` | Ativo |
| Extrato Projeto | `/cadastros/projetos/extrato` | Ativo |
| Extrato Evento | `/cadastros/eventos/extrato` | Ativo |

### Documentos e Registros
| Módulo | Rota | Status |
|--------|------|--------|
| Biblioteca de Documentos | `/cadastros/documentos` | Ativo (toggle Cards/Lista, acesso restrito) |
| Recibos Emitidos | `/recibos` | Ativo (filtros de data e recebedor) |
| Registro de Voluntariado | `/termos-voluntariado` | Ativo (filtros, visualizar, editar, excluir) |
| Funcionários CLT | `/cadastros/funcionarios/clt` | Ativo |
| Funcionários PJ | `/cadastros/funcionarios/pj` | Ativo |

### Administração
| Módulo | Rota | Status |
|--------|------|--------|
| Usuários | `/admin/usuarios` | Ativo (apenas Admin/SuperAdmin) |
| Log de Auditoria | `/admin/audit-log` | Ativo (backup CSV com timestamp Brasília) |
| Configurações | `/configuracoes` | Ativo |
| Guia do Usuário | `/configuracoes/guia` | Ativo |
| Relatório IA | `/relatorio-ia` | Ativo |
| Inbox de Documentos | `/inbox` | Ativo |

### PWA — AMO Scan
| Funcionalidade | Status |
|----------------|--------|
| Captura por câmera e upload de arquivo | Ativo |
| Três fluxos: Cheque-Recibo, Recibo, Termo de Voluntariado | Ativo |
| Envio de documento assinado (PDF) | Ativo |
| Filtro Ano/Mês no dropdown de Recibo e Termo | Ativo (novo — 2026-03-25) |
| Botão de refresh de cache | Ativo |
| Card expandido do CR com todos os dados | Ativo |
| Service Worker / PWA manifest | Ativo |

---

## Controle de Acesso

| Role | Permissões |
|------|-----------|
| `user` | Acesso à maioria dos módulos; não pode excluir projetos/eventos |
| `admin` | Tudo do `user` + excluir projetos/eventos + gerenciar usuários/auditoria + editar docs restritos |
| `superadmin` | Tudo do `admin` + editar/excluir docs restritos na Biblioteca |

---

## Comportamentos de Negócio Relevantes

- **Projetos e Eventos com status `encerrado_consolidado`** são filtrados dos dropdowns em todos os modais de lançamento (despesas, receitas, cheque-recibo, aquisições, etc.)
- **Exclusão de Projetos/Eventos** (Admin/SuperAdmin only): requer confirmação de senha + gera extrato PDF completo salvo na Biblioteca de Documentos como Restrito, antes de executar cascade delete
- **Prebenda**: exclusão bloqueada se o Recibo vinculado já possui documento assinado (`docAssinadoUrl != null`)
- **Cheque-Recibo**: campos `projetoId` e `eventoId` adicionados via `ALTER TABLE` (não no schema Prisma) — acessados sempre via `$queryRaw`
- **Aquisição**: model fora do schema Prisma — usa raw SQL

---

## Banco de Dados — Tabelas fora do schema Prisma

As tabelas abaixo foram criadas via migration customizada (`/api/migrate/*`) e não constam no `schema.prisma`:

| Tabela | Migration |
|--------|-----------|
| `DespesaPrebenda` | `/api/migrate/prebenda` |
| `ChequeRecibo.projetoId / eventoId` | ALTER TABLE inline |
| `Aquisicao` | migration customizada |

---

## Known Issues (TypeScript)

- `src/app/scan/page.tsx` linha ~240: erro TS7009 em `new File(...)` (Web API `File` constructor) — pré-existente, causa: tsconfig sem `lib: ["dom"]` explícito. Não impede o deploy.

---

## Histórico Recente de Commits

| Hash | Descrição |
|------|-----------|
| `1d0499c` | Prebenda (nova despesa) + filtro Ano/Mês no AMO Scan |
| `1ad03b8` | Exclusão de projetos/eventos restrita a Admin/SuperAdmin com extrato PDF |
| `58e79c8` | Fix campo arquivosReferencia ao criar/editar conta bancária |
| `a4a8012` | Filtrar encerrado_consolidado em todos os modais de lançamento |
| `556c0f2` | Fix re-fetch silencioso dos CRs no modo doc-assinado do Scan |
| `d42b027` | Remover checkbox doc-assinado do fluxo regular do Scan |
| `accc7e7` | Card expandido do CR no AMO Scan |
| `e0a02c7` | Botão de refresh de cache no AMO Scan |
| `95e1fde` | CR assinado como pré-requisito para anexos/arquivamento |
| `f8411e1` | AMO Scan — ocultar campos ao marcar doc assinado + fluxo Recibos/Termos |
| `b3ff813` | Escolha de versão ao imprimir + aviso de doc assinado ao editar |
| `2035e54` | Documento assinado (PDF) para Recibos, Termos e Cheque-Recibos |
| `3383b1b` | Registro de Voluntariado com filtros, visualizar, editar, excluir |
| `0d8a9e3` | Página Recibos Emitidos com visualizar, editar e excluir |
