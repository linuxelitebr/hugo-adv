# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.4] - 2026-11-24

### Corrigido
- Nos artigos, o nome do autor voltou a ficar na mesma linha de texto das datas e do tempo de leitura (desalinhado desde a 0.1.1 pela área de toque maior).

### Testes
- Verificação de que os itens de autor, datas e tempo de leitura dividem a mesma linha de base.

## [0.1.3] - 2026-11-24

### Alterado
- Volta o alinhamento à esquerda da última linha das grades, acompanhando o texto das páginas (desfaz a centralização da 0.1.2).

### Adicionado
- Na home, quando há mais áreas de atuação do que o limite (`params.home.practiceLimit`), as que ficaram de fora são citadas abaixo dos cards, com link para a página de todas as áreas.

## [0.1.2] - 2026-11-24

### Alterado
- Grades de três colunas centralizam a última linha incompleta (por exemplo, 7 áreas de atuação), em vez de deixar os cards presos à esquerda.

## [0.1.1] - 2026-11-24

### Corrigido
- Áreas de toque de pelo menos 24 px no celular (WCAG 2.5.8) para links fora do texto corrido: rodapé, canais de contato, "Ver no mapa", autor do artigo e nome no card de pessoa.

### Testes
- Verificação do tamanho das áreas de toque na tela de celular, sem depender da exceção de espaçamento.

## [0.1.0] - 2026-11-23

Primeira versão.

### Adicionado
- Páginas: início, escritório, áreas de atuação, equipe e perfil, artigos com chamada de contato, contato, privacidade e 404.
- Marca configurável pelo `hugo.toml`: cores (claro e escuro), fontes auto-hospedadas, logotipo, ícones e imagem de compartilhamento.
- Canais de contato em ordem de prioridade (WhatsApp, telefone, e-mail, endereço) e modos de exibição do endereço.
- Animações discretas apenas em CSS, desativadas para quem prefere movimento reduzido.
- SEO: títulos otimizados, Open Graph e cartões do X, `robots.txt` por ambiente, sitemap e grafo Schema.org (LegalService, WebSite, WebPage, BreadcrumbList, Article, Person).
- Segurança: `_headers` com CSP restritiva e demais cabeçalhos, sem JavaScript.
- Travas de publicação: registro na OAB obrigatório, aprovação jurídica explícita dos artigos e bloqueio de marcações pendentes em produção.
- Suíte de testes: acessibilidade (axe, WCAG 2.2 AA), CSP, links, sitemap, SEO, orçamento de peso.

### Licença
- PolyForm Noncommercial 1.0.0. Uso comercial mediante licença do autor.
