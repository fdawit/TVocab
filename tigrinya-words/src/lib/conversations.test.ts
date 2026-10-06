import { forLearner, recordReply } from './conversations';
import { emptyState } from './session';
import { newProgress } from './scheduler';

const line = { ti: 'ሕጂ ንዓ!', rom: "hiji n'a!", en: 'Come now!', girl: { ti: 'ሕጂ ንዒ!', rom: "hiji n'i!" } };

test('girls get the girl line, with the same English', () => {
  expect(forLearner(line, 'girl').ti).toBe('ሕጂ ንዒ!');
  expect(forLearner(line, 'girl').en).toBe('Come now!');
  expect(forLearner(line, 'boy').ti).toBe('ሕጂ ንዓ!');
});

test('a miss never drops a box, and brings the word back tomorrow', () => {
  const state = { ...emptyState(), progress: { 93: { ...newProgress('2026-10-01'), box: 4, due: '2026-11-01' } } };
  const after = recordReply(state, { creditWordIds: [93] }, false, '2026-10-05');
  expect(after.progress[93].box).toBe(4);
  expect(after.progress[93].due).toBe('2026-10-06');
});
