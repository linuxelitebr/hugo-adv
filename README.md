# hugo-adv

Tema Hugo para sites de escritórios de advocacia: leve, acessível (WCAG 2.2 AA), sem rastreadores de terceiros e totalmente parametrizável pelo `hugo.toml`.

Baseado no [Justice Hugo Template](https://github.com/CloudCannon/justice-hugo-template), da CloudCannon (licença MIT).

> Em desenvolvimento. Ainda não pronto para uso.

## Princípios

- **Nenhum dado de cliente no tema.** Nome, logo, contatos, cores e textos ficam no repositório do site de cada escritório. O tema só traz um `exampleSite/` fictício.
- **Privacidade por padrão.** Sem cookies de terceiros, sem scripts de rastreamento, compatível com a LGPD sem banner de consentimento.
- **Conformidade com a publicidade da advocacia** (Código de Ética e Disciplina da OAB e Provimento 205/2021) nos componentes padrão.

## Contribuindo

Ative os hooks de proteção depois de clonar:

```sh
git config core.hooksPath .githooks
```

Eles rodam o [gitleaks](https://github.com/gitleaks/gitleaks) e, para mantenedores, verificam uma lista local de termos proibidos (fora do repositório).

## Licença

MIT. Veja [LICENSE](LICENSE).
