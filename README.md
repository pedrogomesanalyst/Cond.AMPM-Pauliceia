# Portal AMPM Paulicéia — demonstração HTML

Portal responsivo em **HTML, CSS e JavaScript**, com visualização de morador e síndico, idiomas **português, inglês e espanhol**, boletos ilustrativos, histórico de pagamentos, reservas, documentos, transparência, solicitações e comunicados.

## Publicar no GitHub e Render

1. Abra o repositório **Cond.AMPM-Pauliceia** no GitHub e clique em **Add file > Upload files**.
2. Envie `index.html`, `styles.css`, `app.js`, `README.md` e a pasta `assets` (incluindo `favicon.svg`) para a **raiz** do repositório. Não envie apenas o arquivo ZIP.
3. Em **Commit changes**, escolha **Commit directly to the main branch** e confirme.
4. No Render, entre em **New > Static Site** e conecte **somente o repositório Cond.AMPM-Pauliceia**. Se não aparecer, atualize as permissões da instalação do GitHub usada pelo Render, mantendo os outros repositórios autorizados.
5. Configure **Branch:** `main`; **Build Command:** deixe vazio (ou `echo "Static site ready"`, se obrigatório); **Publish Directory:** `.`. Crie o site e aguarde a URL `.onrender.com`.
6. Teste a URL em desktop e no celular, inclusive fora da rede local.

> IMPORTANTE: não substitua serviços Render existentes antes de validar o novo endereço.

## Segurança e limitações importantes

**Isto é apenas uma demonstração de interface. NÃO use em produção para dados reais.**

- O botão "Explorar área do morador" e o botão "Explorar painel do síndico" **não fazem autenticação**. O identificador `__admin__` serve apenas como visualização de exemplo e não concede privilégios reais.
- Registros criados em reservas, solicitações e comunicados são gravados apenas no `localStorage` **do navegador** e não são sincronizados com outros usuários ou dispositivos.
- Boletos, pagamentos, valores, comunicados iniciais e documentos são fictícios. Nenhum boleto ou documento verdadeiro está hospedado aqui.
- **Não cadastre** nomes completos, CPF, senhas, comprovantes, dados bancários ou qualquer informação pessoal neste protótipo.
- Não existe backend, banco de dados, emissão de boletos, verificação de pagamento nem integração com Asaas.

## Etapas necessárias para produção internacional

1. Backend/API hospedado, banco de dados gerenciado com persistência e backups, autenticação segura por unidade, redefinição de senhas e controle de autorização no servidor. A conta administrativa única deve ser segregada e identificada como `__admin__`, com senha forte não armazenada no código.
2. Isolamento estrito entre unidades: moradores só podem ler seus próprios boletos, pagamentos, solicitações e documentos autorizados; administradores têm permissão específica no backend.
3. Arquivos PDF/imagens/documentos em armazenamento privado, com links temporários e verificação de acesso. Antivírus para uploads, limites de tamanho e tipos de arquivo.
4. Integração validada com a operadora financeira de sua escolha (por exemplo, Asaas), webhooks autenticados e conciliação antes de marcar qualquer pagamento como concluído.
5. HTTPS, proteção contra tentativas de login, MFA para administração, trilha de auditoria, rotinas de backup e restauração, política de privacidade e adequação à LGPD.
6. Hospedagem global via CDN, monitoramento, testes de carga e disponibilidade, acessibilidade e revisão profissional de segurança antes do uso real.

## Executar localmente

Abra `index.html` no navegador. Não precisa instalar bibliotecas nem servidor para visualizar a demonstração.
