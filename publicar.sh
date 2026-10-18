#!/bin/sh
# Orden de construcción de Cloudflare Pages: copia a _site solo lo que se sirve.
set -e
rm -rf _site
mkdir _site
cp -r index.html datos img _headers _site/
# Fecha de la última publicación en el pie, en hora de Madrid.
sed -i "s|<time data-fecha>[^<]*</time>|<time data-fecha>$(TZ=Europe/Madrid date +%d/%m/%Y)</time>|" _site/index.html
