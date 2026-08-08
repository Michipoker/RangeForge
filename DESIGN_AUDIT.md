# Auditoría de diseño visual — RangeForge

> Solo análisis. No se modificó ningún archivo del proyecto. Basado en: lectura completa del CSS (~2.100 líneas), captura de la app renderizada (estado vacío y estado con datos reales), y las pantallas ya recorridas en profundidad durante esta sesión (panel de combos, matriz del botón "R", resultados de equity).

---

## Resumen en una frase

RangeForge tiene un **sistema de diseño real y bien pensado en el papel** ("Warm Stone + Indigo", con variables de color, radios y sombras definidas) — el problema no es que falte diseño, es que **ese sistema no se aplicó de forma pareja**: conviven componentes que lo siguen al pie de la letra con otros que fueron armados con valores sueltos, y el resultado es una app que se siente más "improvisada spot por spot" que "diseñada como un todo".

---

## 1. Jerarquía visual

**Débil en casi toda la app.** El tamaño de letra más grande que usa la interfaz para *contenido* (no para el logo) es 20px, reservado casi únicamente al número de equity. Todo lo demás — títulos de sección, nombres de spot, resultados, etiquetas — se mueve en una banda muy angosta de 9 a 13px. Cuando todo es "casi del mismo tamaño", el ojo no tiene dónde aterrizar primero.

Ejemplo concreto: en el header de la ventana "Agregar combos", el título de la ventana (`.cm-title`) y el contador de manos seleccionadas (`.cm-selected-hand`) compiten por atención similar. En el panel del villano, el resultado de equity (`.cmv-eq-val`, 20px) es la única pieza que realmente destaca — y solo porque nosotros se lo agregamos hace poco; el resto de la app no tiene un equivalente.

## 2. Tipografía

Toda la app usa una sola familia (Inter) — **eso está bien**, no hay mezcla de fuentes. El problema es la escala: conté **19 valores de `font-size` distintos** en el CSS (11px, 10px, 9px, 12px, 9.5px, 20px, 13px, 8px, 10.5px, 7px, 8.5px, 6.8px, 18px, 17px, 16px, 14px, y variantes con/sin espacio antes del `:`). Varios están separados por medio píxel (9.5 vs 10 vs 10.5), lo cual es una señal clásica de que se fue ajustando "a ojo" componente por componente en vez de partir de una escala fija (ej. 10 / 11 / 13 / 16 / 20 / 28).

Los pesos (`font-weight`) sí están mejor controlados: predominan 400 (texto normal), 500-600 (énfasis) y 700 (números importantes) — un uso razonable, solo que sin una escala de tamaño detrás que lo acompañe, el peso solo no alcanza para crear jerarquía clara.

## 3. Espaciado

No hay una escala de espaciado declarada (no existen variables tipo `--gap-sm/md/lg`); cada componente define su propio `padding`/`gap`/`margin` en píxeles sueltos. Esto convive con dos problemas opuestos en la misma app:

- **Demasiado apretado** en las ventanas que fuimos compactando último (el panel del villano, la matriz 13x13).
- **Demasiado suelto** en el estado vacío general de la app (ver punto 16) y en algunos modales grandes (`#modal-img` a 95vw/95vh, `#card-modal` a 98vw con hasta 1600px de ancho) que dejan mucho aire sin usar cuando el contenido real es chico.

## 4. Tamaños

Los tamaños de componentes (botones, inputs, celdas de grilla) también varían bastante entre pantallas que deberían sentirse hermanas. Ejemplo muy concreto: la grilla de manos 13x13 tiene **tres tamaños de celda distintos** en la app hoy — 24px (villano histórico), 26px (botón "R"), y 16px (la que compactamos ahora en "Agregar combos"). Ninguno es "incorrecto" por sí solo, pero al no compartir un tamaño, cada grilla se siente como un componente distinto en lugar de la misma pieza reutilizada.

## 5. Bordes y radios

Existen variables (`--radius-sm: 3px`, `--radius-md: 5px`, `--radius-lg: 8px`), pero **casi la mitad de los usos de `border-radius` en el CSS no pasan por esas variables**: hay `2px`, `3px`, `4px`, `8px`, `10px`, `20px` escritos como números sueltos, algunos casi idénticos a un token existente (2px vs. `--radius-sm`=3px) y otros completamente fuera de la escala (`20px`, usado en `.quick-item` y en algún botón, da un aspecto de "pastilla" que no aparece en ningún otro lado de la app). El resultado: dos elementos que deberían verse "igual de redondeados" a veces no lo están, por 1-2px de diferencia invisible a simple vista pero real en el código.

## 6. Colores

Acá está el hallazgo más importante de toda la auditoría. La paleta declarada (`:root`) es coherente y tiene identidad — grises cálidos, un indigo suave, semánticos claros (verde=hit, rojo=bluff, ámbar=warn). Pero conté **más de 40 colores hexadecimales escritos directamente en el CSS**, por fuera de esas variables, incluyendo:

- Grises genéricos "de sistema" que no son parte de la paleta cálida: `#ccc`, `#aaa`, `#e0e0e0`, `#fff` sueltos — se usan en varios lugares (librería de rangos, subida de imagen, input del botón "R") y **desentonan** al lado de los grises cálidos (`#e2dfd9`, `#a8a29e`) que sí están en la paleta.
- Colores de palo (♦ ♣) con **dos versiones distintas conviviendo**: las mini-cartas (las que a vos te gustan, `--card-d: #93c5fd` / `--card-c: #86efac`, pasteles) contra los encabezados de la matriz de combos (`.suit-d { color: #2563eb }` / `.suit-c { color: #16a34a }`, saturados y brillantes). Es el mismo concepto — "esto es un diamante"/"esto es un trébol" — representado con dos paletas de color diferentes en pantallas que el usuario ve una atrás de la otra.
- El botón "+" amarillo que mencionaste vos mismo (`.add-combo-btn`) usa un ámbar de advertencia (`--warn-bg`, borde `#fcd34d`) para lo que es, semánticamente, una acción neutra de "agregar" — no una advertencia. Por eso se siente "fuera de tono" con el resto: el color le está mintiendo un poco al usuario sobre qué tipo de acción es.
- El botón "primario" de los modales (`.modal-btn.primary`) es **negro/casi-negro** (`--text-primary`), mientras que en otras partes de la app (el botón de calcular equity, las pestañas activas, la matriz de pesos) la acción principal se marca con el indigo de acento. Dos "colores de acción principal" distintos conviviendo en la misma app.

## 7. Contraste

En general el contraste texto/fondo está bien resuelto (texto oscuro `#1c1917` sobre fondos claros, cumple de sobra los mínimos de legibilidad). El punto débil es el **texto "faint"/"muted"** (`--text-faint: #d6d3d1`, `--text-muted: #a8a29e`), usado para bastante información funcional (placeholders, contadores, celdas no seleccionadas de las grillas) — es apenas legible a propósito para no competir visualmente, pero en las grillas de manos (13x13) termina siendo tan tenue que las manos "no seleccionadas" casi desaparecen, lo cual está bien si es intencional, pero no hay un punto intermedio entre "invisible" y "protagonista".

## 8. Botones

Este es el componente con **más fragmentación de todo el sistema**. Conté **15 clases de botón distintas** definidas por separado: `.add-btn`, `.del-btn`, `.add-node-btn`, `.add-card-btn`, `.micro-btn`, `.add-combo-btn`, `.auto-btn`, `.lock-btn`, `.modal-btn`, `.db-btn`, `.cmv-weight-btn`, `.cmv-calc-btn`, `.cm-qbtn`, `.cm-qbtn-danger`, `.lib-del-btn`. Varias de ellas (`.add-node-btn`, `.add-card-btn`, `.micro-btn`, `.auto-btn`) son, en la práctica, la misma idea — "botón pequeño con borde, para una acción secundaria" — con pequeñas diferencias de padding/tamaño/radio que no parecen intencionales, sino el resultado de crearse en momentos distintos del desarrollo sin volver a mirar lo que ya existía.

## 9. Inputs

Razonablemente consistentes en los casos "genéricos" (`.modal-box input[type="text"]` cubre la mayoría), pero con excepciones puntuales: el input de texto del botón "R" (`#rm-input`) tiene su borde escrito como `#e0e0e0` en vez del token `var(--border)`, y `#spot-input` usa 11px de fuente mientras el resto de los inputs de modal usan 12px. Son diferencias chicas, invisibles una por una, pero se notan si se los mira lado a lado.

## 10. Tablas

**Prácticamente no existen como componente.** En las ~2.100 líneas de CSS hay un solo `<table>` real en todo el código (la tabla "EQ por jugada" que armamos en esta última ronda). Todo lo demás que *es* conceptualmente una tabla — listas de combos, resultados, la librería de rangos — está armado a mano con `<div>` alineados por `flex`, cada uno con su propia lógica de columnas/alineación. Esto explica por qué cosas que deberían alinearse prolijamente (nombre a la izquierda, número a la derecha) a veces no comparten ni el ancho de columna ni el tipo de alineación entre una lista y otra.

## 11. Paneles / modales

Hay **seis tamaños de modal distintos**, cada uno definido por separado (380px por defecto; 700px para el botón "R"; 98vw/1600px para "Agregar combos"; 95vw/95vh para subir imagen; 30vw para la nota general; uno más para elegir carta). No hay un sistema de "tamaños de modal" (chico/mediano/grande) — cada ventana nueva parece haber elegido su tamaño según lo que necesitaba en ese momento, sin mirar a las demás.

## 12. Rangos de poker (las grillas 13x13)

Es, con diferencia, **la parte más lograda visualmente de la app** — el concepto de pintar con pesos y colores pastel (`getColorForWeight`) es simple, se entiende de un vistazo, y es coherente con la identidad "Warm Stone". El problema no es el concepto, es que **existe implementado tres veces con tres tamaños de celda distintos** (ver punto 4) en vez de ser un solo componente reutilizado.

## 13. Resultados de equity

Es la sección con **más trabajo de diseño reciente** (la que armamos juntos en las últimas rondas) y se nota: tiene jerarquía clara, usa las mini-cartas que ya te gustaban, tiene buckets con barras. Es, junto con las grillas de rango, de lo mejor de la app hoy. El desafío es que el resto de la interfaz todavía no está al mismo nivel de cuidado — hace que esta sección se sienta como una "isla" más pulida dentro de una app más despareja.

## 14. Estados hover / active / selected

Es, sorprendentemente, **una de las partes más consistentes del sistema** — casi todos los `:hover` siguen el mismo patrón (fondo `--bg-hover`, borde que se oscurece un tono, texto que pasa de `muted` a `primary`), y los estados activos/seleccionados casi siempre usan `--accent-light` + `--accent`. Esto es una base sólida para construir el resto del sistema encima.

## 15. Navegación

La navegación es enteramente por la barra lateral (spots → texturas) más un breadcrumb de texto simple arriba del workspace. Es funcional pero minimalista al punto de no dar casi ninguna pista visual de "dónde estoy" más allá del texto — no hay indicador de progreso (preflop → flop → turn → river), por ejemplo, algo que en una herramienta de este tipo (donde el usuario navega mentalmente por calles de una mano) podría aportar mucho.

## 16. Densidad de información

Acá conviven **dos extremos**. Las ventanas de trabajo (Agregar combos, botón R) están, después de esta última ronda, bastante densas y compactas. Pero el **estado vacío de la app** (sin ningún spot creado, o sin textura seleccionada) es casi enteramente blanco: un sidebar angosto y una superficie gigante vacía con un texto tenue centrado ("SELECCIONA UNA TEXTURA") como único contenido. No hay ilustración, no hay guía, no hay nada que le dé personalidad a ese momento — es el primer vistazo que tiene cualquier usuario nuevo, y hoy es el momento más "genérico" de toda la app.

## 17. Consistencia entre componentes

Es el eje que atraviesa todos los puntos anteriores: **el sistema de diseño existe, pero se respeta de forma parcial.** Los componentes construidos o retocados recientemente (equity, matriz de villano) siguen la paleta y las variables casi al pie de la letra. Los componentes más antiguos (librería de rangos, botón "+" amarillo, subida de imagen, algunos botones chicos) tienen colores y tamaños que se escaparon del sistema en algún momento y nunca se corrigieron.

---

## Síntesis

### Elementos que ya se ven bien
- La paleta base "Warm Stone + Indigo" en sí misma — es una identidad real, no un tema genérico de librería.
- Las mini-cartas de color (`--card-h/d/c/s`) — es el elemento con más personalidad propia de toda la app.
- Las grillas de rango con pesos pastel — el concepto visual es claro y agradable.
- Los estados hover/active — consistentes en casi toda la app.
- La sección de resultados de equity (trabajada en las últimas rondas).

### Elementos que se ven genéricos
- Los botones pequeños de utilidad (`.micro-btn`, `.auto-btn`, `.add-node-btn`, etc.) — indistinguibles de cualquier panel de admin genérico.
- El estado vacío de la app (sidebar + gran vacío blanco).
- Los `<div>` haciendo de tabla sin ningún tratamiento visual — se sienten "sin terminar".

### Elementos que se ven anticuados
- Los colores de palo saturados (`.suit-d`/`.suit-c`, azul y verde brillantes) al lado de las mini-cartas pasteles — el contraste de estilo entre ambos hace que uno de los dos parezca "de una versión anterior" de la app (literalmente lo es).
- Los grises genéricos sueltos (`#ccc`, `#aaa`, `#e0e0e0`) en la librería de rangos y el subidor de imagen — texturas visuales de UI por defecto de hace años.
- El botón "primario" negro de los modales (`.modal-btn.primary`) — un lenguaje de "botón oscuro" que no aparece en ningún otro lado de la app.

### Dónde falta jerarquía
- Los headers de sección en casi todas las ventanas (mismo tamaño/peso que el contenido de abajo).
- El breadcrumb de navegación superior (spot → textura), que no distingue visualmente "dónde estoy parado".
- La lista de spots en el sidebar, donde spot y textura tienen pesos de letra muy similares.

### Dónde hay demasiado ruido
- No mucho, en realidad — si algo, la app tiende más al extremo opuesto (ver siguiente punto). El único ruido real es la mezcla involuntaria de colores fuera de paleta (punto 6), que genera "ruido visual" no por exceso de elementos sino por falta de coherencia entre ellos.

### Dónde hay demasiado espacio
- El estado vacío general de la app (el más urgente).
- Los modales grandes (`#card-modal` a 98vw, `#modal-img` a 95vw) cuando el contenido real que muestran es chico.

### Dónde la interfaz podría tener más personalidad
- El estado vacío / de bienvenida.
- El sistema de navegación (podría reflejar visualmente el concepto de "calles" — preflop/flop/turn/river — que es el corazón mental de cómo un jugador de poker piensa una mano).
- Los botones — hoy son funcionales pero anónimos; ninguno "se siente" RangeForge.

### Componentes que deberían convertirse en un sistema visual consistente (candidatos prioritarios)
1. **Botones** — unificar las 15 variantes en 3-4 roles reales (primario, secundario, peligro, ícono/utility), todos construidos sobre los mismos tokens.
2. **Grillas de rango 13x13** — un solo componente reutilizado (tamaño, colores, interacción) en vez de tres implementaciones paralelas.
3. **Colores de palo** — decidir una sola representación (probablemente la pastel, ya que es la que más te gusta) y aplicarla en todos los lugares donde hoy aparece un palo.
4. **Tamaños de modal** — dos o tres tamaños estándar (chico/mediano/grande) en vez de seis medidas ad-hoc.
5. **Escala tipográfica** — reducir de 19 tamaños sueltos a una escala fija de 5-6 pasos.

---

## Nota metodológica

Durante esta auditoría, al intentar cargar un tercer estado de la app con datos de prueba (para capturar el flujo completo de equity con varias jugadas activas), la pestaña del navegador quedó completamente sin responder — ni siquiera comandos triviales de JavaScript se ejecutaban. No llegué a determinar la causa exacta (podría ser un problema puntual de la herramienta de vista previa, o un caso límite real del cálculo con esa combinación específica de datos). Lo marco acá como algo a tener en cuenta, no lo investigué a fondo porque el pedido explícito de esta tarea era **no tocar código** — si querés, lo reviso en una sesión aparte donde sí esté habilitado a modificar archivos.
