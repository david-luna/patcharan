const _queues_key = Symbol.for('patcharan_queues');
const log = (/** @type {any[]} */ ...args) => console.log(...args);
const isFunction = (/** @type {any} */ f) => typeof f === 'function';

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
export function patch(mod, name, patcher) {
  if (!mod || !isFunction(mod[name])) {
    log('no function to patch');
    return;
  }

  if (!isFunction(patcher)) {
    log('patcher is not a function');
    return;
  }

  // Init queues
  // @ts-expect-error -- we ar using a new key internally
  const queues = (mod[_queues_key] = mod[_queues_key] || {});

  // Get the original function
  const original = mod[name];

  if (!queues[name]) {
    queues[name] = [original];
  }

  // Apply the patch and append the. patcher to the queue
  defineProperty(mod, name, patcher(original));
  queues[name].push(patcher);
}

/**
 * @template T
 * @template {FunctionKeys<T>} K
 * @param {T} mod
 * @param {K} name
 * @param {(original: T[K]) => void} patcher
 * @returns {void}
 */
export function unpatch(mod, name, patcher) {
  if (!mod || !isFunction(mod[name])) {
    log('no function to unpatch');
    return;
  }

  /** @type {Record<string | number | symbol, AnyFunction[]>} */
  // @ts-expect-error -- accessing internal property
  const queues = mod[_queues_key];
  if (!queues || !queues[name]) {
    log(`function "${String(name)}" has not been patched`);
    return;
  }
  // remove the patcher if found and not the original function
  const index = queues[name].findIndex((p) => p === patcher);
  if (index > 0) {
    queues[name].splice(index, 1);
    defineProperty(mod, name, applyPatches(queues[name]));
  }
}

// -- helper functions

/**
 * Recreates a function with the given patches in a queue.
 * The 1st item is the original function.
 *
 * @param {AnyFunction[]} queue
 * @returns {AnyFunction}
 */
function applyPatches(queue) {
  let fun = queue[0];

  for (let i = 1; i < queue.length; i++) {
    const patcher = queue[i];
    fun = patcher(fun);
  }
  return fun;
}

/**
 * Sets a property on an object, preserving its enumerability.
 * This function assumes that the property is already writable.
 *
 * @param {any} obj
 * @param {string | number | symbol} name
 * @param {any} value
 */
function defineProperty(obj, name, value) {
  var enumerable = !!obj[name] && obj.propertyIsEnumerable(name);
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: enumerable,
    writable: true,
    value: value,
  });
}
