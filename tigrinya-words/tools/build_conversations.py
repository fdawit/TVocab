"""Check conversation scripts against the word list and write src/data/conversations.json.

Run after build_data.py:  python tools/build_conversations.py
Stops with an error list if any script has a problem. Prints the lines a native speaker must review.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'conversations_src.json'
DATA = ROOT / 'src' / 'data'
PUNCT = '።፡፣?!.,"“”'
TIERS = {1: 'romanized', 2: 'mixed', 3: 'geez'}


def tokens(text):
    return [t.strip(PUNCT) for t in text.split() if t.strip(PUNCT)]


def lines_of(conv):
    """Every displayed line as (turn index, role, line dict), including girl versions."""
    for i, turn in enumerate(conv['turns']):
        if 'them' in turn:
            yield i, 'them', turn['them']
            if 'girl' in turn['them']:
                yield i, 'them', {**turn['them'], **turn['them']['girl']}
        for opt in turn.get('reply', []):
            yield i, 'correct' if opt.get('correct') else 'wrong', opt
            if 'girl' in opt:
                yield i, 'correct' if opt.get('correct') else 'wrong', {**opt, **opt['girl']}


def main():
    words = json.loads((DATA / 'words.json').read_text(encoding='utf-8'))
    units = json.loads((DATA / 'units.json').read_text(encoding='utf-8'))
    by_id = {w['id']: w for w in words}
    lesson_id = {}                       # Ge'ez spelling -> id of the lesson word it counts as
    for w in words:
        main_word = by_id[w['mainId']] if w['mainId'] else w
        if main_word['active']:
            lesson_id[w['word']] = main_word['id']
    unit_pos = {wid: pos for pos, u in enumerate(units) for wid in u['wordIds']}
    list_sentences = {w['exTi'] for w in words if w['exTi']}

    convs = json.loads(SRC.read_text(encoding='utf-8'))
    errors, review, out = [], [], []
    seen_ids = set()
    for conv in convs:
        cid = conv['id']
        if cid in seen_ids:
            errors.append(f'{cid}: duplicate id')
        seen_ids.add(cid)
        glossary = {g['ti'] for g in conv.get('glossary', [])}
        required, used_glossary = set(), set()
        for i, turn in enumerate(conv['turns']):
            if ('them' in turn) == ('reply' in turn):
                errors.append(f'{cid} turn {i + 1}: needs exactly one of "them" or "reply"')
            if 'reply' in turn:
                n_correct = sum(1 for o in turn['reply'] if o.get('correct'))
                if n_correct != 1:
                    errors.append(f'{cid} turn {i + 1}: has {n_correct} correct replies, needs exactly 1')
                for o in turn['reply']:
                    if not o.get('correct') and not o.get('why'):
                        errors.append(f'{cid} turn {i + 1}: wrong reply "{o["ti"]}" needs a "why" hint')
        for i, role, line in lines_of(conv):
            for key in ('ti', 'rom', 'en'):
                if not line.get(key):
                    errors.append(f'{cid} turn {i + 1}: a line is missing "{key}"')
            for t in tokens(line['ti']):
                if t in lesson_id:
                    required.add(lesson_id[t])
                elif t in glossary:
                    used_glossary.add(t)
                else:
                    errors.append(f'{cid} turn {i + 1}: "{t}" is not a lesson word; add it to the glossary')
            if line['ti'] not in list_sentences:
                review.append(f'{cid} turn {i + 1} ({role}): {line["ti"]}  |  {line["en"]}')
        for g in conv.get('glossary', []):
            if g['ti'] not in used_glossary:
                errors.append(f'{cid}: glossary word "{g["ti"]}" is never used; remove it')
            review.append(f'{cid} glossary: {g["ti"]} ({g["rom"]}) = {g["en"]}')

        # Words the child gets review credit for: those in each turn's correct reply.
        turns = []
        for turn in conv['turns']:
            t = dict(turn)
            if 'reply' in turn:
                right = next(o for o in turn['reply'] if o.get('correct'))
                text = right['ti'] + ' ' + right.get('girl', {}).get('ti', '')
                t['creditWordIds'] = sorted({lesson_id[x] for x in tokens(text) if x in lesson_id})
            turns.append(t)
        if required:
            after = units[max(unit_pos[w] for w in required)]
            out.append({**conv, 'turns': turns, 'requiredWordIds': sorted(required),
                        'afterUnitId': after['id'], 'tier': TIERS[after['level']]})

    if errors:
        print('Fix these before building:')
        for e in errors:
            print('  -', e)
        sys.exit(1)

    out.sort(key=lambda c: next(i for i, u in enumerate(units) if u['id'] == c['afterUnitId']))
    (DATA / 'conversations.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'conversations.json: {len(out)} conversations')
    for c in out:
        print(f'  {c["id"]}: after unit {c["afterUnitId"]}, tier {c["tier"]}, '
              f'{len(c["requiredWordIds"])} lesson words, {len(c.get("glossary", []))} glossary words')
    print(f'\nLines and glossary words a native speaker must check ({len(review)}):')
    for r in review:
        print('  -', r)


if __name__ == '__main__':
    main()
