import csv
import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "analyze_tse_turnout.py"
SPEC = importlib.util.spec_from_file_location("analyze_tse_turnout", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class TSETurnoutAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        MODULE.OUT = self.root / "artifacts"
        self.zip_path = self.root / "fixture.zip"
        fields = [
            "NR_TURNO", "SG_UF", "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO",
            "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO", "QT_APTOS",
            "QT_COMPARECIMENTO", "QT_ABSTENCOES", "CD_CARGO",
        ]
        rows = [
            ["1","SP","SAO PAULO","1","10","100","Local A","100","80","20","1"],
            ["2","SP","SAO PAULO","1","10","100","Local A","100","70","30","1"],
            ["1","SP","SAO PAULO","1","11","200","Local B","100","90","10","1"],
            ["2","SP","SAO PAULO","1","11","200","Local B","100","90","10","1"],
        ]
        with zipfile.ZipFile(self.zip_path, "w") as z:
            with tempfile.NamedTemporaryFile("w", encoding="latin-1", newline="", delete=False) as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow(fields)
                writer.writerows(rows)
                csv_path = Path(f.name)
            z.write(csv_path, "BRASIL.csv")
            csv_path.unlink()

    def tearDown(self):
        self.tmp.cleanup()

    def test_paired_rounds_and_exposure_join(self):
        exposure = self.root / "exposure.csv"
        with exposure.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["NR_LOCAL_VOTACAO", "exposicao_onibus"])
            w.writeheader()
            w.writerow({"NR_LOCAL_VOTACAO":"100", "exposicao_onibus":"alta"})
            w.writerow({"NR_LOCAL_VOTACAO":"200", "exposicao_onibus":"controle"})
        records = MODULE.read_sections(self.zip_path)
        self.assertEqual(len(records), 4)
        summary = MODULE.analyze(records, exposure)
        self.assertEqual(summary["paired_sections"], 2)
        self.assertTrue(summary["exposure_analysis"]["joined"])
        self.assertEqual(summary["exposure_analysis"]["exposed_sections"], 1)
        self.assertEqual(summary["exposure_analysis"]["control_sections"], 1)
        self.assertAlmostEqual(summary["exposure_analysis"]["difference_in_abstention_change_pp"], 10.0)

    def test_missing_second_round_fails_closed(self):
        broken = self.root / "one-round.zip"
        with zipfile.ZipFile(broken, "w") as z:
            z.writestr("BRASIL.csv",
                "NR_TURNO;SG_UF;NM_MUNICIPIO;NR_ZONA;NR_SECAO;QT_APTOS;QT_COMPARECIMENTO;QT_ABSTENCOES\n"
                "1;SP;SAO PAULO;1;1;100;80;20\n")
        with self.assertRaisesRegex(RuntimeError, "both rounds"):
            MODULE.read_sections(broken)


if __name__ == "__main__":
    unittest.main()
