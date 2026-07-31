#!/usr/bin/env bash
# Creates (or replaces) the mcninch-auth secret on tron from .env.local.
#
# Why a script rather than a printed kubectl command: a bcrypt hash is full of `$`,
# and every layer of shell between here and the cluster wants to expand it. An
# earlier attempt printed
#
#   ssh tron "kubectl create secret ... --from-literal=HASH='$2b$12$Riwx...'"
#
# and the single quotes were useless — they sit INSIDE the double-quoted ssh string,
# so they're literal characters and the local shell expanded $2b, $12 and $Riwx before
# ssh ran. The hash arrived mangled and the login would have rejected every password.
#
# This avoids the problem entirely: values are base64-encoded (no shell metacharacters
# survive that) and the manifest is piped to kubectl over stdin, so nothing is ever
# interpolated into a quoted command string.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env.local"
REMOTE="${REMOTE_HOST:-tron}"
NAMESPACE="${K8S_NAMESPACE:-jason}"
SECRET_NAME="mcninch-auth"

[ -f "$ENV_FILE" ] || { echo "error: $ENV_FILE not found" >&2; exit 1; }

# Read one key. Strips the dotenv `\$` escaping, which exists only to survive
# Next.js's own variable expansion when it loads the file — the cluster wants the
# raw value.
read_key() {
  local key="$1" line
  line=$(grep -m1 "^${key}=" "$ENV_FILE" || true)
  [ -n "$line" ] || return 1
  printf '%s' "${line#*=}" | sed 's/\\\$/$/g'
}

b64() { printf '%s' "$1" | base64 | tr -d '\n'; }

KEYS=(AUTH_USERNAME AUTH_PASSWORD_HASH SESSION_SECRET IMAP_USER IMAP_APP_PASSWORD IMAP_WORK_FOLDER)

DATA=""
echo "Reading $ENV_FILE:"
for key in "${KEYS[@]}"; do
  if value=$(read_key "$key"); then
    DATA+="  ${key}: $(b64 "$value")"$'\n'
    printf '  %-20s %d chars\n' "$key" "${#value}"
  else
    printf '  %-20s absent, skipping\n' "$key"
  fi
done

# Fail loudly rather than shipping a hash that can never match a password.
HASH=$(read_key AUTH_PASSWORD_HASH || true)
case "$HASH" in
  '$2b$'*|'$2a$'*|'$2y$'*)
    [ "${#HASH}" -eq 60 ] || { echo "error: hash is ${#HASH} chars, expected 60" >&2; exit 1; }
    ;;
  *)
    echo "error: AUTH_PASSWORD_HASH does not look like bcrypt (starts '${HASH:0:4}')" >&2
    exit 1
    ;;
esac
echo "  hash validated: 60 chars, bcrypt prefix intact"

echo
echo "Applying to ${REMOTE}, namespace ${NAMESPACE}..."
# `apply` rather than `create`, so re-running updates in place instead of erroring.
{
  printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: %s\n  namespace: %s\ntype: Opaque\ndata:\n' \
    "$SECRET_NAME" "$NAMESPACE"
  printf '%s' "$DATA"
} | ssh "$REMOTE" "/snap/bin/kubectl apply -f - -n ${NAMESPACE}"

echo
echo "Verifying what landed on the cluster:"
ssh "$REMOTE" "/snap/bin/kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o jsonpath='{.data.AUTH_PASSWORD_HASH}'" \
  | base64 -d \
  | awk '{ printf "  hash on cluster: %d chars, prefix %s\n", length($0), substr($0,1,4) }'
