# Taller de estremeñu · web

Web del Taller de estremeñu del CEPA Coria, curso 2026-2027. Versión de trabajo, sin difundir: el repositorio es privado y la web no está publicada.

## Partes

- **index.html** — la web entera: portada y secciones El contenido del taller, Rasgos, Textos y Diccionario; la página de cada apartado de los apuntes, la de cada rasgo (con mapa interactivo en three.js cuando lo tiene) y la de cada texto leído en el taller. Se navega con la almohadilla de la dirección: `#apuntes-4`, `#rasgos`, `#V01`, `#TEX-02`.
- **datos/** — lo que lee la web. Lo escribe `fuente/construir.mjs`; no se toca a mano.
  - `base.json`: los términos municipales de Extremadura y de las cinco comarcas salmantinas, con su comarca y si son del área del taller, y las provincias vecinas y Portugal.
  - `rasgos.json`: la lista de los treinta y un rasgos de los apuntes del alumnado, con cuáles tienen mapa.
  - `rasgos/<código>.json`: la página del rasgo en los apuntes y, si tiene mapa, el fichero del rasgo del generador de reels y la clase de cada término.
  - `textos.json`: los textos leídos en el taller.
  - `apuntes.json`: los apartados de los apuntes del alumnado, de «Antes de empezar» al 7, con el sitio de cada mapa.
- **img/** — el logo del centro, todo en blanco para la banda naranja de arriba, y en `mapas/` los mapas de los apuntes en WebP de 1600 px, sacados de los PNG de la carpeta Mapas de Drive.
- **fuente/** — lo que se escribe a mano para cada rasgo y el programa que prepara los datos:
  - `rasgos/<código>.json`: el mismo fichero del rasgo que usa el generador de reels (reel-rasgo.zip). Un rasgo nuevo sirve para el reel y para la web.
  - `apuntes/<código>.json`: el texto de la página del rasgo en los apuntes del alumnado y los ejemplos de la cabecera.
  - `apuntes/apartados.json`: el texto de los apartados de los apuntes del alumnado, por párrafos, con los arranques en negrita y los mapas.
  - `catalogo.json`: los títulos de las páginas de rasgo de los apuntes y qué rasgos tienen mapa y página.
  - `textos/TEX-NN.json`: cada texto leído en el taller, con la fecha de la pestaña Sesiones de la app, sus rasgos destacados, las palabras marcadas con el código de su rasgo y el glosario. Salen del texto marcado de la guía de clase (guia-clase-pdf.zip).
  - `comarcas.json`: las comarcas REDEX y el área del taller, la del generador de reels.

## Añadir un texto

1. Escribir `fuente/textos/TEX-NN.json` como los que hay: `bloques` de tipo `verso`, `linea`, `pregunta` o `corte`, y en cada línea `tokens`, con `{"t": …}` para el texto corrido y `{"w": palabra, "r": [códigos]}` para las palabras marcadas.
2. En `fuente/`: `node construir.mjs`.

## Añadir un rasgo

1. Copiar su fichero de rasgo a `fuente/rasgos/` y su página de los apuntes a `fuente/apuntes/`.
2. Marcar en `fuente/catalogo.json` `"mapa": true` y `"pagina": true`.
3. En `fuente/`: `npm install` la primera vez, y después `node construir.mjs`.

## Colores

Los del cuerpo del reel: fondo #132e0d, área #85be6d, contacto #3d6a33, recogido #ff914d, en algunos pueblos #b84c1e, probable #ffc4a0. En las fechas, lo recogido antes de la fecha elegida va en #a95f33.
