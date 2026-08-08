# @cloviz/eq-mc

WebAssembly poker equity calculator for Texas Hold'em.

## Install

```bash
npm install @cloviz/eq-mc
```

## Usage

```ts
import init, {
  calculate_combo_equity,
  calculate_combo_equity_exact,
} from "@cloviz/eq-mc"

await init()

const approximate = calculate_combo_equity("AsAh,KsKh", "", "", 100000)
const exact = calculate_combo_equity_exact("AsAh,KsKh", "", "")
const exactWithDeadCards = calculate_combo_equity_exact("AsAh,KsKh", "2c,7d,Ts", "Qc")

console.log({ approximate, exact, exactWithDeadCards })
```

## API

### `calculate_combo_equity(combos, board, deadCards, trials)`

Monte Carlo combo equity.

- `combos`: comma-separated combos, for example `"AsAh,KsKh"`
- `board`: comma-separated board cards, for example `"2c,7d,Ts"`, or `""`
- `deadCards`: comma-separated cards to exclude, for example `"Ad,Kc"`, or `""`
- `trials`: simulation count
- returns comma-separated equities, for example `"0.826370,0.173630"`

### `calculate_combo_equity_exact(combos, board, deadCards)`

Exact combo equity by exhaustive runout enumeration.

- `combos`: comma-separated combos
- `board`: comma-separated board cards, or `""`
- `deadCards`: comma-separated cards to exclude, for example `"Ad,Kc"`, or `""`
- returns comma-separated equities

For preflop heads-up exact equity, this API can use an optional packed lookup
table loaded with `load_preflop_hu_table`. Without the table it falls back to
the normal exact path.

### `calculate_range_equity(ranges, board, deadCards, trials)`

Monte Carlo range equity.

- `ranges`: pipe-separated weighted ranges, for example
  `"AsKs:1.0,AsKh:0.5|QhQd:1.0,QhQc:1.0"`
- `board`: comma-separated board cards, or `""`
- `deadCards`: comma-separated cards to exclude, for example `"Ad,Kc"`, or `""`
- `trials`: simulation count
- returns comma-separated equities

### `load_preflop_hu_table(bytes)`

Loads an optional packed preflop heads-up exact equity table.

- `bytes`: `Uint8Array` containing the `EQPH` binary table
- returns `true` when the table was loaded, `false` when it was already loaded
  or the format is invalid

### `is_preflop_hu_table_loaded()`

Returns whether the optional preflop heads-up table is loaded.

## Packed Preflop HU Table Format

The table is intentionally not bundled into the npm package. It is meant to be
served by applications that need low-latency preflop heads-up exact equity.

- header: 16 bytes
- magic: `EQPH`
- version: `1`
- combo count: `1326`
- entries: upper triangle only, excluding identical combo pairs
- entry size: 6 bytes
- entry payload: `firstWins` and `chops` as little-endian unsigned 24-bit ints
- total runouts per entry: `1_712_304`

The canonical first/second order is the ascending combo-id order. Callers do not
need to canonicalize hands before passing them to `calculate_combo_equity_exact`.
