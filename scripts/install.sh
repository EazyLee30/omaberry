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
    # Try local directory fallback
    OMA_PATH="$(cd "$(dirname "$0")/.." && pwd)"
fi

echo "Starting OmaBerry Server..."
if command -v node >/dev/null 2>&1; then
    node "$OMA_PATH/server/index.js" &
    SERVER_PID=$!
    echo "OmaBerry Server started (PID: $SERVER_PID)"
    echo "Opening Berry Browser -> http://127.0.0.1:9820"
    sleep 1
    
    # If berry-browser command is available, invoke it
    if command -v berry-browser >/dev/null 2>&1; then
        berry-browser "http://127.0.0.1:9820" &
    else
        echo "Please open Berry Browser and navigate to: http://127.0.0.1:9820"
    fi
else
    echo "Error: node not found. Please install node-term49 via qpkg."
    exit 1
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
