#!/usr/bin/env python3
"""Local PocketJS control client. Run on the phone as the OmaBerry app user.

  python3 omaberry-control.py screen '{"action":"observe"}' --image

The desktop must be foreground. stdout contains JSON, never log chatter.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import time
import uuid


def call(root, method, args, image=False):
    root = Path(root)
    lock = root / 'control.lock'
    deadline = time.monotonic() + 35
    acquired = False
    while not acquired:
        try:
            lock.mkdir(mode=0o700)
            acquired = True
        except FileExistsError:
            if time.monotonic() >= deadline:
                raise RuntimeError('Another native control client holds the lock')
            time.sleep(0.1)
    try:
        deadline = time.monotonic() + 30
        request = {'id': uuid.uuid4().hex, 'createdAt': int(time.time()*1000),
                   'method': method, 'args': args}
        text = json.dumps(request, ensure_ascii=False)
        if len(text.encode('utf8')) > 8192:
            raise ValueError('Request exceeds 8 KiB')
        tmp = root / ('control-' + request['id'] + '.tmp')
        tmp.write_text(text, encoding='utf8')
        os.replace(tmp, root / 'control-request.json')
        while time.monotonic() < deadline:
            try:
                reply = json.loads((root / 'control-response.json').read_text())
            except (OSError, ValueError):
                reply = {}
            if reply.get('id') == request['id']:
                if image and reply.get('observation', {}).get('path'):
                    data = Path(reply['observation']['path']).read_bytes()
                    if len(data) > 2*1024*1024 or not data.startswith(b'\x89PNG\r\n\x1a\n'):
                        raise ValueError('Invalid capture file')
                    reply['image'] = {'mimeType':'image/png', 'data':base64.b64encode(data).decode('ascii')}
                return reply
            time.sleep(0.1)
        raise RuntimeError('OmaBerry did not reply; open its native desktop')
    finally:
        lock.rmdir()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('method', choices=['screen','desktop','browser','native_ui','herdr'])
    parser.add_argument('args', help='JSON object')
    parser.add_argument('--image', action='store_true')
    parser.add_argument('--root', default=str(Path(__file__).resolve().parent.parent / "control"))
    options = parser.parse_args()
    try:
        print(json.dumps(call(options.root, options.method, json.loads(options.args), options.image), ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        raise SystemExit(1)
