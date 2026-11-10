# Instalação no plano gratuito — Portal AMPM Global

## Política de publicação

**Não substitua o serviço Flask existente antes de testar a nova API e a interface**. Crie um serviço novo; mantenha o endereço antigo ativo até os testes. O repositório original poderá receber um subdiretório para o novo projeto, mas use uma branch e revise as alterações antes de publicar.

## Serviços sugeridos (gratuitos dentro de cotas)

1. **PostgreSQL: Neon Free** — criar projeto e copiar `DATABASE_URL`. O plano gratuito tem cota de armazenamento, rede e computação e pode hibernar. Não usar Render Postgres Free como banco definitivo sem avaliar a expiração de 30 dias.
2. **API: Render Free** — novo Web Service com Docker, `Root Directory: api` e Dockerfile na pasta `api`; deve escutar `0.0.0.0:$PORT`. Render suspende serviço após período de inatividade e perde arquivos locais.
3. **Interface: Vercel (Hobby)** — importe o repositório e selecione `web` como raiz. Em Environment configure `API_ORIGIN` com a URL pública do serviço de API Render, por exemplo `https://seu-servico-api.onrender.com`.
4. **Notificações: Brevo** — verifique o e-mail de remetente e use uma chave API v3 nas variáveis secretas do Render. `AMPM_ALERT_EMAIL` é o destinatário administrativo. E-mails são notificações, não enviam senha.
5. **Arquivos: Cloudflare R2** (opcional) — bucket privado, tokens S3 e políticas de acesso. A camada gratuita tem limites e pode exigir cadastro de cobrança; não vincule dados reais sem revisar esses termos. Sem bucket, upload de documentos ficará desabilitado.

## Preparar o banco

No ambiente de desenvolvimento, com `DATABASE_URL` apontando ao **novo** PostgreSQL:

```bash
cd api
npm install
npm run migrate
npm run seed
npm test
```

A execução inicial `seed` cria a conta `__admin__` somente se não existir. A senha inicial vem de `AMPM_ADMIN_INITIAL_PASSWORD` com 16+ caracteres, e a aplicação obriga troca no primeiro acesso. **Nunca compartilhe a senha nem publique valores no GitHub.**

## Credenciais das unidades

Para liberar as unidades, o administrador pode emitir **uma por vez** pela interface. Alternativamente, em um computador seguro, o responsável autorizado pode executar:

```bash
cd api
ALLOW_BULK_PROVISION=yes node scripts/provision-all.js /caminho/fora/do/repositorio/credenciais-privadas.csv
```

Este script só provisiona contas sem senha, gera credenciais **diferentes para cada apartamento**, exige a troca no primeiro login e produz um CSV privado. Entregar cada credencial somente ao morador verificado. Não importar o arquivo de credenciais na planilha mestre nem subir o CSV ao GitHub.

## Variáveis do Render API

```text
DATABASE_URL=postgresql://...
PG_SSL=1
JWT_SECRET=<48+ caracteres aleatórios>
NODE_ENV=production
AMPM_ADMIN_INITIAL_PASSWORD=<somente primeira inicialização>
AMPM_ALERT_EMAIL=<e-mail administrativo>
BREVO_API_KEY=<chave secreta>
BREVO_SENDER_EMAIL=<remetente verificado>
S3_ENDPOINT=<opcional: endpoint de R2>
S3_REGION=auto
S3_BUCKET=<opcional>
S3_ACCESS_KEY_ID=<opcional>
S3_SECRET_ACCESS_KEY=<opcional>
```

O API healthcheck deve retornar `{"status":"ok","service":"ampm-api"}` em `/api/health`, caso a conexão PostgreSQL esteja funcionando.

## Ordem segura para implantação

1. Conferir backups do portal anterior, sem modificar o Flask.
2. Criar PostgreSQL persistente e restringir credenciais.
3. Rodar migração e seed no ambiente local ou ambiente autorizado com acesso ao banco.
4. Publicar API separada no Render Free, testar `/api/health`.
5. Publicar o novo Next.js na Vercel em URL separada.
6. Entrar como administrador, trocar senha e provisionar unidade de teste.
7. Validar CRUD de módulos, autorização entre unidades, recuperação, anexos e exportações.
8. Somente após aprovação, decidir a substituição gradual do portal antigo.

## Observações para Free

Não existe garantia de atendimento ininterrupto ou capacidade para milhares de pessoas simultâneas em Free. Cotas e suspensão automática continuam. Para uso permanente com dados pessoais, inclua backup e teste de restauração, termos LGPD, inspeção de segurança e monitoramento.
