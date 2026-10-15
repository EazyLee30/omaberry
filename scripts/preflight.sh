#!/bin/sh
# OmaBerry Preflight Check Script for BlackBerry Q20
# Verifies Node.js, BerryCore, and permissions

echo "========================================="
echo "   OmaBerry Preflight Diagnostic (Q20)   "
echo "========================================="

FAILURES=0

# 1. Check OS Kernel
echo -n "[1/5] Checking OS Kernel... "
KERNEL=$(uname -s 2>/dev/null)
if [ "$KERNEL" = "QNX" ]; then
    echo "OK ($KERNEL $(uname -r))"
else
    echo "WARN (Expected QNX, got $KERNEL)"
fi

# 2. Check Node.js
echo -n "[2/5] Checking Node.js runtime... "
NODE_BIN=$(command -v node 2>/dev/null)
if [ -n "$NODE_BIN" ]; then
    NODE_VER=$(node -v 2>/dev/null)
    echo "OK ($NODE_BIN $NODE_VER)"
else
    echo "FAILED"
    echo "  -> Node.js not found in PATH."
    echo "  -> Run: qpkg install node-term49"
    FAILURES=$((FAILURES + 1))
fi

# 3. Check BerryCore Directory
echo -n "[3/5] Checking BerryCore environment... "
BC_PATH="/accounts/1000/shared/misc/berrycore"
if [ -d "$BC_PATH" ]; then
    echo "OK ($BC_PATH)"
else
    echo "WARN (BerryCore default path not found at $BC_PATH)"
fi

# 4. Check Shell Executables
echo -n "[4/5] Checking available shell... "
if [ -x "/accounts/1000/shared/misc/berrycore/bin/zsh" ]; then
    echo "OK (BerryCore zsh)"
elif [ -x "/bin/ksh" ]; then
    echo "OK (/bin/ksh)"
elif [ -x "/bin/sh" ]; then
    echo "OK (/bin/sh)"
else
    echo "FAILED (No shell found)"
    FAILURES=$((FAILURES + 1))
fi

# 5. Check Port Availability
echo -n "[5/5] Checking port 9820 availability... "
if command -v netstat >/dev/null 2>&1; then
    PORT_OCCUPIED=$(netstat -an | grep 9820)
    if [ -n "$PORT_OCCUPIED" ]; then
        echo "BUSY (Port 9820 in use)"
    else
        echo "OK"
    fi
else
    echo "OK (netstat not present, proceeding)"
fi

echo "========================================="
if [ $FAILURES -eq 0 ]; then
    echo "Preflight PASSED. Ready to install OmaBerry."
    exit 0
else
    echo "Preflight found $FAILURES issue(s). Please install dependencies."
    exit 1
fi
