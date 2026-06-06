#!/usr/bin/env python3
"""
Scenario 22 mock collector — localhost only, stdlib HTTP.
POST /collect — append JSON event to captured-data.json
GET /captured-data — return log
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PORT = 3022
HERE = Path(__file__).resolve().parent
LOG = HERE / "captured-data.json"


def _forward_to_elasticsearch(entry: dict) -> None:
    es_url = os.environ.get("SCAS_ES_URL")
    if not es_url:
        return
    doc = {
        "@timestamp": entry.get("received_at") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "scenario_id": "22",
        "event_type": "exfil_capture",
        "severity": "HIGH",
        "message": "Exfiltration capture for scenario 22",
        "rule": {"id": "exfil_capture"},
        "source": "litellm_like",
        "destination": "",
        "package": {"name": "litellm_like", "version": ""},
        "detail": entry,
    }
    request = urllib.request.Request(
        f"{es_url.rstrip('/')}/scas-detections/_doc",
        data=json.dumps(doc).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=3)
    except urllib.error.URLError:
        pass


def _load() -> dict:
    if not LOG.exists():
        return {"events": []}
    return json.loads(LOG.read_text(encoding="utf-8"))


def _save(data: dict) -> None:
    LOG.write_text(json.dumps(data, indent=2), encoding="utf-8")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args) -> None:
        return

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/collect":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            payload = {"raw": body.decode("utf-8", errors="replace")}

        data = _load()
        entry = {
            "received_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "payload": payload,
        }
        data.setdefault("events", []).append(entry)
        _save(data)
        _forward_to_elasticsearch(entry)
        print("\n📡 COLLECT (scenario-22):", json.dumps(payload, indent=2))

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/captured-data":
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(_load()).encode("utf-8"))


def main() -> None:
    _save({"events": []})
    httpd = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Scenario 22 mock server on http://127.0.0.1:{PORT}")
    print("  POST /collect")
    print("  GET  /captured-data")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
