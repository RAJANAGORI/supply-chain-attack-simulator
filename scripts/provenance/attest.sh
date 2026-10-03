#!/usr/bin/env bash
# Create a signed, timestamped authorship attestation for SCAS.
#
# This is the "prove you were first" layer. It writes ATTESTATION.json binding
# the creator, the repo, the current commit SHA, and the provenance fingerprint,
# then signs it. The signature plus git history plus (optionally) a public
# timestamp anchor gives you third-party-verifiable evidence of priority that
# predates any copy.
#
# Usage:
#   ./scripts/provenance/attest.sh            # build + sign the attestation
#   ./scripts/provenance/attest.sh --verify   # verify an existing attestation
#
# Signing backends, tried in order:
#   1. gitsign (Sigstore keyless, ties to your GitHub identity + Rekor log)
#   2. SSH key (git ssh-signing; you already use id_ed25519 for commit signing)
#   3. gpg (your local key; pair with `git config user.signingkey`)
#   4. unsigned (still records commit + timestamp; weaker, but a start)
#
# Optional public anchoring (strongest): if `ots` (OpenTimestamps) is installed,
# the attestation hash is stamped to the Bitcoin blockchain, giving an
# independent, immutable timestamp no one can backdate.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CANON="${ROOT}/SCAS_PROVENANCE.json"
OUT="${ROOT}/ATTESTATION.json"
SIG="${ROOT}/ATTESTATION.json.sig"
STAMP="${ROOT}/ATTESTATION.json.ots"

if [[ ! -f "${CANON}" ]]; then
  echo "Missing ${CANON}" >&2
  exit 1
fi

VERIFY=0
[[ "${1:-}" == "--verify" ]] && VERIFY=1

if [[ "${VERIFY}" -eq 1 ]]; then
  echo "Verifying attestation in: ${ROOT}"
  [[ -f "${OUT}" ]] || { echo "No ATTESTATION.json found"; exit 1; }
  if [[ -f "${SIG}" ]]; then
    if head -1 "${SIG}" | grep -q "SSH SIGNATURE"; then
      SSH_KEY="$(git -C "${ROOT}" config user.signingkey 2>/dev/null || echo "${HOME}/.ssh/id_ed25519.pub")"
      PUB="${SSH_KEY%.pub}.pub"
      if [[ -f "${PUB}" ]]; then
        PRINCIPAL="$(git -C "${ROOT}" config user.email 2>/dev/null || echo scas)"
        ALLOWED="$(mktemp)"
        echo "${PRINCIPAL} $(cat "${PUB}")" > "${ALLOWED}"
        ssh-keygen -Y verify -f "${ALLOWED}" -I "${PRINCIPAL}" -n scas-attestation -s "${SIG}" < "${OUT}" \
          && echo "SSH signature: VALID" || echo "SSH signature: INVALID"
        rm -f "${ALLOWED}"
      fi
    elif command -v gpg >/dev/null 2>&1; then
      gpg --verify "${SIG}" "${OUT}" && echo "GPG signature: VALID"
    fi
  else
    echo "No signature to verify (attestation may be unsigned)."
  fi
  if command -v ots >/dev/null 2>&1 && [[ -f "${STAMP}" ]]; then
    ots verify "${STAMP}" && echo "OpenTimestamps anchor: VALID"
  fi
  echo "Recorded commit: $(grep -o '"commit": *"[^"]*"' "${OUT}" | cut -d'"' -f4)"
  echo "Recorded at:     $(grep -o '"attestedAt": *"[^"]*"' "${OUT}" | cut -d'"' -f4)"
  exit 0
fi

CREATOR=$(grep -o '"creator": *"[^"]*"' "${CANON}" | cut -d'"' -f4)
REPO=$(grep -o '"repository": *"[^"]*"' "${CANON}" | cut -d'"' -f4)
FP=$(grep -o '"fingerprint": *"[^"]*"' "${CANON}" | cut -d'"' -f4)
COMMIT=$(git -C "${ROOT}" rev-parse HEAD 2>/dev/null || echo "unknown")
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CANON_SHA=$(shasum -a 256 "${CANON}" | awk '{print $1}')

cat > "${OUT}" <<JSON
{
  "type": "scas-authorship-attestation",
  "creator": "${CREATOR}",
  "repository": "${REPO}",
  "fingerprint": "${FP}",
  "commit": "${COMMIT}",
  "attestedAt": "${NOW}",
  "provenanceSha256": "${CANON_SHA}",
  "statement": "I, ${CREATOR}, am the original author of the Supply Chain Attack Simulator. This attestation binds my identity to commit ${COMMIT} and provenance fingerprint ${FP} at the time above."
}
JSON

echo "Wrote ${OUT}"

SIGNED="no"
if command -v gitsign >/dev/null 2>&1; then
  # Keyless Sigstore: identity-bound, logged to the Rekor transparency log.
  gitsign attest --predicate "${OUT}" --type "application/json" >/dev/null 2>&1 && SIGNED="sigstore"
fi
if [[ "${SIGNED}" == "no" ]]; then
  # SSH signing via the key already used for git commit signing.
  SSH_KEY="$(git -C "${ROOT}" config user.signingkey 2>/dev/null || true)"
  if [[ -z "${SSH_KEY}" && -f "${HOME}/.ssh/id_ed25519" ]]; then
    SSH_KEY="${HOME}/.ssh/id_ed25519"
  fi
  if [[ -n "${SSH_KEY}" && -f "${SSH_KEY%.pub}" ]]; then
    if ssh-keygen -Y sign -f "${SSH_KEY%.pub}" -n scas-attestation "${OUT}" >/dev/null 2>&1; then
      # ssh-keygen writes ${OUT}.sig
      [[ -f "${OUT}.sig" ]] && SIGNED="ssh"
      echo "Signed with SSH key -> ${SIG}"
    fi
  fi
fi
if [[ "${SIGNED}" == "no" ]] && command -v gpg >/dev/null 2>&1; then
  if gpg --armor --detach-sign --output "${SIG}" "${OUT}" 2>/dev/null; then
    SIGNED="gpg"
    echo "Signed with GPG -> ${SIG}"
  fi
fi

if command -v ots >/dev/null 2>&1; then
  ots stamp "${OUT}" >/dev/null 2>&1 && echo "OpenTimestamps stamp -> ${STAMP} (run 'ots upgrade ${STAMP##*/}' later to finalize the Bitcoin anchor)"
fi

echo "Signed: ${SIGNED}"
echo ""
echo "Next steps for maximum strength:"
echo "  1. Commit ATTESTATION.json (and .sig) so it is part of the signed git history."
echo "  2. Sign the release tag:  git tag -s vX.Y.Z -m 'Release by ${CREATOR}'"
echo "  3. Anchor publicly:       ots stamp ATTESTATION.json   (needs opentimestamps)"
echo "  4. Optional DOI:          link the repo to Zenodo for a citable, timestamped record."
