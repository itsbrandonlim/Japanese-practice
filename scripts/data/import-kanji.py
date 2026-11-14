"""Build the pinned Kanji catalog with Python 3.10+ and its standard library."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import tarfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
RELEASE = "3.6.2+20261109214828"
HASHES = {
    "kanjidic2-all.tgz": "733dd72ce7abad078dca9ab9727038aa496c51be54c643a0fa08f375f23649bf",
    "jmdict-eng-common.tgz": "85bbc8a41ecfd28f30ac18defa8e98245344a0ab1bf17a76888299279f286f9b",
    "kanjivg.zip": "b5df6cd2bc249dd49b8041eb99e38ba9f8dc6b9ea57962a80084b4a315d1a7fc",
}
SVG = "{http://www.w3.org/2000/svg}"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_dictionary(path):
    with tarfile.open(path) as archive:
        member, = archive.getmembers()
        require(member.isfile() and member.name.endswith(".json"), "Unexpected dictionary archive")
        return json.load(archive.extractfile(member))


def applies(restriction, value):
    return "*" in restriction or value in restriction


def vocabulary(words, characters):
    examples = defaultdict(list)
    ids = set()
    for entry in words:
        require(entry["id"] not in ids, "Duplicate vocabulary ID")
        ids.add(entry["id"])
        linked = set()
        for spelling in sorted(entry["kanji"], key=lambda item: not item["common"]):
            word = spelling["text"]
            candidates = (set(word) & characters) - linked
            if not candidates:
                continue
            for kana in sorted(entry["kana"], key=lambda item: not item["common"]):
                reading = kana["text"]
                if not applies(kana["appliesToKanji"], word):
                    continue
                gloss = next((g["text"] for sense in entry["sense"]
                              if applies(sense["appliesToKanji"], word) and applies(sense["appliesToKana"], reading)
                              for g in sense["gloss"] if g["lang"] == "eng" and not g["type"]), None)
                if gloss:
                    for char in candidates:
                        examples[char].append((not (spelling["common"] and kana["common"]), len(word),
                                               entry["id"], word, reading, gloss))
                    linked.update(candidates)
                    break
    result = {}
    for char, candidates in examples.items():
        result[char] = [list(x[2:]) for x in sorted(candidates)[:3]]
    return result


def diagram(archive, char, count):
    key = f"{ord(char):05x}"
    name = f"kanji/{key}.svg"
    if name not in archive.NameToInfo:
        return "no-file", []
    doc = ET.fromstring(archive.read(name))
    group = doc.find(f".//*[@id='kvg:StrokePaths_{key}']")
    shape = doc.find(f".//*[@id='kvg:{key}']")
    require(group is not None and shape is not None, f"Missing group for {key}")
    if char not in [value for attr, value in shape.attrib.items() if attr.endswith("}element")]:
        return "different-character", []
    require(doc.get("viewBox") == "0 0 109 109", f"Unexpected viewBox for {key}")
    require(not any("transform" in el.attrib for el in group.iter()), f"Transformed paths in {key}")
    paths = list(group.iter(SVG + "path"))
    if len(paths) != count:
        return "different-count", []
    values = []
    for n, path in enumerate(paths, 1):
        require(path.get("id") == f"kvg:{key}-s{n}", f"Out-of-order path for {key}")
        d = path.get("d", "")
        require(re.fullmatch(r"[Mm][MLHVCSQTAZmlhvcsqtaz0-9.,+\s-]+", d), f"Invalid path in {key}")
        values.append(d)
    return "available", values


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


def build(source, out):
    for name, digest in HASHES.items():
        require(hashlib.sha256((source / name).read_bytes()).hexdigest() == digest, f"SHA-256 mismatch for {name}")
    kd = read_dictionary(source / "kanjidic2-all.tgz")
    jm = read_dictionary(source / "jmdict-eng-common.tgz")
    characters = {c["literal"] for c in kd["characters"]}
    require(len(characters) == len(kd["characters"]), "Duplicate Kanji literal")
    words = vocabulary(jm["words"], characters)
    details, drawings = defaultdict(dict), defaultdict(dict)
    counts = Counter()
    index = []
    with zipfile.ZipFile(source / "kanjivg.zip") as archive:
        for entry in kd["characters"]:
            char = entry["literal"]
            code = ord(char)
            require(any(c["type"] == "ucs" and int(c["value"], 16) == code for c in entry["codepoints"]), f"Unicode ID mismatch for {code}")
            misc = entry["misc"]
            strokes = misc["strokeCounts"]
            require(strokes and all(isinstance(n, int) and n > 0 for n in strokes), "Invalid stroke count")
            rm = entry["readingMeaning"] or {}
            groups = rm.get("groups", [])
            meanings = list(dict.fromkeys(m["value"] for g in groups for m in g["meanings"] if m["lang"] == "en"))
            readings = {kind: list(dict.fromkeys(r["value"] for g in groups for r in g["readings"] if r["type"] == kind))
                        for kind in ("ja_on", "ja_kun")}
            names = rm.get("nanori", [])
            radical = next((r["value"] for r in entry["radicals"] if r["type"] == "classical"), None)
            require(radical is None or 1 <= radical <= 214, "Invalid classical radical")
            state, paths = diagram(archive, char, strokes[0])
            counts[state] += 1
            bucket = f"{code // 256:x}"
            if paths:
                drawings[bucket][char] = paths
            examples = words.get(char, [])
            counts["withVocabulary"] += bool(examples)
            counts["withEnglish"] += bool(meanings)
            counts["withJapaneseReading"] += bool(readings["ja_on"] or readings["ja_kun"])
            details[bucket][char] = dict(char=char, meanings=meanings, on=readings["ja_on"], kun=readings["ja_kun"],
                                         names=names, strokes=strokes, grade=misc["grade"], radical=radical,
                                         diagram=state, examples=examples)
            index.append(dict(char=char, meanings=meanings, readings=list(dict.fromkeys(readings["ja_on"] + readings["ja_kun"] + names)),
                              strokes=strokes[0], grade=misc["grade"], frequency=misc["frequency"]))
    index.sort(key=lambda e: (e["grade"] or 99, e["frequency"] or 99999, ord(e["char"])))
    for row in index:
        del row["frequency"]
    for kind, shards in [("details", details), ("strokes", drawings)]:
        for bucket, data in shards.items():
            write_json(out / kind / (bucket + ".json"), data)
    write_json(out / "index.json", index)
    manifest = dict(dictionaryRelease=RELEASE, dictionaryDate=kd["dictDate"], databaseVersion=kd["databaseVersion"],
                    strokeRelease="r20260714", archiveSHA256=HASHES, characters=len(index),
                    commonWordEntries=len(jm["words"]), detailBuckets=sorted(details), coverage=dict(counts))
    write_json(out / "manifest.json", manifest)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("source", type=Path, help="Folder containing the three pinned archives")
    cli.add_argument("--out", type=Path, default=ROOT / "public/data/kanji/20261109-v1")
    args = cli.parse_args()
    build(args.source, args.out)
