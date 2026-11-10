# Arquitetura, segurança e requisitos para produção

## Componentes

O navegador acessa Next.js (Vercel) pela mesma origem. `next.config.mjs` encaminha `/api/*` à API Express no Render. A API autentica o usuário e consulta PostgreSQL (Neon, por exemplo). Anexos utilizam S3 compatível privado (R2), quando configurado. E-mails são enviados por Brevo HTTPS ao administrador.

## Segurança já implementada no código

- Senhas bcrypt, sem armazenar texto puro na tabela de unidades ou no Excel.
- Admin `__admin__`, contas de unidade distintas e controle de acesso no servidor.
- JWT expirável em cookie HttpOnly, Secure em produção, SameSite=Lax e versionamento da senha para invalidar sessões antigas.
- Token CSRF derivado de sessão para mutações autenticadas, rate limit de login e recuperação, bloqueio temporário após tentativas falhas.
- Queries parametrizadas via `pg`, validações de entrada, helmet, limites de payload e upload.
- Operações de moradores filtradas por unidade no SQL; anexo autorizado pelo servidor; bucket não público.
- Recuperação supervisionada, sem envio de senhas por e-mail.
- Auditoria de eventos administrativos e modificações.

## Riscos que exigem trabalho adicional antes de produção

1. Confirmar sessão e segurança de cookies no domínio real e em navegadores móveis; validar redirecionamento/rewrite do Next.
2. Testar telas com as dependências instaladas e autenticação integrada; preparar testes e2e de acesso cruzado e XSS/CSRF.
3. Configurar infraestrutura S3 com permissões mínimas e verificação antivírus ou serviço de varredura de arquivos; assinatura, limitação de downloads e retenção.
4. Adicionar política de privacidade, atendimento a titulares, exclusão/retificação conforme LGPD e gestão de incidentes.
5. Definir um sistema de backup externo do PostgreSQL e bucket; ensaiar restauração e retenção.
6. Migrar dados reais do Flask antigo somente após backup e mapeamento; NÃO assumir que banco SQLite do Render Free persistiu.
7. Adicionar limites distribuídos, monitoramento de erros e trilhas resistentes a adulteração conforme escala.
8. Conectar uma API bancária autorizada para o status financeiro (Asaas/administradora) e conciliação; isso não está implementado.
9. Teste de carga com centenas de sessões; escalar horizontalmente somente com plano apropriado.
10. Revisar segurança e pentest com responsável técnico antes de dados de moradores.

## Referência visual

O usuário indicou `https://ampmpauliceia.netlify.app/` como molde. A URL não pôde ser acessada para inspeção técnica no ambiente desta entrega. A identidade base usada foi o HTML AMPM previamente fornecido: azul-escuro, azul e laranja, menu lateral e cartões responsivos. Para reprodução exata será necessária a captura ou os fontes da versão Netlify.
