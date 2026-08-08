# Auditoría técnica del motor de equity — RangeForge

> Este informe es solo un análisis. No se modificó, refactorizó ni eliminó ningún archivo del proyecto. Las pruebas de rendimiento se hicieron llamando a las funciones que YA existen en `index.html`, abriendo el archivo en un navegador y midiendo tiempos reales — sin tocar el código fuente.

**Entorno donde se midió el rendimiento** (importante para interpretar los números, ver sección 8):
Navegador Chromium 148 (basado en Electron), 12 núcleos de CPU, 16 GB de RAM. Esto es una máquina potente. Un usuario final con un portátil de gama media o un móvil probablemente vería tiempos más altos que los reportados aquí.

---

## 1. ¿Qué algoritmo se utiliza actualmente para calcular equity?

RangeForge usa un **evaluador de manos propio, escrito a mano** (no una librería de terceros) para decidir quién gana una mano de póker dado un conjunto de 5 a 7 cartas (función `eqEvaluateFast`, [index.html:4692](index.html:4692)). Este evaluador es rápido: usa números enteros y "bitmasks" (trucos a nivel de bits) en vez de comparar texto o crear muchos objetos, que es la forma lenta de hacerlo.

Sobre ese evaluador, se construye la lógica de equity de dos maneras distintas, según si el cálculo lo hace JavaScript o WASM (ver punto 2).

## 2. ¿Enumeración exacta, Monte Carlo, combinación de ambos, u otro método?

**Es un sistema combinado (híbrido), y funciona distinto según el motor:**

### Motor JavaScript (el que siempre corre, función `eqCoreBatch`, [index.html:4950](index.html:4950))
- Si faltan 0 cartas por repartir (ya estás en el río): comparación directa, no hace falta ni exacto ni Monte Carlo.
- Si faltan 1 o 2 cartas por repartir (estás en el turn o el flop) **y** el volumen de trabajo estimado es manejable (por debajo de 300.000 "evaluaciones"): usa **enumeración exacta** — revisa TODAS las combinaciones posibles de cartas restantes, sin excepción. Es el resultado matemáticamente perfecto.
- Si el volumen estimado supera ese umbral (rangos anchos, o estás en preflop con las 5 cartas del board por repartir): cambia automáticamente a **Monte Carlo** — en vez de revisar todas las combinaciones, toma una muestra aleatoria (3.000 repeticiones en turn/flop, 500 en preflop) y estima el resultado. Es una aproximación, no un resultado exacto, pero con esa cantidad de muestras el margen de error es pequeño para uso práctico.

### Motor WASM (WebAssembly, función externa `calculate_range_equity`)
Este motor (que **no** fue escrito por ustedes, es una librería externa — ver [ARCHITECTURE.md](ARCHITECTURE.md) sección 6) es **siempre Monte Carlo**: se le pide un número fijo de simulaciones (`EQ_WASM_TRIALS = 15000`, [index.html:5368](index.html:5368)) y no tiene modo de "enumeración exacta" en la función que RangeForge usa (`calculate_range_equity`). Sí existe una función `calculate_combo_equity_exact` en esa librería, pero **no se usa en ningún lugar del código actual**.

**Resumen simple:** hay dos "cerebros" de cálculo. El de JavaScript decide por sí mismo si conviene ser exacto o aproximado según cuánto trabajo hay que hacer. El de WASM siempre es aproximado (Monte Carlo con 15.000 simulaciones), pero por diseño de la librería externa, no por elección explícita en el código de RangeForge.

## 3. Flujo completo: desde que el usuario pulsa "Calcular Equity" hasta que aparece el resultado

Diagrama adaptado a lo que realmente ocurre (no hay Java ni Worker en ningún punto):

```
Usuario
  │  pulsa el botón "Calcular equity"
  ▼
Interfaz (botón dispara la función cmvCalculate())
  │
  ▼
Función de cálculo — cmvCalculate()  [index.html:7508]
  │  valida que haya rango de rival y combos guardados
  │  muestra "Calculando equity..." y espera 30 milisegundos
  │  (ese pequeño respiro es SOLO para que el mensaje se pinte en
  │   pantalla antes de que el navegador se bloquee calculando)
  ▼
Parser de rangos — eqExpandRange()  [index.html:4899]
  │  convierte el rango del rival (ej. "AA, KK, AKs") en la lista
  │  real de combinaciones de cartas concretas
  ▼
        ┌─────────────────────────────────────────────┐
        │  DOS cálculos distintos ocurren aquí:        │
        └─────────────────────────────────────────────┘
  │
  ├──► (A) Número principal de equity — eqComboListVsRange()
  │        SIEMPRE en JavaScript puro (motor "exacto o Monte Carlo
  │        automático" descrito en el punto 2). WASM NUNCA
  │        interviene en este número.
  │
  └──► (B) Distribución de equity del rival (las barras por %)
           │
           ├─ Intenta primero: WASM — wasmVillainBuckets()
           │    Si window.EqWasm.ready es true, llama al motor
           │    WebAssembly UNA VEZ POR CADA combo del rango rival
           │
           └─ Si falla o no está listo: JavaScript — eqVillainBuckets()
                usa el mismo motor JS del punto (A), como respaldo
  │
  ▼
Resultado
  │  se arma el HTML con el % de equity y las barras de distribución
  ▼
Interfaz
  se inyecta ese HTML en pantalla, se reactiva el botón
```

**No existe ningún Web Worker en ningún punto de este flujo.** Todo ocurre en el mismo hilo principal del navegador (el mismo hilo que dibuja botones, anima cosas y responde a clics).

## 4. ¿Dónde se ejecuta actualmente el cálculo?

**Combinación de JavaScript y WASM, siempre en el navegador del propio usuario, nunca en un servidor:**

| Parte del cálculo | Dónde se ejecuta |
|---|---|
| Evaluar quién gana una mano dada | JavaScript (función interna) o dentro del binario WASM (motor externo), según cuál de los dos flujos esté activo |
| Número principal "Equity vs Rango Villano" | **Siempre JavaScript**, en el hilo principal |
| Distribución de equity del rival (barras) | **WASM si está disponible**, si no, JavaScript — ambos en el hilo principal |
| Servidor | **No existe.** No hay ninguna llamada de red para calcular equity |
| Java | No existe en absoluto (ver punto 6) |
| Web Worker | No existe (ver punto 7) |

## 5. ¿El código WASM está realmente siendo utilizado en el flujo actual?

**Sí, se usa activamente — pero solo para una parte del cálculo, no para todo.**

Confirmado en vivo: al abrir `index.html` en el navegador, `window.EqWasm.ready` es `true` y el motor WASM efectivamente calcula resultados cuando se le llama.

Aclaración importante que no es obvia mirando solo la interfaz: **el número grande de "Equity vs Rango Villano" que ve el usuario NUNCA pasa por WASM.** Ese número siempre se calcula en JavaScript. Solo la sección de abajo ("Distribución de equity del Villano", las barras por rango de porcentaje) intenta usar WASM primero, y si falla, cae a JavaScript automáticamente sin avisar al usuario (solo deja un aviso en la consola técnica del navegador, invisible para el usuario normal).

## 6. ¿Existe código Java relacionado con el cálculo?

**No.** No se encontró ningún archivo `.java`, ni ninguna referencia a Java o a un "applet" en ningún archivo del proyecto. El motor "pesado" no es Java: es un binario WebAssembly compilado desde **Rust** (ver `wasm_tmp_check/package/package.json`, que identifica la librería como `@cloviz/eq-mc`, "Poker equity calculator compiled to WebAssembly"). No hay nada de Java que limpiar, migrar ni mantener.

## 7. ¿Se utilizan Web Workers?

**No, no se usa ningún Web Worker en todo el proyecto.** Se buscó explícitamente `new Worker(...)` en el código y no aparece ni una sola vez.

Consecuencia directa: **el cálculo pesado SÍ bloquea la interfaz.** Mientras se está calculando (ya sea en JavaScript o en WASM), el usuario no puede interactuar con nada más en la página — ni scrollear, ni hacer clic en otro botón, ni ver animaciones — porque todo corre en el mismo hilo que dibuja la pantalla. El único paliativo que tiene el código es un `setTimeout` de 30 milisegundos antes de empezar a calcular (línea 7537), que solo sirve para que alcance a pintarse el mensaje "Calculando equity..." antes de que el navegador se congele durante el cálculo real.

## 8. Rendimiento actual (mediciones reales)

Se realizaron pruebas reales ejecutando las funciones existentes de `index.html` en un navegador, usando rangos de póker de tamaño creciente:

- **Rango angosto ("tight")**: AA, KK, QQ, JJ, AKs, AKo → 40 combinaciones
- **Rango medio ("medium")**: pares 22-AA + conectores/broadways suited + AK/AQ/AJ/KQ offsuit → 178 combinaciones (~13% de las manos posibles)
- **Rango amplio ("wide")**: el medio + más manos suited y offsuit → 354 combinaciones (~27% de las manos posibles)

Board de ejemplo usado: flop `2h 7d 9s` (y variantes en turn/river/preflop donde se indica).

### 8.1 Una mano contra una mano (river, las 5 cartas del board ya están puestas)

| Escenario | Tiempo |
|---|---|
| AA vs KK específicas, board completo | **0.06 ms** (prácticamente instantáneo) |

### 8.2 Una mano contra un rango (motor JavaScript — el que da el número principal)

| Escenario | Combos rival | Calle | Tiempo |
|---|---|---|---|
| Mano vs rango tight | 40 | Flop | 13 ms |
| Mano vs rango medium | 178 | Flop | 53 ms |
| Mano vs rango wide | 354 | Flop | **396 ms** |
| Mano vs rango medium | 178 | Turn | 2.5 ms |
| Mano vs rango wide | 354 | Turn | 4.3 ms |
| Mano vs rango tight | 40 | Preflop | 9.6 ms |
| Mano vs rango medium | 178 | Preflop | 47 ms |
| Mano vs rango wide | 354 | Preflop | 93 ms |

Nótese el salto de 53 ms → 396 ms al pasar de "medium" a "wide" en el flop: no es un salto proporcional al tamaño del rango (el rango solo se duplicó). Esto ocurre porque el sistema cruza automáticamente el umbral que lo hace pasar de "enumeración exacta" a "Monte Carlo" — y en este caso puntual, el modo Monte Carlo termina siendo más lento, no más rápido (se explica en el punto 9).

### 8.3 Rango contra rango — distribución de equity del rival (lo que ve el usuario como las "barras")

Aquí es donde aparecen los números más importantes de esta auditoría:

| Escenario | Combos vs Combos | Motor **WASM** (el que se usa primero) | Motor **JavaScript** (respaldo si WASM falla) |
|---|---|---|---|
| tight vs tight | 40 × 40 | 114 ms | 670 ms |
| medium vs medium | 178 × 178 | 450 ms | **13.480 ms (13,5 segundos)** |
| wide vs wide | 354 × 354 | 900 ms | **NO MEDIDO exactamente — la prueba superó los 30 segundos y se interrumpió.** Siguiendo la tendencia observada entre los otros dos puntos, el orden de magnitud esperable es de **decenas de segundos** (posiblemente 50+ segundos), pero esto es una extrapolación, no una medición directa. |

**Esto es el hallazgo más importante de la auditoría de rendimiento.** Cuando WASM funciona (que es el caso normal), todo va rápido: menos de 1 segundo incluso con rangos anchos. Pero si por algún motivo WASM no está disponible (falla al cargar, un navegador antiguo, alguna política de seguridad corporativa que bloquee WebAssembly, etc.), el sistema cae automáticamente al motor de respaldo en JavaScript — y ese respaldo puede tardar **de 13 a más de 50 segundos**, congelando por completo la pantalla durante todo ese tiempo, sin ninguna forma de cancelar ni avisar cuánto falta.

### 8.4 Simulación de un clic real completo ("Calcular equity" con una jugada guardada de 6 combos)

Combinando el número principal (siempre JS) + la distribución (WASM):

| Escenario | Tiempo total por clic |
|---|---|
| 6 combos propios vs rango medium (178 combos), flop | ~1,19 segundos |
| 6 combos propios vs rango wide (354 combos), flop | ~2,21 segundos |

Esto es lo más parecido a "lo que realmente experimenta un usuario" hoy, en el camino normal (WASM funcionando). Es una espera notoria pero no exagerada — el problema real está en el escenario de respaldo (8.3), no en el camino normal.

**Pruebas no realizadas (declaradas explícitamente):**
- Rendimiento en un móvil o portátil de gama baja: **NO MEDIDO** (solo se probó en la máquina de este análisis).
- Rendimiento con rangos "cualquier par de cartas" (100% de las manos, 1.326 combos): **NO MEDIDO** — dado el patrón cuadrático observado en el punto 8.3, se espera que el motor JavaScript de respaldo sea impracticable en ese escenario (varios minutos), aunque esto también es una extrapolación, no una medición.

## 9. Principales cuellos de botella identificados

1. **El motor de respaldo en JavaScript para "rango contra rango" crece de forma cuadrática.** Si el rango del rival tiene `V` combinaciones y el rango propio tiene `H` combinaciones, el trabajo crece aproximadamente como `V × H`. Duplicar el tamaño de ambos rangos multiplica el tiempo por 4, no por 2. Esto es lo que explica el salto de 670 ms a 13,5 segundos al pasar de 40×40 a 178×178 combos.

2. **El "modo Monte Carlo automático" del motor JavaScript no resuelve el problema anterior.** Se investigó el motivo exacto: cuando ambos lados del cálculo son rangos completos (no una sola mano), el modo Monte Carlo reduce cuántas "cartas por venir" se revisan, pero **no reduce cuántas combinaciones de manos se comparan entre sí** — y esa comparación de combinaciones es la parte más cara cuando ambos rangos son anchos. Es decir: el interruptor automático que debería acelerar las cosas en casos difíciles, en el peor caso (rango ancho contra rango ancho) no ayuda casi nada.

3. **Todo el cálculo bloquea la interfaz por completo (sin Web Worker).** Incluso en el camino "rápido" (WASM), un clic real puede tardar más de 2 segundos con rangos anchos, y durante ese tiempo la pantalla completa queda congelada — no solo el botón de calcular.

4. **No hay ningún tipo de caché ni memoria de resultados anteriores.** Si el usuario pulsa "Calcular equity" dos veces seguidas sin cambiar nada, se repite absolutamente todo el trabajo desde cero. No se guarda el resultado anterior ni se detecta que la entrada no cambió.

5. **Llamadas repetidas al motor WASM, una por cada combinación del rival.** Esto no es un error de diseño (la librería externa no ofrece una forma de pedir "dame el detalle combo por combo en una sola llamada"), pero sí implica que por cada combinación del rango rival se vuelve a construir un texto con todo el rango propio y se cruza la frontera JavaScript↔WASM una vez más. Con rangos anchos esto son cientos de idas y vueltas. No es el mayor cuello de botella medido, pero es trabajo repetido que en teoría podría reducirse si la librería externa expusiera una función de "lote".

6. **El evaluador de manos (la pieza más usada de todo el sistema) está bien optimizado.** Esto no es un problema — se menciona aquí para contraste: usa números y operaciones a nivel de bits en vez de texto u objetos, evitando el error más común de rendimiento en este tipo de cálculos. No es un cuello de botella.

## 10. ¿Hay cálculos o procesos que se realicen innecesariamente?

Sí, dos casos concretos y verificables en el código:

- **Recalcular todo desde cero en cada clic**, aunque el usuario no haya cambiado ni el rango ni el board ni sus combos desde el cálculo anterior (no hay caché, ver punto 9.4).
- **Reconstruir el texto del rango propio en cada vuelta del bucle** dentro de la llamada a WASM (`wasmVillainBuckets`, [index.html:5450](index.html:5450)): el texto se arma dentro del `for` que recorre cada combo rival, en vez de una sola vez fuera del bucle. Es un costo pequeño comparado con el resto, pero es trabajo repetido que no depende de la iteración.

No se encontraron cálculos "muertos" (código que calcula algo que después nunca se usa) en las funciones de equity revisadas.

## 11. ¿Es razonable esta arquitectura para una aplicación comercial pequeña?

**Sí, es razonable como punto de partida — con matices.** Para una app pequeña/mediana, evitar un servidor de cálculo (todo corre en el navegador del usuario) es una decisión de arquitectura acertada: es barata, simple de mantener y no requiere pensar en escalado de servidores. El problema no es "dónde" se calcula (el navegador es correcto), sino que:

- Falta el mecanismo estándar para que ese cálculo no congele la pantalla (Web Worker).
- El camino de respaldo (cuando WASM no está disponible) es lo suficientemente lento como para parecer que la aplicación "se colgó", lo cual es un riesgo real de percepción de calidad para un producto que se quiere vender.

## 12. Capacidad conceptual para 100 / 1.000 / 10.000 usuarios

**Punto clave que cambia todo el análisis: como el cálculo ocurre 100% en el navegador de cada usuario, no existe un servidor central que tenga que "aguantar" más carga a medida que crecen los usuarios.** Cada persona usa la potencia de su propio dispositivo. Esto es una ventaja de costos enorme.

| | 100 usuarios | 1.000 usuarios | 10.000 usuarios |
|---|---|---|---|
| **Carga en su servidor/infraestructura** | Ninguna (solo servir el archivo HTML, que pesa ~270 KB) | Ninguna | Ninguna — servir archivos estáticos escala prácticamente sin costo con cualquier hosting o CDN moderno |
| **Carga en el dispositivo de cada usuario** | La de siempre: 1 cálculo a la vez, en su propia máquina | Igual — cada usuario es independiente | Igual — cada usuario es independiente |
| **Riesgo real** | Bajo | Bajo | Bajo, pero depende de la **variedad de dispositivos**: a más usuarios, más probable que algunos tengan equipos lentos (móviles viejos, portátiles de oficina) donde el escenario "lento" del punto 8.3 se sienta con más frecuencia |

Importante, tal como se pidió: no todos los usuarios calculan lo mismo. Un usuario que solo mira manos contra manos (punto 8.1) no notará nada. Un usuario que arma rangos anchos contra rangos anchos (punto 8.3) es quien puede toparse con el peor escenario, sin importar si hay 100 o 10.000 usuarios en total — es un problema de "por cálculo", no de "por cantidad de gente usando la app a la vez".

**Conclusión de este punto: escalar a más usuarios no es un problema de infraestructura para RangeForge hoy. El "costo" que puede crecer es el de soporte/quejas si algunos usuarios con equipos modestos chocan con el escenario lento del punto 8.3.**

## 13. ¿Puede el cálculo ejecutarse completamente en el navegador del usuario?

**Sí, y de hecho ya es así hoy.** No hay ninguna parte del cálculo de equity que dependa de un servidor. Esto ya está resuelto en la arquitectura actual y es correcto mantenerlo así.

## 14. ¿Es WASM + Web Worker una arquitectura adecuada para RangeForge?

**Sí, es la combinación adecuada — y RangeForge ya tiene la mitad de esa combinación funcionando (WASM), le falta la otra mitad (Web Worker).**

- WASM ya demostró en las pruebas del punto 8.3 ser entre 6 y 30 veces más rápido que el respaldo en JavaScript para el caso más pesado (rango contra rango). Es la pieza correcta para la velocidad.
- Un Web Worker no haría el cálculo más rápido en sí, pero movería ese cálculo a un "hilo" separado del que dibuja la pantalla, de forma que la interfaz nunca se congele, sin importar cuánto tarde el cálculo. Es la pieza que falta para que la app "se sienta" fluida incluso en el peor caso.

## 15. Problemas de arquitectura que podrían seguir aumentando el costo de desarrollo

- **Todo el proyecto vive en un único archivo de ~7.900 líneas** (`index.html`, ver [ARCHITECTURE.md](ARCHITECTURE.md)). Esto no es un problema de equity en sí, pero cualquier cambio futuro al motor de cálculo — incluso uno pequeño — implica editar con cuidado en medio de un archivo enorme donde la interfaz, los datos y el cálculo están todos mezclados. Esto encarece cada cambio futuro, incluidos los relacionados con equity.
- **Dos motores de cálculo que hay que mantener sincronizados** (JavaScript y WASM). Si en el futuro se corrige una regla de póker o se ajusta algo en uno de los dos motores, hay que recordar replicarlo en el otro, o los resultados podrían no coincidir entre el camino "normal" (WASM) y el camino "de emergencia" (JavaScript). Ya existe una diferencia de fondo entre ambos: uno es exacto/aproximado según el caso, el otro es siempre aproximado.
- **El umbral que decide "exacto vs Monte Carlo" (300.000) fue calibrado pensando en un solo tipo de escenario** (una mano o pocas manos contra un rango), y como se vio en el punto 9.2, no funciona bien para el escenario de "rango contra rango". Si en el futuro se agregan más funciones que comparen rangos anchos entre sí, este mismo problema puede reaparecer en otro lugar del código si no se revisa esa lógica de forma consciente.

## 16. Partes que parecen innecesariamente complejas para un MVP

- El **umbral automático exacto↔Monte Carlo** (punto 9.2) agrega complejidad y, en el peor caso medido, ni siquiera cumple su objetivo (no es más rápido). Para un MVP, una regla más simple y predecible podría ser suficiente y más fácil de razonar.
- Mantener **dos motores de equity completos** (JS y WASM) es más superficie para mantener que la que necesita un MVP. Es razonable tener un respaldo, pero valdría la pena evaluar si el respaldo necesita ser tan completo como el motor principal, dado lo lento que resulta en el peor caso (punto 8.3) — un respaldo que casi nunca se usa y que, cuando se usa, tarda 50+ segundos, puede no valer el costo de mantenimiento de tenerlo tan completo.

## 17. Arquitectura mínima recomendada para RangeForge V1 (propuesta, sin implementar nada)

Objetivo: rápido, correcto, interfaz fluida, costo de infraestructura mínimo, mantenimiento mínimo, con espacio para crecer después.

1. **Mantener el cálculo 100% en el navegador del usuario** (ya es así, y es la decisión correcta — no se necesita servidor de cálculo ni ahora ni con más usuarios, ver punto 12).
2. **Mover el cálculo de equity a un Web Worker.** Es el cambio de mayor impacto por menor esfuerzo: la interfaz dejaría de congelarse en todos los escenarios, incluido el de respaldo lento. El usuario vería un indicador de "calculando..." mientras sigue pudiendo usar el resto de la app.
3. **Usar WASM como único motor "de verdad", y simplificar el rol del motor JavaScript a un respaldo mínimo y honesto.** Ya que WASM demostró ser muchísimo más rápido, tiene sentido invertir en que cargue de forma confiable, y aceptar que el respaldo en JavaScript exista solo para "no romper la app" en el caso raro de que WASM falle — no para dar la misma experiencia de velocidad.
4. **Agregar una caché simple del último resultado calculado** (mismo rango + mismo board + mismos combos = mismo resultado, no recalcular). Bajo costo de implementación, elimina trabajo repetido innecesario (punto 10).
5. **Mantener el hosting como archivos estáticos** (sin backend), que es como está hoy — es la opción de menor costo de infraestructura posible y ya escala bien a miles de usuarios (punto 12).

Ninguno de estos puntos requiere introducir un servidor de cálculo, y todos son compatibles con mantener el archivo único si así se prefiere por ahora (aunque separar el código eventualmente ayudaría a que estos cambios sean más fáciles de hacer con seguridad, ver punto 15).

## 18. Conclusión

### A. ESTÁ BIEN
- El cálculo ocurre enteramente en el navegador del usuario, sin servidor — la decisión de arquitectura correcta para minimizar costos de infraestructura, hoy y a futuro.
- El evaluador de manos (la pieza más usada de todo el sistema) está bien construido y no es un cuello de botella.
- WASM ya está integrado y funcionando, y es entre 6 y 30 veces más rápido que el respaldo en JavaScript en el escenario más pesado medido — es la pieza más valiosa que ya existe.
- El sistema tiene manejo de errores básico: si WASM falla, cae a JavaScript en vez de romper la app por completo.
- El diseño de "compartir trabajo" en el motor JavaScript (evaluar una vez y reutilizar entre varias manos propias) es una optimización real y bien pensada, no un parche superficial.

### B. PROBLEMAS
- No hay Web Worker: cualquier cálculo, aunque sea el camino rápido (WASM), congela toda la interfaz mientras dura (hasta ~2,2 segundos medidos en un escenario realista, y mucho más en el peor caso).
- El motor de respaldo en JavaScript puede tardar entre 13 y más de 50 segundos en el escenario de "rango ancho contra rango ancho" — un tiempo que un usuario percibiría como que la aplicación se colgó, sin ninguna forma de saber que sigue trabajando.
- No existe ninguna caché: cada clic repite todo el trabajo, incluso si nada cambió desde el clic anterior.

### C. RIESGOS (lo que podría seguir costando dinero en desarrollo)
- Mantener dos motores de cálculo (JS y WASM) que pueden desincronizarse en su comportamiento (uno es exacto cuando puede serlo, el otro siempre es aproximado) es una fuente de bugs sutiles y de tiempo de debugging futuro.
- Tener toda la aplicación en un único archivo de ~7.900 líneas hace que cualquier cambio al motor de equity sea más lento y más riesgoso de lo necesario, porque hay que navegar y entender interfaz, datos y cálculo entremezclados para tocar una sola pieza.
- El umbral automático "exacto vs Monte Carlo" es una regla que en el peor caso no cumple su propio objetivo (punto 9.2) — si se construye más lógica encima de ese supuesto sin revisarlo, el problema puede reaparecer en otras funciones futuras.

### D. RECOMENDACIÓN
Antes de seguir agregando funciones nuevas sobre el motor de equity, priorizar dos cambios de bajo costo y alto impacto: **mover el cálculo a un Web Worker** (para que la interfaz nunca se congele) y **agregar una caché simple de resultados** (para no recalcular lo mismo dos veces). Ninguno de los dos requiere rehacer el motor de cálculo ni tocar la lógica de equity en sí — son cambios "alrededor" del cálculo, no "dentro" de él, lo cual reduce el riesgo de introducir errores nuevos en algo que hoy funciona correctamente.

### E. NO TOCAR
- El evaluador de manos (`eqEvaluateFast`) — funciona bien y es rápido; no hay evidencia de que sea un cuello de botella.
- La integración de WASM en sí (la forma en que se carga y ejecuta) — funciona, y es la parte más rápida del sistema.
- La decisión general de calcular todo en el navegador sin servidor — es la arquitectura correcta para minimizar costos, no hay motivo para introducir un servidor de cálculo.
