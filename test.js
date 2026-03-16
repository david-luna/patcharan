import assert from 'node:assert';
import { test } from 'node:test';

import { patch, unpatch } from './index.js';

test.skip('patch - should allow patching multiple times', () => {
  const calls = [];
  const mod = {
    num: 0,
    accumulate: function (a, b) {
      this.num += a + b;
    },
  };

  // 1st patch wraps the original
  patch(mod, 'accumulate', function (orig) {
    return function (a, b) {
      calls.push([a, b]);
      return orig.apply(this, arguments);
    };
  });

  // 2nd patch wraps the first (gets precedence)
  patch(mod, 'accumulate', function (orig) {
    return function (a, b) {
      calls.push(`${a}+${b}`);
      return orig.apply(this, arguments);
    };
  });

  // Call the method
  mod.accumulate(1, 2);
  mod.accumulate(3, 4);

  // assert
  assert.strictEqual(mod.num, 10);
  assert.deepStrictEqual(calls, ['1+2', [1, 2], '3+4', [3, 4]]);
});

test('patch - should allow unpatch no mater the order', () => {
  const calls = [];
  const mod = {
    num: 0,
    accumulate: function (a, b) {
      this.num += a + b;
    },
  };

  // 1st patch wraps the original
  const firstPatch = function (orig) {
    return function (a, b) {
      calls.push([a, b]);
      return orig.apply(this, arguments);
    };
  };
  patch(mod, 'accumulate', firstPatch);

  // 2nd patch wraps the first (gets precedence)
  const secondPatch = function (orig) {
    return function (a, b) {
      calls.push(`${a}+${b}`);
      return orig.apply(this, arguments);
    };
  };
  patch(mod, 'accumulate', secondPatch);

  // Call the method
  mod.accumulate(1, 2);
  mod.accumulate(3, 4);
  // remove the 1st so 2nd now should wrap the original
  unpatch(mod, 'accumulate', firstPatch);
  mod.accumulate(5, 6);
  // remove the second so now we are have the original
  unpatch(mod, 'accumulate', secondPatch);
  mod.accumulate(7, 8);

  // assert
  assert.strictEqual(mod.num, 36);
  assert.deepStrictEqual(calls, ['1+2', [1, 2], '3+4', [3, 4], '5+6']);
});

// -- patch: single patch / unpatch round-trip

test('patch - single patch and unpatch restores original behavior', () => {
  const mod = {
    add(a, b) {
      return a + b;
    },
  };
  const patcher = (orig) => (a, b) => orig(a, b) * 10;

  patch(mod, 'add', patcher);
  assert.strictEqual(mod.add(2, 3), 50);

  unpatch(mod, 'add', patcher);
  assert.strictEqual(mod.add(2, 3), 5);
});

// -- patch: return value preservation

test('patch - preserves return values through the chain', () => {
  const mod = {
    greet(name) {
      return `hello ${name}`;
    },
  };

  const upper = (orig) =>
    function (...args) {
      return orig.apply(this, args).toUpperCase();
    };
  const exclaim = (orig) =>
    function (...args) {
      return orig.apply(this, args) + '!';
    };

  patch(mod, 'greet', upper);
  patch(mod, 'greet', exclaim);

  assert.strictEqual(mod.greet('world'), 'HELLO WORLD!');
});

// -- patch: this context

test('patch - preserves this context', () => {
  const mod = {
    value: 42,
    getValue() {
      return this.value;
    },
  };

  const doubler = (orig) =>
    function () {
      return orig.call(this) * 2;
    };

  patch(mod, 'getValue', doubler);
  assert.strictEqual(mod.getValue(), 84);
});

// -- patch: guard clauses

test('patch - does nothing when mod is null or undefined', () => {
  assert.doesNotThrow(() => patch(null, 'fn', () => {}));
  assert.doesNotThrow(() => patch(undefined, 'fn', () => {}));
});

test('patch - does nothing when property is not a function', () => {
  const mod = { value: 42 };
  assert.doesNotThrow(() => patch(mod, 'value', () => {}));
  assert.strictEqual(mod.value, 42);
});

test('patch - does nothing when patcher is not a function', () => {
  const mod = { fn() {} };
  const original = mod.fn;
  assert.doesNotThrow(() => patch(mod, 'fn', 'not a function'));
  assert.strictEqual(mod.fn, original);
});

// -- unpatch: guard clauses

test('unpatch - does nothing when mod is null or undefined', () => {
  assert.doesNotThrow(() => unpatch(null, 'fn', () => {}));
  assert.doesNotThrow(() => unpatch(undefined, 'fn', () => {}));
});

test('unpatch - does nothing when property is not a function', () => {
  const mod = { value: 42 };
  assert.doesNotThrow(() => unpatch(mod, 'value', () => {}));
});

test('unpatch - does nothing when function was never patched', () => {
  const mod = {
    fn() {
      return 1;
    },
  };
  assert.doesNotThrow(() => unpatch(mod, 'fn', () => {}));
  assert.strictEqual(mod.fn(), 1);
});

test('unpatch - does nothing when patcher was not in the queue', () => {
  const mod = {
    fn() {
      return 1;
    },
  };
  const applied = (orig) => () => orig() + 1;
  const notApplied = (orig) => () => orig() + 2;

  patch(mod, 'fn', applied);
  unpatch(mod, 'fn', notApplied);

  // applied patch should still be active
  assert.strictEqual(mod.fn(), 2);
});

// -- enumerability

test('patch - preserves enumerability of the patched property', () => {
  const mod = { fn() {} };

  // fn is enumerable by default
  assert.ok(mod.propertyIsEnumerable('fn'));
  patch(mod, 'fn', (orig) => orig);
  assert.ok(mod.propertyIsEnumerable('fn'));
});

test('patch - preserves non-enumerability of the patched property', () => {
  const mod = {};
  Object.defineProperty(mod, 'fn', {
    value: () => {},
    configurable: true,
    writable: true,
    enumerable: false,
  });

  patch(mod, 'fn', (orig) => orig);
  assert.ok(!mod.propertyIsEnumerable('fn'));
});

// -- independent functions on the same object

test('patch - can patch different functions on the same object independently', () => {
  const mod = {
    foo() {
      return 'foo';
    },
    bar() {
      return 'bar';
    },
  };

  const upper = (orig) =>
    function () {
      return orig.call(this).toUpperCase();
    };
  patch(mod, 'foo', upper);

  assert.strictEqual(mod.foo(), 'FOO');
  assert.strictEqual(mod.bar(), 'bar');

  unpatch(mod, 'foo', upper);
  assert.strictEqual(mod.foo(), 'foo');
});

// -- unpatch middle of three patches

test('unpatch - removing middle patch keeps first and last intact', () => {
  const calls = [];
  const mod = {
    run() {
      calls.push('orig');
    },
  };

  const first = (orig) =>
    function () {
      calls.push('1st');
      orig.call(this);
    };
  const second = (orig) =>
    function () {
      calls.push('2nd');
      orig.call(this);
    };
  const third = (orig) =>
    function () {
      calls.push('3rd');
      orig.call(this);
    };

  patch(mod, 'run', first);
  patch(mod, 'run', second);
  patch(mod, 'run', third);

  mod.run();
  assert.deepStrictEqual(calls, ['3rd', '2nd', '1st', 'orig']);

  calls.length = 0;
  unpatch(mod, 'run', second);
  mod.run();
  assert.deepStrictEqual(calls, ['3rd', '1st', 'orig']);
});

// -- unpatch all restores original

test('unpatch - removing all patches restores the original function', () => {
  const mod = {
    val() {
      return 'original';
    },
  };

  const a = (orig) => () => orig() + '-a';
  const b = (orig) => () => orig() + '-b';

  patch(mod, 'val', a);
  patch(mod, 'val', b);
  assert.strictEqual(mod.val(), 'original-a-b');

  unpatch(mod, 'val', b);
  unpatch(mod, 'val', a);
  assert.strictEqual(mod.val(), 'original');
});
