#!/bin/sh
# Orden de construcción de Cloudflare Pages: copia a _site solo lo que se sirve.
set -e
rm -rf _site
mkdir _site
cp -r index.html manifest.webmanifest datos img lib _headers _site/
# Ficheros para Instagram, que Metricool toma por enlace público (14-INSTAGRAM).
if [ -d instagram ]; then cp -r instagram _site/; fi
# Una página por palabra del diccionario, para la vista previa al compartirla.
node fuente/voz-paginas.mjs _site
# Fecha de la última publicación en el pie, en hora de Madrid.
sed -i "s|<time data-fecha>[^<]*</time>|<time data-fecha>$(TZ=Europe/Madrid date +%d/%m/%Y)</time>|" _site/index.html
