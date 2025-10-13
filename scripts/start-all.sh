#!/bin/sh
set -eu

# Start all built services from dist/ in background and wait for them.
# This script is written to be POSIX/sh compatible so it works in minimal containers
# that may not have bash available.

PIDS=""

if [ ! -d "dist" ]; then
  echo "dist directory not found. Run 'bun run build' first."
  exit 1
fi

start_service() {
  file="$1"
  if [ ! -f "$file" ]; then
    echo "Warning: $file not found, skipping."
    return
  fi
  echo "Starting $file"
  node "$file" &
  pid="$!"
  PIDS="$PIDS $pid"
}

start_service "dist/udp-server.js"
start_service "dist/forwarding-server.js"

# Trim whitespace and check if any PIDs were recorded
set -- $PIDS
if [ $# -eq 0 ]; then
  echo "No services started. Exiting."
  exit 1
fi

cleanup() {
  echo "Shutting down..."
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}

trap cleanup INT TERM

# Wait for background processes
for pid in $PIDS; do
  # ignore exit status of individual services so the script can continue shutting down
  wait "$pid" || true
done
