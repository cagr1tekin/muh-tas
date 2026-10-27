"""
fetcher.py — EVDS'ten 6 makro seri çeker, raw_macro.json ve latest.json üretir.

cursorrules §2.4:
- fetcher.py → noise_filter.py sırası değişmez; noise_filter ham veriyi bekler.
- EVDS_API_KEY .env'den okunur — kod içinde hardcode yasak.
- Politika faizi: TP.APIFON4 kodu kullanılır (TP.PY.PKA hatalı).
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import pandas as pd
from dotenv import load_dotenv
from evds import evdsAPI


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"

# cursorrules §2.4: TP.APIFON4 politika faizi için doğru kod.
SERIES: Dict[str, str] = {
    "Dolar_Kuru":       "TP.DK.USD.A.YTL",
    "Rezervler":        "TP.AB.A02",
    "Cari_Denge":       "TP.ODEAYRSUNUM6.Q1",
    "M2_Para_Arzi":     "TP.HPBITABLO1.11",
    "Reel_Efektif_Kur": "TP.RK.T1.Y",
    "Politika_Faizi":   "TP.APIFON4",
}


def _parse_enddate(enddate: Optional[datetime | str]) -> str:
    if enddate is None:
        end = datetime.today()
    elif isinstance(enddate, datetime):
        end = enddate
    else:
        return str(enddate)
    return end.strftime("%d-%m-%Y")


def fetch_raw_macro(
    evds_api_key: Optional[str] = None,
    startdate: str = "01-01-2000",
    enddate: Optional[datetime | str] = None,
) -> pd.DataFrame:
    load_dotenv(dotenv_path=ROOT.parent / ".env")
    key = evds_api_key or os.getenv("EVDS_API_KEY")
    if not key:
        raise RuntimeError("EVDS_API_KEY bulunamadı. Lütfen .env dosyasına ekleyin.")

    enddate_str = _parse_enddate(enddate)
    evds = evdsAPI(key)

    merged: Optional[pd.DataFrame] = None

    for out_col, evds_code in SERIES.items():
        try:
            df_tmp = evds.get_data(
                [evds_code],
                startdate=startdate,
                enddate=enddate_str,
                frequency=5,       # aylık
                aggregation_types="avg",
            )
            if df_tmp is None or df_tmp.empty:
                print(f"[fetcher] Uyarı: {out_col} için veri boş döndü.", file=sys.stderr)
                continue

            non_date_cols = [c for c in df_tmp.columns if c != "Tarih"]
            if not non_date_cols:
                print(f"[fetcher] Uyarı: {out_col} için Tarih dışı kolon yok.", file=sys.stderr)
                continue

            df_tmp = df_tmp[["Tarih", non_date_cols[0]]].rename(
                columns={non_date_cols[0]: out_col}
            )

            if merged is None:
                merged = df_tmp
            else:
                merged = pd.merge(merged, df_tmp, on="Tarih", how="outer")

            print(f"[fetcher] OK: {out_col} ({evds_code})", file=sys.stderr)

        except Exception as e:
            print(f"[fetcher] Hata: {out_col} çekilemedi: {e}", file=sys.stderr)

    if merged is None or merged.empty:
        raise RuntimeError("Hiçbir seri çekilemedi; raw data boş.")

    return merged


def _save_json(df: pd.DataFrame, path: Path) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_json(path, orient="records", force_ascii=False)


def _save_outputs(df: pd.DataFrame) -> None:
    _save_json(df, DATA_DIR / "raw_macro.json")

    try:
        parsed = pd.to_datetime(df["Tarih"], errors="coerce")
        if parsed.notna().any():
            latest_df = df.assign(_dt=parsed).sort_values("_dt").drop(columns=["_dt"]).tail(1)
        else:
            latest_df = df.tail(1)
    except Exception:
        latest_df = df.tail(1)

    _save_json(latest_df, DATA_DIR / "latest.json")


def main() -> None:
    try:
        df = fetch_raw_macro()
        _save_outputs(df)
        print("[fetcher] Tamamlandı: raw_macro.json ve latest.json yazıldı.", file=sys.stderr)
    except Exception as e:
        print(f"[fetcher] Fatal hata: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
