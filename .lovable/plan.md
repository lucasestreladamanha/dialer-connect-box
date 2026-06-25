
# Firma do 7 — Plano de Implementação

## Stack
O template atual é **TanStack Start (React 19 + TS + Vite + Tailwind v4)**, não Vite/React puro. Vou usá-lo (roteamento via TanStack Router, file-based em `src/routes/`). Toda integração com Evolution API ficará em **Supabase Edge Functions** (Deno), conforme pedido — nada de backend Node próprio, nada de chave no frontend.

Habilitarei o **Lovable Cloud** (Supabase gerenciado) e cadastrarei `EVOLUTION_URL` e `EVOLUTION_API_KEY` como secrets das Edge Functions.

## Design
- Tema escuro permanente (preto `#0A0A0A`, cinza escuro `#161616` / `#1F1F1F`, branco, verde `#22C55E` para status conectado/válido, vermelho discreto para inválido).
- Tokens definidos em `src/styles.css` (oklch). Sem cores hardcoded nos componentes — só tokens semânticos.
- Sidebar fixa colapsável (shadcn sidebar), layout dashboard responsivo, tipografia limpa (Inter).

## Rotas (TanStack Router)
Públicas:
- `/` — Landing (logo, descrição curta, botões Entrar / Criar conta)
- `/auth` — Login + Cadastro (tabs) + link "Esqueci minha senha"
- `/reset-password` — Define nova senha (obrigatório para o fluxo de recuperação)

Protegidas (sob `_authenticated/` layout gerenciado, `ssr:false`, redireciona para `/auth`):
- `/dashboard` — 4 passos (Conectar / Enviar / Validar / Exportar) + cards (WhatsApp conectado, total contatos, válidos, inválidos)
- `/whatsapp` — QR Code, status da conexão, botão desconectar/reconectar
- `/upload` — Drag-and-drop CSV/XLSX, mapeamento de colunas, normalização
- `/contatos` — Tabela com filtros (Todos/Válidos/Inválidos), busca por nome/telefone, paginação
- `/exportacao` — Escolha de escopo (válidos/inválidos/todos) e formato (CSV/XLSX)
- `/configuracoes` — Perfil e logout

## Banco de dados (Supabase)
Tabelas em `public` com RLS habilitada e GRANTs corretos. Toda policy `auth.uid() = user_id`.

- `whatsapp_sessions` — `id`, `user_id`, `instance_name` (= `instancia_{user_id}`), `status` (`OPEN|CONNECTING|CLOSE`), `phone`, `created_at`, `updated_at`. Único por user_id.
- `uploads` — `id`, `user_id`, `file_name`, `total_contacts`, `created_at`.
- `contacts` — `id`, `user_id`, `upload_id`, `name`, `cpf`, `phone_original`, `phone_normalized`, `valid_whatsapp` (`boolean nullable` enquanto não validado), `validated_at`, `created_at`. Índices em `(user_id, upload_id)` e `(user_id, valid_whatsapp)`.

Observação: a tabela `users` espelha `auth.users` — não vou recriá-la; quando precisar de dado de perfil uso `auth.users` ou trigger para `profiles` (não necessário agora, só email).

Todos os contatos são salvos, válidos ou não. Validação atualiza `valid_whatsapp` + `validated_at`.

## Edge Functions (Deno, Supabase)
Cada função valida a sessão do usuário via `Authorization: Bearer` (JWT do Supabase), faz as chamadas à Evolution e usa `service_role` apenas no servidor para escrever no banco.

1. **`create-instance`** — POST. Cria/garante `instancia_{user_id}` via `POST {EVOLUTION_URL}/instance/create` com `integration: "WHATSAPP-BAILEYS"`. Se já existir (409/erro de duplicado), reutiliza. Faz upsert em `whatsapp_sessions`.
2. **`connect-instance`** — GET. Chama `GET /instance/connect/{instance}` e devolve QR code (base64) ao cliente.
3. **`connection-status`** — GET. Chama `GET /instance/connectionState/{instance}`, atualiza `whatsapp_sessions.status` e `phone` quando `OPEN`, retorna status atual. Frontend faz polling a cada 3s.
4. **`logout-instance`** — DELETE. Chama `DELETE /instance/logout/{instance}` e atualiza status para `CLOSE`.
5. **`validate-contacts`** — POST `{ upload_id }`. Busca contatos não validados do upload (do user logado), processa em lotes de 1000 chamando `POST /chat/whatsappNumbers/{instance}` com `{ numbers: [...] }`, atualiza `valid_whatsapp` + `validated_at`. Retorna progresso por lote (resposta streamada ou chamadas sucessivas controladas pelo frontend, paginadas por offset).
6. **`export-contacts`** — POST `{ scope: 'valid'|'invalid'|'all', format: 'csv'|'xlsx' }`. Gera arquivo no servidor e devolve como download (CSV nativo; XLSX via `xlsx` no Deno).

Secrets das functions: `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (já injetadas pelo Cloud).

## Fluxos principais

**WhatsApp**: ao entrar em `/whatsapp`, chama `create-instance` → `connect-instance` (exibe QR) → polling em `connection-status` a cada 3s. Quando `OPEN`, esconde QR, mostra "Conectado" + número. Botão "Desconectar" chama `logout-instance`. Botão "Reconectar" quando `CLOSE`.

**Upload**: parsing **client-side** com `papaparse` (CSV) e `xlsx` (XLSX). Detecta colunas `nome|name`, `cpf`, `telefone|phone|whatsapp` (case-insensitive); se só houver uma coluna, assume telefone. Normaliza: remove tudo que não é dígito, remove DDI 55 inicial se presente, valida 10–11 dígitos, reanexa `55`. Insere em `uploads` + `contacts` (bulk insert via cliente Supabase autenticado, RLS protege).

**Validação**: botão em `/dashboard` ou `/contatos` dispara `validate-contacts` em loop de lotes; frontend exibe barra de progresso (lote atual / total). Atualiza counters em tempo real (React Query invalidation).

**Exportação**: `export-contacts` retorna Blob; navegador faz download.

## Segurança
- RLS em todas as tabelas, policies `using/with check (auth.uid() = user_id)`.
- `EVOLUTION_API_KEY` e `SERVICE_ROLE_KEY` **apenas** nas Edge Functions.
- Edge Functions sempre verificam JWT (`supabase.auth.getUser(token)`) antes de qualquer operação.
- Validação Zod nos payloads das functions.
- HIBP password check ativo no Supabase Auth.

## Pacotes a instalar
`papaparse`, `xlsx`, `@types/papaparse`. shadcn já disponível (sidebar, card, table, dialog, tabs, progress, sonner, etc.).

## Entregáveis por etapa (ordem)
1. Habilitar Lovable Cloud + cadastrar secrets `EVOLUTION_URL` e `EVOLUTION_API_KEY`.
2. Migrações: tabelas + RLS + GRANTs + índices.
3. Design tokens (tema escuro) em `src/styles.css`.
4. Landing `/` + Auth (`/auth`, `/reset-password`).
5. Layout autenticado com sidebar.
6. Edge Functions (6 funções) + secrets.
7. Páginas: `/whatsapp` (QR + polling), `/upload`, `/contatos`, `/exportacao`, `/dashboard`, `/configuracoes`.
8. Verificação ponta-a-ponta (criar conta → conectar WhatsApp → upload → validar → exportar).

## Pontos confirmados
- Endpoint de validação WhatsApp na Evolution API: `POST /chat/whatsappNumbers/{instance}` com `{ numbers: string[] }` (padrão Evolution v2). Caso sua instância use outro path, ajustamos na função `validate-contacts` sem mexer no frontend.
- O nome `instancia_{user_id}` usa o UUID do Supabase (com hífens). Se preferir slug sem hífens, ajustamos.
