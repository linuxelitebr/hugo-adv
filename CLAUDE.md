# CLAUDE.md

Instruções permanentes para o Claude Code neste repositório.

## Contexto

`hugo-adv` é um tema Hugo **público** (licença MIT) para sites de escritórios de advocacia, escrito do zero (a direção visual inicial foi inspirada no Justice Hugo Template da CloudCannon, sem reaproveitamento de código). Cada escritório usa o tema a partir de um repositório próprio e privado, via Hugo Modules, com versão fixada por tag semântica.

Hospedagem alvo: Cloudflare (Workers Static Assets), somente free tier.

## Prioridade máxima: segurança e não vazamento

Segurança vem antes de qualquer outra consideração, em todas as etapas.

1. **Este repositório é público.** Nunca inclua nome, logo, contatos, textos, cores, domínios, capturas de tela ou qualquer dado de um escritório cliente. Tudo isso é parâmetro do `hugo.toml` ou arquivo do repositório do site.
2. O `exampleSite/` usa somente dados claramente fictícios (domínio `example.com`, telefones de faixa reservada, pessoas inventadas).
3. Os hooks em `.githooks/` (lista local de termos proibidos e gitleaks) devem estar ativos: `git config core.hooksPath .githooks`. Nunca usar `--no-verify`.
4. Na dúvida se algo identifica um cliente, não commitar e perguntar.
5. Sem scripts de terceiros, rastreadores, CDNs externas ou cookies. Fontes e assets auto-hospedados.
6. Content-Security-Policy restritiva compatível com o tema (sem `unsafe-inline` em scripts). Markdown sem HTML livre (`unsafe = false`); usar shortcodes.
7. Formulários nunca enviam dados para serviços de terceiros; o processamento fica num Worker do próprio site, com Turnstile.

## Convenções

- Código, identificadores, commits e comentários em inglês. Textos de interface em pt-BR via `i18n/`, com estrutura pronta para outros idiomas.
- Sem emojis e sem travessão (em dash) em textos.
- Acessibilidade WCAG 2.2 AA, mobile first, sem JavaScript obrigatório para navegar.
- Conformidade com a publicidade da advocacia (Código de Ética e Disciplina da OAB, Provimento 205/2021): sem preços, sem promessa de resultado, sem captação indevida; inscrição na OAB visível.
- Conventional Commits. Versionamento semântico com tags `vX.Y.Z`.
- Não copiar código do Justice nem de outros temas. Se algum trecho de terceiro for reaproveitado, registrar a origem e a licença, e incluir o aviso de copyright exigido no `LICENSE`.
- Build somente com Hugo extended: sem Sass, Node, PostCSS ou CDN. CSS moderno (custom properties, nesting) processado por Hugo Pipes. Node é permitido apenas como ferramenta de teste (Playwright e axe), nunca no build do site.
