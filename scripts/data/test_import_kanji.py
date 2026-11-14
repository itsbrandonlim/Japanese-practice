"""Run with python scripts/data/test_import_kanji.py."""
import runpy
import unittest
from pathlib import Path

vocabulary = runpy.run_path(str(Path(__file__).with_name("import-kanji.py")))["vocabulary"]


class VocabularyTests(unittest.TestCase):
    def test_restricted_senses_and_readings(self):
        word = {
            "id": "1", "kanji": [{"text": "甲", "common": True}, {"text": "乙", "common": False}],
            "kana": [{"text": "こう", "common": True, "appliesToKanji": ["甲"]},
                     {"text": "おつ", "common": True, "appliesToKanji": ["乙"]}],
            "sense": [{"appliesToKanji": ["乙"], "appliesToKana": ["おつ"],
                       "gloss": [{"lang": "eng", "type": None, "text": "second"}]},
                      {"appliesToKanji": ["甲"], "appliesToKana": ["こう"],
                       "gloss": [{"lang": "eng", "type": None, "text": "first"}]}],
        }
        self.assertEqual(vocabulary([word], {"甲", "乙"}), {
            "甲": [["1", "甲", "こう", "first"]], "乙": [["1", "乙", "おつ", "second"]]
        })
        word["sense"][1]["appliesToKana"] = ["おつ"]
        self.assertNotIn("甲", vocabulary([word], {"甲", "乙"}))


if __name__ == "__main__":
    unittest.main()
