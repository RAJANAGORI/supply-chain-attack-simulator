#!/usr/bin/env bash
# Install Docker (engine + Compose v2) when this machine does not already
# have a running daemon. ./run.sh calls this before the stack starts.
#
# Exit 0   `docker info` works for this user
# Exit 10  daemon is up, but this shell is not in the docker group yet
#          (`sg docker -c 'docker info'` works). Caller should re-exec via sg.
set -euo pipefail

log()  { printf '▶ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
err()  { printf '✗ %s\n' "$*" >&2; }

DISTRO=unknown
PKG=none

detect_os() {
  case "$(uname -s)" in
    Darwin)
      DISTRO=macos
      if command -v brew >/dev/null 2>&1; then
        PKG=brew
      fi
      ;;
    Linux)
      if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        DISTRO="${ID:-linux}"
      else
        DISTRO=linux
      fi
      if command -v apt-get >/dev/null 2>&1; then
        PKG=apt
      elif command -v dnf >/dev/null 2>&1; then
        PKG=dnf
      elif command -v yum >/dev/null 2>&1; then
        PKG=yum
      elif command -v pacman >/dev/null 2>&1; then
        PKG=pacman
      elif command -v zypper >/dev/null 2>&1; then
        PKG=zypper
      elif command -v apk >/dev/null 2>&1; then
        PKG=apk
      fi
      ;;
    *)
      DISTRO="$(uname -s)"
      PKG=none
      ;;
  esac
}

current_user() {
  if [[ -n "${USER:-}" ]]; then
    printf '%s\n' "$USER"
  else
    id -un
  fi
}

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
    return
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    err "Installing Docker needs root, and sudo is not on this machine."
    exit 1
  fi
  if ! sudo -n true 2>/dev/null; then
    if [[ ! -t 0 ]]; then
      err "Installing Docker needs sudo. Run 'sudo -v' in this terminal, then ./run.sh again."
      exit 1
    fi
    sudo -v
  fi
  sudo "$@"
}

compose_ready() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1
}

docker_ready() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1 || return 1
  compose_ready
}

docker_group_exists() {
  if command -v getent >/dev/null 2>&1; then
    getent group docker >/dev/null 2>&1
    return
  fi
  grep -q '^docker:' /etc/group 2>/dev/null
}

session_in_docker_group() {
  id -nG 2>/dev/null | grep -qw docker
}

user_in_docker_group() {
  id -nG "$(current_user)" 2>/dev/null | grep -qw docker
}

permission_denied() {
  local out
  out="$(docker info 2>&1 || true)"
  printf '%s\n' "$out" | grep -Eiq 'permission denied'
}

apt_compose_pkg() {
  if apt-cache show docker-compose-v2 >/dev/null 2>&1; then
    printf '%s\n' docker-compose-v2
  elif apt-cache show docker-compose-plugin >/dev/null 2>&1; then
    printf '%s\n' docker-compose-plugin
  fi
}

install_apt() {
  local pkgs="" compose_pkg
  as_root env DEBIAN_FRONTEND=noninteractive apt-get update -y
  if ! command -v docker >/dev/null 2>&1; then
    pkgs="docker.io"
  fi
  if ! compose_ready; then
    compose_pkg="$(apt_compose_pkg || true)"
    if [[ -n "$compose_pkg" ]]; then
      pkgs="${pkgs:+$pkgs }$compose_pkg"
    fi
  fi
  if [[ -z "$pkgs" ]]; then
    return 0
  fi
  # shellcheck disable=SC2086
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y $pkgs
}

install_rpm() {
  local mgr="$1"
  local pkgs=""
  if ! command -v docker >/dev/null 2>&1; then
    pkgs="docker"
  fi
  if ! compose_ready; then
    pkgs="${pkgs:+$pkgs }docker-compose"
  fi
  if [[ -z "$pkgs" ]]; then
    return 0
  fi
  # shellcheck disable=SC2086
  if ! as_root "$mgr" install -y $pkgs; then
    if [[ "$mgr" == dnf ]] && ! command -v docker >/dev/null 2>&1; then
      as_root dnf install -y moby-engine docker-cli docker-compose-plugin
      return
    fi
    return 1
  fi
}

install_pacman() {
  local pkgs=""
  if ! command -v docker >/dev/null 2>&1; then
    pkgs="docker"
  fi
  if ! compose_ready; then
    pkgs="${pkgs:+$pkgs }docker-compose"
  fi
  [[ -n "$pkgs" ]] || return 0
  # shellcheck disable=SC2086
  as_root pacman -Sy --noconfirm --needed $pkgs
}

install_zypper() {
  local pkgs=""
  if ! command -v docker >/dev/null 2>&1; then
    pkgs="docker"
  fi
  if ! compose_ready; then
    pkgs="${pkgs:+$pkgs }docker-compose"
  fi
  [[ -n "$pkgs" ]] || return 0
  # shellcheck disable=SC2086
  as_root zypper --non-interactive install $pkgs
}

install_apk() {
  local pkgs=""
  if ! command -v docker >/dev/null 2>&1; then
    pkgs="docker docker-cli"
  fi
  if ! compose_ready; then
    pkgs="${pkgs:+$pkgs }docker-cli-compose"
  fi
  [[ -n "$pkgs" ]] || return 0
  # shellcheck disable=SC2086
  as_root apk add --no-cache $pkgs
}

install_macos() {
  if command -v docker >/dev/null 2>&1 || [[ -x /Applications/Docker.app/Contents/Resources/bin/docker ]]; then
    if [[ -d /Applications/Docker.app/Contents/Resources/bin ]]; then
      export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH}"
    fi
    return 0
  fi
  if [[ "$PKG" != brew ]]; then
    err "Homebrew is not installed, so this script cannot install Docker Desktop."
    err "Install it from https://www.docker.com/products/docker-desktop/ and re-run ./run.sh"
    exit 1
  fi
  brew install --cask docker
  if [[ -d /Applications/Docker.app/Contents/Resources/bin ]]; then
    export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH}"
  fi
}

install_for_os() {
  case "$PKG" in
    apt) install_apt ;;
    dnf) install_rpm dnf ;;
    yum) install_rpm yum ;;
    pacman) install_pacman ;;
    zypper) install_zypper ;;
    apk) install_apk ;;
    brew) install_macos ;;
    *)
      err "No Docker package mapping for ${DISTRO}."
      err "Install Docker Engine and the Compose v2 plugin, then re-run ./run.sh"
      exit 1
      ;;
  esac
}

start_daemon() {
  if docker info >/dev/null 2>&1 || permission_denied; then
    return 0
  fi
  case "$(uname -s)" in
    Darwin)
      log "Starting Docker Desktop"
      open -a Docker >/dev/null 2>&1 || open -a "Docker Desktop" >/dev/null 2>&1 || true
      ;;
    Linux)
      if [[ -d /run/systemd/system ]] && command -v systemctl >/dev/null 2>&1; then
        as_root systemctl enable --now docker
      elif command -v service >/dev/null 2>&1; then
        as_root service docker start
      elif command -v rc-service >/dev/null 2>&1; then
        as_root rc-service docker start
        as_root rc-update add docker default || true
      else
        err "Docker is installed, but there is no systemd or OpenRC here to start it."
        exit 1
      fi
      ;;
  esac
}

add_docker_group() {
  [[ "$(uname -s)" == Linux ]] || return 0
  [[ "$(id -u)" -ne 0 ]] || return 0
  docker_group_exists || return 0
  if user_in_docker_group; then
    return 0
  fi
  log "Adding $(current_user) to the docker group"
  as_root usermod -aG docker "$(current_user)"
}

# Exit 10 when a fresh shell with the docker group would work.
hand_off_group() {
  if docker_ready; then
    ok "Docker is running"
    exit 0
  fi
  if ! command -v docker >/dev/null 2>&1 || ! permission_denied; then
    return 1
  fi
  if session_in_docker_group || [[ "${SCAS_DOCKER_SG_REEXEC:-}" == 1 ]]; then
    err "This shell is in the docker group, but the daemon still refused the connection."
    exit 1
  fi
  if command -v sg >/dev/null 2>&1 && sg docker -c 'docker info >/dev/null' >/dev/null 2>&1; then
    exit 10
  fi
  err "Docker is installed, but $(current_user) cannot use /var/run/docker.sock yet."
  err "Log out and back in so the docker group applies, then run ./run.sh again."
  exit 1
}

wait_for_docker() {
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45; do
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    if permission_denied; then
      return 2
    fi
    sleep 2
  done
  return 1
}

detect_os

if docker_ready; then
  exit 0
fi

# Socket exists and refused this user. Installing again will not fix that.
if command -v docker >/dev/null 2>&1 && permission_denied; then
  add_docker_group
  hand_off_group
fi

if ! command -v docker >/dev/null 2>&1 || ! compose_ready; then
  log "Docker is missing on ${DISTRO}. Installing with ${PKG}."
  install_for_os
  hash -r 2>/dev/null || true
fi

if ! command -v docker >/dev/null 2>&1; then
  err "Docker is still not on PATH after the ${DISTRO} install."
  exit 1
fi

if ! compose_ready; then
  err "Docker Compose v2 is still missing. The stack needs the 'docker compose' command."
  exit 1
fi

add_docker_group
start_daemon

wait_rc=0
wait_for_docker || wait_rc=$?
if [[ "$wait_rc" -eq 0 ]]; then
  ok "Docker is running"
  exit 0
fi
if [[ "$wait_rc" -eq 2 ]]; then
  hand_off_group
  exit 1
fi
err "Docker installed, but the daemon did not come up on ${DISTRO}."
exit 1
