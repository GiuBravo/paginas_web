## DeckBuilder (Cursor)

Este projeto foi “desmonolitarizado”: o HTML original (`Deckbuilder_cursor.html`) foi mantido como backup, e o código principal agora roda a partir de:

- `index.html`: markup principal
- `src/style.css`: CSS extraído do `<style>`
- `src/main.js`: JS extraído do `<script>` (mantido como script global para compatibilidade com `onclick="..."`)
- `vite.config.js`: proxy opcional para imagens same-origin em dev

Documentação mais ampla do projeto (arquitetura, scripts, mapa de subsistemas): **[docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md)**. Convenções de código e comentários em PT-BR: **[docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)**.

### Como rodar

```bash
npm install
npm run dev
```

### Formatação

```bash
npm run format
```

