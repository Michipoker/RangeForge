/* tslint:disable */
/* eslint-disable */

/**
 * コンボ vs コンボのエクイティを計算（WASM用）
 *
 * # Arguments
 * * `combos` - カンマ区切りのコンボ文字列 (例: "AsKs,QhQd,JcJd")
 * * `board` - ボードカード文字列 (例: "Js,Ts,2c" または空文字列)
 * * `dead_cards` - runoutから除外するカード文字列 (例: "Ad,Kc" または空文字列)
 * * `trials` - シミュレーション回数
 *
 * # Returns
 * カンマ区切りのエクイティ文字列 (例: "0.35,0.40,0.25")
 */
export function calculate_combo_equity(combos: string, board: string, dead_cards: string, trials: number): string;

/**
 * コンボ vs コンボの正確なエクイティを計算（WASM用）
 *
 * # Arguments
 * * `combos` - カンマ区切りのコンボ文字列 (例: "AsKs,QhQd,JcJd")
 * * `board` - ボードカード文字列 (例: "Js,Ts,2c" または空文字列)
 * * `dead_cards` - runoutから除外するカード文字列 (例: "Ad,Kc" または空文字列)
 *
 * # Returns
 * カンマ区切りのエクイティ文字列 (例: "0.35,0.40,0.25")
 */
export function calculate_combo_equity_exact(combos: string, board: string, dead_cards: string): string;

/**
 * レンジ vs レンジのエクイティを計算（WASM用）
 *
 * # Arguments
 * * `ranges` - パイプ区切りのレンジ文字列 (例: "AsKs:1.0,AsKh:0.5|QhQd:1.0,QhQc:1.0")
 * * `board` - ボードカード文字列 (例: "Js,Ts,2c" または空文字列)
 * * `dead_cards` - runoutとレンジ候補から除外するカード文字列 (例: "Ad,Kc" または空文字列)
 * * `trials` - シミュレーション回数
 *
 * # Returns
 * カンマ区切りのエクイティ文字列 (例: "0.35,0.65")
 */
export function calculate_range_equity(ranges: string, board: string, dead_cards: string, trials: number): string;

/**
 * preflop heads-up exact equity lookup tableが読み込み済みかを返す（WASM用）
 */
export function is_preflop_hu_table_loaded(): boolean;

/**
 * preflop heads-up exact equity lookup tableを読み込む（WASM用）
 *
 * # Arguments
 * * `bytes` - `EQPH` header付き packed binary table
 *
 * # Returns
 * 読み込みに成功した場合 true。既に読み込み済み、またはformat不正なら false。
 */
export function load_preflop_hu_table(bytes: Uint8Array): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_combo_equity: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly calculate_combo_equity_exact: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly calculate_range_equity: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly is_preflop_hu_table_loaded: () => number;
    readonly load_preflop_hu_table: (a: number, b: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
