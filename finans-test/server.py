import json
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("server")

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
CLEAN_PATH = DATA_DIR / "clean_macro.json"


app = FastAPI()

# Sadece localhost/127.0.0.1 (http) isteklerine izin ver.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_json_file(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _get_last_updated(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    ts = path.stat().st_mtime
    return datetime.fromtimestamp(ts).isoformat()


def _run_refresh_scripts() -> None:
    # Çağıran beklemeden dönsün diye BackgroundTasks içinde çalışır.
    fetcher_rc = subprocess.run(
        [sys.executable, "fetcher.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if fetcher_rc.returncode != 0:
        logger.error("[refresh] fetcher.py başarısız (code=%s). stderr=%s", fetcher_rc.returncode, fetcher_rc.stderr)
        return

    noise_rc = subprocess.run(
        [sys.executable, "noise_filter.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if noise_rc.returncode != 0:
        logger.error("[refresh] noise_filter.py başarısız (code=%s). stderr=%s", noise_rc.returncode, noise_rc.stderr)
        return

    logger.info("[refresh] Başarılı.")


@app.get("/latest")
def latest() -> Any:
    if not CLEAN_PATH.exists():
        raise HTTPException(status_code=404, detail="clean_macro.json bulunamadı. Önce /refresh çağır.")
    return _read_json_file(CLEAN_PATH)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "last_updated": _get_last_updated(CLEAN_PATH),
    }


@app.post("/refresh", status_code=202)
def refresh(background_tasks: BackgroundTasks) -> dict:
    background_tasks.add_task(_run_refresh_scripts)
    return {"status": "accepted"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

