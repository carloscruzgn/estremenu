#!/bin/sh
# Orden de construcción de Cloudflare Pages: copia a _site solo lo que se sirve.
set -e
rm -rf _site
mkdir _site
cp -r index.html datos img _headers _site/
