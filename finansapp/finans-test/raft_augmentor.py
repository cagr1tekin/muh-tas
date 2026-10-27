import copy
import json
import random
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Tuple


INPUT_PATH = Path("raft_dataset.jsonl")
OUTPUT_PATH = Path("raft_dataset_augmented.jsonl")


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def period_human(period: str) -> Tuple[str, str]:
    # "2021-11" -> ("Kasım", "2021")
    months = {
        "01": "Ocak",
        "02": "Şubat",
        "03": "Mart",
        "04": "Nisan",
        "05": "Mayıs",
        "06": "Haziran",
        "07": "Temmuz",
        "08": "Ağustos",
        "09": "Eylül",
        "10": "Ekim",
        "11": "Kasım",
        "12": "Aralık",
    }
    parts = str(period).split("-")
    if len(parts) < 2:
        return period, ""
    year = parts[0]
    month = parts[1].zfill(2)
    return months.get(month, month), year


def extract_period_from_question(q: str) -> str:
    # Örn: "2021-11 döneminde..."
    first = q.split(" ")[0]
    if "-" in first and len(first) >= 7:
        return first[:7]
    return "Bilinmiyor"


def distractor_templates(rng: random.Random, context: str) -> List[str]:
    x = rng.randint(2, 12)
    y = rng.randint(2, 12)
    net_hn = round(rng.uniform(0.2, 6.0), 2)
    altin_ton = rng.randint(20, 95)
    hacim = rng.randint(90, 420)
    cıkıs = rng.randint(50, 900)
    return [
        f"BIST 100 bu ay %{x} yükseldi.",
        f"BIST 100 bu ay %{y} geriledi.",
        f"Net Hata ve Noksan kalemi {net_hn} milyar dolar olarak açıklandı.",
        f"Altın ithalatı bu ay {altin_ton} ton ile rekor kırdı.",
        f"Borsa İstanbul günlük işlem hacmi {hacim} milyar TL oldu. Yabancı yatırımcı BIST'ten {cıkıs} milyon dolar çıkardı.",
    ]


def method1_question_paraphrase(base: Dict[str, Any], n: int) -> List[Dict[str, Any]]:
    q = str(base.get("question", ""))
    period = extract_period_from_question(q)
    month_name, year = period_human(period)
    has_portfolio = bool(base.get("portfolio_context"))

    if has_portfolio:
        variants = [
            f"{year} {month_name} döneminde portföyümdeki dövizler için ne yapmalıyım?",
            f"{month_name} {year}'de makroekonomik tabloya göre portföy önerisi nedir?",
        ]
    else:
        variants = [
            f"{year} {month_name} ayında dolar neden yükseldi?",
            f"{month_name} {year}'de TL'nin değer kaybetmesinin makroekonomik nedenleri nelerdi?",
        ]

    out = []
    for v in variants[: max(0, min(n, len(variants)))]:
        row = copy.deepcopy(base)
        row["question"] = v
        out.append(row)
    return out


def method2_distractor_rotation(base: Dict[str, Any], rng: random.Random, n: int) -> List[Dict[str, Any]]:
    templates = distractor_templates(rng, str(base.get("context", "")))
    # DÜZELTME 1: Örnek başına en fazla 3 distractor varyantı.
    n = max(0, min(n, 3))
    templates = templates[:n]
    out = []
    for d in templates:
        row = copy.deepcopy(base)
        row["distractor_context"] = d
        out.append(row)
    return out


def method3_negative_examples(base: Dict[str, Any], rng: random.Random) -> List[Dict[str, Any]]:
    ans = base.get("answer", {})
    risk = str(ans.get("risk_bolgesi", "NOTR"))
    if risk != "RISKLI":
        return []

    positive_decoys = [
        "rezervlerde geçici artış",
        "faiz oranındaki yükseliş",
        "kısa vadeli sermaye girişi",
        "cari dengede geçici toparlanma",
    ]
    negative_drivers = [
        "kur şokunun ivmelenmesi",
        "M2 büyümesinin yüksek kalması",
        "REK dengesizliği ve dış kırılganlık",
        "rezervlerde kırılganlık ve müdahale kapasitesi riski",
    ]

    p = rng.choice(positive_decoys)
    n = rng.choice(negative_drivers)

    row = copy.deepcopy(base)
    row["question"] = "Bu dönemde neden GUVENLI bölgedeyiz?"
    row["chain_of_thought"] = (
        f"Yatırımcı {p} verisini görüp GUVENLI sanabilir ama {n} baskın. "
        f"Bu nedenle nihai etiket RISKLI kalır."
    )
    # doviz_onerileri: RISKLI kararına göre SAT/TUT önerileri; base'den koru (zaten RISKLI mantıklı)
    row["answer"] = {
        "risk_bolgesi": "RISKLI",
        "projeksiyon_3_ay": ans.get("projeksiyon_3_ay", 0),
        "projeksiyon_6_ay": ans.get("projeksiyon_6_ay", 0),
        "ozet": "Görünürde pozitif sinyaller olsa da baskın riskler nedeniyle dönem RISKLI sınıfındadır.",
        "doviz_onerileri": ans.get("doviz_onerileri", []),
    }
    return [row]


def method4_hybrid_scenarios(base_rows: List[Dict[str, Any]], rng: random.Random, count: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if len(base_rows) < 3:
        return out

    for _ in range(count):
        a, b, c = rng.sample(base_rows, 3)
        pa = extract_period_from_question(str(a.get("question", "")))
        pb = extract_period_from_question(str(b.get("question", "")))
        pc = extract_period_from_question(str(c.get("question", "")))

        # Hibritte risk etiketini muhafazakâr belirleyelim:
        ra = str(a.get("answer", {}).get("risk_bolgesi", "NOTR"))
        rb = str(b.get("answer", {}).get("risk_bolgesi", "NOTR"))
        rc = str(c.get("answer", {}).get("risk_bolgesi", "NOTR"))
        risks = [ra, rb, rc]
        if risks.count("RISKLI") >= 2:
            final_risk = "RISKLI"
        elif risks.count("GUVENLI") >= 2:
            final_risk = "GUVENLI"
        else:
            final_risk = "NOTR"

        proj3 = round(
            (
                float(a.get("answer", {}).get("projeksiyon_3_ay", 0))
                + float(b.get("answer", {}).get("projeksiyon_3_ay", 0))
                + float(c.get("answer", {}).get("projeksiyon_3_ay", 0))
            )
            / 3.0,
            2,
        )
        proj6 = round(
            (
                float(a.get("answer", {}).get("projeksiyon_6_ay", 0))
                + float(b.get("answer", {}).get("projeksiyon_6_ay", 0))
                + float(c.get("answer", {}).get("projeksiyon_6_ay", 0))
            )
            / 3.0,
            2,
        )

        # Hibrit senaryoda doviz_onerileri: üç dönemin çoğunluk kararına göre
        # A'nın portföy yapısını temel al, diğerleri yoksa boş liste
        base_onerileri = list(a.get("answer", {}).get("doviz_onerileri", []))

        row = {
            "question": f"Eğer {pa} rezervleriyle {pb} REK değeri bir arada olsaydı ve {pc} faiz rejimi geçerli olsaydı ne olurdu?",
            "context": (
                f"Hibrit senaryo: rezerv dinamiği={pa}, REK rejimi={pb}, faiz koşulu={pc}. "
                "Bu kombinasyon gerçek tarihsel olmayan fakat makro tutarlı bir deney senaryosudur."
            ),
            "portfolio_context": a.get("portfolio_context", ""),
            "news_context": a.get("news_context", ""),
            "chain_of_thought": (
                f"Üç farklı dönemin risk sinyalleri birleştirildi: {pa}({ra}), {pb}({rb}), {pc}({rc}). "
                f"Çoğunluk sinyali yaklaşımıyla sonuç {final_risk}."
            ),
            "answer": {
                "risk_bolgesi": final_risk,
                "projeksiyon_3_ay": proj3,
                "projeksiyon_6_ay": proj6,
                "ozet": "Hibrit senaryo değerlendirmesinde birleşik sinyal yaklaşımı kullanıldı.",
                "doviz_onerileri": base_onerileri,
            },
            "distractor_context": rng.choice(distractor_templates(rng, "")),
        }
        out.append(row)
    return out


def main() -> None:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Girdi dosyası bulunamadı: {INPUT_PATH}")

    rng = random.Random(123)
    base_rows = load_jsonl(INPUT_PATH)

    augmented: List[Dict[str, Any]] = []
    method_counter = Counter()

    # Orijinal örnekleri de koru
    for row in base_rows:
        r = copy.deepcopy(row)
        r["_method"] = "base"
        augmented.append(r)
    method_counter["base"] += len(base_rows)

    # Sınıf bazlı çarpan:
    # - GUVENLI örnekler: 4x
    # - Diğerleri: 2x
    # Bunu method1+method2 toplam kopya sayısına dağıtıyoruz.
    #   GUVENLI -> 2 paraphrase + 2 distractor = 4
    #   diğerleri -> 1 paraphrase + 1 distractor = 2

    # YÖNTEM 1
    for row in base_rows:
        risk = str(row.get("answer", {}).get("risk_bolgesi", "NOTR"))
        n_paraphrase = 2 if risk == "GUVENLI" else 1
        items = method1_question_paraphrase(row, n_paraphrase)
        for it in items:
            it["_method"] = "method1_paraphrase"
            augmented.append(it)
        method_counter["method1_paraphrase"] += len(items)

    # YÖNTEM 2
    for row in base_rows:
        risk = str(row.get("answer", {}).get("risk_bolgesi", "NOTR"))
        n_distractor = 2 if risk == "GUVENLI" else 1
        items = method2_distractor_rotation(row, rng, n_distractor)
        for it in items:
            it["_method"] = "method2_distractor_rotation"
            augmented.append(it)
        method_counter["method2_distractor_rotation"] += len(items)

    # YÖNTEM 3
    for row in base_rows:
        items = method3_negative_examples(row, rng)
        for it in items:
            it["_method"] = "method3_negative_examples"
            augmented.append(it)
        method_counter["method3_negative_examples"] += len(items)

    # YÖNTEM 4
    # Toplamı 600-900 bandında tutmak için hibrit senaryoyu kontrollü üretiyoruz.
    hybrid_count = 120
    hybrids = method4_hybrid_scenarios(base_rows, rng, hybrid_count)
    for h in hybrids:
        h["_method"] = "method4_hybrid_scenarios"
        augmented.append(h)
    method_counter["method4_hybrid_scenarios"] += len(hybrids)

    # Hedef minimum 600; güvence için padding.
    while len(augmented) < 600:
        row = copy.deepcopy(rng.choice(base_rows))
        row["_method"] = "padding_copy"
        augmented.append(row)
        method_counter["padding_copy"] += 1

    # Risk dağılımı
    # DÜZELTME 2 + final hedef dağılım:
    # Son seti 600-900 bandında tutup hedef oranlara yaklaştırıyoruz.
    target_total = 800
    target_counts = {
        "RISKLI": int(target_total * 0.425),   # %42.5
        "GUVENLI": int(target_total * 0.225),  # %22.5
        "NOTR": target_total - int(target_total * 0.425) - int(target_total * 0.225),  # %35
    }

    by_risk: Dict[str, List[Dict[str, Any]]] = {"RISKLI": [], "GUVENLI": [], "NOTR": []}
    for row in augmented:
        risk = str(row.get("answer", {}).get("risk_bolgesi", "NOTR"))
        if risk not in by_risk:
            risk = "NOTR"
        by_risk[risk].append(row)

    final_rows: List[Dict[str, Any]] = []
    for risk, need in target_counts.items():
        pool = by_risk.get(risk, [])
        if not pool:
            continue
        if len(pool) >= need:
            chosen = rng.sample(pool, need)
        else:
            # Yetersizse replacement ile tamamla.
            chosen = pool.copy()
            while len(chosen) < need:
                chosen.append(copy.deepcopy(rng.choice(pool)))
        final_rows.extend(chosen)

    rng.shuffle(final_rows)

    risk_counter = Counter()
    method_counter_final = Counter()
    for row in final_rows:
        risk = str(row.get("answer", {}).get("risk_bolgesi", "NOTR"))
        risk_counter[risk] += 1
        method_counter_final[str(row.get("_method", "unknown"))] += 1

    # JSONL yazarken _method alanını çıkar (istenen formatı koruyalım)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        for row in final_rows:
            row_out = dict(row)
            row_out.pop("_method", None)
            f.write(json.dumps(row_out, ensure_ascii=False) + "\n")

    print(f"Augmented dataset üretildi: {OUTPUT_PATH}")
    print(f"Toplam örnek: {len(final_rows)}")
    print(
        f"Risk dağılımı: RISKLI={risk_counter['RISKLI']}, "
        f"GUVENLI={risk_counter['GUVENLI']}, NOTR={risk_counter['NOTR']}"
    )
    print("Yöntem bazında sayılar:")
    for k, v in method_counter_final.items():
        print(f"- {k}: {v}")


if __name__ == "__main__":
    main()

