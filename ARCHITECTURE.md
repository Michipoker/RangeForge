# Arquitectura de RangeForge (mapa para no-desarrolladores)

> Este documento es solo un análisis. No se modificó ni se movió ningún archivo del proyecto para crearlo.

---

## 1. Resumen en una frase

**RangeForge es una única página web (`index.html`) que contiene todo el HTML, todo el diseño (CSS) y todo el código (JavaScript) en un solo archivo.** No usa un framework como React o Vue, y no tiene un proceso de "build" (compilación) como Vite o Webpack. Se abre directamente en el navegador.

---

## 2. Respuestas directas a tus preguntas

### 1. ¿Qué framework utiliza actualmente el proyecto?

**Ninguno.** Es HTML + CSS + JavaScript "puro" (llamado _vanilla JS_), escrito a mano dentro de un solo archivo. No hay React, Vue, Angular, ni ninguna librería de interfaz.

### 2. ¿Qué sistema de build utiliza (Vite, Webpack, etc.)?

**Ninguno.** No existe `package.json` en la raíz del proyecto, ni configuración de Vite/Webpack/Parcel. El único `node_modules` que existe pertenece a **Playwright** (una herramienta de testing/automatización de navegador), no a un sistema de build de la app.

### 3. ¿Cuál es el punto de entrada principal de la aplicación?

[index.html](index.html) — es el único archivo que hay que abrir. Todo vive ahí dentro:

- Líneas 1–11: cabecera HTML (título, fuente de letra "Inter", ícono de pestaña).
- Líneas 12–2127: todo el CSS (diseño visual) dentro de una etiqueta `<style>`.
- Líneas 2128–2677: todo el HTML visible (botones, paneles, modales).
- Líneas 2678–7621: un bloque `<script>` gigante con TODA la lógica de la aplicación (~5.000 líneas).
- Líneas 7623–7913: un segundo bloque de inicialización y el motor de cálculo de equity en WebAssembly (WASM).

### 4. ¿Dónde está el código de la interfaz gráfica (UI)?

Dentro del mismo [index.html](index.html):

- El **diseño visual** (colores, tamaños, layout) está en el bloque `<style>` (líneas 12–2127).
- La **estructura de pantalla** (botones, tarjetas, modales/ventanas emergentes) está en el HTML del `<body>` (líneas 2128–2677).
- El **comportamiento** de esa interfaz (qué pasa al hacer clic, cómo se pintan las cuadrículas de manos, etc.) está mezclado dentro del gran `<script>` (a partir de la línea 2678), en funciones como `renderRangeGrid()`, `cmRenderGrid()`, `cmRenderMatrix()`, `renderCombosUI()`, etc.

### 5. ¿Dónde está la lógica relacionada con rangos y estrategias?

También dentro del mismo `<script>` grande, mezclada con la UI (no está separada en otro archivo). Algunas zonas clave:

- Definición y edición de rangos preflop tipo "Flopzilla": funciones `parseRangeInput()`, `processRangeTokens()`, `generateRangeString()`, `renderRangeGrid()` (desde línea ~3136).
- Guardado de "spots" (situaciones de juego) y librería de rangos: `addSpot()`, `renderLibrary()`, `addRangeToLibrary()`, `loadLibraryRange()` (desde línea ~3022).
- Clasificación de manos por categoría de mano (sets, proyectos, top pair, etc.) según el board: `bestCategory()`, `classifyBoard()`, `detectFlushDraw()`, `detectStraightDraw()` (desde línea ~5524).
- Panel del "rango del rival" (villano) y su distribución de equity: funciones con prefijo `cmv...` (`cmvInit`, `cmvRenderGrid`, `cmvParseRangeText`, `cmvClassifyVillainRange`, `cmvCalculate`, desde línea ~7248). Esta parte corresponde al commit reciente "implementacion rango del rival".

### 6. ¿Dónde está implementado el cálculo de equity?

Hay **dos motores de equity**, ambos dentro de [index.html](index.html):

1. **Motor en JavaScript puro** (funciones `eq...`, líneas ~4661–5480): evalúa manos de póker y calcula equity por simulación/combinatoria directamente en JavaScript. Es el motor de respaldo (_fallback_).
2. **Motor en WebAssembly (WASM)**: un cálculo mucho más rápido, escrito originalmente en Rust y compilado a WASM, que se carga e inicializa al final del archivo (línea ~7638 en adelante, función `initEqWasm()`).

La función `cmvCalculate()` (línea ~7508) es la que decide: intenta usar el motor WASM si está listo (`window.EqWasm.ready`), y si falla o no está disponible, usa el motor JavaScript como respaldo automático.

### 7. ¿Dónde se encuentra el código WASM?

En la carpeta [wasm/](wasm/), archivo [wasm/eq_mc_data.js](wasm/eq_mc_data.js). Este archivo **no contiene código legible**: es un archivo binario WASM codificado como texto (Base64) dentro de una variable JavaScript (`EQ_WASM_B64`). El script final de `index.html` (línea ~7638) decodifica ese texto, lo convierte de nuevo en un módulo WASM ejecutable y lo conecta a la app como `window.EqWasm`.

El motor original se llama **`@cloviz/eq-mc`**, una librería de cálculo de equity de póker para Texas Hold'em, compilada a WebAssembly (ver más abajo, sección de librerías externas).

### 8. ¿Se están utilizando Web Workers? Si es así, ¿para qué?

**No.** No se encontró ninguna referencia a `new Worker(...)` en el código. Todo el cálculo (JavaScript o WASM) se ejecuta en el mismo hilo principal del navegador. Por eso, al pulsar "Calcular equity", el código usa un pequeño truco (`setTimeout(..., 30)`, línea ~7537) para dejar que la interfaz pinte el mensaje "Calculando equity..." antes de bloquear el hilo con el cálculo.

### 9. ¿Existe todavía código Java relacionado con el cálculo? ¿Dónde?

**No se encontró ningún archivo `.java` ni referencia a Java/Applet en todo el proyecto.** El motor de cálculo "pesado" es WebAssembly (compilado desde Rust, no desde Java).

### 10. ¿Qué sucede exactamente desde que el usuario pulsa "Calcular Equity" hasta que aparece el resultado?

Paso a paso (todo ocurre dentro de la función `cmvCalculate()`, [index.html:7508](index.html:7508)):

1. El botón "Calcular equity" del panel del rival dispara `cmvCalculate()`.
2. Se valida que exista un rango de rival seleccionado y que tu jugada tenga combos guardados. Si falta algo, se muestra un aviso y se detiene.
3. Se desactiva el botón y se muestra el texto "Calculando equity...".
4. Tras una pequeña pausa (30 milisegundos, solo para que la interfaz se actualice visualmente):
   a. Se calculan las cartas "muertas" (las que ya están en el board o en tu mano) y se expande el rango del rival a la lista real de combinaciones posibles.
   b. Se calcula el % de equity de tu(s) combo(s) contra el rango completo del rival (`eqComboListVsRange`).
   c. Se calcula la distribución de equity del rival (en qué % de manos el rival tiene mucha o poca equity): primero se intenta con el motor **WASM** (`wasmVillainBuckets`); si falla, se recurre automáticamente al motor **JavaScript** (`eqVillainBuckets`).
5. Se genera el HTML de resultado: el número de equity, cuántos combos se evaluaron, y una barra por cada "bucket" (rango porcentual) de equity del rival.
6. Ese HTML se inyecta en pantalla (`cmv-results`) y el botón se vuelve a activar.
7. Si algo falla en el camino, se captura el error y se muestra un mensaje en pantalla en vez de romper la aplicación.

---

## 3. Diagrama de la arquitectura real

```
Usuario
   │  (abre index.html en el navegador, sin servidor ni build)
   ▼
Interfaz (HTML + CSS embebidos en index.html)
   │  botones, cuadrícula de manos, paneles, modales
   ▼
Lógica de RangeForge (JavaScript embebido en index.html)
   │  rangos preflop, librería de spots, clasificación de manos
   │  por board (sets, proyectos, etc.), panel de rango del rival
   ▼
Cálculo de Equity (dentro del mismo JavaScript)
   │
   ├──► Intenta primero: Motor WASM (wasm/eq_mc_data.js → @cloviz/eq-mc)
   │        rápido, compilado desde Rust
   │
   └──► Si falla o no cargó: Motor JavaScript puro (funciones eq...)
            más lento, pero siempre disponible como respaldo
   ▼
Resultado (equity %, distribución por buckets)
   ▼
Interfaz (se pinta el resultado en el panel de resultados)
```

No hay servidor backend, ni base de datos externa: el guardado de tus rangos y spots se hace con **`localStorage`** del navegador (una memoria local del propio navegador, ligada a ese equipo/perfil).

---

## 4. Archivos de código fuente más importantes

| Archivo                                  | Para qué sirve (una frase)                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [index.html](index.html)                 | La aplicación completa: interfaz, lógica de rangos/estrategia y cálculo de equity, todo en un solo archivo.            |
| [wasm/eq_mc_data.js](wasm/eq_mc_data.js) | Contiene el motor de cálculo de equity en WebAssembly, codificado en texto (Base64), que `index.html` carga y ejecuta. |

Todo lo demás en la raíz son **recursos** (imágenes/logos), **copias de seguridad** o **archivos sueltos no conectados** a la app (ver secciones 6 y 7).

---

## 5. Archivos que NO deberías editar a mano

| Archivo/Carpeta                          | Motivo                                                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [wasm/eq_mc_data.js](wasm/eq_mc_data.js) | Es un binario WASM codificado en texto; no es código legible ni editable a mano, se generó automáticamente al empaquetar la librería `@cloviz/eq-mc`.    |
| [wasm_tmp_check/](wasm_tmp_check/)       | Parece una carpeta temporal donde se descargó/descomprimió el paquete `@cloviz/eq-mc-0.1.7.tgz` para inspeccionarlo. No es parte de la app en ejecución. |
| [node_modules/](node_modules/)           | Carpeta de dependencias instaladas automáticamente por un gestor de paquetes (npm). Nunca se edita a mano; si se borra, se puede regenerar reinstalando. |
| `node_modules/.package-lock.json`        | Generado automáticamente por npm para fijar versiones exactas de dependencias.                                                                           |

---

## 6. Librerías y paquetes externos utilizados

| Librería                            | Para qué sirve                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@cloviz/eq-mc`** (v0.1.7)        | Motor de cálculo de equity de póker (Texas Hold'em) compilado a WebAssembly. Es el "cerebro" que hace los cálculos de probabilidad rápidos. Está embebido dentro de [wasm/eq_mc_data.js](wasm/eq_mc_data.js).                                                                                                               |
| **Google Fonts "Inter"**            | Solo aporta la tipografía (letra) que se ve en toda la interfaz. Se carga desde internet (`fonts.googleapis.com`), no es código de la app.                                                                                                                                                                                  |
| **Playwright** (en `node_modules/`) | Herramienta de automatización/testing de navegador. NO forma parte de la aplicación en sí; solo está instalada como utilidad de desarrollo (por ejemplo, para probar la app automáticamente). No hay evidencia de tests escritos actualmente que la usen (NO DETERMINADO con certeza si hay scripts de test en otro lugar). |

No se usan React, Vue, jQuery, Bootstrap, Tailwind ni ninguna otra librería de UI: todo el CSS y el JavaScript de interfaz están escritos a mano.

---

## 7. ¿Cómo se ejecuta RangeForge en desarrollo actualmente?

**NO DETERMINADO con un método único y oficial**, porque no hay ningún script de arranque (`package.json`, `npm run dev`, etc.). Por la naturaleza del proyecto (un solo archivo HTML sin dependencias de build), lo más probable es que se use así:

- Abrir directamente [index.html](index.html) con doble clic en el navegador, o
- Servirlo con un servidor local simple (por ejemplo, la extensión "Live Server" de un editor de código), útil sobre todo para evitar restricciones del navegador al cargar el archivo `wasm/eq_mc_data.js`.

No hay un comando de "modo desarrollo" con recarga automática configurado en el proyecto.

## 8. ¿Cómo se genera la versión de producción/build?

**No existe un proceso de build.** No hay Vite, Webpack, ni ningún script de "compilar" o "empaquetar". El archivo [index.html](index.html) que está en el repositorio **es literalmente el mismo archivo que se usaría en producción** (por ejemplo, subiéndolo tal cual a un hosting de archivos estáticos). "Desarrollar" y "publicar" son, hoy, el mismo archivo.

---

## 9. Archivos/carpetas absolutamente esenciales para que RangeForge funcione

- [index.html](index.html) — imprescindible, es toda la aplicación.
- [wasm/eq_mc_data.js](wasm/eq_mc_data.js) — imprescindible para el motor de equity rápido (WASM). Si faltara, la app seguiría funcionando pero usando solo el motor JavaScript de respaldo, más lento.
- [RangForge logo SVG.svg](RangForge%20logo%20SVG.svg) y [RF logo (only square).png](RF%20logo%20%28only%20square%29.png) — usados como logo e ícono de pestaña del navegador (referenciados directamente en `index.html`).
- La fuente "Inter" se carga desde internet (Google Fonts): si no hay conexión, la app funciona igual pero con una tipografía distinta por defecto.

Todo lo demás (backups, copias, archivos sueltos) **no es necesario** para que la app funcione.

---

## 10. Archivos/carpetas que parecen antiguos, duplicados, temporales o de versiones anteriores

| Archivo/Carpeta                                                                                   | Por qué parece obsoleto/duplicado                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [index-Backup.html](index-Backup.html)                                                            | Copia antigua completa de la app (31/07), no referenciada desde `index.html`.                                                                                                                                                               |
| [index-galeria.html](index-galeria.html) y [index-galeria-backup.html](index-galeria-backup.html) | Versión alternativa/experimental ("galería") y su respaldo; según el historial de git corresponden a una rama de trabajo separada ("versión galería") que en algún punto se probó por separado. No están conectadas al `index.html` actual. |
| [index-Weight.html](index-Weight.html)                                                            | Copia antigua relacionada con una funcionalidad de "pesos" de combos (según los mensajes de commit "Intentando incluir pesos en la app"), ya integrada o descartada en la versión actual.                                                   |
| [Backups/](Backups/)                                                                              | Carpeta con archivos `.json` — parecen ser **exportaciones de datos guardados de la app** (rangos/spots), no código. Corresponden a la función `exportData()` de `index.html`.                                                              |
| [Respaldos/](Respaldos/)                                                                          | Carpeta con archivos `.txt` con fecha en el nombre — parecen copias de seguridad manuales hechas por el propio usuario en distintos momentos, probablemente pegando texto o exportaciones.                                                  |
| [wasm_tmp_check/](wasm_tmp_check/)                                                                | Carpeta temporal de verificación del paquete `@cloviz/eq-mc` (contiene el `.tgz` descargado y su contenido descomprimido). Nombre indica explícitamente que es temporal.                                                                    |
| [wozniak-method.html](wozniak-method.html)                                                        | Una **aplicación totalmente distinta** (un sistema de repaso espaciado tipo "Wozniak method"), no relacionada con el cálculo de equity ni referenciada desde `index.html`. Probablemente vive en esta carpeta solo por conveniencia.        |
| [matriz_rango_raise_call_fold.txt](matriz_rango_raise_call_fold.txt)                              | Fragmento HTML/CSS suelto (una matriz de 13x13 coloreada) que no está enlazado desde `index.html`; parece un export o prueba puntual.                                                                                                       |
| [Interfaz Panel Combos.svg](Interfaz%20Panel%20Combos.svg)                                        | Archivo de diseño (probablemente un mockup/boceto de interfaz), no es código ni se carga desde la app.                                                                                                                                      |
| [RF Logo by Prysm.svg](RF%20Logo%20by%20Prysm.svg), [RF Logo.png](RF%20Logo.png)                  | Variantes de logo no referenciadas actualmente en `index.html` (el logo activo es `RangForge logo SVG.svg`). NO DETERMINADO si se usan en otro lugar fuera del código (por ejemplo, redes sociales).                                        |

---

## 11. Notas y cosas marcadas como "NO DETERMINADO"

- **NO DETERMINADO**: si existe algún script de test automatizado que use Playwright (no se encontró carpeta `tests/` ni configuración `playwright.config.*` en la raíz al momento de este análisis).
- **NO DETERMINADO**: el método exacto y "oficial" que usa el usuario para ver sus cambios mientras desarrolla (doble clic, Live Server, u otro), ya que no hay ningún script ni documentación que lo indique.
- **NO DETERMINADO**: si `RF Logo by Prysm.svg`, `RF Logo.png` y `Interfaz Panel Combos.svg` se usan fuera del código (diseño, redes, documentación externa).

---

## 12. Resumen ejecutivo (por si solo lees esta sección)

- RangeForge es **un solo archivo HTML gigante**, sin framework ni sistema de build: se abre y ya está.
- Tiene **dos motores de cálculo de equity**: uno rápido en WebAssembly (basado en Rust, cargado desde `wasm/eq_mc_data.js`) y uno de respaldo en JavaScript puro, por si el primero falla.
- No usa Web Workers ni tiene código Java.
- Los datos del usuario (rangos, spots guardados) viven en el `localStorage` del navegador, no en una base de datos.
- El proyecto tiene **varios archivos sueltos que son copias de seguridad o versiones anteriores** (`index-Backup.html`, `index-galeria*.html`, `index-Weight.html`, carpetas `Backups/` y `Respaldos/`) que no forman parte de la app activa y podrían archivarse aparte para simplificar la carpeta raíz, si en algún momento se decide hacerlo (esta es solo una observación, no una recomendación de acción inmediata).
