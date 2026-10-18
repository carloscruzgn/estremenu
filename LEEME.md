# Taller de estremeñu · web

Web del Taller de estremeñu del CEPA Coria, curso 2026-2027. Se da al alumnado del taller desde el lunes 19/10/2026, sin otra difusión: el repositorio es privado y la web se ve en https://estremenu.pages.dev (ver «Vista en el navegador»). Lo vigente —qué lleva, de dónde se copia cada parte y qué queda— está en la ficha 12-WEB del proyecto del taller. La web es copia: lo que se corrige, se corrige en la fuente y se vuelve a copiar.

## Partes

- **index.html** — la web entera: portada y secciones El contenido del taller, Rasgos, Textos y Diccionario; la página de cada apartado de los apuntes, la de cada rasgo (con mapa interactivo en three.js cuando lo tiene) y la de cada texto leído en el taller. Se navega con la almohadilla de la dirección: `#apuntes-4`, `#rasgos`, `#V01`, `#TEX-02`.
- **datos/** — lo que lee la web. Lo escribe `fuente/construir.mjs`; no se toca a mano.
  - `base.json`: los términos municipales de Extremadura y de las cinco comarcas salmantinas, con su comarca y si son del área del taller, y las provincias vecinas y Portugal.
  - `rasgos.json`: la lista de los treinta y un rasgos de los apuntes del alumnado, con cuáles tienen mapa.
  - `rasgos/<código>.json`: la página del rasgo en los apuntes y, si tiene mapa, el fichero del rasgo del generador de reels y la clase de cada término.
  - `textos.json`: los textos leídos en el taller.
  - `autores.json`: las páginas «Sobre el autor» de los textos, una por autor o fuente, con sus informantes; copia de `fuente/autores.json`.
  - `portada.json`: el mapa de la portada —España y Portugal, Extremadura, el área del taller y los términos—, en kilómetros y simplificado, para la animación del título.
  - `signos.json`: los signos de Cummins, de la hoja GEN-06, para el desplegable de la transcripción.
  - `apuntes.json`: los apartados 1 a 7 de los apuntes del alumnado, con el sitio de cada mapa, la bibliografía como apartado 8 y el anexo de mapas históricos como apartado 9. «Antes de empezar» no tiene página: su texto es la entradilla de «El contenido del taller» (campo `entradilla`).
  - `diccionario-cifras.json`: la fecha y el número de lemas del diccionario, para la tarjeta de la portada. Lo escriben `diccionario.mjs` y `construir.mjs`.
  - `diccionario.json`: el diccionario, de `fuente/diccionario.mjs` (ver «Poner al día el diccionario»): cada entrada con su tarjeta ya compuesta como en el diccionario impreso, las formas para buscar, las fuentes, las abreviaturas y las palabras del taller.
  - `claves.json`: las claves del formulario del diccionario, solo en resumen SHA-256, copia de `fuente/claves.json`.
- **img/** — el logo del centro, todo en blanco para la banda naranja de arriba; en `mapas/` los mapas de los apuntes y los quince históricos del anexo en WebP de 1600 px, sacados de los PNG de la carpeta Mapas de Drive, en `textos/` las ilustraciones de los textos, `TEX-NN-<qué>.webp`, en `autores/` el retrato o la portada de cada página de autor, y en `fuentes/` la Charis SIL recortada a los signos de la fonética, con su licencia OFL, la EB Garamond y la IM Fell del diccionario, y la Montserrat, de @fontsource/montserrat 5.3.0, en los pesos 500, 700, 800 y 900 y la cursiva de 500 y 700, con los juegos latin, latin-ext y vietnamese, los mismos que daba Google Fonts.
- **lib/three/** — three.js 0.160.0, de npm: `build/three.module.js` y los cinco módulos de `examples/jsm` que usa el mapa, con su licencia MIT. La web no pide nada a otros servidores: ni Google Fonts ni jsDelivr reciben la IP de quien la visita. Para cambiar de versión se copian los mismos ficheros de la nueva y se prueba el mapa.
- **fuente/** — lo que se escribe a mano para cada rasgo y el programa que prepara los datos:
  - `rasgos/<código>.json`: el mismo fichero del rasgo que usa el generador de reels (reel-rasgo.zip). Un rasgo nuevo sirve para el reel y para la web. V01 vino del generador; C06, V07, C01, C02 y C03, y en una segunda tanda C08, C09, C11, C16, C20, C27, M03, M04, M11, M14, M23 y M27, en una tercera C18, M21, M24 y P01, y en una cuarta los nueve rasgos generales del español hablado (V05, C07, C19, M01, M05, M08, M09, M15 y M28), con `tipo` «general» y toda Extremadura en probable, se escribieron aquí el 18/10/2026, y el generador los toma de aquí cuando se haga su reel. Al lado, la hoja de criterios de cada tanda (`criterios_…md`), con las decisiones dudosas y su alternativa. La nota de cada pueblo, que la web enseña al tocarlo, lleva solo el dato de la fuente, con autor, página y formas; las razones del mapa van en la hoja de criterios y en los campos que empiezan por guion bajo, que la web no enseña. En la extensión probable se toca la comarca, no el pueblo (Carlos, 18/10/2026): su ficha la arma index.html (infoComarca) con el tono de la comarca, lo recogido en sus pueblos, lo que va en contra y el campo `extension` del .json —`probable` y `algunos`, el texto para las comarcas con ese tono; `comarcas`, el de una comarca concreta, y "" para el texto por defecto; `terminos`, el de un pueblo con tono propio o fuera de lo probable—, solo con dato de fuente, autor y página. Las ciudades sin comarca van solas.
  - `apuntes/<código>.json`: el texto de la página del rasgo en los apuntes del alumnado y los ejemplos de la cabecera, sacados de la misma página. Un ejemplo es `{base, antes, despues}` y, si el cambio no va al final, `cola` con lo que sigue (*hacha → jacha*).
  - `apuntes/apartados.json`: el texto de los apartados de los apuntes del alumnado, por párrafos, con los arranques en negrita y los mapas.
  - `apuntes/bibliografia.json`: el apartado 8, Bibliografía, que construir.mjs pone detrás de los del alumnado. Lo genera `python3 bibliografia.py` desde `bibliografia_apuntes-propios-7.md`, copia literal del § 7 de los apuntes propios: entra solo la referencia completa, sin los comentarios de Claude, y lo demás va a `bibliografia_pendientes.md` con lo que le falta. Cuando el § 7 cambie, se vuelve a copiar entero a ese .md y se corre el script.
  - `apuntes/anexo.json`: el apartado 9, «Anexo: mapas históricos», que construir.mjs pone detrás de la bibliografía: los quince mapas H de la carpeta Mapas por orden de las fechas que enseñan, cada uno con `fecha` cuando su título no la lleva, que sale en el pie del mapa. No es copia de los apuntes: lo escribió Claude el 19/10/2026, a petición de Carlos. Cada mapa tiene que estar en `img/mapas/`, o construir.mjs para.
  - `catalogo.json`: los títulos de las páginas de rasgo de los apuntes y qué rasgos tienen mapa y página.
  - `textos/TEX-NN.json`: cada texto leído en el taller, con la fecha de la pestaña Sesiones de la app (o `null` si está pendiente de leer), sus rasgos destacados, las palabras marcadas con el código de su rasgo y el glosario de la guía, que la web no muestra. Salen del texto marcado de la guía de clase (guia-clase-pdf.zip). El campo `detalle` es la página «Los rasgos en detalle» del texto (`#TEX-NN-rasgos`), a la que lleva la tarjeta del pie de los rasgos destacados: `resumen` para la tarjeta, `entradilla`, un apartado por rasgo destacado (`parrafos` y `pregunta`, en el orden de `rasgos`), `otros` (con `titulo` solo si el rasgo no tiene página; `codigo` null para lo que no sale) y `fuentes`. Es un resumen a mano de las secciones de rasgos de la guía de clase, sin lo que ya cuenta la página de cada rasgo. En el texto, `*palabra*` va en cursiva, `{[fonética]}` en la letra de la fonética, y los códigos de rasgo con página se enlazan solos.
  - `signos-cummins.json`: los signos de Cummins, con el texto de GEN-06.
  - `autores.json`: las páginas «Sobre el autor» de los textos: una por autor o fuente (Gabriel y Galán; Cummins, con un apartado por informante), con los textos que la enlazan, sacadas de la sección 1 de la guía de clase de cada texto. Bloques `h`, `p`, `cita`, `informante` y `fuentes`; el `*título*` va en cursiva. `corto` y `resumen`, para la tarjeta de cada texto, bajo la fecha de lectura. Para la foto o la portada, `imagen` con `src`, `ancho`, `alto`, `alt` y `pie`, y la imagen en `img/autores/`. Un texto nuevo de un autor que ya tiene página se añade a sus `textos` y, si es de Cummins, con su `informante`.
  - `comarcas.json`: las comarcas REDEX y el área del taller, la del generador de reels.
  - `diccionario.mjs`: prepara `datos/diccionario.json` desde el espejo de la hoja DICCIONARIO-NOROESTE. La entrada es la del impreso desde el 18/10/2026, sin Observaciones ni nada marcado como dudoso. Siglas y referencias, de la pestaña FUENTES del espejo; si no la trae, de `diccionario-siglas.json`, y las que falten se forman por regla y se avisan. Abreviaturas, de `diccionario-abreviaturas.json`.
  - `claves.json`: las claves del formulario, en resumen SHA-256 con su sal. Las claves en claro no están en el repositorio: las tiene Carlos.

## Añadir un texto

1. Escribir `fuente/textos/TEX-NN.json` como los que hay. Si todavía no se ha leído en clase, `"leido": null`: sale al final de la lista como «Pendiente de leer», y cuando se lea se le pone la fecha de la pestaña Sesiones de la app y se queda donde está. Solo puede haber uno pendiente a la vez: construir.mjs para si hay dos. Los textos: `bloques` de tipo `verso`, `linea`, `pregunta` o `corte`, y en cada línea `tokens`, con `{"t": …}` para el texto corrido y `{"w": palabra, "r": [códigos]}` para las palabras marcadas. Si es teatro (`"tipo": "teatro"`, TEX-04), `bloques` de tipo `acto`, `acot` (acotación, en cursiva), `fin` y `turno`, con `quien` y sus `tokens`; una acotación dentro del turno va como `{"aside": …}`. Si el autor no tiene imagen, la tarjeta del autor sale sin ella. Si es de Cummins, `fonetica` con `informante`, `pagina` y `bloques` de tipo `pregunta` o `fon`, copiados de la hoja TEX del aula; sale el conmutador a la transcripción. Si lleva ilustraciones, `imagenes` con `src`, `ancho`, `alto`, `alt` y `pie`, y las imágenes en `img/textos/`.
2. Escribir su `detalle`, sobre la guía de clase, como los que hay.
3. En `fuente/`: `node construir.mjs`.

## Añadir un rasgo

1. Copiar su fichero de rasgo a `fuente/rasgos/` y su página de los apuntes a `fuente/apuntes/`.
2. Marcar en `fuente/catalogo.json` `"mapa": true` y `"pagina": true`.
3. En `fuente/`: `npm install` la primera vez, y después `node construir.mjs`.

## Poner al día el diccionario

1. Traer al contenedor la carpeta DICCIONARIO-NOROESTE-espejo (Claude/Fichas/04-DICCIONARIO) y mirar en _ESPEJO.txt que sea posterior a la última modificación de la hoja.
2. En `fuente/`: `node diccionario.mjs <carpeta del espejo>`. Lee los avisos: siglas formadas por regla, lemas sin testimonios.
3. Publicar como siempre. La web no lee la hoja: se pone al día cuando se vuelve a correr.

El formulario «Envía una palabra» manda a Formspree (formulario mqpejala, cuenta ccruzg04@educarex.es), que lo reenvía por correo. La clave se comprueba en la página contra `datos/claves.json`; Formspree no la comprueba. Se prueba en estremenu.pages.dev.

## Colores

Los del cuerpo del reel: fondo #132e0d, área #85be6d, contacto #3d6a33, recogido #ff914d, en algunos pueblos #b84c1e, probable #ffc4a0. En la web, desde el 18/10/2026, probable #b8652f y en algunos pueblos #70401f, para que probable sea el más intenso de los dos; el reel conserva los suyos hasta el próximo. En las fechas, lo recogido antes de la fecha elegida va en #a95f33.

## Vista en el navegador

Cloudflare Pages, conectado a este repositorio, que sigue privado. Cada subida a `main` vuelve a publicar. Ajustes del proyecto: sin preset de framework; orden de construcción `sh publicar.sh`, que copia a `_site` index.html, datos, img, lib y _headers; directorio de salida `_site`. Así solo se sirve la web: `fuente/` y este LEEME no salen. publicar.sh pone además en el pie la fecha de la publicación, en hora de Madrid, sobre la que lleva index.html (`<time data-fecha>`). `_headers` va sin cabeceras desde el 18/10/2026: los buscadores pueden indexarla (Carlos). Hasta entonces llevaba `X-Robots-Tag: noindex, nofollow`, mientras las notas de los pueblos no estaban en limpio.
