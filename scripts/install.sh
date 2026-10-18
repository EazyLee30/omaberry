#!/bin/sh
# OmaBerry Installation Script for BlackBerry Q20 (BerryCore)

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
OMA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
BIN_DIR="/accounts/1000/shared/misc/berrycore/bin"

echo "========================================="
echo "   Installing OmaBerry on Q20            "
echo "========================================="

# 1. Run preflight
sh "$SCRIPT_DIR/preflight.sh"
if [ $? -ne 0 ]; then
    echo "Preflight check failed. Aborting installation."
    exit 1
fi

# 2. Ensure target binary dir exists
mkdir -p "$BIN_DIR" 2>/dev/null

# 3. Create omaberry launcher wrapper
LAUNCHER="$BIN_DIR/omaberry"
cat << 'EOF' > "$LAUNCHER"
#!/bin/sh
# OmaBerry Shell Launcher for BlackBerry Q20
OMA_PATH="/accounts/1000/shared/misc/omaberry"

if [ ! -d "$OMA_PATH" ]; then
    OMA_PATH="$(cd "$(dirname "$0")/.." && pwd)"
fi

echo "Starting OmaBerry Server..."
echo "  path: $OMA_PATH"

# node lives in more than one place depending on how BerryCore was installed.
# Try each and use whichever actually runs; do not report success for a fork
# that immediately died.
NODE=""
for candidate in \
    /accounts/1000/shared/misc/berrycore/bin/node \
    /accounts/1000/shared/misc/clitools/bin/node \
    "$(command -v node 2>/dev/null)"
do
    [ -z "$candidate" ] && continue
    [ -x "$candidate" ] || continue
    "$candidate" -e 1 >/dev/null 2>&1
    if [ $? -eq 0 ]; then NODE="$candidate"; break; fi
done

if [ -z "$NODE" ]; then
    echo ""
    echo "ERROR: no runnable node found."
    echo ""
    echo "Tried:"
    echo "  /accounts/1000/shared/misc/berrycore/bin/node"
    echo "  /accounts/1000/shared/misc/clitools/bin/node"
    echo ""
    echo "On BB10 a binary must be on the pathtrust allowlist to run. If this"
    echo "says the file exists but is not executable, the shell you are in has"
    echo "no execution rights for it -- run this from Term49 instead of an SSH"
    echo "session, where the app context can exec what the installer registered."
    exit 1
fi

echo "  node: $NODE"
"$NODE" "$OMA_PATH/server/index.js" &
SERVER_PID=$!
sleep 2

# Check it actually came up rather than trusting the fork.
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "OmaBerry Server running (PID $SERVER_PID)"
    echo "Open Berry Browser -> http://127.0.0.1:9820"
else
    echo ""
    echo "ERROR: server exited. Check $OMA_PATH/omaberry.log"
    exit 1
fi

if command -v berry-browser >/dev/null 2>&1; then
    berry-browser "http://127.0.0.1:9820" &
fi
EOF

chmod +x "$LAUNCHER"
chmod +x "$SCRIPT_DIR/preflight.sh"
chmod +x "$SCRIPT_DIR/uninstall.sh"

# 4. Handle QNX pathtrust if available.
#
# pathtrust is an execution allowlist: the default set trusts /proc/boot and
# /base, and once it is locked down no later registration is honoured. Anything
# under /accounts has to be registered before that happens.
#
# The obvious entries are the launcher and the server, but neither of those is
# an executable -- node runs them. Trusting only the scripts leaves node.bin
# blocked, and the desktop silently never starts.
if [ -x "/proc/boot/pathtrust" ]; then
    echo "Registering pathtrust for OmaBerry..."

    NODE_DIR=""
    if [ -d "$BIN_DIR/../bin" ]; then
        NODE_DIR="$(cd "$BIN_DIR/../bin" && pwd)"
    fi

    for target in "$LAUNCHER" "$OMA_PATH/server/index.js"; do
        [ -e "$target" ] && /proc/boot/pathtrust "!$target" 2>/dev/null
    done

    if [ -n "$NODE_DIR" ]; then
        # BerryCore's node is a wrapper that execs node.bin; both must be
        # trusted or it is the exec step that gets refused.
        for bin in "$NODE_DIR/node" "$NODE_DIR/node.bin"; do
            [ -e "$bin" ] && /proc/boot/pathtrust "!$bin" 2>/dev/null
        done
        echo "  trusted node runtime in $NODE_DIR"
    else
        echo "  WARNING: node not found near $BIN_DIR -- trusting the launcher"
        echo "           alone is not enough, node.bin must be trusted too"
    fi
fi

echo "========================================="
echo " OmaBerry installation complete!         "
echo "                                         "
echo " To start OmaBerry, run:                 "
echo "   omaberry                              "
echo "                                         "
echo " Web desktop address:                    "
echo "   http://127.0.0.1:9820                 "
echo "========================================="
