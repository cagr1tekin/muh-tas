import json
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from currency_history import fetch_currency_history, supported_codes


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("python-service")

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
CLEAN_PATH = DATA_DIR / "clean_macro.json"

app = FastAPI(title="finans-backend python servisi")

# Sadece localhost/127.0.0.1 (http) isteklerine izin ver.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _last_updated(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime).isoformat()


def _run_refresh() -> None:
    # fetcher.py → noise_filter.py sırası değişmez (cursorrules §2.4).
    fetcher_rc = subprocess.run(
        [sys.executable, "fetcher.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if fetcher_rc.returncode != 0:
        logger.error("[refresh] fetcher.py başarısız (code=%s). stderr=%s",
                     fetcher_rc.returncode, fetcher_rc.stderr)
        return

    noise_rc = subprocess.run(
        [sys.executable, "noise_filter.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if noise_rc.returncode != 0:
        logger.error("[refresh] noise_filter.py başarısız (code=%s). stderr=%s",
                     noise_rc.returncode, noise_rc.stderr)
        return

    logger.info("[refresh] Başarılı — clean_macro.json güncellendi.")


@app.get("/latest")
def latest() -> Any:
    if not CLEAN_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="clean_macro.json bulunamadı. Önce POST /refresh çağırın.",
        )
    return _read_json(CLEAN_PATH)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "last_updated": _last_updated(CLEAN_PATH),
    }


@app.post("/refresh", status_code=202)
def refresh(background_tasks: BackgroundTasks) -> dict:
    # cursorrules §2.4: /refresh endpoint'i POST'tur; GET 405 döner — bu normaldir.
    background_tasks.add_task(_run_refresh)
    return {"status": "accepted"}


@app.get("/currencies/{code}/history")
def currency_history(
    code: str,
    period: str = Query(default="1m", pattern="^(1d|1w|1m|3m|1y)$"),
) -> list:
    """
    Belirtilen döviz kodunun EVDS tarihsel verisini döner.
    period: 1d | 1w | 1m | 3m | 1y (varsayılan: 1m)
    """
    code = code.upper()
    if code not in supported_codes():
        raise HTTPException(
            status_code=404,
            detail=f"{code!r} desteklenmiyor. Desteklenenler: {supported_codes()}",
        )
    try:
        points = fetch_currency_history(code=code, period=period)
        return points
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[currency history] %s/%s hata: %s", code, period, exc)
        raise HTTPException(status_code=500, detail="EVDS sorgusu başarısız") from exc


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
