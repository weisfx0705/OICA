from __future__ import annotations

import csv
import html
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List


ROOT = Path(__file__).resolve().parent
REPORT_DIR = ROOT / "report_hub"

YEARS = ["111", "112", "113", "114"]
COUNTRY_TARGETS = [
    "越南社會主義共和國",
    "印度尼西亞共和國",
    "香港",
    "日本",
    "泰國",
    "菲律賓共和國",
    "馬來西亞",
]
SCHOOL_TARGETS = [
    "義守大學",
    "靜宜大學",
    "逢甲大學",
    "中國文化大學",
    "銘傳大學",
]
EXCLUDED_FOREIGN_MARKETS = {"香港", "澳門", "大陸地區"}


def shorten_country(name: str) -> str:
    mapping = {
        "越南社會主義共和國": "越南",
        "印度尼西亞共和國": "印尼",
        "菲律賓共和國": "菲律賓",
        "大韓民國(南韓)": "南韓",
        "印度": "印度",
        "香港": "香港",
        "澳門": "澳門",
        "大陸地區": "中國大陸",
        "馬來西亞": "馬來西亞",
        "泰國": "泰國",
        "日本": "日本",
        "蒙古國": "蒙古",
        "聖文森(及格瑞那丁)": "聖文森",
        "聖露西亞": "聖露西亞",
        "史瓦帝尼王國": "史瓦帝尼",
        "吉爾吉斯": "吉爾吉斯",
        "大不列顛暨北愛爾蘭聯合王國": "英國",
        "美利堅合眾國": "美國",
    }
    return mapping.get(name, name)


def shorten_school(name: str) -> str:
    mapping = {
        "義守大學": "義守",
        "靜宜大學": "靜宜",
        "逢甲大學": "逢甲",
        "中國文化大學": "文化",
        "銘傳大學": "銘傳",
        "輔仁大學": "輔仁",
        "國立臺灣大學": "臺大",
        "國立清華大學": "清華",
        "國立政治大學": "政大",
        "國立臺灣師範大學": "臺師大",
        "開南大學": "開南",
        "真理大學": "真理",
    }
    return mapping.get(name, name)


def slugify(name: str) -> str:
    mapping = {
        "越南社會主義共和國": "vietnam",
        "印度尼西亞共和國": "indonesia",
        "香港": "hong-kong",
        "日本": "japan",
        "泰國": "thailand",
        "菲律賓共和國": "philippines",
        "馬來西亞": "malaysia",
        "義守大學": "isu",
        "靜宜大學": "pu",
        "逢甲大學": "fcu",
        "中國文化大學": "pccu",
        "銘傳大學": "mcu",
    }
    if name in mapping:
        return mapping[name]
    return (
        name.replace("大學", "")
        .replace("學院", "")
        .replace("國立", "")
        .replace("中國", "china-")
        .replace(" ", "-")
    )


def fmt_int(value: int | float) -> str:
    return f"{int(round(value)):,}"


def fmt_pct(value: float | None, digits: int = 1) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{digits}f}%"


def calc_growth(start: float, end: float) -> float | None:
    if start == 0:
        return None
    return (end - start) / start * 100


def read_csv_rows(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if rows and rows[0].keys() == {"無相關統計資料"}:
        return []
    return rows


def load_rows_by_year(folder: Path, pattern: str) -> Dict[str, List[dict]]:
    return {
        year: read_csv_rows(folder / pattern.format(year=year))
        for year in YEARS
    }


identity_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "growth-rank",
    "stud_3_7_identity_school_{year}.csv",
)
student_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "growth-rank",
    "stud_1_2_school_{year}.csv",
)
registration_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "growth-rank",
    "stud_12_3_registration_school_{year}.csv",
)
attendance_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "growth-rank",
    "stud_16_attendance_school_{year}.csv",
)
foreign_dept_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "foreign-student",
    "moe_udb_foreign_students_by_department_national_{year}.csv",
)
overseas_dept_rows = load_rows_by_year(
    ROOT / "isu_foreign_student_report_site" / "downloads" / "registration-dropout",
    "stud_3_1_foreign_degree_department_{year}.csv",
)


def build_school_year_metrics() -> Dict[str, Dict[str, dict]]:
    metrics: Dict[str, Dict[str, dict]] = defaultdict(dict)

    for year, rows in student_rows.items():
        school_totals = defaultdict(int)
        for row in rows:
            school_totals[row["學校名稱"]] += int(row["在學學生數小計"] or 0)
        for school, total in school_totals.items():
            metrics[school].setdefault(year, {})["students"] = total

    for year, rows in identity_rows.items():
        school_totals = defaultdict(lambda: Counter())
        location_totals = defaultdict(Counter)
        for row in rows:
            school = row["學校名稱"]
            school_totals[school]["overseas"] += int(row["境外學位生總人數(A)(A=B+C+D+E)小計"] or 0)
            school_totals[school]["foreign"] += int(row["外國學生(B)小計"] or 0)
            school_totals[school]["overseas_hkmo"] += int(row["港澳生(D)小計"] or 0)
            school_totals[school]["overseas_china"] += int(row["大陸地區來臺學位生(E)小計"] or 0)
            school_totals[school]["overseas_overseas_chinese"] += int(row["僑生(C)小計"] or 0)
            location_totals[school][row["國家(地區)別"]] += int(
                row["境外學位生總人數(A)(A=B+C+D+E)小計"] or 0
            )
        for school, counter in school_totals.items():
            year_metrics = metrics[school].setdefault(year, {})
            year_metrics.update(counter)
            year_metrics["top_locations"] = dict(location_totals[school])

    for year, rows in registration_rows.items():
        for row in rows:
            school = row["學校名稱"]
            metrics[school].setdefault(year, {})["intl_freshmen"] = int(
                row["當學年度全校境外(新生)學生實際註冊人數(D)"] or 0
            )
            metrics[school][year]["registration_rate"] = float(
                row["當學年度全校新生註冊率(％)E=〔(C+D)/(A-B+D)〕*100％"] or 0
            )

    for year, rows in attendance_rows.items():
        for row in rows:
            if row["學制班別"] != "學士班(日間)":
                continue
            school = row["學校名稱"]
            metrics[school].setdefault(year, {})["stability_rate"] = float(
                row["前一學年度學生就學穩定率(%)(C)(C=B/A)"] or 0
            )

    for school, school_years in metrics.items():
        for year, year_metrics in school_years.items():
            students = year_metrics.get("students", 0)
            overseas = year_metrics.get("overseas", 0)
            year_metrics["share"] = (overseas / students * 100) if students else 0.0

    return metrics


school_year_metrics = build_school_year_metrics()


IDENTITY_FIELD_MAP = {
    "overseas": "境外學位生總人數(A)(A=B+C+D+E)小計",
    "foreign": "外國學生(B)小計",
    "overseas_overseas_chinese": "僑生(C)小計",
    "overseas_hkmo": "港澳生(D)小計",
    "overseas_china": "大陸地區來臺學位生(E)小計",
}


def build_school_meta() -> Dict[str, dict]:
    meta: Dict[str, dict] = {}
    for rows in identity_rows.values():
        for row in rows:
            school = row["學校名稱"]
            meta.setdefault(
                school,
                {"設立別": row["設立別"], "學校類別": row["學校類別"]},
            )
    return meta


school_meta = build_school_meta()


def is_daytime_program(label: str) -> bool:
    return "進修" not in label and "在職" not in label


def build_daytime_students() -> Dict[str, Dict[str, int]]:
    totals: Dict[str, Dict[str, int]] = defaultdict(dict)
    for year, rows in student_rows.items():
        counter = defaultdict(int)
        for row in rows:
            if not is_daytime_program(row["學制班別"]):
                continue
            counter[row["學校名稱"]] += int(row["在學學生數小計"] or 0)
        for school, value in counter.items():
            totals[school][year] = value
    return totals


daytime_students = build_daytime_students()


def is_general_university(school: str) -> bool:
    return school_meta.get(school, {}).get("學校類別") == "一般大學"


def is_private_general_university(school: str) -> bool:
    meta = school_meta.get(school, {})
    return meta.get("學校類別") == "一般大學" and meta.get("設立別") == "私立"


def aggregate_group_identity(predicate) -> Dict[str, Dict[str, int]]:
    result: Dict[str, Dict[str, int]] = {}
    for year, rows in identity_rows.items():
        counter = Counter()
        for row in rows:
            school = row["學校名稱"]
            if not predicate(school):
                continue
            for metric, field in IDENTITY_FIELD_MAP.items():
                counter[metric] += int(row[field] or 0)
        result[year] = dict(counter)
    return result


def build_ratio_rankings(year: str = "114") -> List[dict]:
    items = []
    for school in school_meta:
        if not is_general_university(school):
            continue
        denominator = daytime_students.get(school, {}).get(year, 0)
        numerator = school_year_metrics.get(school, {}).get(year, {}).get("overseas", 0)
        if not denominator:
            continue
        items.append(
            {
                "school": school,
                "overseas": numerator,
                "students": denominator,
                "share": numerator / denominator * 100,
            }
        )
    return sorted(items, key=lambda item: item["share"], reverse=True)


def build_private_general_rankings(metric: str, year: str = "114") -> List[dict]:
    items = []
    for school in school_meta:
        if not is_private_general_university(school):
            continue
        value = school_year_metrics.get(school, {}).get(year, {}).get(metric, 0)
        items.append({"school": school, "value": value})
    return sorted(items, key=lambda item: item["value"], reverse=True)


def build_foreign_department_series(school: str) -> Dict[str, Dict[str, int]]:
    series = defaultdict(dict)
    for year, rows in foreign_dept_rows.items():
        dept_counter = Counter()
        ratio_map = {}
        for row in rows:
            if row["學校名稱"] != school:
                continue
            dept = row["系所名稱"]
            dept_counter[dept] += int(row["外國學生小計"] or 0)
            ratio_map[dept] = float(row["外國學生數之在學比率(%)"] or 0)
        for dept, value in dept_counter.items():
            series[dept][year] = value
            series[dept]["ratio_114"] = ratio_map.get(dept, 0.0)
    return series


def build_dropout_suspend_113(school: str, departments: List[str]) -> List[dict]:
    dropout_stats = defaultdict(lambda: {"students": 0, "dropout": 0})
    with (
        ROOT
        / "isu_foreign_student_report_site"
        / "downloads"
        / "registration-dropout"
        / "stud_14_1_dropout_department_113.csv"
    ).open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["學校名稱"] != school:
                continue
            dept = row["系所名稱"]
            if dept not in departments:
                continue
            dropout_stats[dept]["students"] += int(row["在學學生數"] or 0)
            dropout_stats[dept]["dropout"] += int(row["學期間退學人數-總計"] or 0)

    suspend_stats = defaultdict(lambda: {"students": 0, "suspend": 0})
    with (
        ROOT
        / "isu_foreign_student_report_site"
        / "downloads"
        / "registration-dropout"
        / "stud_13_1_suspend_department_113.csv"
    ).open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["學校名稱"] != school:
                continue
            dept = row["系所名稱"]
            if dept not in departments:
                continue
            suspend_stats[dept]["students"] += int(row["在學學生數"] or 0)
            suspend_stats[dept]["suspend"] += int(
                row["於學年底處於休學狀態之人數-總計"] or 0
            )

    rows = []
    for dept in departments:
        dropout = dropout_stats[dept]
        suspend = suspend_stats[dept]
        dropout_rate = (
            dropout["dropout"] / dropout["students"] * 100 if dropout["students"] else 0
        )
        suspend_rate = (
            suspend["suspend"] / suspend["students"] * 100 if suspend["students"] else 0
        )
        rows.append(
            {
                "name": dept,
                "dropout_rate": dropout_rate,
                "suspend_rate": suspend_rate,
            }
        )
    return rows


def build_country_school_counts(country: str) -> Dict[str, Dict[str, int]]:
    counts = defaultdict(dict)
    for year, rows in identity_rows.items():
        school_counter = Counter()
        for row in rows:
            if row["國家(地區)別"] != country:
                continue
            school_counter[row["學校名稱"]] += int(
                row["境外學位生總人數(A)(A=B+C+D+E)小計"] or 0
            )
        for school, value in school_counter.items():
            counts[school][year] = value
    return counts


def build_market_department_profiles(year: str, schools: Iterable[str]) -> Dict[str, List[dict]]:
    profiles: Dict[str, List[dict]] = {}
    for school in schools:
        dept_counter = Counter()
        ratio_map = {}
        for row in overseas_dept_rows[year]:
            if row["學校名稱"] != school:
                continue
            dept = row["系所名稱"]
            dept_counter[dept] += int(row["境外學位生數小計"] or 0)
            ratio_map[dept] = float(row["境外學位生數之在學比率(%)"] or 0)
        profiles[school] = [
            {
                "name": dept,
                "count": count,
                "ratio": ratio_map.get(dept, 0.0),
            }
            for dept, count in dept_counter.most_common(5)
        ]
    return profiles


def build_overseas_department_series(school: str) -> Dict[str, Dict[str, int]]:
    series = defaultdict(dict)
    for year, rows in overseas_dept_rows.items():
        dept_counter = Counter()
        ratio_map = {}
        for row in rows:
            if row["學校名稱"] != school:
                continue
            dept = row["系所名稱"]
            dept_counter[dept] += int(row["境外學位生數小計"] or 0)
            ratio_map[dept] = float(row["境外學位生數之在學比率(%)"] or 0)
        for dept, value in dept_counter.items():
            series[dept][year] = value
            series[dept]["ratio_114"] = ratio_map.get(dept, 0.0)
    return series


def html_page(title: str, body: str, nav_link: str | None = "../index.html") -> str:
    topbar = (
        f"""
    <div class="topbar">
      <a class="crumb" href="{html.escape(nav_link)}">返回報告入口</a>
      <div>資料來源固定為教育部大專校院校務資訊公開平台 CSV</div>
    </div>
"""
        if nav_link
        else """
    <div class="topbar">
      <div>境外生大數據分析報告入口</div>
      <div>資料來源固定為教育部大專校院校務資訊公開平台 CSV</div>
    </div>
"""
    )
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {{
      --bg: #f3efe6;
      --paper: rgba(255,255,255,0.84);
      --paper-strong: rgba(255,255,255,0.94);
      --ink: #151a23;
      --muted: #596170;
      --line: rgba(21, 26, 35, 0.12);
      --scarlet: #b2482f;
      --teal: #1f6660;
      --navy: #24395b;
      --gold: #c59b45;
      --shadow: 0 26px 60px rgba(31, 25, 18, 0.12);
      --radius: 28px;
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      color: var(--ink);
      font: 16px/1.75 "Noto Sans TC", sans-serif;
      background:
        radial-gradient(circle at 0% 0%, rgba(197, 155, 69, 0.18), transparent 24%),
        radial-gradient(circle at 100% 0%, rgba(31, 102, 96, 0.16), transparent 28%),
        linear-gradient(180deg, #f8f4ec 0%, var(--bg) 100%);
    }}
    body::before {{
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(rgba(21,26,35,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(21,26,35,0.03) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: linear-gradient(180deg, rgba(0,0,0,0.32), transparent 40%);
    }}
    a {{ color: var(--scarlet); text-underline-offset: 3px; }}
    .shell {{
      width: min(1360px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 22px 0 64px;
      position: relative;
      z-index: 1;
    }}
    .topbar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      color: var(--muted);
    }}
    .crumb {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(21,26,35,0.08);
      text-decoration: none;
      font-weight: 700;
    }}
    .hero {{
      position: relative;
      overflow: hidden;
      padding: 42px;
      border-radius: 34px;
      color: #f9f5ee;
      background:
        linear-gradient(145deg, rgba(19, 24, 34, 0.98), rgba(35, 48, 66, 0.96)),
        linear-gradient(90deg, rgba(197, 155, 69, 0.18), transparent);
      box-shadow: var(--shadow);
    }}
    .hero::after {{
      content: "";
      position: absolute;
      width: 340px;
      height: 340px;
      right: -80px;
      top: -60px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(197, 155, 69, 0.26), transparent 70%);
      filter: blur(14px);
    }}
    .eyebrow {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 12px;
      font-weight: 800;
    }}
    h1, h2, h3 {{
      margin: 0;
      font-family: "Fraunces", "Noto Sans TC", serif;
      line-height: 1.08;
      letter-spacing: -0.03em;
    }}
    h1 {{
      margin-top: 18px;
      max-width: 11ch;
      font-size: clamp(42px, 5vw, 74px);
    }}
    .hero-summary {{
      max-width: 68ch;
      margin: 16px 0 0;
      color: rgba(249, 245, 238, 0.84);
    }}
    .source-note {{
      margin-top: 18px;
      padding: 16px 18px;
      border-radius: 20px;
      background: rgba(255,255,255,0.09);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(249, 245, 238, 0.9);
      font-size: 14px;
    }}
    .metric-grid {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-top: 22px;
    }}
    .metric-card {{
      padding: 18px;
      border-radius: 22px;
      background: rgba(255,255,255,0.9);
      color: var(--ink);
      border: 1px solid rgba(255,255,255,0.6);
    }}
    .metric-card span {{
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    .metric-card strong {{
      display: block;
      margin-top: 8px;
      font-size: 34px;
      line-height: 1.05;
      font-family: "Fraunces", "Noto Sans TC", serif;
    }}
    .metric-card small {{
      display: block;
      margin-top: 8px;
      color: var(--muted);
    }}
    section {{
      margin-top: 18px;
      padding: 28px;
      border-radius: var(--radius);
      background: var(--paper);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }}
    .section-head {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 18px;
    }}
    .section-head p {{
      margin: 10px 0 0;
      color: var(--muted);
      max-width: 72ch;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      gap: 18px;
    }}
    .panel {{
      padding: 20px;
      border-radius: 24px;
      background: var(--paper-strong);
      border: 1px solid rgba(21,26,35,0.08);
    }}
    .chart-wrap {{
      height: 360px;
    }}
    .callout {{
      margin-top: 14px;
      padding: 16px 18px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(178,72,47,0.08), rgba(31,102,96,0.05));
      border-left: 4px solid var(--scarlet);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }}
    th, td {{
      padding: 11px 10px;
      border-bottom: 1px solid rgba(21,26,35,0.08);
      text-align: left;
      vertical-align: top;
    }}
    th {{
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .isu-row td {{
      background: rgba(178, 72, 47, 0.10);
      font-weight: 700;
    }}
    .focus-row td {{
      background: rgba(31, 102, 96, 0.10);
      font-weight: 700;
    }}
    tr:last-child td {{ border-bottom: 0; }}
    .dept-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }}
    .dept-card {{
      padding: 18px;
      border-radius: 24px;
      background: var(--paper-strong);
      border: 1px solid rgba(21,26,35,0.08);
    }}
    .dept-card h3 {{
      font-size: 28px;
      margin-bottom: 10px;
    }}
    .dept-card ol {{
      margin: 0;
      padding-left: 20px;
    }}
    .dept-card li + li {{
      margin-top: 8px;
    }}
    .footnote {{
      margin-top: 14px;
      color: var(--muted);
      font-size: 13px;
    }}
    .link-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }}
    .link-card {{
      display: block;
      padding: 22px;
      border-radius: 24px;
      text-decoration: none;
      color: inherit;
      background: var(--paper-strong);
      border: 1px solid rgba(21,26,35,0.08);
      transition: transform .18s ease, box-shadow .18s ease;
    }}
    .link-card:hover {{
      transform: translateY(-4px);
      box-shadow: 0 18px 30px rgba(21,26,35,0.08);
    }}
    .link-card strong {{
      display: block;
      margin-top: 8px;
      font-size: 26px;
      font-family: "Fraunces", "Noto Sans TC", serif;
      line-height: 1.1;
    }}
    .link-card span {{
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    .link-card p {{
      margin: 10px 0 0;
      color: var(--muted);
    }}
    .main-link-card {{
      padding: 34px;
      border-radius: 30px;
      background:
        linear-gradient(145deg, rgba(19, 24, 34, 0.98), rgba(35, 48, 66, 0.96)),
        linear-gradient(90deg, rgba(197, 155, 69, 0.12), transparent);
      color: #f9f5ee;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: var(--shadow);
    }}
    .main-link-card span,
    .main-link-card p {{
      color: rgba(249, 245, 238, 0.82);
    }}
    .main-link-card strong {{
      font-size: clamp(34px, 4vw, 56px);
      color: #f9f5ee;
      margin-top: 10px;
    }}
    @media (max-width: 1080px) {{
      .metric-grid,
      .dept-grid,
      .link-grid,
      .grid-2 {{
        grid-template-columns: 1fr;
      }}
      .chart-wrap {{
        height: 320px;
      }}
    }}
    @media (max-width: 720px) {{
      .shell {{ width: min(100vw - 18px, 100%); }}
      .hero, section {{ padding: 22px; border-radius: 24px; }}
      h1 {{ max-width: none; }}
      .topbar {{ flex-direction: column; align-items: flex-start; }}
    }}
  </style>
</head>
<body>
  <div class="shell">
    {topbar}
    {body}
  </div>
</body>
</html>"""


def chart_block(canvas_id: str, chart_type: str, data: dict, options: dict) -> str:
    config = {
        "type": chart_type,
        "data": data,
        "options": options,
    }
    return (
        f'<div class="chart-wrap"><canvas id="{canvas_id}"></canvas></div>\n'
        f"<script>new Chart(document.getElementById({json.dumps(canvas_id)}), {json.dumps(config, ensure_ascii=False)});</script>"
    )


def render_country_report(country: str) -> str:
    country_counts = build_country_school_counts(country)
    totals_by_year = {
        year: sum(country_counts[school].get(year, 0) for school in country_counts)
        for year in YEARS
    }
    isu_total_history = {
        year: school_year_metrics["義守大學"][year]["overseas"]
        for year in YEARS
    }
    isu_total_growth = calc_growth(
        isu_total_history["111"], isu_total_history["114"]
    )
    isu_history = country_counts.get("義守大學", {})
    isu_latest = isu_history.get("114", 0)
    isu_growth = calc_growth(isu_history.get("111", 0), isu_latest)
    latest_top = sorted(
        (
            {
                "school": school,
                "latest": year_data.get("114", 0),
                "history": [year_data.get(year, 0) for year in YEARS],
                "growth_111_114": calc_growth(year_data.get("111", 0), year_data.get("114", 0)),
                "growth_113_114": calc_growth(year_data.get("113", 0), year_data.get("114", 0)),
            }
            for school, year_data in country_counts.items()
            if year_data.get("114", 0) > 0
        ),
        key=lambda item: item["latest"],
        reverse=True,
    )[:10]
    top_schools = [item["school"] for item in latest_top]
    profile_schools: List[str] = []
    for school_name in top_schools[:6] + ["義守大學"]:
        if school_name not in profile_schools:
            profile_schools.append(school_name)
    isu_rank = next(
        (
            index + 1
            for index, item in enumerate(
                sorted(
                    (
                        {
                            "school": school,
                            "latest": year_data.get("114", 0),
                        }
                        for school, year_data in country_counts.items()
                        if year_data.get("114", 0) > 0
                    ),
                    key=lambda item: item["latest"],
                    reverse=True,
                )
            )
            if item["school"] == "義守大學"
        ),
        None,
    )

    table_rows = "\n".join(
        f"""
          <tr class="{'isu-row' if item['school'] == '義守大學' else ''}">
            <td>{index}</td>
            <td>{html.escape(item['school'])}</td>
            <td>{fmt_int(item['latest'])}</td>
            <td>{fmt_int(item['latest'] - item['history'][0])}</td>
            <td>{fmt_pct(item['growth_111_114'], 2)}</td>
            <td>{fmt_pct(item['growth_113_114'], 2)}</td>
          </tr>
        """
        for index, item in enumerate(latest_top, start=1)
    )
    if isu_latest and "義守大學" not in top_schools:
        table_rows += f"""
          <tr class="isu-row">
            <td>義守</td>
            <td>義守大學</td>
            <td>{fmt_int(isu_latest)}</td>
            <td>{fmt_int(isu_latest - isu_history.get('111', 0))}</td>
            <td>{fmt_pct(isu_growth, 2)}</td>
            <td>{fmt_pct(calc_growth(isu_history.get('113', 0), isu_latest), 2)}</td>
          </tr>
        """
    trend_chart = chart_block(
        f"trend-{slugify(country)}",
        "line",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": shorten_school(item["school"]),
                    "data": item["history"],
                    "borderColor": color,
                    "backgroundColor": f"{color}22",
                    "tension": 0.32,
                    "fill": False,
                }
                for item, color in zip(
                    latest_top[:5],
                    ["#b2482f", "#1f6660", "#24395b", "#c59b45", "#7d4c39"],
                )
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "interaction": {"mode": "index", "intersect": False},
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    isu_only_chart = chart_block(
        f"isu-only-{slugify(country)}",
        "line",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": f"義守大學 {shorten_country(country)}學生",
                    "data": [isu_history.get(year, 0) for year in YEARS],
                    "borderColor": "#b2482f",
                    "backgroundColor": "#b2482f22",
                    "tension": 0.32,
                    "fill": True,
                    "pointRadius": 4,
                    "pointHoverRadius": 6,
                }
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"display": False}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    share_chart = chart_block(
        f"share-{slugify(country)}",
        "bar",
        {
            "labels": [shorten_school(item["school"]) for item in latest_top[:8]],
            "datasets": [
                {
                    "label": f"114 {shorten_country(country)}學生",
                    "data": [item["latest"] for item in latest_top[:8]],
                    "backgroundColor": [
                        "#b2482f",
                        "#1f6660",
                        "#24395b",
                        "#c59b45",
                        "#7d4c39",
                        "#6a7081",
                        "#8d6e63",
                        "#497aa0",
                    ],
                }
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"display": False}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )

    body = f"""
    <header class="hero">
      <div class="eyebrow">Country Research</div>
      <h1>{shorten_country(country)}作為單一市場，臺灣哪些學校真正吃到成長</h1>
      <p class="hero-summary">本頁只使用目前資料夾中的 CSV 檔，核心底表為教育部大專校院校務資訊公開平台之校級國別資料 `stud_3_7_identity_school_111~114.csv`，因此「國家 x 學校」的人數與成長率皆直接來自公開平台，不用人工估算。</p>
      <div class="source-note">資料來源：教育部大專校院校務資訊公開平台 CSV。國家別學生數統一採 `stud_3_7_identity_school_111~114.csv` 的境外學位生總人數(A)欄位，讓越南、印尼、香港、日本、泰國、菲律賓、馬來西亞可以在同一尺度比較；科系差異代理則採 `stud_3_1_foreign_degree_department_114.csv` 的各校境外學位生熱門系所。</div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>114 全國總量</span>
          <strong>{fmt_int(totals_by_year["114"])}</strong>
          <small>{shorten_country(country)}在全部公開平台學校中的學生合計</small>
        </article>
        <article class="metric-card">
          <span>111→114 成長</span>
          <strong>{fmt_pct(calc_growth(totals_by_year["111"], totals_by_year["114"]), 2)}</strong>
          <small>全國該市場在四年內的整體變化</small>
        </article>
        <article class="metric-card">
          <span>義守 114 規模</span>
          <strong>{fmt_int(isu_latest)}</strong>
          <small>義守在此市場的 114 年學生數</small>
        </article>
        <article class="metric-card">
          <span>義守 111→114</span>
          <strong>{fmt_pct(isu_growth, 2)}</strong>
          <small>114 年全部公開平台學校排名 {"#" + str(isu_rank) if isu_rank else "n/a"}</small>
        </article>
      </div>
      <div class="callout">備注：義守大學整體境外學位生由 {fmt_int(isu_total_history["111"])} 人降至 {fmt_int(isu_total_history["114"])} 人，111→114 總成長率為 {fmt_pct(isu_total_growth, 2)}。同期，義守來自 {shorten_country(country)} 的學生由 {fmt_int(isu_history.get("111", 0))} 人變為 {fmt_int(isu_latest)} 人，該市場變化率為 {fmt_pct(isu_growth, 2)}。因此單一市場的升降，不等於義守整體境外生規模也會跟著同方向變化。</div>
    </header>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">01 / School Trend</div>
          <h2>前段學校不是一起長，而是少數幾校明顯加速</h2>
          <p>先把 {shorten_country(country)} 市場的前五校攤開看 111 到 114 學年的序列，判斷到底是均勻成長，還是特定學校把量能集中吃下來。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          {trend_chart}
        </div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>學校</th>
                <th>114 人數</th>
                <th>111→114 增量</th>
                <th>111→114</th>
                <th>113→114</th>
              </tr>
            </thead>
            <tbody>{table_rows}</tbody>
          </table>
          <div class="callout">114 年 {shorten_country(country)} 市場前五校合計已有 {fmt_int(sum(item['latest'] for item in latest_top[:5]))} 人。若前段學校的增量與成長率長期都高於義守，就代表競爭對手正在更快地吃下新增量。</div>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">02 / Latest Scale</div>
          <h2>114 年最新規模排序</h2>
          <p>這裡只看最新年度的人數規模，不再放佔比，只用實際學生數來看哪些學校已經卡住前段位置。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">{share_chart}</div>
        <div class="panel">
          <h3>研究判讀</h3>
          <p>如果一個市場同時呈現「總量成長」與「前幾校集中度提高」，策略上就不只是跟所有大學競爭，而是必須拆解前段對手的校系供給與招生敘事。這也是後續 one-pager 應優先鎖定的對象群。</p>
          <div class="callout">這一頁的國家別人數全部直接來自公開平台校級國別 CSV，沒有混入招生文案、媒體資料或主觀排名。</div>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">03 / ISU Only</div>
          <h2>只看義守，該國學生數怎麼變</h2>
          <p>這張折線圖單獨抽出義守大學在 {shorten_country(country)} 市場的 111 到 114 變化，讓單校趨勢可以和全國及競校脈絡分開閱讀。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">{isu_only_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>學年</th>
                <th>義守學生數</th>
                <th>相較前一年增減</th>
              </tr>
            </thead>
            <tbody>
              {"".join(f"<tr><td>{year}</td><td>{fmt_int(isu_history.get(year, 0))}</td><td>{'n/a' if year == YEARS[0] else fmt_int(isu_history.get(year, 0) - isu_history.get(YEARS[YEARS.index(year)-1], 0))}</td></tr>" for year in YEARS)}
            </tbody>
          </table>
          <div class="callout">這張圖只回答一件事：義守在這個市場到底有沒有持續擴張。它不處理競校比較，只處理單校自己的時間序列。</div>
        </div>
      </div>
    </section>

    """
    return html_page(f"{shorten_country(country)}市場研究", body)


def render_school_report(school: str) -> str:
    metrics = school_year_metrics[school]
    latest = metrics["114"]
    national_totals = aggregate_group_identity(lambda _: True)
    general_totals = aggregate_group_identity(is_general_university)
    private_general_totals = aggregate_group_identity(is_private_general_university)

    daytime_latest = daytime_students.get(school, {}).get("114", 0)
    school_growth = calc_growth(metrics["111"]["overseas"], latest["overseas"])
    school_foreign_growth = calc_growth(metrics["111"]["foreign"], latest["foreign"])

    def indexed(values: List[int]) -> List[float]:
        base = values[0]
        if not base:
            return [0 for _ in values]
        return [round(value / base * 100, 2) for value in values]

    overview_chart = chart_block(
        f"overview-{slugify(school)}",
        "line",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": "全國境外學位生指數(111=100)",
                    "data": indexed([national_totals[year]["overseas"] for year in YEARS]),
                    "borderColor": "#24395b",
                    "backgroundColor": "#24395b22",
                    "tension": 0.32,
                    "fill": False,
                },
                {
                    "label": f"{shorten_school(school)}境外學位生指數(111=100)",
                    "data": indexed([metrics[year]["overseas"] for year in YEARS]),
                    "borderColor": "#b2482f",
                    "backgroundColor": "#b2482f22",
                    "tension": 0.32,
                    "fill": False,
                },
                {
                    "label": f"{shorten_school(school)}外國學生指數(111=100)",
                    "data": indexed([metrics[year]["foreign"] for year in YEARS]),
                    "borderColor": "#1f6660",
                    "backgroundColor": "#1f666022",
                    "tension": 0.32,
                    "fill": False,
                },
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "interaction": {"mode": "index", "intersect": False},
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {"y": {"beginAtZero": False}},
        },
    )

    overview_rows = "\n".join(
        f"""
          <tr>
            <td>{year}</td>
            <td>{fmt_int(national_totals[year]['overseas'])}</td>
            <td>{fmt_int(metrics[year]['overseas'])}</td>
            <td>{fmt_int(metrics[year]['foreign'])}</td>
            <td>{fmt_int(daytime_students.get(school, {}).get(year, 0))}</td>
          </tr>
        """
        for year in YEARS
    )

    growth_metrics = [
        ("境外學位生總數", "overseas"),
        ("外國學生", "foreign"),
        ("僑生", "overseas_overseas_chinese"),
        ("港澳生", "overseas_hkmo"),
        ("陸生", "overseas_china"),
    ]
    growth_chart = chart_block(
        f"growth-{slugify(school)}",
        "bar",
        {
            "labels": [label for label, _ in growth_metrics],
            "datasets": [
                {
                    "label": school,
                    "data": [
                        calc_growth(metrics["113"][key], metrics["114"][key]) or 0
                        for _, key in growth_metrics
                    ],
                    "backgroundColor": "#b2482f",
                },
                {
                    "label": "一般大學",
                    "data": [
                        calc_growth(general_totals["113"][key], general_totals["114"][key]) or 0
                        for _, key in growth_metrics
                    ],
                    "backgroundColor": "#24395b",
                },
                {
                    "label": "私立一般大學",
                    "data": [
                        calc_growth(private_general_totals["113"][key], private_general_totals["114"][key]) or 0
                        for _, key in growth_metrics
                    ],
                    "backgroundColor": "#1f6660",
                },
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    growth_rows = "\n".join(
        f"""
          <tr>
            <td>{label}</td>
            <td>{fmt_pct(calc_growth(metrics['113'][key], metrics['114'][key]), 2)}</td>
            <td>{fmt_pct(calc_growth(general_totals['113'][key], general_totals['114'][key]), 2)}</td>
            <td>{fmt_pct(calc_growth(private_general_totals['113'][key], private_general_totals['114'][key]), 2)}</td>
          </tr>
        """
        for label, key in growth_metrics
    )

    ratio_rankings = build_ratio_rankings()
    school_ratio_rank = next(
        index + 1 for index, item in enumerate(ratio_rankings) if item["school"] == school
    )
    school_ratio = next(item["share"] for item in ratio_rankings if item["school"] == school)
    ratio_top = ratio_rankings[:10]
    if school not in [item["school"] for item in ratio_top]:
        ratio_top = ratio_top[:9] + [next(item for item in ratio_rankings if item["school"] == school)]
    ratio_chart = chart_block(
        f"ratio-{slugify(school)}",
        "bar",
        {
            "labels": [shorten_school(item["school"]) for item in ratio_top],
            "datasets": [
                {
                    "label": "114 境外學位生占日間學制學生比",
                    "data": [round(item["share"], 2) for item in ratio_top],
                    "backgroundColor": [
                        "#1f6660" if item["school"] == school else "#24395bcc"
                        for item in ratio_top
                    ],
                }
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"display": False}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    ratio_rows = "\n".join(
        f"""
          <tr class="{'focus-row' if item['school'] == school else ''}">
            <td>{index}</td>
            <td>{html.escape(item['school'])}</td>
            <td>{fmt_pct(item['share'], 2)}</td>
            <td>{fmt_int(item['overseas'])}</td>
            <td>{fmt_int(item['students'])}</td>
          </tr>
        """
        for index, item in enumerate(ratio_top, start=1)
    )

    private_overseas_rankings = build_private_general_rankings("overseas")
    private_foreign_rankings = build_private_general_rankings("foreign")
    private_hkmo_rankings = build_private_general_rankings("overseas_hkmo")
    private_overseas_chinese_rankings = build_private_general_rankings("overseas_overseas_chinese")
    private_rank_cards = {
        "overseas": next(i + 1 for i, item in enumerate(private_overseas_rankings) if item["school"] == school),
        "foreign": next(i + 1 for i, item in enumerate(private_foreign_rankings) if item["school"] == school),
        "hkmo": next(i + 1 for i, item in enumerate(private_hkmo_rankings) if item["school"] == school),
        "overseas_chinese": next(i + 1 for i, item in enumerate(private_overseas_chinese_rankings) if item["school"] == school),
    }
    position_chart = chart_block(
        f"position-{slugify(school)}",
        "bar",
        {
            "labels": [shorten_school(item["school"]) for item in private_overseas_rankings[:10]],
            "datasets": [
                {
                    "label": "114 境外學位生總數",
                    "data": [item["value"] for item in private_overseas_rankings[:10]],
                    "backgroundColor": [
                        "#1f6660" if item["school"] == school else "#b2482fcc"
                        for item in private_overseas_rankings[:10]
                    ],
                }
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"display": False}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    position_rows = "\n".join(
        f"""
          <tr class="{'focus-row' if item['school'] == school else ''}">
            <td>{index}</td>
            <td>{html.escape(item['school'])}</td>
            <td>{fmt_int(item['value'])}</td>
          </tr>
        """
        for index, item in enumerate(private_overseas_rankings[:10], start=1)
    )

    top_locations_counter = Counter(latest["top_locations"])
    source_top3 = [name for name, _ in top_locations_counter.most_common(3)]
    source_chart = chart_block(
        f"sources-{slugify(school)}",
        "line",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": shorten_country(name),
                    "data": [metrics[year]["top_locations"].get(name, 0) for year in YEARS],
                    "borderColor": color,
                    "backgroundColor": f"{color}22",
                    "tension": 0.32,
                    "fill": False,
                }
                for name, color in zip(source_top3, ["#b2482f", "#1f6660", "#24395b"])
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "interaction": {"mode": "index", "intersect": False},
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    source_rows = "\n".join(
        f"""
          <tr>
            <td>{index}</td>
            <td>{html.escape(shorten_country(name))}</td>
            <td>{fmt_int(top_locations_counter[name])}</td>
            <td>{fmt_pct(calc_growth(metrics['111']['top_locations'].get(name, 0), metrics['114']['top_locations'].get(name, 0)), 2)}</td>
          </tr>
        """
        for index, name in enumerate(source_top3, start=1)
    )

    foreign_dept_series = build_foreign_department_series(school)
    major_foreign_departments = sorted(
        (
            {
                "name": dept,
                "history": [series.get(year, 0) for year in YEARS],
                "count_114": series.get("114", 0),
            }
            for dept, series in foreign_dept_series.items()
            if series.get("114", 0) > 0
        ),
        key=lambda item: item["count_114"],
        reverse=True,
    )[:4]
    foreign_dept_chart = chart_block(
        f"foreign-dept-{slugify(school)}",
        "line",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": item["name"],
                    "data": item["history"],
                    "borderColor": color,
                    "backgroundColor": f"{color}22",
                    "tension": 0.32,
                    "fill": False,
                }
                for item, color in zip(
                    major_foreign_departments,
                    ["#b2482f", "#1f6660", "#24395b", "#c59b45"],
                )
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "interaction": {"mode": "index", "intersect": False},
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {"y": {"beginAtZero": True}},
        },
    )
    foreign_dept_rows = "\n".join(
        f"""
          <tr>
            <td>{html.escape(item['name'])}</td>
            <td>{fmt_int(item['history'][0])}</td>
            <td>{fmt_int(item['history'][-1])}</td>
            <td>{fmt_pct(calc_growth(item['history'][0], item['history'][-1]), 2)}</td>
          </tr>
        """
        for item in major_foreign_departments
    )

    enrollment_chart = chart_block(
        f"enrollment-{slugify(school)}",
        "bar",
        {
            "labels": YEARS,
            "datasets": [
                {
                    "label": "境外新生實際註冊人數",
                    "data": [metrics[year].get("intl_freshmen", 0) for year in YEARS],
                    "backgroundColor": "#b2482f",
                    "yAxisID": "y",
                },
                {
                    "type": "line",
                    "label": "全校註冊率",
                    "data": [metrics[year].get("registration_rate", 0) for year in YEARS],
                    "borderColor": "#1f6660",
                    "backgroundColor": "#1f666022",
                    "yAxisID": "y1",
                    "tension": 0.32,
                },
                {
                    "type": "line",
                    "label": "學士班穩定率",
                    "data": [metrics[year].get("stability_rate", 0) for year in YEARS],
                    "borderColor": "#24395b",
                    "backgroundColor": "#24395b22",
                    "yAxisID": "y1",
                    "tension": 0.32,
                },
            ],
        },
        {
            "responsive": True,
            "maintainAspectRatio": False,
            "plugins": {"legend": {"position": "bottom"}},
            "scales": {
                "y": {"beginAtZero": True, "position": "left"},
                "y1": {"beginAtZero": True, "position": "right", "grid": {"drawOnChartArea": False}},
            },
        },
    )
    enrollment_rows = "\n".join(
        f"""
          <tr>
            <td>{year}</td>
            <td>{fmt_int(metrics[year].get('intl_freshmen', 0))}</td>
            <td>{fmt_pct(metrics[year].get('registration_rate'), 2)}</td>
            <td>{fmt_pct(metrics[year].get('stability_rate'), 2)}</td>
          </tr>
        """
        for year in YEARS
    )

    risk_departments = [item["name"] for item in major_foreign_departments]
    risk_rows_data = build_dropout_suspend_113(school, risk_departments)
    risk_rows = "\n".join(
        f"""
          <tr>
            <td>{html.escape(item['name'])}</td>
            <td>{fmt_pct(item['dropout_rate'], 2)}</td>
            <td>{fmt_pct(item['suspend_rate'], 2)}</td>
          </tr>
        """
        for item in risk_rows_data
    )

    body = f"""
    <header class="hero">
      <div class="eyebrow">School Research</div>
      <h1>{school}境外生整體評估</h1>
      <p class="hero-summary">這一版把學校主體頁拉到和義守整體評估相近的深度，重點放在總盤變化、113→114 成長速度、114 比例與位置、來源前三國、外國學生主力科系變化，以及境外新生註冊與穩定表現。</p>
      <div class="source-note">資料來源：教育部大專校院校務資訊公開平台 CSV。核心底表包括 `stud_1_2_school_111~114.csv`、`stud_3_7_identity_school_111~114.csv`、`stud_12_3_registration_school_111~114.csv`、`stud_16_attendance_school_111~114.csv`、`moe_udb_foreign_students_by_department_national_111~114.csv`、`stud_14_1_dropout_department_113.csv` 與 `stud_13_1_suspend_department_113.csv`。</div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>114 境外生</span>
          <strong>{fmt_int(latest['overseas'])}</strong>
          <small>校級境外學位生總數</small>
        </article>
        <article class="metric-card">
          <span>111→114 境外生</span>
          <strong>{fmt_pct(school_growth, 2)}</strong>
          <small>四年間整體境外生規模變化</small>
        </article>
        <article class="metric-card">
          <span>114 外國學生</span>
          <strong>{fmt_int(latest['foreign'])}</strong>
          <small>純外國學生規模</small>
        </article>
        <article class="metric-card">
          <span>111→114 外國生</span>
          <strong>{fmt_pct(school_foreign_growth, 2)}</strong>
          <small>純外國學生規模變化</small>
        </article>
      </div>
    </header>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">01 / Overview</div>
          <h2>先看全國 111 到 114 的變化，再看自己的變化</h2>
          <p>這裡先把全國境外學位生總盤與本校自身走勢放在同一個框架。因為全國整體向上，不代表單一學校一定同步吃到成長。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">{overview_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>學年</th>
                <th>全國境外生</th>
                <th>{school}</th>
                <th>{school}外國生</th>
                <th>{school}日間學生</th>
              </tr>
            </thead>
            <tbody>{overview_rows}</tbody>
          </table>
          <div class="callout">114 年全國境外學位生為 {fmt_int(national_totals['114']['overseas'])} 人；{school} 自身為 {fmt_int(latest['overseas'])} 人。若本校的指數斜率明顯低於全國，代表不是市場沒有長，而是學校承接得不夠快。</div>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">02 / Growth</div>
          <h2>113→114 五項變化中，成長速度與一般大學、私立一般大學比較</h2>
          <p>這一段直接用五個身份結構指標比速度：境外學位生總數、外國學生、僑生、港澳生與陸生。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">{growth_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>指標</th>
                <th>{school}</th>
                <th>一般大學</th>
                <th>私立一般大學</th>
              </tr>
            </thead>
            <tbody>{growth_rows}</tbody>
          </table>
          <div class="callout">這裡看的不是規模，而是 113→114 的加速度。某校即使基礎盤大，如果五項指標的年增率全面慢於私立一般大學平均，競爭位置仍可能在鈍化。</div>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">03 / Ratio</div>
          <h2>114 學年，境外學位生占日間學制學生比例與全國排名</h2>
          <p>比例要放在一般大學名單裡一起看，才能知道這個結構在全國算前段、中段，還是偏弱。</p>
        </div>
      </div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>114 境外占比</span>
          <strong>{fmt_pct(school_ratio, 2)}</strong>
          <small>境外學位生占日間學制學生比例</small>
        </article>
        <article class="metric-card">
          <span>一般大學排名</span>
          <strong>#{school_ratio_rank}</strong>
          <small>114 年按占比排序</small>
        </article>
        <article class="metric-card">
          <span>114 日間學生</span>
          <strong>{fmt_int(daytime_latest)}</strong>
          <small>分母採日間學制</small>
        </article>
        <article class="metric-card">
          <span>114 境外生</span>
          <strong>{fmt_int(latest['overseas'])}</strong>
          <small>分子採境外學位生總數</small>
        </article>
      </div>
      <div class="grid-2" style="margin-top:18px;">
        <div class="panel">{ratio_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>學校</th>
                <th>占比</th>
                <th>境外生</th>
                <th>日間學生</th>
              </tr>
            </thead>
            <tbody>{ratio_rows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">04 / Position</div>
          <h2>放在私立一般大學來看，114 學年的境外學位生規模位置</h2>
          <p>這裡把私立一般大學當作主戰場，直接看本校在總量、外國學生、僑生、港澳生的相對名次。</p>
        </div>
      </div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>境外學位生</span>
          <strong>#{private_rank_cards['overseas']}</strong>
          <small>114 私立一般大學排名</small>
        </article>
        <article class="metric-card">
          <span>外國學生</span>
          <strong>#{private_rank_cards['foreign']}</strong>
          <small>114 私立一般大學排名</small>
        </article>
        <article class="metric-card">
          <span>僑生</span>
          <strong>#{private_rank_cards['overseas_chinese']}</strong>
          <small>114 私立一般大學排名</small>
        </article>
        <article class="metric-card">
          <span>港澳生</span>
          <strong>#{private_rank_cards['hkmo']}</strong>
          <small>114 私立一般大學排名</small>
        </article>
      </div>
      <div class="grid-2" style="margin-top:18px;">
        <div class="panel">{position_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>學校</th>
                <th>114 境外生</th>
              </tr>
            </thead>
            <tbody>{position_rows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">05 / Source Mix</div>
          <h2>114 學年國家來源前三名</h2>
          <p>來源前三名決定招生重心；同時，本校外國學生主力科系 111 到 114 的走勢，能看出真正承接外國學生的是哪些學術單位。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          {source_chart}
          <table style="margin-top:14px;">
            <thead>
              <tr>
                <th>排名</th>
                <th>來源地</th>
                <th>114 人數</th>
                <th>111→114</th>
              </tr>
            </thead>
            <tbody>{source_rows}</tbody>
          </table>
        </div>
        <div class="panel">
          {foreign_dept_chart}
          <table style="margin-top:14px;">
            <thead>
              <tr>
                <th>外國學生主力科系</th>
                <th>111</th>
                <th>114</th>
                <th>111→114</th>
              </tr>
            </thead>
            <tbody>{foreign_dept_rows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">06 / Enrollment</div>
          <h2>境外新生實際註冊率與在學穩定</h2>
          <p>除了看境外新生進來多少，也要一起看全校註冊率、學士班穩定率，以及 113 年主力科系的退學與休學風險。</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">{enrollment_chart}</div>
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>學年</th>
                <th>境外新生</th>
                <th>全校註冊率</th>
                <th>學士班穩定率</th>
              </tr>
            </thead>
            <tbody>{enrollment_rows}</tbody>
          </table>
          <div class="footnote">註冊率採 `stud_12_3_registration_school`；穩定率採 `stud_16_attendance_school` 的學士班(日間)。</div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px;">
        <h3>113 主力科系退學率與休學率</h3>
        <table>
          <thead>
            <tr>
              <th>系所</th>
              <th>退學率</th>
              <th>休學率</th>
            </tr>
          </thead>
          <tbody>{risk_rows}</tbody>
        </table>
        <div class="footnote">這裡的大系所以本校外國學生主力科系為主；退學率用 `stud_14_1_dropout_department_113.csv` 的學期資料加總換算，休學率用 `stud_13_1_suspend_department_113.csv` 的學年資料換算。</div>
      </div>
    </section>
    """
    return html_page(f"{school}境外生整體評估", body)


def render_sources_page() -> str:
    site_root = ROOT / "isu_foreign_student_report_site"
    csv_files = sorted(site_root.rglob("*.csv"))
    grouped: Dict[str, List[Path]] = defaultdict(list)
    for path in csv_files:
        if path.name.startswith("download_manifest"):
            continue
        grouped[path.name].append(path)
    source_rows_data = [
        {
            "index": index,
            "name": name,
            "paths": [p.relative_to(ROOT).as_posix() for p in paths],
            "bytes": paths[0].stat().st_size,
        }
        for index, (name, paths) in enumerate(sorted(grouped.items()), start=1)
    ]
    for row in source_rows_data:
        row["path_links"] = "<br>".join(
            f'<a href="{html.escape(path)}">{html.escape(path)}</a>'
            for path in row["paths"]
        )
    source_rows = "\n".join(
        f"""
          <tr>
            <td>{row['index']}</td>
            <td>{html.escape(row['name'])}</td>
            <td>{row['path_links']}</td>
            <td>{len(row['paths'])}</td>
            <td>{fmt_int(row['bytes'])}</td>
          </tr>
        """
        for row in source_rows_data
    )

    body = f"""
    <header class="hero">
      <div class="eyebrow">Sources</div>
      <h1>資料來源與下載清單</h1>
      <p class="hero-summary">這一頁集中放置本專案使用的主要資料來源、平台連結，以及 `isu_foreign_student_report_site` 內目前作為研究基礎的 CSV 清單，方便後續追溯與再利用。</p>
      <div class="source-note">主要資料來源基礎：<a href="https://udb.moe.edu.tw/udata/ReportCategories" target="_blank" rel="noopener noreferrer">教育部大專校院校務資訊公開平台</a>。本頁主清單以 `/Users/weisfx/Desktop/國際處/4 嘉暐notes/20260319_wei/student_analyse/isu_foreign_student_report_site` 內的 CSV 為準。</div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>主要平台</span>
          <strong>1</strong>
          <small>教育部大專校院校務資訊公開平台</small>
        </article>
        <article class="metric-card">
          <span>主清單 CSV</span>
          <strong>{len(source_rows_data)}</strong>
          <small>以檔名去重後的 76 份 CSV</small>
        </article>
        <article class="metric-card">
          <span>來源資料夾</span>
          <strong>1</strong>
          <small>`isu_foreign_student_report_site`</small>
        </article>
        <article class="metric-card">
          <span>實體 CSV</span>
          <strong>{len(csv_files)}</strong>
          <small>含重複檔名與 manifest 共 {len(csv_files)} 份</small>
        </article>
      </div>
    </header>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">Main Source</div>
          <h2>主要資料來源</h2>
          <p>本專案的校務公開資料主要來自教育部大專校院校務資訊公開平台的資訊查詢頁與學生類表冊下載頁。</p>
        </div>
      </div>
      <div class="link-grid">
        <a class="link-card main-link-card" href="https://udb.moe.edu.tw/udata/ReportCategories" target="_blank" rel="noopener noreferrer">
          <span>Official Source</span>
          <strong>教育部大專校院校務資訊公開平台</strong>
          <p>直接前往平台主查詢頁，查看資訊分類與各表冊下載入口。</p>
        </a>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">CSV List</div>
          <h2>`isu_foreign_student_report_site` 內的 76 份 CSV 清單</h2>
          <p>以下清單以檔名去重後呈現；若同名檔案同時存在於不同子目錄，會一起列在同一列中。</p>
        </div>
      </div>
      <div class="panel">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>檔名</th>
              <th>本地路徑</th>
              <th>份數</th>
              <th>Bytes</th>
            </tr>
          </thead>
          <tbody>{source_rows}</tbody>
        </table>
      </div>
    </section>
    """
    return html_page("資料來源與下載清單", body, nav_link="index.html")


def render_index() -> str:
    country_cards = "\n".join(
        f"""
        <a class="link-card" href="report_hub/country-{slugify(country)}.html">
          <span>Country Report</span>
          <strong>{shorten_country(country)}</strong>
          <p>查看 {shorten_country(country)} 市場在臺灣前段學校的 111 到 114 變化、成長率與科系代理輪廓。</p>
        </a>
        """
        for country in COUNTRY_TARGETS
    )
    school_cards = "\n".join(
        f"""
        <a class="link-card" href="report_hub/school-{slugify(school)}.html">
          <span>School Report</span>
          <strong>{school}</strong>
          <p>獨立查看 {school} 的境外生規模、來源地、身份結構、註冊與系所承接面。</p>
        </a>
        """
        for school in SCHOOL_TARGETS
    )
    body = f"""
    <header class="hero">
      <div class="eyebrow">Admissions Research Hub</div>
      <h1>境外生大數據分析報告入口</h1>
      <p class="hero-summary">這個入口頁把總結報告與新的一頁式研究拆成兩條線管理。所有新頁面都只使用目前資料夾內的 CSV，且在頁首固定標示資料來源為教育部大專校院校務資訊公開平台，方便後續持續擴充。</p>
      <div class="source-note">主要資料來源基礎：<a href="https://udb.moe.edu.tw/udata/ReportCategories" target="_blank" rel="noopener noreferrer">教育部大專校院校務資訊公開平台</a>。新報告目前使用該平台匯出的 CSV，包括 `stud_1_2_school`、`stud_3_7_identity_school`、`stud_12_3_registration_school`、`stud_16_attendance_school`、`stud_3_1_foreign_degree_department`、`moe_udb_foreign_students_by_department_national` 等檔案，年份範圍為 111 到 114 學年。</div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>國家主體頁</span>
          <strong>{len(COUNTRY_TARGETS)}</strong>
          <small>固定納入越南、印尼、香港、日本、泰國、菲律賓、馬來西亞</small>
        </article>
        <article class="metric-card">
          <span>學校主體頁</span>
          <strong>{len(SCHOOL_TARGETS)}</strong>
          <small>義守、靜宜、逢甲、文化、銘傳</small>
        </article>
        <article class="metric-card">
          <span>總結報告</span>
          <strong>1</strong>
          <small>首頁直接保留一份總結報告主入口</small>
        </article>
        <article class="metric-card">
          <span>研究基礎</span>
          <strong>CSV</strong>
          <small>全部數字來自本地 CSV，不用人工搬數</small>
        </article>
      </div>
    </header>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">Summary</div>
          <h2>總結報告</h2>
        </div>
      </div>
      <div class="link-grid">
        <a class="link-card main-link-card" href="isu_foreign_student_report_site/index.html">
          <span>Summary Report</span>
          <strong>義守境外生整體評估報告</strong>
          <p>直接進入義守境外生整體評估報告，查看成長、來源結構、競校位置與整體招生成效。</p>
        </a>
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">Track A</div>
          <h2>以國家為主體的研究</h2>
        </div>
      </div>
      <div class="link-grid">{country_cards}</div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">Track B</div>
          <h2>以學校為主體的研究</h2>
        </div>
      </div>
      <div class="link-grid">{school_cards}</div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <div class="eyebrow">Sources</div>
          <h2>資料來源</h2>
        </div>
      </div>
      <div class="link-grid">
        <a class="link-card" href="sources.html">
          <span>Data Sources</span>
          <strong>資料來源與下載清單</strong>
          <p>查看主要來源平台連結，以及 `isu_foreign_student_report_site` 內 76 份 CSV 的主清單。</p>
        </a>
      </div>
    </section>
    """
    return html_page("境外生大數據分析報告入口", body, nav_link=None)


def write_output() -> None:
    REPORT_DIR.mkdir(exist_ok=True)
    (ROOT / "index.html").write_text(render_index(), encoding="utf-8")
    (ROOT / "sources.html").write_text(render_sources_page(), encoding="utf-8")
    target_country_files = {
        REPORT_DIR / f"country-{slugify(country)}.html"
        for country in COUNTRY_TARGETS
    }
    for path in REPORT_DIR.glob("country-*.html"):
        if path not in target_country_files:
            path.unlink()
    for country in COUNTRY_TARGETS:
        target = REPORT_DIR / f"country-{slugify(country)}.html"
        target.write_text(render_country_report(country), encoding="utf-8")
    for school in SCHOOL_TARGETS:
        target = REPORT_DIR / f"school-{slugify(school)}.html"
        target.write_text(render_school_report(school), encoding="utf-8")


if __name__ == "__main__":
    write_output()
