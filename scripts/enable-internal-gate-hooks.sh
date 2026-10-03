#!/bin/sh
set -eu

git config core.hooksPath .githooks
echo "VUC internal pre-push governance hook enabled."
