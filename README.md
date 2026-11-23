# hugo-adv

Tema Hugo para sites de escritórios de advocacia: leve, acessível (WCAG 2.2 AA), sem rastreadores de terceiros e totalmente parametrizável pelo `hugo.toml`.

Escrito do zero. A direção visual inicial foi inspirada no [Justice Hugo Template](https://github.com/CloudCannon/justice-hugo-template), da CloudCannon, sem reaproveitamento de código.

> Em desenvolvimento. Ainda não pronto para uso.

## Princípios

- **Nenhum dado de cliente no tema.** Nome, logo, contatos, cores e textos ficam no repositório do site de cada escritório. O tema só traz um `exampleSite/` fictício.
- **Sem dependências de build.** Somente Hugo extended: CSS moderno sem Sass, sem Node, sem CDN, JavaScript opcional.
- **Privacidade por padrão.** Sem cookies de terceiros, sem scripts de rastreamento, compatível com a LGPD sem banner de consentimento.
- **Conformidade com a publicidade da advocacia** (Código de Ética e Disciplina da OAB e Provimento 205/2021) nos componentes padrão.

## Uso

No repositório do site (Hugo Modules):

```sh
hugo mod init github.com/<voce>/<seu-site>
```

```toml
# hugo.toml do site
locale = "pt-BR"
disableKinds = ["taxonomy", "term"]

[module]
  [[module.imports]]
    path = "github.com/linuxelitebr/hugo-adv"

[params.firm]
  name = "Nome do escritório"            # obrigatório
  legalName = "Razão social"
  oabRegistration = "OAB/UF 00.000"      # obrigatório (registro da sociedade)
  cnpj = "00.000.000/0001-00"
  tagline = "Frase curta"
  email = "contato@seudominio.com.br"
  phone = "(00) 0000-0000"
  whatsapp = "5500900000000"             # somente dígitos, com DDI
  whatsappDisplay = "(00) 90000-0000"
  hours = "Segunda a sexta, das 9h às 18h"
  [params.firm.address]
    street = "..."
    district = "..."
    city = "..."
    state = "UF"
    postalCode = "00000-000"
    mapUrl = "https://..."
    display = "full"                     # "full" (padrão), "city" (só cidade/UF) ou "none"
    note = "Atendimento com hora marcada"  # opcional, exibido junto ao endereço

[params.brand]
  logo = "brand/logo-light.svg"          # em assets/ do site
  logoDark = "brand/logo-dark.svg"
  favicon = "brand/favicon.svg"
  [params.brand.colors]                  # tema claro
    primary = "#..."
    primaryStrong = "#..."
    ink = "#..."
    muted = "#..."
    surface = "#..."
    border = "#..."
  [params.brand.colorsDark]              # tema escuro (mesmas chaves + background)
  [params.brand.fonts]
    heading = "Nome da fonte de títulos"
    body = "Nome da fonte de texto"
    [[params.brand.fonts.files]]         # woff2 em assets/ do site
      family = "..."
      weight = 400
      path = "fonts/arquivo.woff2"
      preload = true
```

Seções de conteúdo (nomes configuráveis em `params.sections`): `areas-de-atuacao/` (`type = "practice"`), `equipe/` (`type = "people"`), `artigos/` (`type = "articles"`), `contato.md` (`type = "contact"`) e `privacidade.md`. Veja o `exampleSite/`.

### Proteções de build

- O build falha sem `params.firm.name` ou `params.firm.oabRegistration`.
- Em produção (`hugo --environment production --panicOnWarning`), o build falha se houver `[A PREENCHER]` ou `[VERIFICAR]` em qualquer página, se algum artigo não tiver `legalReview = "aprovado"` ou se outra página declarar `legalReview` diferente de `"aprovado"`.
- Artigos exibem "Atualizado em" quando `lastmod` é posterior a `date`.
- O tema gera `_headers` para a Cloudflare com CSP restritiva, HSTS e demais headers de segurança.

## Desenvolvimento

```sh
hugo server -s exampleSite          # visualizar o tema
cd tests && pnpm install && pnpm test   # build, axe (WCAG 2.2 AA), CSP, links, orçamento de peso
```

## Contribuindo

Contribuições externas dependem de um termo de cessão de direitos (CLA), para preservar o licenciamento comercial. Abra uma issue antes de enviar código.

Ative os hooks de proteção depois de clonar:

```sh
git config core.hooksPath .githooks
```

Eles rodam o [gitleaks](https://github.com/gitleaks/gitleaks) e, para mantenedores, verificam uma lista local de termos proibidos (fora do repositório).

## Licença

[PolyForm Noncommercial 1.0.0](LICENSE.md). O código é visível e pode ser estudado e usado para fins não comerciais.

**Uso comercial**, incluindo o site de qualquer escritório de advocacia ou empresa, exige licença comercial do autor. Entre em contato pelo perfil [linuxelitebr](https://github.com/linuxelitebr).

Versões anteriores a esta mudança de licença foram publicadas sob MIT.
