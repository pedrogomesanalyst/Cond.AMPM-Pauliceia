# Checklist de validação antes da publicação

## Verificações realizadas nesta entrega

- [x] API JavaScript passou pelo verificador de sintaxe do Node.js.
- [x] Testes das funções de validação (4 casos) passaram.
- [x] Planilha XLSX gerada com 221 unidades e os cabeçalhos de importação.
- [x] Código JSX/TSX passou pela verificação de sintaxe do compilador TypeScript.
- [ ] Build completo do Next.js e instalação de dependências: não executados, porque não há acesso ao registro NPM nesta sessão.
- [ ] Teste de integração PostgreSQL: não executado, porque nenhum banco foi autorizado ou conectado.
- [ ] Teste de envio Brevo: não executado, pois chave e remetente são privados.
- [ ] Teste de arquivos R2/S3: não executado, pois nenhum bucket foi configurado.
- [ ] Teste responsivo com navegador real: não executado.
- [ ] Teste de carga, auditoria LGPD e pentest: pendentes.
- [ ] Deploy no GitHub/Render/Vercel: não realizado.

## Critérios de aceitação

1. Login válido; bloqueio de credenciais erradas e senha fraca.
2. Conta de unidade A não acessa boletos, chamados, documentos privados ou reservas de B.
3. Primeiro acesso impede navegação até troca da senha.
4. Reset de senha exige operador verificar identidade e emite credencial temporária.
5. Cadastro e importação XLSX preservam senhas e cadastros anteriores.
6. Aprovação duplicada de mesma área/data gera HTTP 409.
7. PDFs, anexos e documentos somente podem ser baixados por quem está autenticado e autorizado.
8. Logs não expõem senhas, JWT, chaves de API ou documentos pessoais.
9. Sistema exibe estados vazios reais, sem transações demonstrativas.
10. Backup completo restaurado em homologação.
