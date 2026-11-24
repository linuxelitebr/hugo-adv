# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem [SemVer](https://semver.org/lang/pt-BR/).

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
