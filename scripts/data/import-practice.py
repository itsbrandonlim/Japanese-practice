"""Build the introductory word deck from the Phase 3 JMdict common release."""
import argparse
import hashlib
from pathlib import Path
import runpy

shared = runpy.run_path(str(Path(__file__).with_name("import-kanji.py")))
words = """日本 学校 今日 明日 大人 人口 水道 学生 電車 火山 出口 入口 先生 小学校 大学
天気 花火 手紙 山道 男女 四月 土曜日 金曜日 名前 空気 食事 時間 電気 本日 来年
去年 来月 毎日 毎年 月曜日 水曜日 日曜日 自転車 図書館 新聞 時計 家族""".split()


def build(source, out):
    archive = source / "jmdict-eng-common.tgz"
    shared["require"](hashlib.sha256(archive.read_bytes()).hexdigest() == shared["HASHES"][archive.name], "Unexpected JMdict archive")
    deck = {word: {"text": word, "readings": [], "meaning": "", "entries": []} for word in words}
    for entry in shared["read_dictionary"](archive)["words"]:
        for form in entry["kanji"]:
            word = form["text"]
            if word not in deck:
                continue
            card = deck[word]
            for kana in sorted(entry["kana"], key=lambda k: not k["common"]):
                reading = kana["text"]
                if not shared["applies"](kana["appliesToKanji"], word):
                    continue
                for sense in entry["sense"]:
                    if shared["applies"](sense["appliesToKanji"], word) and shared["applies"](sense["appliesToKana"], reading):
                        if reading not in card["readings"]:
                            card["readings"].append(reading)
                        if entry["id"] not in card["entries"]:
                            card["entries"].append(entry["id"])
                        if not card["meaning"]:
                            card["meaning"] = next((g["text"] for g in sense["gloss"] if g["lang"] == "eng" and not g["type"]), "")
    for word, card in deck.items():
        shared["require"](card["meaning"] and card["readings"], f"Missing evidence for {word}")
    shared["write_json"](out, list(deck.values()))
    print(f"Built {len(deck)} vocabulary cards")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("source", type=Path)
    cli.add_argument("--out", type=Path, default=shared["ROOT"] / "src/features/practice/words.json")
    args = cli.parse_args()
    build(args.source, args.out)
