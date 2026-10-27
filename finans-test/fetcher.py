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


SERIES: Dict[str, str] = {
    "Dolar_Kuru": "TP.DK.USD.A.YTL",
    "Rezervler": "TP.AB.A02",
    "Cari_Denge": "TP.ODEAYRSUNUM6.Q1",
    "M2_Para_Arzi": "TP.HPBITABLO1.11",
    "Reel_Efektif_Kur": "TP.RK.T1.Y",
    "Politika_Faizi": "TP.APIFON4",
}


def _parse_enddate(enddate: Optional[datetime | str]) -> str:
    if enddate is None:
        end = datetime.today()
    elif isinstance(enddate, datetime):
        end = enddate
    else:
        # EVDS wrapper çoğunlukla dd-mm-YYYY bekler; bu durumda olduğu gibi iletelim.
        return str(enddate)
    return end.strftime("%d-%m-%Y")


def fetch_raw_macro(
    evds_api_key: Optional[str] = None,
    startdate: str = "01-01-2000",
    enddate: Optional[datetime | str] = None,
) -> pd.DataFrame:
    """
    6 seriyi EVDS'den çekip outer join ile tek DataFrame üretir.
    Dönüş: Tarih sütunu dahil, seri kolonları rename edilmiş DataFrame.
    """
    load_dotenv(dotenv_path=ROOT / ".env")
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
                frequency=5,  # aylık
                aggregation_types="avg",
            )
            if df_tmp is None or df_tmp.empty:
                print(f"[fetcher] Uyarı: {out_col} için veri boş döndü.", file=sys.stderr)
                continue

            # EVDS DataFrame'i genellikle 'Tarih' + 1 kolon döndürür.
            non_date_cols = [c for c in df_tmp.columns if c != "Tarih"]
            if not non_date_cols:
                print(f"[fetcher] Uyarı: {out_col} için Tarih dışı kolon bulunamadı.", file=sys.stderr)
                continue

            value_col = non_date_cols[0]
            df_tmp = df_tmp[["Tarih", value_col]].rename(columns={value_col: out_col})

            if merged is None:
                merged = df_tmp
            else:
                merged = pd.merge(merged, df_tmp, on="Tarih", how="outer")

            print(f"[fetcher] OK: {out_col} ({evds_code})", file=sys.stderr)
        except Exception as e:
            # Tek seri patlasa bile diğerleri devam edecek.
            print(f"[fetcher] Hata: {out_col} çekilemedi: {e}", file=sys.stderr)

    if merged is None or merged.empty:
        raise RuntimeError("Hiçbir seri çekilemedi; raw data boş.")

    return merged


def save_json_records(df: pd.DataFrame, path: Path) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # pandas NaN -> null dönüşür; Go tarafı JSON'u rahat tüketir.
    df.to_json(path, orient="records", force_ascii=False)


def save_outputs(df: pd.DataFrame) -> None:
    # 1) Tüm raw dataset
    save_json_records(df, DATA_DIR / "raw_macro.json")

    # 2) Son 1 ay (uygulamada son ay son kayıttır)
    latest_df = df
    try:
        parsed = pd.to_datetime(df["Tarih"], errors="coerce")
        if parsed.notna().any():
            tmp = df.assign(_dt=parsed).sort_values("_dt")
            latest_df = tmp.tail(1).drop(columns=["_dt"])
        else:
            latest_df = df.tail(1)
    except Exception:
        latest_df = df.tail(1)

    save_json_records(latest_df, DATA_DIR / "latest.json")


def main() -> None:
    try:
        df = fetch_raw_macro()
        save_outputs(df)
        print("[fetcher] Tamamlandı: raw_macro.json ve latest.json yazıldı.", file=sys.stderr)
    except Exception as e:
        print(f"[fetcher] Fatal hata: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

