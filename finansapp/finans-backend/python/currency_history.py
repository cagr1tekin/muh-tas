"""
currency_history.py — EVDS API'sinden döviz kuru tarihsel verisi çeker.

Desteklenen döviz kodları ve EVDS seri eşlemeleri:
- cursorrules §2.4: EVDS_API_KEY .env'den okunur — kod içinde hardcode yasak.
"""

import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from evds import evdsAPI


ROOT = Path(__file__).resolve().parent

# Desteklenen döviz kodları → EVDS seri kodu
CURRENCY_SERIES = {
    "USD": "TP.DK.USD.A.YTL",
    "EUR": "TP.DK.EUR.A.YTL",
    "GBP": "TP.DK.GBP.A.YTL",
    "JPY": "TP.DK.JPY.A.YTL",
    "CHF": "TP.DK.CHF.A.YTL",
    "SAR": "TP.DK.SAR.A.YTL",
    "CAD": "TP.DK.CAD.A.YTL",
    "AUD": "TP.DK.AUD.A.YTL",
    "NOK": "TP.DK.NOK.A.YTL",
    "SEK": "TP.DK.SEK.A.YTL",
    "DKK": "TP.DK.DKK.A.YTL",
    "KWD": "TP.DK.KWD.A.YTL",
    "AED": "TP.DK.AED.A.YTL",
    "RUB": "TP.DK.RUB.A.YTL",
    "CNY": "TP.DK.CNY.A.YTL",
}

# period → (gün aralığı, EVDS frekansı)
# EVDS frekans kodları: 1=günlük, 2=işgünü, 3=haftalık, 5=aylık
# TCMB kur verisi işgünü bazlı yayınlanır; kısa dönemler için işgünü (2) kullanılır.
PERIOD_CONFIG: dict[str, dict] = {
    "1d": {"days": 10,  "frequency": 2},   # son 10 gün → ~7 işgünü veri noktası
    "1w": {"days": 21,  "frequency": 2},   # son 21 gün → ~15 işgünü
    "1m": {"days": 45,  "frequency": 2},   # son 45 gün → ~30 işgünü
    "3m": {"days": 100, "frequency": 2},   # son 100 gün → ~70 işgünü
    "1y": {"days": 400, "frequency": 5},   # son ~13 ay → aylık ortalama (~13 nokta)
}


def _load_api_key() -> str:
    load_dotenv(dotenv_path=ROOT.parent / ".env")
    key = os.getenv("EVDS_API_KEY", "")
    if not key:
        raise RuntimeError("EVDS_API_KEY bulunamadı. Lütfen .env dosyasına ekleyin.")
    return key


def fetch_currency_history(
    code: str,
    period: str = "1m",
) -> list[dict]:
    """
    Belirtilen döviz kodu ve dönem için EVDS'ten tarihsel veri çeker.

    Dönüş: [{"date": "YYYY-MM-DD", "rate": float}, ...]
    """
    code = code.upper()
    evds_code = CURRENCY_SERIES.get(code)
    if not evds_code:
        raise ValueError(f"Desteklenmeyen döviz kodu: {code!r}. Desteklenenler: {list(CURRENCY_SERIES.keys())}")

    cfg = PERIOD_CONFIG.get(period, PERIOD_CONFIG["1m"])
    days: int = cfg["days"]
    frequency: int = cfg["frequency"]

    end_date = datetime.today()
    start_date = end_date - timedelta(days=days)

    key = _load_api_key()
    evds = evdsAPI(key)

    df = evds.get_data(
        [evds_code],
        startdate=start_date.strftime("%d-%m-%Y"),
        enddate=end_date.strftime("%d-%m-%Y"),
        frequency=frequency,
        aggregation_types="avg",
    )

    if df is None or df.empty:
        return []

    # Tarih sütununu standart formata çevir — EVDS DD-MM-YYYY döner, dayfirst=True zorunlu
    df["Tarih"] = pd.to_datetime(df["Tarih"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["Tarih"])
    df = df.sort_values("Tarih")

    # Değer sütunu (EVDS'in döndürdüğü ilk sayısal kolon)
    value_cols = [c for c in df.columns if c != "Tarih"]
    if not value_cols:
        return []

    val_col = value_cols[0]
    df[val_col] = pd.to_numeric(df[val_col], errors="coerce")
    df = df.dropna(subset=[val_col])

    return [
        {
            "date": row["Tarih"].strftime("%Y-%m-%d"),
            "rate": float(row[val_col]),
        }
        for _, row in df.iterrows()
    ]


def supported_codes() -> list[str]:
    return sorted(CURRENCY_SERIES.keys())
