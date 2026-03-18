# patcharan

Patch and unpatch JavaScript functions multiple times, with the ability to remove patches in any order.

## Install

```sh
npm install patcharan
```

## Usage

```js
import { patch, unpatch } from 'patcharan';

const mod = {
  greet(name) {
    return `hello ${name}`;
  },
};

// Define a patcher: receives the original and returns a wrapped version
const loud = (orig) => {
  return function (...args) {
    return orig.apply(this, args).toUpperCase();
  };
};

patch(mod, 'greet', loud);
mod.greet('world'); // => "HELLO WORLD"

unpatch(mod, 'greet', loud);
mod.greet('world'); // => "hello world"
```

### Stacking patches

Multiple patches can be applied to the same function. Each patch wraps the result of the previous one. When a patch is removed with `unpatch`, the remaining patches are re-applied in order so the function stays consistent.

```js
const logger = (orig) =>
  function (...args) {
    console.log('called with', args);
    return orig.apply(this, args);
  };

const timer = (orig) =>
  function (...args) {
    const start = performance.now();
    const result = orig.apply(this, args);
    console.log(`took ${performance.now() - start}ms`);
    return result;
  };

patch(mod, 'greet', logger);
patch(mod, 'greet', timer);

// Remove logger while keeping timer
unpatch(mod, 'greet', logger);
```

## API

### `patch(obj, name, patcher)`

Wraps `obj[name]` with the function returned by `patcher`.

- **obj** — the object that owns the function
- **name** — property name of the function to patch
- **patcher** `(original) => replacement` — receives the current function and must return the replacement

### `unpatch(obj, name, patcher)`

Removes a previously applied `patcher` and rebuilds `obj[name]` from the remaining patches.

Arguments are the same as `patch`.

## License

[MIT](LICENSE)
