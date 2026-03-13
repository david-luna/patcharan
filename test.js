import assert from 'node:assert';
import {test} from 'node:test';

import {patch, unpatch} from './index.js';

test.skip('patch - should allow patching multiple times', () => {
  const calls = [];
  const mod = {
    num: 0,
    accumulate: function (a, b) {
      this.num += a + b;
    }
  };

  // 1st patch wraps the original
  patch(mod, 'accumulate', function(orig) {
    return function(a, b) {
      calls.push([a, b]);
      return orig.apply(this, arguments);
    }
  });

  // 2nd patch wraps the first (gets precedence)
  patch(mod, 'accumulate', function(orig) {
    return function(a, b) {
      calls.push(`${a}+${b}`);
      return orig.apply(this, arguments);
    }
  });

  // Call the method
  mod.accumulate(1,2);
  mod.accumulate(3,4);

  // assert
  assert.strictEqual(mod.num, 10);
  assert.deepStrictEqual(calls, ['1+2', [1,2], '3+4', [3,4]]);
});

test('patch - should allow unpatch no mater the order', () => {
  const calls = [];
  const mod = {
    num: 0,
    accumulate: function (a, b) {
      this.num += a + b;
    }
  };

  // 1st patch wraps the original
  const firstPatch = function(orig) {
    return function(a, b) {
      calls.push([a, b]);
      return orig.apply(this, arguments);
    }
  };
  patch(mod, 'accumulate', firstPatch);

  // 2nd patch wraps the first (gets precedence)
  const secondPatch = function(orig) {
    return function(a, b) {
      calls.push(`${a}+${b}`);
      return orig.apply(this, arguments);
    }
  };
  patch(mod, 'accumulate', secondPatch);

  // Call the method
  mod.accumulate(1,2);
  mod.accumulate(3,4);
  // remove the 1st so 2nd now should wrap the original
  unpatch(mod, 'accumulate', firstPatch);
  mod.accumulate(5,6);
  // remove the second so now we are have the original
  unpatch(mod, 'accumulate', secondPatch);
  mod.accumulate(7,8);

  // assert
  assert.strictEqual(mod.num, 36);
  assert.deepStrictEqual(calls, ['1+2', [1,2], '3+4', [3,4], '5+6']);
});