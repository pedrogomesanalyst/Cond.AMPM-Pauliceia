# Manual do administrador — AMPM Paulicéia

## Acesso

O identificador administrativo exclusivo é `__admin__`. A conta é criada pela carga inicial apenas se não existir. A senha inicial vem do ambiente seguro (`AMPM_ADMIN_INITIAL_PASSWORD`) e deve ser alterada no primeiro login. Não há senha universal para administração.

## Tarefas

**Unidades**: editar proprietário, morador, telefone, e-mail e status. Importar ou exportar planilha mestre. A importação preserva senhas e histórico. Antes de emitir credencial, confirme a identidade. Cada credencial temporária é exibida apenas uma vez. Para geração em lote, consulte as instruções de instalação.

**Recuperação**: solicitações chegam ao painel. Se Brevo estiver configurado, também haverá alerta no e-mail administrativo. Confirme a identidade por canal autorizado antes de marcar o pedido como resolvido. Isso gera uma credencial única e força a troca.

**Comunicados**: título e texto; apenas mensagens publicadas aparecem ao morador. **Boletos**: cadastrar valores reais e situação financeira manualmente. Marcar `PAGO` não substitui conciliação bancária; não marque sem prova de pagamento.

**Reservas**: aprovar ou negar pedido do salão de festas; o banco impede aprovar duas reservas para a mesma área/data. **Visitantes**: aprovar ou negar previamente. **Chamados**: registrar andamento/conclusão. **Documentos**: enviar somente arquivos autorizados, com bucket privado configurado. **Assembleias**: cadastrar data e URL de reunião oficial. **Auditoria**: consultar histórico de eventos.

**Relatórios**: baixar Excel de unidades ou PDF gerencial. Os relatórios são gerados com registros reais do PostgreSQL e não devem ser compartilhados publicamente.

## Segurança e LGPD

Limite a administração a pessoal autorizado. Não envie planilhas com dados pessoais em canais públicos. Mantenha backup cifrado, credenciais no gerenciador de segredos e registro de quem efetuou alterações. O sistema não substitui política de privacidade, base legal, atendimento a solicitações de titulares nem auditoria profissional.
