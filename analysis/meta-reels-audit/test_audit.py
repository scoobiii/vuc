import statistics, unittest
import audit

class AggregateAuditTests(unittest.TestCase):
    def test_profile_and_group_counts(self):
        rows = audit.load()
        self.assertEqual(len(rows), 30)
        self.assertEqual([sum(r["group"] == g for r in rows) for g in ("deputies","Brazil","world")],[9,10,10])

    def test_nikolas_published_metrics(self):
        row = next(r for r in audit.load() if r["profile"] == "Nikolas Ferreira")
        self.assertAlmostEqual(row["mean_m"],41.05,places=2)
        self.assertAlmostEqual(row["median_m"],38.25,places=2)
        self.assertAlmostEqual(row["median_pct"],166.30,places=2)
        self.assertEqual(row["above_followers"],10)

    def test_group_ratios(self):
        rows = audit.load()
        case = next(r for r in rows if r["group"] == "case")
        for group, expected in (("deputies",17.2),("Brazil",29.3),("world",33.7)):
            med = {"deputies":9.68,"Brazil":5.67,"world":4.93}[group]
            self.assertEqual(round(case["median_pct"]/med,1),expected)

    def test_24_reels_above_followers(self):
        self.assertEqual(sum(int(r["above_followers"]) for r in audit.load()),24)

if __name__ == "__main__":
    unittest.main()
