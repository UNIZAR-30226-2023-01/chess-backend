#!/bin/sh

export LINE_N=1
export START=1
export END=2

while read LINE
do
  if [ "${LINE}" = 'Supported archs:' ]; then
    export START=$(expr ${LINE_N} + 2)
  fi

  if [ "${LINE}" = 'Supported compilers:' ]; then
    export END=$(expr ${LINE_N} - 2)
  fi

  LINE_N=$(expr ${LINE_N} + 1)
done << EOT
$(make help)
EOT

echo 'Looking for compatible architectures'
echo 'This can take a while...'

while read ARCH
do
  make clean
  echo ${ARCH}
  #ERROR_L=$(make -j build ARCH=${ARCH} 2>/dev/stdout >/dev/null | wc -l)
  make -j build ARCH=${ARCH} >/dev/null 2>/dev/null
  if ./stockfish uci >/dev/null 2>/dev/null; then
    exit 0
  fi
done << EOT
$(make help | sed -n "${START},${END}p" | cut -f1 -d' ' | cat)
EOT

echo 'No compatible architectures were found' 1>2
exit 1
