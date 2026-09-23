// tests/demo-gate.test.js — DELIBERATELY FAILING. Demo prop, never merged to main.
//
// Lives only on the branch `demo/failing-test`. Opening a pull request from that
// branch makes the CI gate go red, which locks the merge button. That is the whole
// point: it proves "only successful builds proceed" is enforced by the pipeline and
// not just claimed in a slide.
//
// Demo order: open the PR, show the red X and the blocked merge button, then flip
// the 3 below to a 2, push, and watch the checks go green and the button unlock.
const test = require("node:test");
const assert = require("node:assert");

test("the CI gate blocks a broken build from being merged", () => {
  // 1 + 1 is 2. Asserting it is 3 fails the job on purpose.
  assert.strictEqual(1 + 1, 3, "deliberate failure: this is the demo of the gate working");
});
