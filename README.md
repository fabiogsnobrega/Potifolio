# Portfólio — Fábio Germano Nóbrega

Site estático feito com HTML, CSS e JavaScript, sem dependências de build.

## Páginas

- `index.html` — apresentação em português, seletor de idioma e animação automática Computador → Têmis → Engrenagem → Têmis → Computador.
- `pages/about.html` — currículo e trajetória profissional.
- `pages/projects.html` — espaço para projetos publicados; a animação da Home é parte da apresentação, não um projeto.
- `pages/contact.html` — e-mail profissional e perfil do GitHub.
- `pages/projects/project-template.html` — modelo para páginas de projetos futuros.

## Executar localmente

Abra `index.html` em um navegador. As ilustrações usadas durante a animação estão incorporadas em `js/transition-lab-assets.js`, sem requisições `fetch` para arquivos SVG locais. O SVG do computador também fica como imagem estática de segurança antes da inicialização do JavaScript. Se o navegador indicar movimento reduzido, a Home permanece estática por acessibilidade; nos demais casos, o ciclo começa automaticamente.

Também é possível servir a pasta com qualquer servidor estático; não é necessário instalar frameworks ou pacotes.

## Publicar

Publique a raiz do repositório em uma hospedagem estática. No GitHub Pages, selecione a branch `main` e a pasta raiz (`/`). Os caminhos relativos funcionam em hospedagem de projeto.
