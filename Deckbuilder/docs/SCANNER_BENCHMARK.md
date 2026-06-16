# Scanner benchmark v1 — DeckBuilder GiuBravo

Contrato de testes para evolução do leitor OCR/câmera.

**Regras gerais:**

- Fases em ordem: **A→B→C→D→E→F→G→H→I→J**; não avançar sem cumprir a meta de fecho da fase anterior.
- Não mudar ambiente (luz, cartas, mesa) entre fases sem anotar no **Histórico de sessões**.

Referência de logs: pasta `logs/`, análise com:

```bash
node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_<STAMP>.zip
```

---

## Ambiente (preencher e não alterar durante a Fase A)

| Campo | Valor |
|-------|--------|
| **Benchmark ID** | `v1.1-2026-06-02` (evolução de `v1-2026-06-01`) |
| **Dispositivo** | _[X] PC _[ ] Android _[ ] iOS — modelo: __Processador i7-6700K 4.00GHz 32GB de RAM DDR4 Placa de vídeo NVIDIA Geforce RTX 3070 SSD M.2. 2TB |
| **Browser** | _[X] Chrome _[ ] Edge _[ ] Safari — versão: __148.0.7778.179 (Compilação oficial) (64 bits) |
| **App** | `npm run dev` → http://localhost:5173 |
| **Enquadramento** | _[ ] Mira fixa do scanner _[X] Carta solta na mesa |
| **Sleeve** | _[X] Sem _[ ] Com sleeve |
| **Luz** | Mesa, luz fixa; evitar mudar entre sessões |
| **Fundo** | Madeira (como nas fotos de referência) |

**Notas do ambiente:** cartas fotografadas em mesa, foil com reflexo; Psychic End Punisher é carta **em inglês** (MP23-EN086) — útil para testar OCR de nome EN vs PT.

---

## Cartas fixas do benchmark (6)

Ordem sugerida na coleta: uma carta de cada vez, ~20–30 s estável, depois trocar.

| # | Nome (PT/EN) | Passcode (`cardId`) | Set (foto) | Tipo | Raridade (física) | Tipo esperado (UI) | Raridade esperada (UI) | Atributo esperado (Fase F) | Level/Rank/Link (Fase G) | Desafio principal |
|---|----------------|---------------------|------------|------|-------------------|--------------------|------------------------|----------------------------|--------------------------|-------------------|
| 1 | Brigrand, O Dragão da Glória | `34848821` | CH01-PT047 | Monstro Fusão / Efeito | Ultra Rare | Monstro Fusão | Ultra Rara | DARK | level=8 | Nome foil dourado; moldura roxa; nível 8 |
| 2 | Livro da Lua | `14087893` | LCJW-PT288 | Magia Rápida | Secret Rare | Magia Rápida | Secreta | **SPELL** (ícone verde «Spell Card», não LIGHT/DARK) | **kind=spell** (barra «[Spell Card]», sem estrelas) | Foil diagonal na arte + nome |
| 3 | Vazio Helsombraneco | `92079625` | GFTP-PT007 | Monstro Virar / Efeito | Ultra Rare | Monstro Virar | Ultra Rara | DARK | level=9 | Nome foil; nível 9 |
| 4 | Zeroboros Topológico | `66403530` | SDRR-PT041 | Monstro Link / Efeito | Ultra Rare | Monstro Link | Ultra Rara | DARK | link=4 (sem level) | Moldura azul Link; nome foil; link 4 |
| 5 | Hordeum Maligno Cavaleiro Exciton | `46772449` | BLC1-PT015 | Monstro XYZ / Efeito | Ultra Rare | Monstro XYZ | Ultra Rara | DARK | rank=4 | Moldura preta XYZ; rank 4 |
| 6 | Psychic End Punisher | `60465049` | MP23-EN086 | Monstro Sincro / Efeito | Secret Rare | Monstro Sincro | Secreta | LIGHT | level=11 | Nome inglês; foil Secret; nível 11 |

**Critério de acerto por carta (Fase C):** `matchedCardId` = passcode da tabela (ou `cardId` equivalente no app).

**Índice visual:** todas as impressões acima estão no `public/data/art-hash-index.json` (passcode = `cardId` na API YGOPRODeck).

**Físico (Ultra/Secret):** a zona do passcode (canto inferior esquerdo, 8 dígitos) **não** tem foil — acabamento matte como Comum; brilho forte no **nome** e na **arte**. Não inferir Secret/Ultra só por métricas na ROI do passcode; Fase B (dHash) usa só a arte canónica.

---

## Procedimento padrão (sempre igual)

### Coleta completa (75 amostras, 6 cartas)

1. `npm run dev` na raiz do projeto.
2. Abrir o DeckBuilder → modo **Scanner OCR**.
3. Botão **「Coletar informações」** → ligar (fica ativo).
4. Para **cada uma das 6 cartas** (na ordem da tabela):
   - Encostar/centralizar na mira (ou posição definida no ambiente).
   - Manter **20–30 s** sem tremer.
   - Trocar carta.
5. Botão de novo → **「Parar e exportar」**.
6. Mover o ZIP para `logs/`.
7. Analisar:

   ```bash
   node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_<STAMP>.zip
   ```

8. Actualizar histórico:

   ```bash
   npm run benchmark:update -- .\logs\ocr_diagnostics_<STAMP>.zip --phase <LETRA> --notes "..."
   ```

9. Copiar métricas relevantes para a tabela **Histórico** abaixo.

**Duração alvo:** ~2 minutos de coleta (Brigrand/Livro/Zeroboros 13 + Vazio/Exciton 12 + Psychic 12 pipeline = 75).

**Limite art_only:** durante coleta activa, o canal `art_only` (loop de preview) grava até **63** amostras (`OCR_DIAG_MAX_ART_ONLY = 75 − 12`). Os **12** slots restantes são `pipeline` (modo leve — OCR completo esparso, Fase H nome). Quando `art_only` enche, a coleta continua via pipeline até 75 totais. Se parar antes de 75, verificar log «Canal art_only cheio» — não exportar cedo. Segmentos: Brigrand seq **0–12** (13); Livro **13–25** (13); Vazio **26–37** (12); Zeroboros **38–50** (13); Exciton **51–62** (12); Psychic **63–74** (12 pipeline).

**Modo coleta leve (v1.1):** durante coleta activa, sem toast/som/cooldown de match; art_only só dHash + typeProbe (sem JPEG robot/passcode); pipeline ≤12; cap estrito **75** amostras; throttle art_only **600 ms**.

**Ao trocar carta (novo segmento):** repor **Tipo** e **Raridade** em **Auto** — evita hints manuais (ex. Sincro) a contaminar Zeroboros/Psychic.

**Regressão C + H (P3):** se matched regredir vs oficial **e** H &lt; ref.G (4/6), **não** aumentar pipeline além de 12 — corrigir enquadramento/nome antes de nova coleta.

**Export ZIP (modo rápido, default):** «Parar e exportar» não corre Tesseract em 75 amostras — no máximo **3 sondas** passcode (`OCR_DIAG_PASSCODE_EXPORT_PROBE_MAX`) + compactação assíncrona (`fflate.zip`). Meta **&lt;90s** para 75 amostras. JPEGs no ZIP: `passcode_raw`, `art`, `raw_name_ocr` (sem `robot` na coleta). Barra dupla na coleta: total 0–75 + carta actual (ex. «3/6 Vazio — 7/10 nesta carta»).

### Coletas curtas (validação D/E/F/G)

Coletas de **~15 amostras, 1 carta** são válidas para validar fases **D, E, F ou G** isoladamente, sem exigir as 75 amostras completas. Anotar no histórico qual fase e qual carta.

**Nota (implementação):** `analyze-ocr-diagnostics.mjs` reporta secções dedicadas às Fases D/E/F/G.

---

## Metas por fase (critérios de “passou”)

| Fase | Objetivo | Meta intermédia | Meta fecho | Depende de |
|------|----------|-----------------|------------|------------|
| **A** | Warp / alinhamento | warpActive ≥ 70% | estável em 2 coletas | — |
| **A** | Fonte arte | art_mira < 30% | idem | — |
| **B** | dHash top0 correcto | ≥ 4/6 com top0≤9 | ≥ 4/6; matchedWrong=0 | A |
| **C** | Match ao vivo (sem coleta) | ≥ 4/6 cartas correctas na lista | ≥ 5/6; 0 fora dos 6 passcodes | B |
| **C** | Coleta strict (benchStrict) | ≥ 40 matched/75 | ≥ 51/75; 6/6 cartas | B |
| **D** | **Tipo / moldura** | ≥ 4/6 segmentos correctos | ≥ 5/6 | C |
| **E** | **Raridade** | ≥ 4/6 correctos | ≥ 5/6 | D |
| **F** | **Atributo / ícone Spell-Trap** | ≥ 4/6 aplicáveis | ≥ 5/6 (Livro=SPELL) | E |
| **G** | **Level / Rank / Link / spell-trap strip** | ≥ 4/6 aplicáveis | ≥ 5/6 (Livro=kind spell) | F |
| **H** | Nome OCR (PT + EN) | ≥ 3/6 | ≥ 4/6 | G |

> **Fase H — gate offline 5/6 PASSOU (2026-06-14):** `npm run benchmark:name-offline` valida nas 6 fotos com o engine do runtime (tesseract.js + CLAHE + binarização adaptativa). Falta só o fecho **runtime** numa coleta 75 (ao vivo ainda 2/6). Ver §"Gate offline Fase H" abaixo.
| **I** | Integração coleta 75 | pipeline>0; warp 75/75 | matched≥51; 0 fora benchmark | H |
| **J** | Passcode 8 dígitos Konami | raw>0; ≥ 2/6 candidatos correctos | ≥ 4/6 em sidecar.candidates | I |

> **Fase J — gate offline 5/6 PASSOU (2026-06-14):** `npm run benchmark:passcode-offline` valida nas 6 fotos com o engine do runtime (tesseract.js). Falta só o fecho **runtime** numa coleta 75 (sidecar ainda 0/6 ao vivo). Ver §"Gate offline Fase J" abaixo.

**Fora de scope v1.1:** OCR caixa de efeito, ATK/DEF.

### Fase A — Warp / alinhamento

**Proibido para agentes na Fase A:** alterar Paddle, Tesseract, calibrador foil, política de match `ambiguous`, deck builder, i18n geral.

### Fase B — dHash

**Análise Fase B** (`analyze-ocr-diagnostics.mjs`): por carta usar `minDist` (`artBenchmarkDist`), `rankTop5` / `minInTop5` em `topCandidates[0..4]`, não confundir com UI global em `art_only`.

**Índice (Fase B):** **Congelados** (patch ignora): Livro, Psychic, Exciton (`minDist=9` em `1780667198734`). **Aceitação congelada** (ambiguous→strong `dist≤9`, `gap≥1`). **Push 4ª carta:** Vazio + Zeroboros repatch. Brigrand índice estável. Meta: ≥4/6 `top0≤9`, `matches ≥ 15`, zero fora benchmark.

**Iluminação referência (3/6):** sombra + janela + luminária distante — manter setup das coletas `1780664164076` / `1780664930546`.

**Fase C (pós `1780667905754`):** baseline B = 4/6 `top0≤9` (Livro+Vazio+Zeroboros), warp 75/75, zero matched fora benchmark. **Recuperar:** Livro (`top0≤9` 2→13), Psychic, Exciton, Brigrand (`minDist=14` — 5ª/6ª carta) **sem perder** Vazio/Zeroboros. **Manter:** índice congelado Livro/Psychic/Exciton; push Vazio+Zeroboros; rerank Brigrand dist≤14 gap≥3; aceitação pipeline sem bloqueio Paddle em coleta.

### Fase D — Tipo / moldura

- **Campos (diagnóstico):** `typeProbe.classifiedTypeFromFrameOnly` (moldura pura), `typeProbe.classifiedTypeMerged` (moldura + faixa do nome), `typeProbe.classifiedTypeFromNameStripOnly` (placa do nome).
- **Análise (`ocr-diag-analyze.mjs`):** prioriza `classifiedTypeMerged` quando coincide com o tipo esperado do segmento; senão usa merge/faixa se moldura = Normal/Efeito; senão moldura pura. Meta fecho: ≥5/6 cartas com **≥50%** amostras correctas no segmento.
- **PAUSA HARD (coleta ao vivo):** após **5** amostras no segmento, se Fase D &lt;50%, a coleta **pausa** (banner vermelho no quadro + log). Corrigir carta na mira, **Tipo/Raridade → Auto**, retomar com «Coletar informações». Não exportar ZIP com anomalia D (ex. Zeroboros 31%).
- **Impacto:** alimenta `buildScannerFoilPreviewSettings` / passes Paddle+Tesseract.
- **Teste manual:** Livro → Magia Rápida; Zeroboros → Monstro Link; Exciton → Monstro Xyz; Psychic → Monstro Sincro.

#### Zeroboros Topológico (`66403530`, seq 38–50) — preflight obrigatório

1. Antes do segmento: confirmar **SDRR-PT041** Monstro Link (moldura azul escura), **não** Sincro/Xyz na mira.
2. Ao iniciar seq 38: **Tipo → Auto** e **Raridade → Auto** (reset automático ao trocar segmento).
3. Se o quadro mostrar UI Sincro/Xyz dominante com G link 100% mas D &lt;50%: carta errada ou glare — **parar**, não continuar as 13 amostras.
4. Meta segmento: **D ≥92%** (oficial 100%), matched 13/13, G link 4 = 100%.

### Fase E — Raridade

- **Campo:** `rarityProbe.classifiedRarity`.
- **Distribuição esperada:** 4× Ultra Rara (Brigrand, Vazio, Zeroboros, Exciton), 2× Secreta (Livro, Psychic).

### Fase F — Atributo

- **Campo:** `featureMiraProbe.liveProbe.attribute` ou `attribute` em amostras.
- **Monstros:** LIGHT, DARK, WATER, … (canto superior direito).
- **Magia / Armadilha:** ícone do tipo de carta (SPELL / TRAP), **não** atributo elemental.
- **Região:** mira atributo (`#scanner-attribute-visual`).

**Atributo — Magia e Armadilha:**

- Monstros: canto superior direito = atributo (LIGHT, DARK, WATER, …).
- Magias/Armadilhas: a **mesma região** (`TCG_REGIONS.attribute`) mostra o **ícone do tipo de carta** (Spell / Trap), não atributo elemental.
- No código: `classifyAttributeFromRgb` pode devolver `SPELL` ou `TRAP`; `metaFromApiCard` usa `attr: 'SPELL'|'TRAP'` para Magia/Armadilha.
- **Livro da Lua:** esperado `SPELL`, **não** classificar como monstro DARK/FIRE/etc.

Referência: `src/ocr-card-features.mjs` (`classifyAttributeFromRgb`, `metaFromApiCard`), `src/ocr-card-track.mjs` (`TCG_REGIONS.attribute`).

### Fase G — Level / Rank / Link

- **Campo:** `featureMiraProbe.liveProbe.levelRank.kind` + `value`.
- **Valores:** `level`, `rank`, `link`, `spell`, `trap`, `none`.
- **Livro da Lua:** `kind=spell`, `value=null` — **não** contar estrelas nem rank.

**Level / Rank / Link — Magia e Armadilha:**

- Monstros: faixa `levelRank` = estrelas amarelas (level), estrelas pretas (rank), ou indicador Link.
- Magias/Armadilhas: faixa mostra texto/tipo **«Spell Card»** / **«Trap Card»** com ícone — **sem estrelas**.
- No código: `probeLevelRankStrip` devolve `kind: 'spell'` ou `kind: 'trap'` (não `level`/`rank`).
- **Livro da Lua:** esperado `levelRank.kind === 'spell'`, value null — **não** contar estrelas nem rank.

Referência: `src/ocr-card-features.mjs` (`probeLevelRankStrip`), `src/ocr-card-track.mjs` (`TCG_REGIONS.levelRank`).

### Fase H — Nome OCR (PT + EN)

Validar reconhecimento do nome na faixa superior: cartas PT (5/6) e Psychic em inglês (MP23-EN086). Meta intermédia ≥ 3/6 cartas com nome legível; fecho ≥ 4/6.

#### Gate offline Fase H (2026-06-14) — **5/6 PASSOU**

Benchmark offline dedicado: `npm run benchmark:name-offline` (`scripts/bench-name-offline.mjs`).
Mesmo engine do runtime (tesseract.js), recorta a faixa do nome (`TCG_LAYOUT_MM.name`:
x=3.5, y=3.3, h=6.8 mm; largura até ao atributo) e valida por tokens com
`benchNameMatchesExpected` (espelho de `src/ocr-diag-analyze.mjs`). Resultado **5/6**:
Brigrand, Vazio, Zeroboros, Exciton e **Psychic (EN)** OK; só **Livro da Lua** falha
(nome embossado prateado-sobre-prateado, contraste baixíssimo — o nome PT mais difícil,
análogo ao Brigrand na Fase J). Gate `≥3/6` e fecho `≥4/6` satisfeitos **offline** →
desbloqueia coleta 75 para fecho runtime (que continua 2/6 ao vivo).

**Chave do ganho:** os nomes foil/embossados têm contraste muito baixo. CLAHE (equalização
local de histograma do `sharp`) + binarização adaptativa mean-C (ambas as polaridades, para
texto prateado claro **ou** escuro) + várias PSM + whitelist de letras/acentos PT.
Rects da faixa do nome medidos à mão na frame 900-wide (deteção automática não é fiável nas
fotos com cartas vizinhas; não representa o warp do runtime).

**Setup:** `npm run vendor:tess-lang` (uma vez) e depois `npm run benchmark:name-offline`.

### Fase I — Integração coleta 75

Coleta completa com pipeline activo: warp 75/75, `sampleKind: pipeline` > 0, matched arte ≥ 51/75, zero `matchedCardId` fora dos 6 passcodes do benchmark.

### Fase J — Passcode 8 dígitos Konami

Na faixa inferior da carta (esquerda → direita):

| Zona | Exemplo | OCR Fase J? |
|------|---------|-------------|
| © | © | Não |
| **Set code** | CH01-PT047, LCJW-PT288 | **Não** — letras + hífen + 3 dígitos |
| **Passcode (ID Konami)** | 34848821 | **Sim** — exactamente 8 dígitos (0–9) |
| Edição | 1ª Edição | Não |

**Código (`src/ocr-card-track.mjs`):**

| Campo | Significado | Uso |
|-------|-------------|-----|
| `TCG_LAYOUT_MM.passcode` / `passcodeSetCode` | **Deprecated** — ROI era passcode, não set code | **Não** usar; set code PT fica abaixo da arte (direita) |
| `passcodeStrip` | Faixa inf. esquerda (8 dígitos + edição) | Seed de projeção / `findPasscodeEightDigitBand` |
| `passcodeDigits` | 8 dígitos matte (OCR) | Crop OCR Fase D |
| `passcodeVisualMira` | Mira laranja (~18% largura) | **Preview** `#scanner-passcode-visual` (sem «1ª Edição») |

**Sinais de crop errado (não avançar para coleta 75):** `rawPasscodeJpeg` legível como `CH01-PT…`, só 3–4 dígitos (047, 1543), ou sidecar com comprimento ≠ 8.

**Metas Fase J (numéricas):** meta intermédia **≥ 2/6** passcodes correctos em `sidecar.candidates`; meta fecho **≥ 4/6**. Manter matched arte **≥ 51** (baseline histórico `1780766030211`, alvo 55).

**Nota:** texto pequeno, difícil na câmara; especialmente importante para cartas PT só na API EN (Psychic End Punisher).

#### Runtime H/J desligado do offline — causa-raiz (coleta 1781458183349)

Diagnóstico do ZIP (`passcodeSamplesWithRaw=0`, H 1/6): **o re-OCR de export estava a ler fora
da carta (madeira), não o pré-processamento que falhava.** Os JPEGs `images/sample_*_passcode_raw.jpg`
das 12 amostras pipeline mostravam **mesa de madeira**, embora a arte da mesma warp estivesse perfeita.

- **Warp boa:** `_frozenOcrWarp` tem crops corretos em canónico 590×860 (`nameCrop y≈75`, `passcodeCrop y≈800`).
- **Passcode (fix aplicado):** `passcodeSidecarJpegSourcesForSample` usava o JPEG guardado, gerado por
  `resolvePasscodeOcrCrop`→`findPasscodeEightDigitBand` (busca-de-tinta) que derivava para a madeira.
  Agora **prefere a faixa geométrica da layout** (`regionsOnCanonicalCard().passcodeStrip`) recortada
  do warp congelado — só no caminho de **export** (não toca deteção ao vivo A–G/C).
- **Nome:** o OCR pipeline (`runOcrDiagPipelineNameOnSample`) já usa `ocrWarp.nameCrop` correto; o
  `nameCropOcr` guardado (mira de vídeo fixa) é só metadata. O ganho do nome será o **port do
  pré-processamento offline** (CLAHE + binarização adaptativa), depois de validar a geometria.

**Validação pendente (Tarefa 4):** export manual de 1 Brigrand ao vivo (`npm run dev`) com
`passcode_raw` legível no ZIP **antes** de pedir coleta 75. Se o crop geométrico ainda for madeira,
a warp sobre-estende verticalmente (Phase A) e o fix muda de rumo.

#### CONFIRMADO: a warp sobre-estende verticalmente (coleta 1781460187606, 2 cartas)

A coleta de 2 cartas completas (27 amostras, 4 pipeline: Brigrand 11–12, Livro 24–25) deu de novo
`raw=0`, mas agora com causa-raiz **definitiva**. Calibrando pelos crops das amostras:

- `sample_011_art.jpg` (Brigrand) sai **perfeito** — vê-se a fila de estrelas de nível no topo e o
  set code `CH01-PT047` em baixo. Por essas marcas, a carta ocupa só **canónico y ≈ 0.067–0.93**
  (≈16% de margem de madeira: topo+fundo, variável por frame).
- `sample_011_passcode_raw.jpg` = **madeira**; `sample_011_raw_name_ocr.jpg` = madeira + borda Fusion
  (o crop do nome cai **acima** da carta).

Mecânica: `warpCardToCanonicalCanvas` **não é rectificação de perspectiva** — é um *stretch da
bounding-box* (`ctx.drawImage(video, card.x, card.y, card.w, card.h, 0,0, 590,860)`). A bbox de
`detectCardFromVideo` é mais alta que a carta → a carta fica inset com madeira em cima/baixo. A arte
(centro) sobrevive (por isso A–G/C passam); nome (topo) e passcode (fundo) caem na margem.

**Fix aplicado (opção «remap», escolhida pelo utilizador):** nova `detectCardExtentOnCanonical(canvas)`
em `ocr-card-track.mjs` acha a extensão real da carta no warp por energia de gradiente por linha/coluna
(transição madeira→borda). Em `buildScannerWarpOcrContext` remapeia **apenas** `name`, `passcodeDigits`,
`passcodeStrip` para essa extensão (arte/tipo/level/atributo intactos → A–G/C/D-centrais protegidos);
o mesmo remap é aplicado no caminho de export (`passcodeSidecarJpegSourcesForSample`). **Guardado:**
sem margem relevante ou baixa confiança → `null` → mantém comportamento atual (sem regressão).

Teste sintético (carta inset em madeira a 0/8/16%): **aresta inferior (passcode) exacta nas 6 cartas**;
aresta superior (nome) boa em 5/6 (Psychic é low-contrast no topo e fica instável — mas o nome do
Psychic já falhava por cair na margem, logo sem regressão líquida). Falta **validar ao vivo**.

#### Validação live do remap (coleta 1781461462288, 2 cartas) — remap OK, falta crop fino + OCR

O remap **carregou e funcionou**: `frozenPC.y` subiu **784 → 713–731** (saiu da madeira), `passcode_raw.jpg`
deixou de ser madeira (mostra borda/arte inferior da carta). `ocrWorker` **está disponível** (falha é
`ocr_no_readable_name`, não `ocr_worker_unavailable`). dHash da arte perfeito (dist 4–12, IDs certos).
Mas `raw=0` / nome 0 persistem porque: (a) o crop caiu ~30–40px **acima** dos dígitos (ink-refine
`findPasscodeEightDigitBand` / `refineNameOnCanonical` derivam p/ brilho da arte/foil); (b) o
pré-processamento runtime dá garbage nesses crops (→ port offline).

**Debug de geometria adicionado ao ZIP (só pipeline):** `images/sample_NNN_warp_full.jpg` (carta inteira
retificada), `_passcode_geom.jpg` (faixa exacta que o OCR de export recebe) e `_name_geom.jpg`. Permite
calibrar a posição sem adivinhar (não temos a média do warp offline).

#### Crops OCR ancorados à extensão (coleta 1781476919069) — geometria RESOLVIDA e validada offline

Com o `warp_full` da coleta consegui medir em canónico 590×860: carta em y≈82–781; **nome** em y≈115–140;
**8 dígitos `34848821`** no fundo absoluto y≈759–772 (mesma linha que «1ª Edição»). Diagnóstico final:
- O layout mm punha o passcode em **0.9326 H** (`80.2mm/86`), mas os dígitos reais estão em **~0.96–0.98 H**;
  a faixa do nome de layout (`h=6.8mm`) é alta demais (apanha estrelas/arte). O remap proporcional do layout
  não chega — as próprias frações estavam erradas para a carta no warp.
- A deteção **vertical** da extensão é fiável; a **horizontal** é instável (deu falsa margem esquerda numa
  amostra e cortava os dígitos).

**Fix:** `buildScannerWarpOcrContext` passa a definir nome/passcode por **frações calibradas ancoradas à
extensão vertical** da carta (`ocrWarpBenchmarkCropsFromExtent`): nome `{x:0.05,y:0.04,w:0.72,h:0.048}`,
passcode `{x:0.02,y:0.955,w:0.44,h:0.042}` — x/largura à largura total `W` (horizontal não fiável), y/altura
à extensão detetada. **Sem ink-refine** para nome/passcode (derivava p/ brilho da arte); level/type/art
mantêm o refine. Export (`passcodeSidecarJpegSourcesForSample`) usa o `passcodeCrop` congelado.
Validado offline nas 3 amostras pipeline do warp real: **passcode cai exactamente em `34848821`**, nome
completo «Brigrand, o Dragão da Glória». Falta validar OCR ao vivo + portar pré-processamento p/ foils.

#### Coleta 1781477958681 (2 cartas) — crops aplicados; nome corta topo; passcode attempts=0 = export estrangulado

Frozen rects confirmam os crops novos aplicados (`frozenPC.y≈750–778` em cima dos dígitos). Mas:
- **Nome:** `raw_name_ocr` mostra o crop a **cortar o topo das letras** e a apanhar a **fila de estrelas** em
  baixo (varia com a deteção de extensão por frame); Brigrand → `ocr_no_readable_name`, Livro → leu o
  **`[CARD DE MAGIA]`** (faixa de tipo abaixo do nome). **Fix:** subir o topo e dar folga ao crop de nome
  (`y 0.04→0.024`, `h 0.048→0.06`).
- **Passcode:** `attempts=0` em **todas** as coletas, independentemente do crop. Causa-raiz (não era o
  pré-processamento): o export tinha `PROBE_MAX=3` e **abortava à 1ª amostra** sem candidato; além disso os
  **logs de export não eram capturados no ZIP** (a sessão de diagnóstico é limpa no stop → `addOcrLog` do
  export caía no vazio → diagnóstico cego). **Fix:** (1) `ocrDiagnosticsPushLogMirror` espelha na
  `ocrDiagnosticsFlushSession` durante o flush; (2) log por amostra `📦 ID #seq raw="…" attempts=N cands=…`;
  (3) `PROBE_MAX 3→16`, teto `12s→45s`, aborto só após **≥8** sondas sem candidato (cobre o pipeline das 6
  cartas, interleaved). Falta nova coleta para ler os `ID #seq raw=` e decidir se é preciso portar a
  binarização adaptativa do `bench-passcode-offline` p/ os dígitos matte.

#### Coleta 1781480658828 (2 cartas) — CAUSA-RAIZ de J: Tesseract devolve VAZIO no runtime

Com os logs de export agora no ZIP, o passcode ficou transparente:
```
📦 Passcode: export rápido — sondar 4/4 (teto 45s).
📦 ID #11: raw="" attempts=0 cands=0   (~13s)
📦 ID #12: raw="" attempts=0 cands=0
📦 Passcode: teto 45s — a compactar ZIP.
```
- **Nome (H): corrigido.** `raw_name_ocr` mostra «BRIGRAND, O DRAGÃO DA GLÓRIA» inteiro (sem corte) e
  `✅ H pipeline #12: cleaned=Brigrand Draagkoley Gyor match=sim engine=paddle`. O crop subido resolveu.
- **Passcode (J): os dígitos estão lá** (`passcode_raw` mostra `34848821 | 1ª Edição`), mas o OCR devolve
  `raw="" attempts=0` e gasta ~13s/amostra. Diagnóstico decisivo: **todas as leituras boas usam
  `engine=paddle`; o Tesseract (`ocrWorker`) devolve vazio em tudo** (nome `engine=—` quando Tesseract,
  passcode sempre vazio). O `ocrWorker` arranca mas a *lang data* vem de `tessdata.projectnaptha.com` (CDN)
  — inacessível/partida sob a **interceção TLS** do ambiente (a mesma que offline exigiu `curl -k`). O
  passcode só usava Tesseract → nunca lia nada.

**Fix (Fase J via Paddle):** o passcode passa a usar o **Paddle** (o motor que já lê os nomes):
- `recognizePasscodePaddleDigits()` corre o Paddle nos canvases pré-processados da faixa e extrai o
  candidato Konami via `extractYuGiOhPasscodeCandidates`;
- **Paddle-first** nos modos export/sidecar — tenta o Paddle primeiro e **só corre o Tesseract se o Paddle
  não obtiver 8 dígitos** (evita os ~13s/amostra desperdiçados a falhar);
- fallback Paddle também no fim do caminho normal (quando o Tesseract devolve vazio);
- `paddleRecognizeCanvas` passa a devolver `allText` (todas as linhas) para extrair os dígitos mesmo quando
  a linha de maior confiança é o «1ª Edição» e não os dígitos.

Falta validar ao vivo: nova coleta deve mostrar `📦 ID #seq raw="34848821…" cands=[34848821]`.

#### Coleta 1781482913033 — Paddle a ler o passcode (dígitos errados → crop+pré-proc)

Após ligar o Paddle no export (warm-up + sem gate na flag), o Paddle **correu** e devolveu candidatos:
`📦 Passcode: Paddle pronto`, `attempts=1 cands=4`. Mas os dígitos saíram **errados e iguais entre cartas**
(`1413111137` em Brigrand e Livro). Os `passcode_geom` explicaram:
- **Brigrand:** o crop apanhava `34848821 | 1ª Edição` — o texto «1ª Edição» à direita confundia o Paddle.
- **Livro:** dígitos `14087893` em **ciano sobre teal** (contraste baixíssimo).
- Os canvases que alimentavam o Paddle eram as variantes **binarizadas/esticadas do Tesseract**
  (stretch/lc/glare) → viravam os dígitos matte em **riscas** que o Paddle lia como «1».

**Fix:** (1) `OCR_WARP_PASSCODE_FRAC.w 0.44→0.26` — crop só nos 8 dígitos (exclui «1ª Edição»);
(2) `buildPasscodePaddleCanvas()` — canvas **limpo** p/ o Paddle (cinzento + alongamento de contraste
percentil 2–98%, **sem binarização/realce**); o Paddle passa a receber este + o `rawCanvas`, já não as
variantes do Tesseract. Falta validar se o Paddle lê agora `34848821`/`14087893`.

#### Coleta 1781483847589 — crop estreito cortou os dígitos; warp sobre-estende na horizontal

Os `passcode_geom` mostraram que o crop estreito (`w=0.26`) caía **na madeira à esquerda + cortava os
dígitos à direita**: a warp sobre-estende também na horizontal (borda esquerda da carta em ~0.12·W do
canvas, não 0.02). O atributo `attempts` veio como `lc_raw` (Tesseract), não `paddle` → o Paddle não achou
texto no crop cortado e o Tesseract devolveu lixo (`9111767711`, igual entre cartas).

Tentei ancorar a horizontal à extensão detetada, mas a deteção horizontal por energia de gradiente é
**instável** (no `warp_full` recomprimido apontou borda errada e largura <0.6 → extensão inválida, perdendo
até a âncora vertical). Revertida.

**Decisão (combinação ainda não testada):** crop **largo** (`x:0.02..0.48` do canvas) que contém **sempre**
os 8 dígitos apesar da madeira, ancorado só na vertical (fiável), **+ canvas limpo** para o Paddle
(`buildPasscodePaddleCanvas`). O Paddle **localiza** a linha dos dígitos por deteção e o
`extractYuGiOhPasscodeCandidates` tira o código do `allText`. As coletas anteriores só testaram largo+riscas
(col. 4) ou estreito+limpo-mas-cortado (col. 5); falta largo+limpo.

> Se mesmo assim o Paddle falhar nos dígitos matte/baixa-resolução, o limite é a legibilidade na warp
> 590×860 (tira ~150px p/ 8 dígitos). Plano B: vendorizar a *lang* do Tesseract no runtime (como offline,
> onde deu 5/6) em vez do CDN bloqueado por TLS.

#### Coleta 1781485886797 — geometria RESOLVIDA; falta contraste local

`passcode_geom` (largo) contém agora os 8 dígitos completos + «1ª Edição» (Brigrand `34848821`
escuro-sobre-roxo; Livro `14087893` ciano-sobre-teal) e o `name_geom` está bom. Mas `raw=""` em tudo: o
**alongamento de contraste global** do canvas do Paddle era dominado pela madeira/borda do crop largo →
dígitos matte ficavam apagados → Paddle não detetava texto.

**Fix:** `buildPasscodePaddleCanvas` passa a usar **contraste LOCAL (CLAHE-like, `applyLocalContrastNormalize`
por colunas)** + `applyHighlightGlareCompress`, e alimenta o Paddle com **duas polaridades** (normal +
invertida) para cobrir escuro-sobre-claro (Brigrand) e claro-sobre-escuro (Livro). Falta validar.

#### Coleta 1781566157428 + export lento — modo FOCO H/J + crop estreito

Tesseract local carregou (lang em `public/ocr-models/tess/`), mas `raw="" attempts=0` e ~12s/amostra: o
crop largo apanhava o «1ª Edição» → o OCR lia dígitos+texto = rejeitado como lixo, e a leitura nunca
aparecia no ZIP. Brigrand tem os dígitos muito apagados (foil); Livro `14087893` está legível.

Mudanças (a pedido do utilizador — export estava demorado):
- **Modo FOCO H/J** (`OCR_DIAG_EXPORT_FOCUS_HJ=true`): o export **salta o re-probe E/F/G** (raridade/
  atributo/nível) de ~26 amostras — fases que já passam e eram o grosso do tempo. Mantém H (nome) e J
  (passcode). Pôr a `false` p/ um benchmark completo final.
- Teto OCR passcode no export **45s→25s** (só ~5 amostras pipeline a sondar).
- **Crop passcode `w 0.46→0.30`**: exclui o «1ª Edição» (dígitos acabam ~x0.23, «1ª Edição» começa ~x0.24).
- **`captureRaw`**: o export regista a leitura do Tesseract **mesmo quando rejeitada como lixo**, p/ ver no
  ZIP exactamente o que foi lido (sem deixar a leitura-lixo vencer o `best`).

#### Gate offline Fase J (2026-06-14) — **5/6 PASSOU**

Benchmark offline dedicado: `node scripts/benchmark:passcode-offline` (ou `node scripts/bench-passcode-offline.mjs`).
Usa **tesseract.js** (mesmo engine do runtime), corre nas 6 fotos de `docs/benchmark-photos/`,
várias variantes de binarização + PSM, candidatos unidos via `extractYuGiOhPasscodeCandidates`
(como o sidecar acumula entre frames). Resultado: **5/6** (Livro, Vazio, Zeroboros, Exciton,
Psychic OK; só Brigrand falha — foil holográfico na zona do passcode mistura os dígitos do meio).
Gate `≥2/6` e fecho `≥4/6` satisfeitos **offline** → desbloqueia coleta 75 para fecho real.

**Setup (uma vez):** `npm run vendor:tess-lang` (descarrega `eng.traineddata.gz` para `.tess-lang/`;
em ambiente com interceção TLS corporativa usa `curl -k`). Depois `npm run benchmark:passcode-offline`.

**Correção crítica de geometria:** os 8 dígitos ficam na **METADE ESQUERDA** da faixa inferior
(`PASSCODE_DIGITS_IN_STRIP` x=0, w≈0.442 — confirmado pelas fotos: `34848821`, `14087893`, …
encostados à esquerda; «1ª Edição» à direita; set code abaixo da arte). O calibrador antigo
`docs/calibrate-passcode-from-photos.mjs` procura na **metade direita** (`STRIP_LEFT_IGNORE_FRAC=0.42`,
`KONAMI_DEFAULT.passcodeDigits.x=13.0`) — por isso reportava **0/6**: lia «1ª Edição», não os dígitos.
O **runtime já recorta a metade esquerda correcta** (x=1.5, w=11.5). Preferir `bench-passcode-offline.mjs`
como gate de Fase J; o calibrador antigo só serve para os overlays mm e está desalinhado com a realidade.

#### Calibração mira passcode (benchmark-photos)

Valores activos em `src/ocr-card-track.mjs` — **Konami PT** (revert 2026-06-14):

| Campo | mm (carta 59×86) |
|-------|------------------|
| `passcodeDigits.x` | 1.5 |
| `passcodeDigits.y` | 80.2 |
| `passcodeDigits.w` | 11.5 |
| `passcodeDigits.h` | 3.0 |
| `passcodeVisualMira` | 1.5, 80.2, **10.5**, 3.0 (mira laranja; w=passcode.w−1 mm edição) |
| `passcodeStrip` | 1.5, 80.2, 26, 3.2 (passcode + edição) |
| `PASSCODE_DIGITS_IN_STRIP` | x=0, y=0, w≈0.442, h≈0.938 |

**Gate de validação** (`node docs/calibrate-passcode-from-photos.mjs`):

1. Lê as 6 fotos em `docs/benchmark-photos/` (01-brigrand … 06-psychic-end-punisher).
2. Deteta carta 59:86, extrai `passcodeStrip`, ignora colunas 0–42% (set code + ©) e >90% («1ª Edição»).
3. Procura banda de exactamente 8 colunas de tinta (~42–88% da strip, largura ~40–46%).
4. **Validação obrigatória por foto:** crop → heurística dígitos deve igualar o passcode esperado (`34848821`, `14087893`, …); rejeita bbox se `raw` contém letras, «Edição», «ª», hífen, ou comprimento ≠ 8.
5. Gera overlays em `docs/benchmark-photos/calibration-overlays/` para revisão humana.
6. Se **≥2 fotos falham** validação → manter Konami 13.0/11.5 mm (não aplicar mediana).

**Resultado pós-revert (2026-06-14):** `node docs/calibrate-passcode-from-photos.mjs` → **0/6** fotos passaram gate OCR offline; overlays em `calibration-overlays/` para revisão humana; valores Konami mantidos no código.

Calibração errada 2026-06-14 (`x:1.51, w:13.46`) foi revertida: assumia set code na faixa inferior e janela até 52% desde `sx0=0`, capturando 8 dígitos + «1ª Edição».

Mira laranja (`passcodeVisualMira`, ~18% largura) e OCR (`passcodeDigits`) partilham x=1.5; a mira é 1 mm mais estreita para excluir «1ª Edição» do preview.

---

## Baseline conhecido (antes de Fase A)

| ZIP | Data | warpActive | art_mira | Matches arte | Near-miss ≤16 | Notas |
|-----|------|------------|----------|--------------|---------------|--------|
| `ocr_diagnostics_1780336545808.zip` | 2026-06-01 ~14:55 | **0/75 (0%)** | **75/75** | **0** | **43** | dist 10–14, `top0` presente, `kind=ambiguous`; sessão mista Fusão |
| `ocr_diagnostics_1780320746405.zip` | 2026-06-01 ~10:32 | 0/75 | 75/75 | 0 | 3 | dist 15/99; passcode lixo `5111` |

**ZIP oficial do benchmark v1.1:** `ocr_diagnostics_1781306694767.zip` (2026-06-12 20:27).

**ZIP referência Fase G (avanços a preservar):** `ocr_diagnostics_1781055185769.zip` (2026-06-09 22:41) — Vazio **L9 100%**, Exciton **rank 4 100%**, Livro E 100%; matched 57/75 (regressão vs C — Exciton matched 4/12). Comparar Exciton: `node scripts/bench-exciton-dist-compare.mjs logs/ocr_diagnostics_1781051277605.zip logs/ocr_diagnostics_1781055185769.zip`.

**Referência obsoleta (v1.0):** `ocr_diagnostics_1780766030211.zip` — ficheiro já não existe; métricas arte 55 matched 6/6 mantidas como baseline histórico na Fase J.

---

## Histórico de sessões

> **Migração v1.1 (2026-06-02):** benchmark ID actualizado para `v1.1-2026-06-02`. Fases D–J redefinidas (tipo, raridade, atributo, level/rank/link, nome, integração, passcode). Entradas anteriores com «Fase D» referem-se ao esquema v1.0 (passcode OCR); no v1.1 a passcode é **Fase J**. Linhas abaixo **não foram apagadas** — servem de histórico.

| Data | ZIP | Fase trabalhada | warpActive | art_mira | Matches arte | pipeline | Near-miss | Observações |
|------|-----|-----------------|------------|----------|--------------|----------|-----------|-------------|
| 2026-06-01 14:55 | 1780336545808 | — (pré-benchmark) | 0/75 | 75/75 | 0 | 0 | 43 | dia, Não usou as 6 cartas fixas |
| 2026-06-02 16:07 | 1780427231784 | pré-A | 0/75 | 75/75 | 0 | 0 | 16 | dia, benchmark v1 oficial, 6 cartas, mesa |
| 2026-06-02 16:33 | 1780428808836 | A | 47/75 | 0/75 | 1 | 0 | 3 | dia, pós Fase A sessão 1 |
| 2026-06-02 19:07 | 1780438063281 | A | 0/75 | 0/75 | 0 | 0 | 2 | noite, pós Fase A sessão 2 |
| 2026-06-02 19:23 | 1780438994909 | A | 0/75 | 0/75 | 0 | 0 | 7 | noite, pós Fase A sessão 2b — fix regressão |
| 2026-06-02 19:33 | 1780439617028 | A | 0/75 | 0/75 | 0 | 0 | 3 | noite, luminária mais longe |
| 2026-06-03 15:12 | 1780510148890 | A | 75/75 | 0/75 | 0 | 0 | 12 | janela + luminária longe |
| 2026-06-03 15:26 | 1780511097395 | B | 0/75 | 0/75 | 7 | 0 | 68 | pós Fase B sessão 1, janela + luminária longe |
| 2026-06-03 15:43 | 1780512126508 | B fix | 75/75 | 0/75 | 0 | 0 | 63 | pós fix warp+match, janela + luminária longe |
| 2026-06-03 16:33 | 1780514995211 | B | 75/75 | 0/75 | 8 | 0 | 64 | pós Fase B sessão 2, janela + luminária longe |
| 2026-06-03 17:03 | 1780516922336 | B | 75/75 | 0/75 | 0 | 0 | 65 | pós Fase B sessão 3, anoitecendo — janela + luminária longe |
| 2026-06-04 12:46 | 1780587945015 | B | 75/75 | 0/75 | 0 | 0 | 68 | controle dia — comparar 1780516922336 |
| 2026-06-04 13:06 | 1780589064476 | B | 75/75 | 0/75 | 0 | 0 | 64 | pós índice/rerank — Livro top0×5 minDist 10 |
| 2026-06-04 13:30 | 1780590468102 | B | 75/75 | 0/75 | 2 | 0 | 61 | Livro matched×2 top0≤9×1 minDist 8 |
| 2026-06-04 13:54 | 1780591958104 | B | 75/75 | 0/75 | 5 | 0 | 61 | Livro 4×top0≤9 Psychic minDist 5 — 2/6 cartas |
| 2026-06-04 14:26 | 1780593883809 | B | 75/75 | 0/75 | 4 | 0 | 50 | Zeroboros+Psychic OK; Livro regrediu 4→0 |
| 2026-06-04 14:42 | 1780594861622 | B | 75/75 | 0/75 | 5 | 0 | 55 | Livro recuperado minDist 7; Psychic 3×top0≤9; Zeroboros oscilou |
| 2026-06-04 15:22 | 1780597215066 | B | 75/75 | 0/75 | 3 | 0 | 54 | Livro top0≤9×5 minDist 6; Psychic regrediu 0/6 |
| 2026-06-04 15:34 | 1780597756567 | B | 75/75 | 0/75 | 4 | 0 | 48 | coleta calma — Livro+Zeroboros 2/6; Psychic 0 |
| 2026-06-04 15:53 | 1780599089592 | B | 75/75 | 0/75 | 9 | 0 | 56 | 3/6 — Livro top0≤9×12 Exciton×2; Zeroboros regrediu |
| 2026-06-04 16:12 | 1780600243868 | B | 75/75 | 0/75 | 8 | 0 | 58 | 3/6 Livro+Zeroboros; Exciton minDist 10 (regrediu 1pt) |
| 2026-06-04 16:32 | 1780601375878 | B | 75/75 | 0/75 | 6 | 0 | 58 | 3/6 Livro minDist=3 + Exciton top0≤9×1; Zeroboros minDist 10 |
| 2026-06-04 16:48 | 1780602357365 | B | 75/75 | 0/75 | 6 | 0 | 54 | 1/6 — Livro top0≤9×13 minDist 4; Zeroboros minDist 16 (query≠índice) |
| 2026-06-04 | 1780662731749 | B | 75/75 | 0/75 | 9 | 0 | — | Livro congelado top0≤9×13 matched×9 minDist 4; Vazio/Zeroboros top0×1 minDist 12/10 |
| 2026-06-04 17:17 | 1780604010406 | B | 75/75 | 0/75 | 4 | 0 | 56 | anoitecer, lanterna E + luminária D; Brigrand top0@12; 1/6 |
| 2026-06-05 09:36 | 1780662731749 | B | 75/75 | 0/75 | 9 | 0 | 58 | manhã — Livro 9×matched top0≤9×13; Vazio/Zeroboros top0×1 |
| 2026-06-05 09:59 | 1780664164076 | B | 75/75 | 0/75 | 11 | 0 | 54 | **3/6 estável** — trio congelado; Vazio rank2 minDist 14 |
| 2026-06-05 | 1780664930546 | B | 75/75 | 0/75 | — | 0 | — | **3/6 estável** — Vazio rank4 minDist 13; Brigrand 15 Exciton 16 |
| 2026-06-05 | 1780666578435 | B | 75/75 | 0/75 | 15 | 0 | — | matches×15; Vazio top0×3 minDist 12; Zeroboros top0≤9×3 |
| 2026-06-05 | 1780667198734 | B | 75/75 | 0/75 | 15 | 0 | — | **melhor matches×15** 3/6 Livro+Exciton+Psychic; recuperar Zeroboros/Vazio |
| 2026-06-05 10:11 | 1780664930546 | B | 75/75 | 0/75 | 11 | 0 | 56 | 3/6 estável — Zeroboros↑ Psychic↓; Vazio minDist 13 |
| 2026-06-05 10:38 | 1780666578435 | B | 75/75 | 0/75 | 6 | 0 | 54 | 3/6 — Vazio top0×3 minDist 12; matches 6; Livro minDist 3 |
| 2026-06-05 10:48 | 1780667198734 | B | 75/75 | 0/75 | 15 | 0 | 43 | 3/6 Livro+Exciton+Psychic; 15 matches recorde |
| 2026-06-05 11:02 | 1780667905754 | B | 75/75 | 0/75 | 9 | 0 | 52 | FASE B FECHADA 4/6 — Vazio+Zeroboros+Livro; Zeroboros minDist=1 |
| 2026-06-05 | 1780673451733 | C | — | — | — | 14 | — | pipeline OK; name×4; OCR Livro; **matched FORA** 7582066@d2; 35/75 incompleta |
| 2026-06-05 | 1780674610924 | C | — | — | — | OK | — | 0 FORA OK; 2/6 matched (Livro×7 Zeroboros×6); Exciton top0≤9×4 matched=0; Vazio minDist 13; 57/75 |
| 2026-06-05 | — | C | — | — | — | — | — | pós-fix Exciton accept + Vazio rerank + coleta 75 |
| 2026-06-05 12:35 | 1780673451733 | C | 35/35 | 0/35 | 7 | 14 | 21 | pipeline 14, name×4; 35 amostras INCOMPLETO; 1 match errado 7582066 |
| 2026-06-05 12:54 | 1780674610924 | C | 57/57 | 0/57 | 13 | 17 | 37 | 57 amostras; pipeline 17; Livro+Zeroboros matched; Exciton top0≤9×4 sem match; 0 errados |
| 2026-06-05 14:00 | 1780678547882 | C | 75/75 | 0/75 | 36 | 35 | 32 | FASE C FECHADA — 6/6 matched, pipeline 35, Brigrand+Vazio novos |
| 2026-06-05 15:02 | 1780682131749 | D (v1.0 passcode) | 75/75 | 0/75 | 38 | 35 | 31 | coleta 75 OK, Fase C mantida, passcode 0/6 — sidecar vazio em coleta |
| 2026-06-05 15:32 | 1780684082866 | D (v1.0 passcode) | 75/75 | 0/75 | 45 | 35 | 25 | arte 45 matched, 5/6 cartas, Psychic matched=0, passcode 0/6 |
| 2026-06-05 15:51 | 1780685325789 | D (v1.0 passcode) | 75/75 | 0/75 | 55 | 35 | 19 | MELHOR COLETA — 6/6 matched 55, Psychic recovered, passcode sidecar 7 mas 0/6 certo |
| 2026-06-05 16:09 | 1780686449241 | D (v1.0 passcode) | 75/75 | 0/75 | 40 | 35 | 24 | REGRESSÃO vs 5325789 — matched 40, passcode sidecar 0 |
| 2026-06-05 16:30 | 1780687539094 | D (v1.0 passcode) | 75/75 | 0/75 | 43 | 35 | 24 | 6/6 matched 43, passcode raw×16 candidatos 0, enquadramento OK |
| 2026-06-05 16:47 | 1780688517516 | D (v1.0 passcode) | 75/75 | 0/75 | 52 | 35 | 16 | MELHOR ARTE 52 matched 6/6, passcode raw×63 candidatos 0 (1543 lixo) |
| 2026-06-05 17:02 | 1780689591868 | D (v1.0 passcode) | 75/75 | 0/75 | 46 | 35 | 23 | REGRESSÃO vs 8517516 — matched 46, passcode raw=5 lixo |
| 2026-06-06 09:41 | 1780749462559 | D (v1.0 passcode) | 75/75 | 0/75 | 54 | 35 | 19 | MANHÃ pós-fix crop — 54 matched 6/6, passcode candidatos×11 (Psychic), 0/6 certo, digit_columns×5 |
| 2026-06-06 10:04 | 1780750864187 | D (v1.0 passcode) | 75/75 | 0/75 | 52 | 35 | 19 | passcode candidatos×30 (4/6 cartas), 0/6 certo, 07131115 Zeroboros, matched 52 |
| 2026-06-06 10:32 | 1780752444745 | D (v1.0 passcode) | 75/75 | 0/75 | 46 | 35 | 23 | passcode 6/6 cartas candidatos×38 matte_mild, 0/6 certo, 311449925 Livro, matched 46 |
| 2026-06-06 10:54 | 1780753865363 | D (v1.0 passcode) | 75/75 | 0/75 | 50 | 35 | 21 | REGRESSÃO passcode 38→0; matched 50 arte OK; Brigrand fraco |
| 2026-06-06 11:15 | 1780755178590 | C | 75/75 | 0/75 | 55 | 35 | 20 | RECORDE ARTE 55 matched 6/6 — Exciton×11 Livro×12; passcode sidecar 0 |
| 2026-06-06 14:16 | 1780766030211 | C | 76/76 | 0/76 | 55 | 36 | 20 | NOVA REF após apagar logs — 55 matched 6/6, Psychic×7, passcode sidecar 0, 76 amostras |
| 2026-06-06 15:54 | 1780771975322 | D (v1.0 passcode) | 75/75 | 0/75 | 54 | 35 | 16 | 54 matched, top0≤9×47 (recorde recente), Exciton×11, passcode 0 |
| 2026-06-06 16:19 | 1780773408044 | D (v1.0 passcode) | 75/75 | 0/75 | 51 | 35 | 18 | pós-correção — matched 51, top0≤9×41, passcode sidecar AINDA 0, Psychic×2 |
| 2026-06-06 16:53 | 1780775622640 | C | 40/40 | 0/40 | 30 | 0 | 8 | **BUG** parou aos 40 art_only (cap 40); Zeroboros seq 38–39; passcode 0 |
| 2026-06-06 17:13 | 1780776690134 | C | 75/75 | 0/75 | 55 | 3 | 16 | 75 amostras pós-fix art_only cap; 55 matched 6/6; passcode 0 |
| 2026-06-07 12:14 | 1780776690134 | C | 75/75 | 0/75 | 55 | 3 | 16 | 75 amostras pós-fix art_only cap; 55 matched 6/6; passcode 0 |
| 2026-06-07 13:15 | 1780848603787 | C | 75/75 | 0/75 | 38 | 0 | 34 | matched 38/75 Zeroboros 13/13 Livro 0 Fase D 1/6 |
| 2026-06-07 17:17 | 1780863103061 | C | 66/66 | 0/66 | 46 | 1 | 16 | 66/75 matched 46 Livro 9/13 D 0/6 E Vazio+Zeroboros 100% |
| 2026-06-07 17:36 | 1780864273788 | C | 66/66 | 0/66 | 53 | 1 | 11 | 66/75 noite matched 53 Livro 12/13 Zeroboros D100% Psychic 1/3 |
| 2026-06-07 18:35 | 1780867847228 | C | 0/0 | 0/0 | 0 | 0 | 0 | teste |
| 2026-06-07 19:19 | 1780870596544 | D | 77/77 | 0/77 | 54 | 31 | 13 | 77 amostras D 5/6 E 6/6 pipeline 31 Brigrand matched 0 Vazio Virar 0% |
| 2026-06-07 19:34 | 1780871530645 | C | 70/75 | 0/75 | 35 | 29 | 25 | REGRESSÃO matched 35/75 warp 70/75 travadas; Livro 3/13; pipeline 29 |
| 2026-06-07 19:50 | 1780872536862 | D | 78/78 | 0/78 | 57 | 26 | 14 | D+E 6/6 matched 57/78 Virar100% Livro11 pipeline26 travadas UX |
| 2026-06-07 22:39 | 1780882609362 | C | 75/75 | 0/75 | 58 | 8 | 11 | RECORDE matched 58/75 D+E 6/6 pipeline 8 F+G 0/6 |
| 2026-06-07 23:01 | 1780883760699 | E | 75/75 | 0/75 | 55 | 12 | 12 | E 6/6 100% cada carta F Psychic LIGHT G Livro spell matched 55 Exciton 4/12 |
| 2026-06-07 23:18 | 1780884942261 | C | 75/75 | 0/75 | 60 | 11 | 10 | RECORDE matched 60/75 F 5/6 Brigrand 10/13 |
| 2026-06-07 23:40 | 1780886279837 | F | 75/75 | 0/75 | 59 | 12 | 10 | F 6/6 G Zeroboros link100% matched 59 Psychic LIGHT 75% |
| 2026-06-08 22:15 | 1780967571348 | G | 75/75 | 0/75 | 59 | 12 | 8 | G 3/6 Exciton rank100% matched 59 F mantida 6/6 Vazio L9 0% |
| 2026-06-08 22:52 | 1780969792199 | G | 75/75 | 0/75 | 54 | 12 | 15 | G 3/6 Zeroboros link100% matched 54 Livro 6/13 regressão C |
| 2026-06-09 19:15 | 1781043162168 | C | 75/75 | 0/75 | 66 | 12 | 5 | RECORDE matched 66/75 Brigrand 12/13 near-miss 5 |
| 2026-06-09 21:30 | 1781051277605 | C | 75/75 | 0/75 | 66 | 12 | 3 | RECORDE partilhado 66/75 near-miss 3 G 4/6 Brigrand 13/13 |
| 2026-06-09 22:41 | 1781055185769 | G | 75/75 | 0/75 | 57 | 12 | 11 | **ref. G** Vazio L9 100%, Exciton rank 100%, Livro E 100%; matched 57/75; Exciton matched 4/12 — meta L11→Exciton corrigido pós-fix |
| 2026-06-09 23:21 | 1781057946690 | C | 75/75 | 0/75 | 67 | 12 | 3 | RECORDE 67/75 near-miss 3 G 5/6 Vazio L9 + Psychic L11 100%; Livro E 38% |
| 2026-06-10 19:36 | 1781130682436 | G | 75/75 | 0/75 | 66 | 12 | 9 | G 6/6 fechada Brigrand L8 77% Livro E 100%; matched 66/75 regressão C; Psychic 5/12 |
| 2026-06-10 20:07 | 1781132676067 | D | 75/75 | 0/75 | 65 | 12 | 9 | Zeroboros D 38% tipo vazio; matched 65/75 regressão; Brigrand G 38% |
| 2026-06-10 21:19 | diagnostics | — | 75/75 | 0/75 | 70 | 12 | 8 | matched 70/75, pipeline 12, D 6/6, E 6/6, F 6/6, G 3/6, Brigrand top0=7 matched=12 |
| 2026-06-10 21:29 | 1781137694755 | G | 75/75 | 0/75 | 63 | 14 | 11 | G 6/6 Brigrand L8 100% H 4/6; matched 63/75 regressão C; Psychic 5/12 |
| 2026-06-10 21:47 | 1781138718766 | C | 75/75 | 0/75 | 65 | 12 | 6 | 65/75 G 6/6 Brigrand L8 100%; Zeroboros D 31% anomalia; −2 vs oficial |
| 2026-06-10 22:05 | 1781139862704 | E | 75/75 | 0/75 | 61 | 12 | 9 | E 6/6 Zeroboros D 100%; matched 61/75 regressão; Exciton G rank 8%; Psychic 4/12 |
| 2026-06-10 22:23 | 1781140924652 | G | 75/75 | 0/75 | 65 | 13 | 7 | 65/75 G 6/6 D 6/6 Vazio 12/12 minDist 0; Zeroboros E 8%; −2 vs oficial |
| 2026-06-11 22:13 | 1781226555305 | C | 75/75 | 0/75 | 69 | 12 | 4 | 69/75 matched +2 vs 7946690; Psychic 12/12 Exciton 10/12; E/F inválidos (flush export); stalls 74/75 |
| 2026-06-12 19:02 | 1781301412749 | C | 75/75 | 0/75 | 70 | 12 | 1 | 70/75 matched +3; near-miss 1; D/F 6/6 E 5/6 G 5/6 Psychic L11 0%; UI cache E/F/G bug |
| 2026-06-12 19:23 | 1781302701084 | C | 75/75 | 0/75 | 70 | 12 | 1 | 70/75 +3; G 6/6; near-miss 1; Brigrand 13/13; Psychic L11 100%; E Brigrand 38% |
| 2026-06-12 20:27 | 1781306694767 | C | 75/75 | 0/75 | 71 | 12 | 1 | 71/75 matched; top0≤9 49; G 6/6; H 2/6 |
| 2026-06-13 22:20 | 1781399634089 | export-perf | 75/75 | 0/75 | 70 | 12 | 4 | export ~3min; C 70; E 6/6; H 2/6 (Hohmaligo+Psychic); passcode abort OK |
| 2026-06-14 14:31 | 1781458183349 | I | 75/75 | 0/75 | 68 | 12 | 4 | pós offline H/J 5/6; runtime J raw=0 H 1/6; C 68/75 |
| | | | | | | | | |

---

## Resultado por carta (preencher após cada ZIP do benchmark)

Marcar por carta se no log apareceu `top0=<passcode>@dist`, `matchedCardId`, e acertos das fases D–G.

| # | Carta | Tipo OK? | Raridade OK? | Atributo OK? | Level/Rank OK? | top0≤9 | matched | Notas |
|---|--------|----------|--------------|--------------|----------------|--------|---------|--------|
| 1 | Brigrand | — | — | — | — | Sim (3×) | Sim (4×) | |
| 2 | Livro da Lua | — | — | — | — | Sim (10×) | Sim (10×) | SPELL / kind=spell |
| 3 | Vazio Helsombraneco | — | — | — | — | Sim (4×) | Sim (4×) | |
| 4 | Zeroboros Topológico | — | — | — | — | Sim (13×) | Sim (12×) | |
| 5 | Hordeum Maligno Exciton | — | — | — | — | Sim (3×) | Sim (3×) | |
| 6 | Psychic End Punisher | — | — | — | — | Parcial (0×) | Sim (3×) | |

---

## Prompt padrão para sessão Cursor (Agent)

```text
Workspace: C:\Users\giubr\Cursor
Contrato: docs/SCANNER_BENCHMARK.md — v1.1-2026-06-02
Fase activa: [C/D/E/…] — ver metas na secção «Metas por fase».
Entrega: diff mínimo + analyze + teste manual indicado na fase.
```

---

## Fotos de referência

Guardar cópias estáveis (opcional: `docs/benchmark-photos/`) das 6 cartas na mesa, mesma luz do ambiente acima.

| # | Ficheiro sugerido |
|---|-------------------|
| 1 | `01-brigrand.jpg` |
| 2 | `02-livro-da-lua.jpg` |
| 3 | `03-vazio-helsombraneco.jpg` |
| 4 | `04-zeroboros.jpg` |
| 5 | `05-exciton.jpg` |
| 6 | `06-psychic-end-punisher.jpg` |
| 7 | `07-cor-mesa.jpg` |
