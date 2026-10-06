import { applyAnswer, emptyState, finishSession } from './session';
import type { Exercise, Unit } from './types';

const unit: Unit = { id: 1, level: 1, topic: 'Greetings', title: 'Hello!', wordIds: [319, 173], homeWordId: 319 };
const day = '2026-10-05';
const ex = (wordId: number, kind: Exercise['kind'] = 'recognize'): Exercise => ({ kind, wordId, prompt: '' });

test('a unit whose words were only answered wrong stays open', () => {
  let state = emptyState();
  for (const id of unit.wordIds) {
    state = applyAnswer(state, ex(id, 'intro'), true, day);
    state = applyAnswer(state, ex(id), false, day);
  }
  expect(state.progress[319].box).toBe(1);   // a wrong answer still lands in box 1
  expect(finishSession(state, [unit], day).finished).toEqual([]);
});

test('the unit closes once every word has one correct answer', () => {
  let state = emptyState();
  for (const id of unit.wordIds) {
    state = applyAnswer(state, ex(id, 'intro'), true, day);
    state = applyAnswer(state, ex(id), false, day);
  }
  state = applyAnswer(state, ex(319), true, '2026-10-06');
  expect(finishSession(state, [unit], '2026-10-06').finished).toEqual([]);
  state = applyAnswer(state, ex(173), true, '2026-10-06');
  expect(finishSession(state, [unit], '2026-10-06').finished).toEqual([1]);
});

test('a word that was introduced but never answered does not count', () => {
  let state = emptyState();
  state = applyAnswer(state, ex(319, 'intro'), true, day);
  state = applyAnswer(state, ex(173, 'intro'), true, day);
  state = applyAnswer(state, ex(173), true, day);
  expect(finishSession(state, [unit], day).finished).toEqual([]);
});
