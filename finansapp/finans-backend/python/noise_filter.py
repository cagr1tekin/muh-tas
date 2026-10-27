"""
noise_filter.py — raw_macro.json'u temizleyerek clean_macro.json üretir.

cursorrules §2.4:
- fetcher.py → noise_filter.py sırası değişmez; noise_filter ham veriyi bekler.
- Cari_Denge için ffill uygulanmaz — gecikmeli seri, null kalmalı.
- NHN, BIST, altın sapması gürültü kategorisi — weight=0 veya drop.
"""

import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if "Tarih" not in df.columns:
        raise ValueError("DataFrame'de 'Tarih' kolonu yok.")

    # 1) NHN / Net_Hata gürültüsünü drop et (cursorrules §2.4)
    drop_cols = [c for c in df.columns if ("NHN" in c) or ("Net_Hata" in c)]
    # 2) BIST / Borsa gürültüsünü drop et (cursorrules §2.4)
    drop_cols += [c for c in df.columns if ("BIST" in c) or ("Borsa" in c)]
    drop_cols = list(dict.fromkeys(drop_cols))
    if drop_cols:
        df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    # 3) Cari_Denge: altın sapma tespiti
    if "Cari_Denge" in df.columns:
        df["Cari_Denge"] = pd.to_numeric(df["Cari_Denge"], errors="coerce")

        tmp_dt = pd.to_datetime(df["Tarih"], errors="coerce")
        tmp_dt = tmp_dt.dt.to_period("M").dt.to_timestamp()
        df = df.assign(_dt=tmp_dt).sort_values("_dt").dropna(subset=["_dt"])

        abs_cd = df["Cari_Denge"].abs()
        rolling_mean = abs_cd.rolling(window=12, min_periods=12).mean()
        mask = rolling_mean.notna() & (abs_cd > (2.5 * rolling_mean))

        df.loc[mask, "Cari_Denge"] = np.nan
        df["altin_sapma"] = mask.fillna(False)
        df = df.drop(columns=["_dt"])
    else:
        df["altin_sapma"] = False

    # 4) Tarih dışı kolonları numeric'e zorla
    for col in df.columns:
        if col in ("Tarih", "altin_sapma"):
            continue
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 5) Aylık resample + ffill (Cari_Denge hariç — cursorrules §2.4)
    df["Tarih"] = pd.to_datetime(df["Tarih"], errors="coerce")
    df["Tarih"] = df["Tarih"].dt.to_period("M").dt.to_timestamp()
    df = df.set_index("Tarih").sort_index()

    df_resampled = df.resample("MS").asfreq()
    avoid_fill = {"Cari_Denge", "altin_sapma"}
    fill_cols = [c for c in df_resampled.columns if c not in avoid_fill]
    if fill_cols:
        df_resampled[fill_cols] = df_resampled[fill_cols].ffill(limit=2)

    df = df_resampled.reset_index()
    df["Tarih"] = df["Tarih"].dt.strftime("%Y-%m-01")

    return df


def _read_raw(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        return pd.DataFrame(json.load(f))


def _write_clean(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_json(path, orient="records", force_ascii=False)


def main(raw_path: Optional[Path] = None) -> None:
    try:
        raw_path = raw_path or (DATA_DIR / "raw_macro.json")
        if not raw_path.exists():
            raise FileNotFoundError(f"Raw dosya bulunamadı: {raw_path}")

        df_raw = _read_raw(raw_path)
        df_clean = clean(df_raw)
        _write_clean(df_clean, DATA_DIR / "clean_macro.json")
        print("[noise_filter] Tamamlandı: clean_macro.json yazıldı.", file=sys.stderr)
    except Exception as e:
        print(f"[noise_filter] Fatal hata: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
