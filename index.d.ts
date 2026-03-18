/**
 * @typedef {(...args: any[]) => any} AnyFunction
 */
/**
 * @template T
 * @typedef {{
 *   [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
 * }[keyof T]} FunctionKeys
 */
/**
 * @template T
 * @template {FunctionKeys<T>} K
 * @param {T} mod
 * @param {K} name
 * @param {(original: T[K]) => void} patcher
 * @returns {void}
 */
export function patch<T, K extends FunctionKeys<T>>(
  mod: T,
  name: K,
  patcher: (original: T[K]) => void,
): void;
/**
 * @template T
 * @template {FunctionKeys<T>} K
 * @param {T} mod
 * @param {K} name
 * @param {(original: T[K]) => void} patcher
 * @returns {void}
 */
export function unpatch<T, K extends FunctionKeys<T>>(
  mod: T,
  name: K,
  patcher: (original: T[K]) => void,
): void;
export type AnyFunction = (...args: any[]) => any;
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
