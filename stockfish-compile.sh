#!/bin/sh

# Compiles Stockfish optimized for x86 and ARM archs if possible.

set -e

verbose=
while getopts v OPTLET; do
  case "$OPTLET" in
    v) verbose=1;;
    \?) exit 2;;
  esac
done

flags=$(grep '^flags\b' </proc/cpuinfo | head -n 1)
flags=" ${flags#*:} "

arch=$(uname -m)

has_flags () {
  for flag; do
    case "${flags}" in
      *" ${flag} "*) :;;
      *)
        if [ -n "${verbose}" ]; then
          echo >&2 "Missing ${flag} for the next level"
        fi
        return 1;;
    esac
  done
}

determine_level_x86_64 () {
  level=""
  has_flags ssse3 || return 1
  level="ssse3"
  has_flags popcnt sse4_1 || return 0
  level="sse41-popcnt"
  has_flags avx2 || return 0
  level="avx2"
  has_flags bmi2 || return 0
  level="bmi2"
  has_flags avx512f || return 0
  level="avx512"
}

determine_level_x86_32 () {
  level=""
  has_flags sse2 || return 1
  level="sse2"
  has_flags popcnt sse4_1 || return 0
  level="sse41-popcnt"
}

case "$arch" in
  "x86_64")
    if determine_level_x86_64; then
      arch="x86-64-${level}"
    else
      arch="x86-64"
    fi
    :;;
  "x86_32")
    if determine_level_x86_32; then
      arch="x86-32-${level}"
    else
      arch="x86-32"
    fi
    :;;
  "aarch64")
    arch="armv8"
    :;;
  "aarch32")
    arch="armv7"
    :;;
  *)
    arch="_"
    :;;
esac

make clean
if [ ${arch} = "_" ]; then
  echo "Building..."
  make -j build >/dev/null 2>/dev/null
else
  echo "Optimizing for ${arch}..."
  make -j profile-build ARCH=${arch} >/dev/null 2>/dev/null
fi
