#!/usr/bin/env bash
# Scan GPIO pins to discover which one actually drives the relay.
# Uses pigpio (pigpiod must be running). Safe: sets each pin OUTPUT, drives LOW then HIGH briefly.
# Usage: bash scripts/scan-gpio-relay.sh

set -euo pipefail

CANDIDATES=${*:-"17 18 22 23 24 25 5 6 12 13 16 19 20 21 26"}

if ! command -v pigs >/dev/null 2>&1; then
  echo "pigpio (pigs) not installed or pigpiod not running." >&2
  exit 1
fi

echo "Relay discovery scan starting..."
echo "Pins to test: $CANDIDATES"
echo "For each pin: note if relay clicks or LED changes. Press Enter to continue to next pin, or 'q' to quit." 

echo "------------------------------------------------------------"
for PIN in $CANDIDATES; do
  echo "Testing GPIO $PIN"
  pigs m $PIN w  # mode output
  pigs w $PIN 0  # drive low
  echo "  -> Driven LOW (0). Observe relay/LED." 
  sleep 0.8
  pigs w $PIN 1  # drive high
  echo "  -> Driven HIGH (1). Observe relay/LED." 
  sleep 0.8
  read -r -p "Result? (Enter=next, q=quit, s=mark as suspect) > " RESP || true
  case "$RESP" in
    q|Q) echo "Aborting scan."; break ;;
    s|S) echo "Marked GPIO $PIN as SUSPECT." >> scan-gpio-results.log ;;
    *) : ;;
  esac
  # Reset to input (hi‑Z) before moving on
  pigs m $PIN r >/dev/null 2>&1 || true
  echo "------------------------------------------------------------"
done

echo "Scan complete. Any marked suspects are in scan-gpio-results.log."
