"""LiveMem HTTP provider — measures the PRODUCTION memory-manager pipeline.

Unlike livemem.py (offline cache + python port of the builder), this provider
drives the real deployed TS implementation over HTTP:

  ingest:   POST /v1/live/ingest  per session (server runs Haiku extraction,
            embedding, observe() dedup, CAS state update — synchronously)
  retrieve: GET  /v1/live/render?budget=N  → the rendered LIVE MEMORY block
            is the whole context (no query-side ranking in prod).

Per-question isolation: x-act-as: bench-lme-<run>-<question_id> (admin token),
so every question gets a fresh Redis livemem:{userId} state.

Env:
  LIVEMEM_HTTP_URL     default http://localhost:8900
  LIVEMEM_HTTP_KEY     memory-manager admin key (required)
  LIVEMEM_HTTP_RUN     run nonce baked into user ids (default "r1") — bump to
                       get fresh state without flushing Redis
  LIVEMEM_BUDGET       render token budget (default 5000, same as python v4)
  LIVEMEM_HTTP_PAR     parallel ingest requests per unit (default 6)
"""
import json
import os
import time
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from ..models import Document
from .base import MemoryProvider

_URL = os.environ.get("LIVEMEM_HTTP_URL", "http://localhost:8900").rstrip("/")
_KEY = os.environ.get("LIVEMEM_HTTP_KEY", "")
_RUN = os.environ.get("LIVEMEM_HTTP_RUN", "r1")
_BUDGET = int(os.environ.get("LIVEMEM_BUDGET", "5000"))
_PAR = int(os.environ.get("LIVEMEM_HTTP_PAR", "6"))


def _request(method: str, path: str, user_id: str, body: dict | None = None, tries: int = 4) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(tries):
        req = urllib.request.Request(_URL + path, data=data, method=method, headers={
            "Authorization": f"Bearer {_KEY}",
            "x-act-as": user_id,
            "content-type": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            if attempt == tries - 1:
                raise RuntimeError(f"livemem-http {method} {path} failed for {user_id}: {e}") from e
            time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def _chat_text(doc: Document) -> str:
    turns = json.loads(doc.content)
    when = doc.timestamp or "unknown"
    lines = [f"[session happened on {when}]"]
    lines += [f"{t.get('role', '?')}: {t.get('content', '')}" for t in turns if isinstance(t, dict)]
    return "\n".join(lines)


class LiveMemHTTPProvider(MemoryProvider):
    name = "livemem-http"
    provider = "livemem"
    variant = "http"
    description = (
        f"Production memory-manager over HTTP: /v1/live/ingest (Haiku extraction + observe dedup, "
        f"TS) per session, /v1/live/render?budget={_BUDGET} as context. Per-question user isolation."
    )
    kind = "local"
    concurrency = 4

    def initialize(self) -> None:
        if not _KEY:
            raise RuntimeError("LIVEMEM_HTTP_KEY not set (memory-manager admin key)")
        _request("GET", "/health", "healthcheck")

    @staticmethod
    def _uid(user_id: str) -> str:
        return f"bench-lme-{_RUN}-{user_id}"

    def ingest(self, documents: list[Document]) -> None:
        # Ledger of fully-ingested units: their state already sits in Redis, so a
        # crashed/re-run harness must not re-extract (cost) or double-observe them.
        ledger = os.environ.get("LIVEMEM_HTTP_LEDGER", "")
        uid = documents[0].user_id if documents else None
        done: set[str] = set()
        if ledger and os.path.exists(ledger):
            done = set(Path(ledger).read_text().split())
        if uid in done:
            return

        def one(doc: Document) -> None:
            body = {"chat": _chat_text(doc)}
            if doc.timestamp:
                body["at"] = doc.timestamp
            _request("POST", "/v1/live/ingest", self._uid(doc.user_id), body)

        with ThreadPoolExecutor(max_workers=_PAR) as ex:
            for f in [ex.submit(one, d) for d in documents]:
                f.result()
        if ledger and uid:
            with open(ledger, "a") as f:
                f.write(uid + "\n")

    def retrieve(self, query: str, k: int = 10, user_id: str | None = None, query_timestamp: str | None = None) -> tuple[list[Document], dict | None]:
        qs = urllib.parse.urlencode({"budget": _BUDGET, "q": query})
        resp = _request("GET", f"/v1/live/render?{qs}", self._uid(user_id))
        block = resp.get("block", "")
        return [Document(id=f"{user_id}_livemem_http", content=block, user_id=user_id)], resp
