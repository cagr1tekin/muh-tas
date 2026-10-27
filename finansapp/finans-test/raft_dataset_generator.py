import json
import random
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Tuple


INPUT_PATH = Path("tarihsel_makro_veri.json")
OUTPUT_PATH = Path("raft_dataset.jsonl")

# Portföy senaryoları: (doviz_kodu, kar_pct) — AL/TUT/SAT kararı için baz
PORTFOLIO_SCENARIOS = [
    # USD ağırlıklı portföy
    [("USD", 0.05), ("EUR", 0.08)],
    # EUR ağırlıklı portföy
    [("EUR", 0.12), ("GBP", 0.03)],
    # Karma portföy (zararda + karda)
    [("USD", -0.06), ("EUR", 0.15), ("GBP", -0.02)],
]

# Makro duruma göre simüle haber başlıkları
NEWS_TEMPLATES = {
    "RISKLI": [
        "TCMB rezervleri gerilemeye devam ediyor; dolar/TL'de yukarı baskı sürüyor.",
        "Cari açık beklenenden yüksek geldi; TL üzerindeki baskı artıyor.",
        "Enflasyon verileri beklentilerin üzerinde; merkez bankası faiz artışı gündemde.",
        "Yabancı yatırımcı çıkışı hız kazandı; piyasalarda sert hareketler bekleniyor.",
        "M2 para arzındaki hızlı artış TL'yi değer kaybetmeye zorluyor.",
    ],
    "GUVENLI": [
        "TCMB rezervleri güçleniyor; TL'de istikrar sinyalleri artıyor.",
        "Cari denge fazlası verdi; sermaye girişi pozitif seyrede devam ediyor.",
        "Sıkı para politikası meyvelerini veriyor; enflasyon beklentileri geriliyor.",
        "Döviz rezervlerindeki artış piyasalara güven veriyor.",
        "Yabancı yatırımcı ilgisi artıyor; TL'de değer kazanımı beklentisi güçleniyor.",
    ],
    "NOTR": [
        "Dolar/TL yatay seyrediyor; piyasalar yönü belirlemekte zorlanıyor.",
        "Karma ekonomik sinyaller; analistler temkinli duruşunu koruyor.",
        "TCMB beklentilere paralel karar aldı; piyasalar sakin seyretti.",
        "Cari denge dengeli; yatırımcılar yeni verileri bekliyor.",
        "Rezerv hareketi sınırlı kalıyor; kur volatilitesi düşük seyrediyor.",
    ],
}


def to_float(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def pct_change(curr: float, prev: float) -> float:
    if prev == 0:
        return 0.0
    return (curr - prev) / abs(prev) * 100.0


def parse_period(tarih: str) -> str:
    parts = str(tarih).split("-")
    if len(parts) < 2:
        return str(tarih)
    y = parts[0]
    m = parts[1].zfill(2)
    return f"{y}-{m}"


def compute_projections(
    risk: str,
    dolar: float,
    rek: float,
    m2_mom: float,
    rezerv_mom: float,
    dolar_mom: float,
) -> Dict[str, float]:
    """
    Dinamik projeksiyon: sabit çarpan yerine makro faktörleri de hesaba katar.
    - rek_adj:   REK > 100 → TL aşırı değerli → yukarı baskı artar
    - m2_adj:    Yüksek M2 büyümesi → TL değer kaybı riski artar
    - rez_adj:   Artan rezerv → aşağı baskı (güvenli liman)
    - vol_adj:   Yüksek kur volatilitesi → belirsizlik primi
    """
    if dolar <= 0:
        dolar = 1.0

    base_3 = {"RISKLI": 1.06, "GUVENLI": 0.98, "NOTR": 1.01}[risk]
    base_6 = {"RISKLI": 1.12, "GUVENLI": 0.95, "NOTR": 1.03}[risk]

    rek_adj = max(0.0, (rek - 100) / 1000) if rek > 0 else 0.0
    m2_adj = max(0.0, m2_mom / 200) if m2_mom > 0 else 0.0
    rez_adj = max(0.0, rezerv_mom / 500) if rezerv_mom > 0 else 0.0
    # Kriz dönemlerinde aylık kur değişimi volatilite primine eklensin
    vol_adj = max(0.0, abs(dolar_mom) / 400) if abs(dolar_mom) > 5 else 0.0

    mult_3 = base_3 + rek_adj + m2_adj + vol_adj - rez_adj
    mult_6 = base_6 + rek_adj * 1.5 + m2_adj * 1.5 + vol_adj * 1.5 - rez_adj * 1.5

    # 3 aylık: en fazla %25 artış veya %15 düşüş
    mult_3 = max(0.85, min(mult_3, 1.25))
    # 6 aylık: en fazla %40 artış veya %20 düşüş
    mult_6 = max(0.80, min(mult_6, 1.40))

    return {
        "projeksiyon_3_ay": round(dolar * mult_3, 2),
        "projeksiyon_6_ay": round(dolar * mult_6, 2),
    }


def build_doviz_onerileri(
    risk: str,
    proj_3ay_mult: float,
    portfolio: List[Tuple[str, float]],
) -> List[Dict[str, str]]:
    """
    Portföydeki her döviz için AL/TUT/SAT kararı üretir.
    Karar mantığı:
      - SAT: kâr var (kar_pct > 0.08) VE risk RISKLI → kârı kilitle
      - AL:  risk GUVENLI VE zarar var (kar_pct < 0) → ortalama düşür
      - AL:  risk GUVENLI VE projeksiyon artış beklentisi var → pozisyon artır
      - TUT: diğer tüm senaryolar
    """
    result = []
    for doviz_kodu, kar_pct in portfolio:
        if risk == "RISKLI" and kar_pct > 0.08:
            oneri = "SAT"
            gerekce = (
                f"Kur riski yüksek, mevcut %{kar_pct*100:.0f} kârı kilitleme fırsatı."
            )
        elif risk == "RISKLI" and kar_pct <= 0:
            oneri = "TUT"
            gerekce = "Risk bölgesi yüksek; zarar realizasyonundan kaçın, toparlanma bekle."
        elif risk == "GUVENLI" and kar_pct < 0:
            oneri = "AL"
            gerekce = (
                f"Güvenli bölgede ortalama maliyeti düşürmek için ek alım fırsatı."
            )
        elif risk == "GUVENLI" and proj_3ay_mult > 1.01:
            oneri = "TUT"
            gerekce = "Piyasa olumlu; mevcut pozisyonu koru, kısa vadeli kazanç bekleniyor."
        elif risk == "GUVENLI" and proj_3ay_mult <= 1.01:
            oneri = "SAT"
            gerekce = "Kur aşağı baskı altında; kâr varsa realize et."
        elif risk == "NOTR" and kar_pct > 0.15:
            oneri = "SAT"
            gerekce = f"Nötr bölgede %{kar_pct*100:.0f} kâr yüksek; kısmi satış değerlendirilebilir."
        else:
            oneri = "TUT"
            gerekce = "Piyasa yönü belirsiz; mevcut pozisyonu koru."
        result.append({"doviz_kodu": doviz_kodu, "oneri": oneri, "gerekce": gerekce})
    return result


def build_news_context(rng: random.Random, risk: str) -> str:
    templates = NEWS_TEMPLATES.get(risk, NEWS_TEMPLATES["NOTR"])
    selected = rng.sample(templates, k=min(2, len(templates)))
    return " ".join(selected)


def build_distractor(rng: random.Random, net_hata_proxy_milyar: float) -> str:
    option = rng.randint(1, 5)
    if option == 1:
        x = rng.randint(2, 12)
        direction = "yükseldi" if rng.random() > 0.5 else "geriledi"
        return f"BIST 100 bu ay %{x} {direction}."
    if option == 2:
        x = round(net_hata_proxy_milyar, 2)
        return f"Net Hata ve Noksan kalemi {x} milyar dolar olarak açıklandı."
    if option == 3:
        x = rng.randint(20, 95)
        return f"Altın ithalatı bu ay {x} ton ile rekor kırdı."
    if option == 4:
        x = rng.randint(90, 420)
        return f"Borsa İstanbul günlük işlem hacmi {x} milyar TL oldu."
    x = rng.randint(50, 900)
    return f"Yabancı yatırımcı BIST'ten {x} milyon dolar çıkardı."


def main() -> None:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Girdi dosyası bulunamadı: {INPUT_PATH}")

    with INPUT_PATH.open("r", encoding="utf-8") as f:
        records: List[Dict[str, Any]] = json.load(f)

    raw_rez_first3 = [to_float(r.get("Rezervler")) for r in records[:3]]
    raw_m2_first3 = [to_float(r.get("M2_Para_Arzi")) for r in records[:3]]
    rez_samples = [v for v in raw_rez_first3 if v > 0]
    m2_samples = [v for v in raw_m2_first3 if v > 0]

    rez_target_b = 100.0
    m2_target_t = 1.0
    rez_div = (sum(rez_samples) / len(rez_samples)) / rez_target_b if rez_samples else 1_000_000_000.0
    m2_div = (sum(m2_samples) / len(m2_samples)) / m2_target_t if m2_samples else 1_000_000_000_000.0

    print("=== Birim Kalibrasyon Kontrolü ===")
    print(f"Rezervler ham ilk3: {[round(x, 3) for x in raw_rez_first3]}")
    print(f"M2 ham ilk3: {[round(x, 3) for x in raw_m2_first3]}")
    print(f"Seçilen rezerv böleni: {rez_div:.3f} (hedef ~100B USD)")
    print(f"Seçilen M2 böleni: {m2_div:.3f} (hedef ~1T TL)")

    rng = random.Random(42)
    output_lines: List[str] = []
    risk_counter: Counter[str] = Counter()
    period_to_risk: Dict[str, str] = {}

    for i, rec in enumerate(records):
        tarih_raw = str(rec.get("Tarih", "Bilinmiyor"))
        period = parse_period(tarih_raw)

        dolar = to_float(rec.get("Dolar_Kuru"))
        rezerv_raw = to_float(rec.get("Rezervler"))
        rezerv_b = rezerv_raw / rez_div if rezerv_raw != 0 else 0.0
        cari = to_float(rec.get("Cari_Denge"))
        m2_raw = to_float(rec.get("M2_Para_Arzi"))
        m2_t = m2_raw / m2_div if m2_raw != 0 else 0.0
        rek = to_float(rec.get("Reel_Efektif_Kur"))
        faiz = to_float(rec.get("Politika_Faizi"))
        altin_sapma = bool(rec.get("altin_sapma", False))

        prev = records[i - 1] if i > 0 else {}
        prev12 = records[i - 12] if i > 11 else {}

        prev_rezerv_b = (to_float(prev.get("Rezervler")) / rez_div) if i > 0 else 0.0
        prev_m2_t = (to_float(prev.get("M2_Para_Arzi")) / m2_div) if i > 0 else 0.0
        prev_cari = to_float(prev.get("Cari_Denge"))
        prev_m2_y = (to_float(prev12.get("M2_Para_Arzi")) / m2_div) if i > 11 else 0.0

        rezerv_mom = pct_change(rezerv_b, prev_rezerv_b)
        m2_mom = pct_change(m2_t, prev_m2_t)
        m2_yoy = pct_change(m2_t, prev_m2_y) if i > 11 else 0.0
        cari_change = cari - prev_cari if i > 0 else 0.0
        prev_dolar = to_float(prev.get("Dolar_Kuru")) if i > 0 else 0.0
        dolar_mom = pct_change(dolar, prev_dolar) if i > 0 else 0.0

        neg = 0
        pos = 0
        steps: List[str] = []

        # NEGATİF SİNYALLER
        if rek > 105:
            neg += 1
            steps.append(f"REK {rek:.2f} > 105: TL aşırı değerli (+neg).")
        if 0 < rek < 80:
            neg += 1
            steps.append(f"REK {rek:.2f} < 80: TL aşırı ucuz ama spekülatif baskı var (+neg).")
        if rezerv_mom < -2:
            neg += 1
            steps.append(f"Rezerv aylık değişim {rezerv_mom:.2f}% < -2: kapasite zayıf (+neg).")
        if m2_mom > 3:
            neg += 1
            steps.append(f"M2 aylık büyüme {m2_mom:.2f}% > 3 (+neg).")
        if m2_yoy > 30:
            neg += 1
            steps.append(f"M2 yıllık büyüme {m2_yoy:.2f}% > 30 (+neg).")
        if cari < 0 and cari_change < 0:
            neg += 1
            steps.append(f"Cari denge negatif ({cari:.2f}) ve kötüleşiyor ({cari_change:.2f}) (+neg).")
        if faiz <= 0 and m2_mom > 2:
            neg += 1
            steps.append(f"Faiz veri yok/0 ve M2 aylık {m2_mom:.2f}% > 2 (+neg).")

        # POZİTİF SİNYALLER
        if 85 <= rek <= 100:
            pos += 1
            steps.append(f"REK {rek:.2f} 85-100 bandında: dengeli (+pos).")
        if rezerv_mom > 3:
            pos += 1
            steps.append(f"Rezerv aylık değişim {rezerv_mom:.2f}% > 3 (+pos).")
        if faiz > 15:
            pos += 1
            steps.append(f"Politika faizi {faiz:.2f} > 15: sıkı duruş (+pos).")
        if cari > 0:
            pos += 1
            steps.append(f"Cari denge pozitif ({cari:.2f}) (+pos).")
        if m2_mom < 1.5 and m2_mom != 0:
            pos += 1
            steps.append(f"M2 aylık büyüme {m2_mom:.2f}% < 1.5: kontrollü büyüme (+pos).")

        # KARAR
        if neg >= 3:
            risk = "RISKLI"
        elif pos >= 3:
            risk = "GUVENLI"
        elif neg >= 2 and pos <= 1:
            risk = "RISKLI"
        else:
            risk = "NOTR"

        if dolar_mom > 8.0:
            risk = "RISKLI"
            steps.append(f"Kur bu ay %{dolar_mom:.2f} artış gösterdi — kriz sinyali, RISKLI zorla.")

        projections = compute_projections(risk, dolar, rek, m2_mom, rezerv_mom, dolar_mom)
        proj_3ay_mult = projections["projeksiyon_3_ay"] / dolar if dolar > 0 else 1.0
        risk_counter[risk] += 1
        period_to_risk[period] = risk

        context = (
            f"Tarih={period}; Dolar_Kuru={dolar:.4f}; Rezervler={rezerv_b:.2f} milyar USD; "
            f"Cari_Denge={cari:.2f}; M2={m2_t:.2f} trilyon TL; REK={rek:.2f}; "
            f"Politika_Faizi={faiz:.2f}; altin_sapma={altin_sapma}; "
            f"Kur_aylik_degisim={dolar_mom:.2f}%; Rezerv_aylik_degisim={rezerv_mom:.2f}%; "
            f"M2_aylik_degisim={m2_mom:.2f}%; M2_yillik_degisim={m2_yoy:.2f}%."
        )

        if altin_sapma:
            steps.append("altin_sapma=True: cari denge altın etkisiyle bozulmuş olabilir, düşük ağırlıkla değerlendirildi.")

        chain = " ".join(steps) + f" Toplam negatif={neg}, pozitif={pos} => {risk}."

        # Haber context: makro duruma göre simüle edilmiş haberler
        news_context = build_news_context(rng, risk)
        distractor = build_distractor(rng, abs(cari) / 1000 if cari != 0 else rng.uniform(0.2, 4.5))

        # Her kayıt için 3 farklı portföy senaryosu üret
        for scenario_idx, portfolio in enumerate(PORTFOLIO_SCENARIOS):
            doviz_onerileri = build_doviz_onerileri(risk, proj_3ay_mult, portfolio)

            # Portföy context stringi
            portfolio_lines = []
            for doviz_kodu, kar_pct in portfolio:
                alis_kuru = dolar / (1 + kar_pct) if kar_pct != -1 else dolar
                portfolio_lines.append(
                    f"{doviz_kodu}: alış={alis_kuru:.2f} TL | anlık={dolar:.2f} TL | K/Z=%{kar_pct*100:+.1f}"
                )
            portfolio_context = "; ".join(portfolio_lines)

            answer = {
                "risk_bolgesi": risk,
                "projeksiyon_3_ay": projections["projeksiyon_3_ay"],
                "projeksiyon_6_ay": projections["projeksiyon_6_ay"],
                "ozet": f"{period} döneminde sinyal dengesi {risk} yönünde.",
                "doviz_onerileri": doviz_onerileri,
            }

            sample = {
                "question": (
                    f"{period} döneminde Türkiye'de USD/TRY kuru nasıl bir seyir izledi "
                    f"ve aşağıdaki portföy için ne önerirsin?"
                ),
                "context": context,
                "portfolio_context": portfolio_context,
                "news_context": news_context,
                "chain_of_thought": chain,
                "answer": answer,
                "distractor_context": distractor,
            }

            output_lines.append(json.dumps(sample, ensure_ascii=False))

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        for line in output_lines:
            f.write(line + "\n")

    total = len(output_lines)
    base_records = total // len(PORTFOLIO_SCENARIOS)
    print(f"RAFT dataset üretildi: {OUTPUT_PATH}")
    print(f"Toplam örnek: {total} ({base_records} kayıt × {len(PORTFOLIO_SCENARIOS)} portföy senaryosu)")
    print(
        "Risk dağılımı (ham kayıt):",
        f"RISKLI={risk_counter['RISKLI']} ({risk_counter['RISKLI'] / base_records:.1%})",
        f"GUVENLI={risk_counter['GUVENLI']} ({risk_counter['GUVENLI'] / base_records:.1%})",
        f"NOTR={risk_counter['NOTR']} ({risk_counter['NOTR'] / base_records:.1%})",
    )

    # Kriz dönemi etiket kontrolü
    for period in ("2018-08", "2021-11", "2021-12"):
        print(f"Kriz kontrolü {period}: {period_to_risk.get(period, 'yok')}")


if __name__ == "__main__":
    main()
