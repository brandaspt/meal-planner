#!/usr/bin/env bash
# Sends a WhatsApp message to every recipient via CallMeBot.
# WA_RECIPIENTS="<phone>:<apikey>,<phone>:<apikey>" (environment secret)
set -euo pipefail

message="${1:?usage: notify.sh \"message\"}"
: "${WA_RECIPIENTS:?WA_RECIPIENTS is not set}"

IFS=',' read -ra recipients <<< "$WA_RECIPIENTS"
for recipient in "${recipients[@]}"; do
  curl --fail --silent --show-error --max-time 30 --retry 2 --get \
    "https://api.callmebot.com/whatsapp.php" \
    --data-urlencode "phone=${recipient%%:*}" \
    --data-urlencode "text=${message}" \
    --data-urlencode "apikey=${recipient#*:}" > /dev/null
done
