# Regras de cálculo

## Coordenadas de progresso

O progresso de uma mercenária é um par **(R, L)**:

- **R** — número do reinício (0 … máximo da raridade).
- **L** — nível dentro do reinício atual (1 … nível máximo efetivo).

Ordem lexicográfica: (R₁, L₁) &lt; (R₂, L₂) se R₁ &lt; R₂, ou R₁ = R₂ e L₁ &lt; L₂.

## Custo acumulado (modo Objetivo)

Para cada reinício `r` de `0` até `R-1`, soma-se o custo de subir do nível 1 até o **nível mínimo exigido** para reiniciar naquele ciclo (`niveisMaximosPorReinicio[r]`).

No reinício `R` atual, soma-se o custo de subir do nível 1 até `L` (se `L > 1`).

Custos por salto de nível vêm das tabelas cumulativas em `gameData.js`, convertidas em custo **por nível** (`mpPor[n]`, `crPor[n]` = diferença entre cumulativo[n] e cumulativo[n-1]).

**Resultado:**

```
alma_restante = total(desejado) - total(atual)
creditos_restantes = idem
```

### Validações

| Código | Condição |
|--------|----------|
| `INVALID_RANGE` | R ou L fora dos limites da raridade |
| `CURRENT_AFTER_DESIRED` | Ponto atual estritamente após o desejado |

## Simulação de orçamento (modo Budget)

Entrada: `pontos` (MP/Alma), opcionalmente `creditos`, ponto inicial (R₀, L₀).

Loop:

1. Se no reinício `R` o nível `L` atingiu o mínimo para reiniciar e `R < maxR`, registra linha, incrementa `R`, volta `L = 1`.
2. Caso contrário, tenta subir um nível: custo `mpPor[L+1]` e `crPor[L+1]`.
3. Para se MP insuficiente, CR insuficiente (quando informado), ou não houver próximo nível.

Cada linha guarda: reinício, nível, gasto no ciclo, sobra de MP, créditos gastos no ciclo.

## Reinício máximo por raridade

| Raridade | Reinícios máx. |
|----------|----------------|
| common | 4 |
| rare | 4 |
| epic | 5 |
| legendary | 7 |

## Presentes (RP)

- **9 tipos** de presente: 3 formatos × 3 tiers (Raro, Épico, Lendário).
- Cada mercenária tem formato preferido por tier (`giftData.MERCENARIAS_PRESENTES`).
- Pontos: favorito +12/+24/+60; outro formato +10/+20/+50.
- Meta de relacionamento: **35.100 RP** (`META_PRESENTES.pontosObjetivo`).
- Pontos atuais do jogador: múltiplos de 2, limitados à meta (`sanitizarPontos`).

`enriquecerLinha` soma o inventário aplicando preferências e calcula `requiredPoints = max(0, meta - currentPoints - bestPoints)`.

## Super Soro

Tabela estática em `serum.js`: linhas são faixas de boost (+0→+1 … +3→+4); colunas são faixas de nível da mercenária. Valores `null` indicam combinação inválida na UI (célula "—").
