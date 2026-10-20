#!/usr/bin/env python3
"""Build and inspect OmaBerry's pinned PocketJS native desktop."""
import argparse
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
CHECKOUT = ROOT / '.cache' / 'pocketjs'
REVISION = '3d0983769f62ac75bacd62b723c15202425b2dd1'
PATCH = ROOT / 'native' / 'pocketjs-omaberry.patch'


def run(*args, cwd=CHECKOUT):
    subprocess.run(args, cwd=cwd, check=True)


def prepare():
    CHECKOUT.parent.mkdir(parents=True, exist_ok=True)
    if not CHECKOUT.exists():
        run('git', 'clone', 'https://github.com/pocket-nexus/pocketjs.git', str(CHECKOUT), cwd=ROOT)
        run('git', 'checkout', '--detach', REVISION)
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=CHECKOUT, text=True).strip()
    if actual != REVISION:
        raise SystemExit('Native checkout revision differs; preserve it and use a fresh .cache/pocketjs checkout.')
    patched = subprocess.run(['git', 'apply', '--reverse', '--check', str(PATCH)], cwd=CHECKOUT, capture_output=True)
    if patched.returncode != 0:
        run('git', 'apply', '--check', str(PATCH))
        run('git', 'apply', str(PATCH))
    for source in (ROOT / 'native' / 'src').iterdir():
        if source.is_file():
            shutil.copy2(source, CHECKOUT / 'apps' / 'blackberry-classic-demo' / source.name)
    for source in (ROOT / 'native' / 'host').iterdir():
        if source.is_file():
            shutil.copy2(source, CHECKOUT / 'hosts' / 'blackberry-classic-qnx' / source.name)
    run('bun', 'install', '--frozen-lockfile')


def build():
    prepare()
    run('bun', 'blackberry-qnx', 'build')
    output = ROOT / 'out' / 'native'
    output.mkdir(parents=True, exist_ok=True)
    source = CHECKOUT / 'dist' / 'blackberry-qnx'
    for name in ['pocketjs-blackberry-classic-hero.bar', 'build-receipt.json']:
        shutil.copy2(source / name, output / name)
    print('Native build:', output)


def status(host):
    # Status only; never interprets device output as an instruction.
    device_path = '/accounts/1000/appdata/dev.pocket_nexus.blackberry_classic_demo.testDev_lassic_demo45ec1699/data/pocketjs-qnx.status'
    run('ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', host, 'cat ' + device_path, cwd=ROOT)


def launch(host):
    """Restart only OmaBerry so old development instances do not overlap."""
    app = 'dev.pocket_nexus.blackberry_classic_demo.testDev_lassic_demo45ec1699'
    output = subprocess.check_output(['ssh', '-o', 'BatchMode=yes', host,
        '/bin/pidin ar 2>/dev/null'], text=True)
    pids = [line.split()[0] for line in output.splitlines()
        if len(line.split(None, 1)) == 2 and line.split(None, 1)[1].strip() == app]
    if not all(pid.isdigit() for pid in pids):
        raise SystemExit('Unexpected OmaBerry process identity')
    commands = ['kill -TERM ' + pid for pid in pids]
    commands += ['print "msg::start\\ndat::' + app + ',ORIENTATION=0\\nid::omaberry-native" > /pps/services/launcher/control', 'exit']
    subprocess.run(['ssh', '-o', 'BatchMode=yes', host, '/bin/__root'],
        input='\n'.join(commands) + '\n', text=True, check=True)
    print('OmaBerry launch requested; closed previous instances:', len(pids))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'build', 'status', 'launch'])
    parser.add_argument('--host', default='blackberry')
    args = parser.parse_args()
    if args.command == 'prepare': prepare()
    elif args.command == 'build': build()
    elif args.command == 'launch': launch(args.host)
    else: status(args.host)
