#!/bin/sh
# OmaBerry Uninstaller Script for BlackBerry Q20

BIN_DIR="/accounts/1000/shared/misc/berrycore/bin"
LAUNCHER="$BIN_DIR/omaberry"

echo "========================================="
echo "   Uninstalling OmaBerry from Q20        "
echo "========================================="

# 1. Kill any running OmaBerry server process
if command -v pkill >/dev/null 2>&1; then
    pkill -f "omaberry/server/index.js" 2>/dev/null
fi

# 2. Remove launcher script
if [ -f "$LAUNCHER" ]; then
    rm -f "$LAUNCHER"
    echo "Removed launcher wrapper: $LAUNCHER"
fi

echo "OmaBerry uninstalled successfully."
echo "(Your files in /accounts/1000/shared/misc/omaberry remain untouched. Delete folder if desired.)"
echo "========================================="
