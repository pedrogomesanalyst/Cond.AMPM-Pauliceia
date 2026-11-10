# AMPM Paulicéia — Portal Global Multiunidades

Projeto **separado** da instalação antiga em Flask/Render. Inspirado na estrutura do portal AMPM fornecido pelo usuário. O endereço https://ampmpauliceia.netlify.app/ foi indicado como **referência visual**, mas não pôde ser inspecionado automaticamente durante esta entrega. Não altera nem publica o site existente.

## Conteúdo

- `web/`: Next.js + React + TypeScript + Tailwind CSS. Portal responsivo para moradores e administração.
- `api/`: Node.js + Express + PostgreSQL; login com cookie JWT HTTP-only, senhas bcrypt, CSRF, auditoria e Brevo.
- `api/sql/001_initial.sql`: tabelas e índices.
- `api/scripts/`: migração SQL, carga inicial e provisionamento individual.
- `planilhas/AMPM_Unidades_Mestre.xlsx`: 221 unidades do cadastro anterior, **sem senhas**.
- `docs/`: implantação, segurança, manual do morador e do administrador.

## Funcionalidades implementadas no código

Login individual; primeiro acesso com troca obrigatória; recuperação supervisionada com alerta Brevo; painel do morador; cadastro de unidades; comunicados; lançamentos de cobrança manuais (sem baixa bancária automática); reservas do salão de festas; visitantes; chamados; upload e download privado (requer bucket S3/R2 configurado); assembleias com links externos; planilha XLSX de importação/exportação; relatório PDF gerencial; trilha de auditoria.

**Não há usuários fictícios, cobranças simuladas ou cobranças bancárias reais cadastradas por padrão.** O `seed-data.json` contém a lista original de 221 unidades, mas não injeta senhas universais. O login de moradores somente é liberado após emissão individual de uma credencial pelo administrador.

## Executar localmente

Requisitos: Node.js 22+, PostgreSQL com banco vazio.

Em `api/`, copie `.env.example` para `.env`; configure DATABASE_URL, JWT_SECRET (48+ caracteres aleatórios) e AMPM_ADMIN_INITIAL_PASSWORD (16+ caracteres). No terminal:

```bash
cd api
npm install
npm run migrate
npm run seed
npm run dev
```

Em outro terminal:

```bash
cd web
npm install
# configure API_ORIGIN=http://127.0.0.1:3001 em .env.local
npm run dev
```

Abra `http://localhost:3000`. Admin: usuário `__admin__`, senha definida em variável segura. Ele deve alterar a senha no primeiro login e emitir credenciais individuais para as unidades.

## Importar a planilha

O administrador acessa **Administração → Unidades → Importar XLSX**. O parser lê as sete primeiras colunas na ordem: `Unidade`, `Andar`, `Proprietário`, `Morador`, `E-mail`, `Telefone`, `Status`. Valores `ATIVA` e `INATIVA`. Importar não sobrescreve os hashes/senhas existentes. A planilha traz 221 unidades e preserva os identificadores originais, como `41`, `42`, `51`.

## Entrega e limites de produção

O projeto contém uma **base funcional de implementação**, mas **não é um sistema certificado como pronto para produção**: faltam validação de build com dependências instaladas, testes ponta a ponta, auditoria de segurança, política LGPD e teste de carga. Não foi implantado no GitHub/Render/Netlify/Vercel nem conectado às suas contas.

O Render Free hiberna e seu disco é efêmero. Use banco PostgreSQL externo com persistência e objetos privados em storage; não utilize o SQLite do portal antigo como banco de produção. Uma meta de milhares de acessos concorrentes exige infraestrutura dimensionada, teste de carga e provavelmente custos.

**Não coloque dados reais dos moradores na nova aplicação antes da revisão jurídica e de segurança e da validação de backup.**

## Próximos documentos

- `docs/INSTALACAO_GRATUITA.md`
- `docs/MANUAL_ADMINISTRADOR.md`
- `docs/MANUAL_MORADOR.md`
- `docs/ARQUITETURA_SEGURANCA.md`
- `docs/TESTES_E_PENDENCIAS.md`
