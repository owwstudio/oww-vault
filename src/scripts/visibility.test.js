import test from 'node:test';
import assert from 'node:assert/strict';
import { mostVisibleProject } from './visibility.js';

test('selects the largest visible slot regardless of scroll direction', () => {
  const slots = [
    { index: 13, top: -700, bottom: 100 },
    { index: 0, top: 100, bottom: 900 },
    { index: 1, top: 900, bottom: 1700 },
  ];
  assert.equal(mostVisibleProject(slots, 1000, 13), 0);
  assert.equal(mostVisibleProject(slots, 1000, 1), 0);
});

test('switches as soon as the next slot becomes larger, before its center arrives', () => {
  assert.equal(mostVisibleProject([
    { index: 0, top: -301, bottom: 499 },
    { index: 1, top: 499, bottom: 1299 },
  ], 1000, 0), 1);
});

test('keeps the active project at an exact tie or when no slots are visible', () => {
  const slots = [
    { index: 13, top: -300, bottom: 500 },
    { index: 0, top: 500, bottom: 1300 },
  ];
  assert.equal(mostVisibleProject(slots, 1000, 0), 0);
  assert.equal(mostVisibleProject(slots, 1000, 13), 13);
  assert.equal(mostVisibleProject([{ index: 1, top: 1000, bottom: 1800 }], 1000, 0), 0);
});

test('handles loop copies and resized viewports', () => {
  const slots = [
    { index: 13, top: -400, bottom: 400 },
    { index: 0, top: 400, bottom: 1200 },
    { index: 13, top: 1200, bottom: 2000 },
  ];
  assert.equal(mostVisibleProject(slots, 1000, 13), 0);
  assert.equal(mostVisibleProject(slots, 600, 0), 13);
});