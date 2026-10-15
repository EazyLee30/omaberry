#!/usr/bin/env python3
"""Build web/js/pinyin-data.js — the candidate table OmaBerry's IME reads.

Why this exists
---------------
Term49CX can open the BB10 system IME because it is a native QNX app with a
Cascades widget tree; a page inside content_shell has no IME interface at all
(no platform input context, no candidate window, no way to send composed
text). So OmaBerry composes Chinese itself and writes UTF-8 straight down the
PTY. That needs a table of pinyin -> candidate characters.

Inputs, all fetched from their upstreams:
  pinyin.txt  mozillazg/pinyin-data      character -> readings, with tones
  dict.txt.big fxsjy/jieba                word -> corpus frequency
  TSCharacters.txt BYVoid/OpenCC          traditional -> simplified, used to
                                           keep the candidate list Simplified

There is no per-character frequency list we can rely on, so character
commonness is derived the same way a corpus would give it: sum the frequency
of every dictionary word the character appears in. A character that shows up
in thousands of frequent words outranks one that appears in a single rare
word, and no hand-written list is needed.

Usage:
    curl -LO https://raw.githubusercontent.com/mozillazg/pinyin-data/master/pinyin.txt
    curl -LO https://raw.githubusercontent.com/fxsjy/jieba/master/extra_dict/dict.txt.big
    curl -LO https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/TSCharacters.txt
    python3 scripts/build_pinyin_data.py pinyin.txt dict.txt.big TSCharacters.txt \
        web/js/pinyin-data.js
"""

from __future__ import annotations

import json
import sys
import unicodedata

TONE_MAP = {
    "ā": "a", "á": "a", "ǎ": "a", "à": "a",
    "ē": "e", "é": "e", "ě": "e", "è": "e",
    "ī": "i", "í": "i", "ǐ": "i", "ì": "i",
    "ō": "o", "ó": "o", "ǒ": "o", "ò": "o",
    "ū": "u", "ú": "u", "ǔ": "u", "ù": "u",
    "ǖ": "v", "ǘ": "v", "ǚ": "v", "ǜ": "v", "ü": "v",
    "ń": "n", "ň": "n", "ǹ": "n", "ḿ": "m",
    "ê": "e",
}

# Keep the ranges a Chinese IME actually needs; drop radicals, kana, Hangul
# and the rare extension blocks, which would otherwise bloat the payload.
KEEP = (
    (0x4E00, 0x9FFF),    # CJK Unified Ideographs
    (0x3400, 0x4DBF),    # Ext A
    (0x3007, 0x3007),    # 〇
)


def wanted(ch: str) -> bool:
    cp = ord(ch)
    return any(lo <= cp <= hi for lo, hi in KEEP)


def toneless(syllable: str) -> str:
    return "".join(TONE_MAP.get(c, c) for c in syllable.lower())


def load_readings(path: str) -> dict[str, list[str]]:
    readings: dict[str, list[str]] = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#") or ":" not in line:
                continue
            body = line.split("#", 1)[0].strip()
            if not body:
                continue
            head = body.split(":", 1)[0].strip()
            parts = body.split(":", 1)[1].split(",") if ":" in body else []
            try:
                ch = chr(int(head.replace("U+", ""), 16))
            except ValueError:
                continue
            if not wanted(ch):
                continue
            for p in parts:
                p = toneless(p.strip())
                if p:
                    readings.setdefault(ch, []).append(p)
    return readings


def load_freq(path: str) -> dict[str, int]:
    freq: dict[str, int] = {}
    words: list[tuple[str, int]] = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            bits = line.split()
            if len(bits) < 2:
                continue
            word, weight = bits[0], bits[1]
            try:
                weight = int(weight)
            except ValueError:
                continue
            words.append((word, weight))
            for ch in word:
                if wanted(ch):
                    freq[ch] = freq.get(ch, 0) + weight
    return freq, words


TOP_WORDS = 4000


def build_word_list(words, readings, freq, traditional) -> list[str]:
    """The most frequent multi-syllable words as `syllables=characters` pairs.

    A syllable table alone cannot segment: greedy matching turns "shijibeijing"
    into 是其北经 because every piece is a legal syllable. Real IMEs break the
    tie with a language model; the cheapest thing that fixes the common cases
    is the head of a word-frequency list, so the composer tries the longest
    dictionary match before falling back to greedy syllables.

    The characters have to travel with the syllables: given the match
    "bei jing", the composer can emit 北京, but looking "beijing" up in the
    single-syllable table finds nothing at all.
    """
    scored: list[tuple[int, str]] = []
    for word, weight in words:
        if not (2 <= len(word) <= 4):
            continue
        if not all(wanted(ch) for ch in word):
            continue
        if any(ch in traditional for ch in word):
            continue
        sylls = [readings[ch][0] for ch in word if ch in readings and readings[ch]]
        if len(sylls) != len(word):
            continue
        scored.append((weight, " ".join(sylls) + "=" + word))
    scored.sort(key=lambda x: -x[0])
    seen: set[str] = set()
    out: list[str] = []
    for _, entry in scored:
        if entry in seen:
            continue
        seen.add(entry)
        out.append(entry)
        if len(out) >= TOP_WORDS:
            break
    return out


def load_traditional(path: str) -> set[str]:
    """Characters OpenCC can rewrite away from -- i.e. not Simplified.

    TSCharacters.txt is `source<TAB>target1 target2`. A source whose first
    target differs from itself is a traditional or variant form, so it has no
    business in a Simplified candidate list.
    """
    traditional: set[str] = set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#") or "\t" not in line:
                continue
            key, _, values = line.partition("\t")
            key = key.strip()
            targets = values.strip().split()
            if not key or not targets:
                continue
            if targets[0] != key and wanted(key):
                traditional.add(key)
    return traditional


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__)
        return 2
    readings_path, freq_path, ts_path, out_path = sys.argv[1:5]

    readings = load_readings(readings_path)
    freq, words = load_freq(freq_path)
    traditional = load_traditional(ts_path)
    print(f"readings for {len(readings)} characters, frequency for {len(freq)}, "
          f"{len(traditional)} traditional forms to drop")

    table: dict[str, list[str]] = {}
    dropped = 0
    for ch, sylls in readings.items():
        if ch in traditional:
            dropped += 1
            continue
        for s in sylls:
            table.setdefault(s, []).append(ch)
    print(f"dropped {dropped} characters from the candidate pool")

    # Rank each syllable's candidates by corpus frequency, then trim. 24 is
    # plenty to cycle through with the trackpad on a 720px screen.
    MAX_CANDIDATES = 24
    for s, chars in table.items():
        # pinyin-data can list a reading more than once for a character, and a
        # character with several readings lands here once per reading path.
        seen: set[str] = set()
        uniq = [c for c in chars if not (c in seen or seen.add(c))]
        uniq.sort(key=lambda c: (-freq.get(c, 0), ord(c)))
        table[s] = uniq[:MAX_CANDIDATES]

    # ü is typed as v on every IME, but u is what people actually reach for.
    for s, chars in list(table.items()):
        if "v" in s:
            table.setdefault(s.replace("v", "u"), chars)

    table = {s: c for s, c in table.items() if c}

    word_list = build_word_list(words, readings, freq, traditional)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by scripts/build_pinyin_data.py -- do not edit.\n")
        fh.write(" * Source: mozillazg/pinyin-data (readings), fxsjy/jieba (frequency).\n")
        fh.write(" * Character order is by summed corpus frequency of the words they\n")
        fh.write(" * appear in; the u/v alias row is added for umlaut syllables.\n")
        fh.write(" * OB_WORDS is the head of the word-frequency list, used to segment\n")
        fh.write(" * before falling back to greedy syllable matching. */\n")
        fh.write("window.OB_PINYIN = ")
        # Compact: no spaces, unicode kept literal so the file stays readable.
        fh.write("{" + ",".join(
            f'"{s}":"{"".join(chars)}"' for s, chars in sorted(table.items())
        ) + "};\n")
        fh.write("window.OB_WORDS = " + json.dumps("|".join(word_list), ensure_ascii=False) + ";\n")

    import os
    print(f"wrote {out_path}: {len(table)} syllables, "
          f"{len(word_list)} words, {os.path.getsize(out_path)} bytes")

    for probe in ("shi", "zhong", "nv", "you", "wo", "xin"):
        got = table.get(probe)
        print(f"  {probe:6} -> {''.join(got) if got else '(none)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())