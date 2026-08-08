# RangeForge — Dirección de diseño

> Propuesta. No se modificó ningún archivo del proyecto ni se tocó arquitectura, lógica de negocio, motor de equity o funcionalidad — esto es exclusivamente UI/UX visual, tal como se pidió. Une cuatro cosas: [DESIGN_AUDIT.md](DESIGN_AUDIT.md) (qué está roto hoy), el brief de dirección visual de RangeForge, el manifiesto de interfaz de PRYSM, y la filosofía detrás del nombre.

---

## 1. El filtro que va a guiar todo esto

Antes de hablar de colores o tipografía, una idea que viene de la historia de PRYSM y que resulta ser, sin que nadie la haya buscado a propósito, el diagnóstico exacto de lo que falla hoy en RangeForge:

> *"Un prisma no crea la luz. No inventa los colores. Los colores ya estaban ahí. El prisma simplemente permite verlos."*

La auditoría encontró una app con **más de 40 colores sueltos**, **15 botones casi iguales** y **19 tamaños de letra** — es decir, un montón de decisiones visuales que se agregaron porque hacía falta *algo* en ese momento, no porque revelaran algo que ya estaba en los datos. Eso es exactamente lo opuesto a la filosofía de PRYSM. Y es exactamente lo que el brief pide evitar: *"no añadir elementos visuales solamente porque se ven cool."*

Entonces el criterio para cada decisión de acá en adelante va a ser uno solo:

**¿Este color/tamaño/borde está revelando algo que el usuario necesita ver (un peso, una equity, una selección, una jerarquía) — o lo estamos inventando porque la pantalla se veía sola?**

Si es lo segundo, se saca. No se reemplaza por otra decoración — se saca.

Hay otra conexión que no busqué, apareció sola: la estructura de datos de RangeForge — spot → textura → flop → turn → river, cada nodo ramificándose en el siguiente — es, literalmente, un árbol de nodos. Es la misma idea detrás del logo de PRYSM (la Y de nodos, las ramificaciones). No hace falta poner un prisma en ningún lado para que la marca esté presente; ya está en cómo el producto piensa una mano de poker. Esto me parece más honesto que agregar un ícono — y es el tipo de decisión que la propia filosofía pide: revelar lo que ya está, no inventar.

## 2. El manifiesto, traducido a decisiones concretas de RangeForge

El manifiesto de interfaz de PRYSM no es una lista de gustos estéticos — es una serie de reglas que, punto por punto, ya me dicen qué hacer con partes específicas de RangeForge. Las traduzco una por una, no como poesía sino como decisión de diseño:

**Bordes — "aquí comienza algo", no "mirá este componente".**
Hoy la mayoría de los bordes de RangeForge ya son finos (1px, `var(--border)`) — esa parte está bien encaminada. Lo que falta es la segunda mitad de la idea: *"cuando algo está seleccionado, el borde puede convertirse en el prisma... normal → descubierto."* Hoy, "seleccionado" en las matrices de rango (botón R, matriz del villano) se resuelve solo con un relleno de color pastel — el borde no participa de la selección. Cuando lleguemos al código, esa es una oportunidad concreta y chica: que el borde también cambie levemente al seleccionar, no solo el fondo. Es el tipo de detalle que el manifiesto pide — sutil, no un efecto.

**Selección — "has revelado esta posibilidad", no "este botón está activo".**
Esto es, literalmente, el lenguaje que ya usan las matrices de peso de RangeForge (pintás una mano, aparece un color según el peso). No hay que inventar el patrón — hay que asegurarse de que **todos** los estados de selección de la app (pestañas, categorías, checkboxes) se sientan con la misma calma, en vez de que cada uno tenga su propia versión (ver auditoría, punto 14 — es la parte más consistente hoy, buena base).

**El clic — con peso, no con celebración.**
RangeForge no tiene animaciones exageradas hoy — otra cosa que ya está bien encaminada por default (la única transición general es `0.15s cubic-bezier`, discreta). El objetivo acá no es agregar, es **no romper eso** cuando avancemos: cada estado nuevo debe seguir sintiéndose "click → claridad", no "click → efecto".

**Datos con contexto — el ejemplo del brief aplica directo a la equity.**
*"31.4% es un dato. 31.4% + BTN RFI es información. 31.4% + BTN RFI + variación vs. tu baseline es comprensión."* Hoy el resultado de equity en RangeForge llega hasta el segundo nivel (el número + de qué jugada es). El tercer nivel — algo para comparar el resultado contra ("¿esto es alto o bajo para esta categoría? ¿cambió respecto al cálculo anterior?") — todavía no existe. Es, probablemente, la mejora de mayor impacto real de todo este documento, y encaja con lo que ya habías marcado antes como la parte más importante de la app (el "Rango del Villano"). La dejo anotada como candidata a una ronda de diseño dedicada, no la resuelvo acá.

**Tablas — deberían ser "aburridas".**
La tabla de EQ por jugada que armamos en la última ronda ya sigue este espíritu (sin colores de más, sin iconos). Lo que falta es que las demás listas de la app (que hoy son `<div>` imitando tablas, cada una con su propio criterio de alineación — auditoría, punto 10) se sientan igual de "aburridas" entre sí, en vez de que cada una tenga su propia personalidad accidental.

**Estados vacíos — invitación, no "No data".**
El estado vacío general de RangeForge hoy es, literalmente, un texto gris chico ("SELECCIONA UNA TEXTURA") flotando solo. El manifiesto da el patrón exacto a seguir: una frase que reconoce el vacío con calma + una invitación a la primera acción. Adaptado al español y al contexto real de RangeForge (no "importa tus manos", sino "creá tu primer spot"), algo en la línea de:

> Nada que revelar todavía.
> Creá un spot para empezar.

**Errores — con humildad, no con `alert()`.**
Acá encontré algo muy concreto: RangeForge usa **42 `alert()` nativos del navegador** para avisos y errores (ej. "Desbloquea el nodo para editar combos.", "Máximo 3 cartas para el Flop.") y **10 `confirm()`** para confirmaciones. Es, sin comparación, lo más alejado del manifiesto que existe hoy en la app — el `alert()` del navegador es una ventana gris, con el ícono del sistema operativo, que bloquea toda la pantalla y dice "esta página dice:" antes del mensaje. No hay forma de que se sienta "PRYSM" mientras siga siendo eso. Reemplazarlos por un mensaje propio, discreto, en el lugar donde ocurre el problema (no una ventana que interrumpe todo) es probablemente el cambio de mayor impacto por menor esfuerzo de toda esta lista.

**Iconos — señal, no decoración.**
Otra que ya está bien encaminada: RangeForge casi no usa iconos hoy (usa texto: "×", "R", "+"). Es, sin buscarlo, exactamente lo que pide el manifiesto — no hay que agregar iconografía nueva, hay que resistir la tentación de sumarla más adelante "porque se ve más profesional".

**Microcopy — la voz.**
Los textos actuales de RangeForge son neutros y funcionales ("Calcular equity", "No hay combos guardados en esta jugada todavía") — no gritan, no venden, lo cual ya está del lado correcto. La oportunidad es afinar el tono hacia algo más parecido a "alguien inteligente y humilde te está hablando" en los pocos lugares donde hoy el texto es más seco de lo necesario (los `alert()` de arriba, principalmente).

**El "Prysm Moment" de RangeForge.**
Si el KPI de diseño es *"cuántas veces ayudamos al usuario a comprender algo"*, el momento que más cerca está de eso hoy es el clic en "Calcular EQ" del panel del villano — el usuario pasa de no saber nada del rango del rival a ver, de una, la jugada por categoría y la distribución completa. Es el candidato natural a ser **el** momento insignia de RangeForge — razón de más para que la ronda dedicada a esa sección (que dejamos pendiente hace unas rondas) sea prioritaria sobre pulir partes menos centrales.

## 3. Principios de diseño (derivados del brief + la filosofía, no genéricos)

1. **Un color, una razón.** Cada color que aparezca en pantalla tiene que estar comunicando algo puntual: peso de una mano, fuerza de equity, selección, acción principal. Si un color no está haciendo ese trabajo, es ruido — se va.
2. **Una sola acción principal visible a la vez.** El brief dice *"la interfaz debe desaparecer cuando el usuario trabaja y llamar la atención solo cuando hay información importante."* Hoy conviven un botón "primario" negro (modales) y uno indigo (equity, pestañas) — dos jerarquías de "esto es lo importante" al mismo tiempo, que se cancelan entre sí. Con una sola, el usuario no tiene que adivinar cuál es la acción que importa.
3. **Densidad ordenada, no aire gratuito.** El brief es explícito: *"no quiero espacios vacíos para parecer moderna."* Esto valida lo que ya veníamos haciendo en el panel del villano (compactar sin perder orden) y señala directamente al estado vacío general de la app como el lugar más urgente a repensar — hoy es aire sin ninguna razón.
4. **La jerarquía tipográfica hace el trabajo, no una segunda fuente.** El brief pide personalidad tipográfica pero evitar mezclar familias. Inter ya es una elección sólida (técnica, legible, sin ruido) — la personalidad va a salir de usarla con una escala de tamaños/pesos deliberada (hoy son 19 tamaños sueltos), no de sumar una tipografía decorativa.
5. **Los rangos de poker son el producto, no un dato más.** El brief lo dice directo: *"no deben parecer una tabla de Excel coloreada... deben sentirse como un componente central de la identidad."* Hoy existen tres implementaciones distintas de la misma grilla 13x13 con tres tamaños de celda. Antes de pensar en "verse más lindas", primero tienen que ser **una sola cosa** en toda la app.
6. **Las microinteracciones ya están bien encaminadas — hay que preservarlas, no reinventarlas.** La auditoría encontró que hover/active/selected son, hoy, la parte más consistente del sistema. Es la base sobre la que se construye todo lo demás, no algo a rehacer.

## 4. Qué cambiaría, componente por componente, y por qué

| Componente | Qué encontré | Qué propongo | Por qué |
|---|---|---|---|
| **Paleta de color** | Base "Warm Stone + Indigo" coherente, pero con 40+ colores sueltos por fuera (grises genéricos `#ccc`/`#aaa`, azules/verdes de palo saturados, ámbar mal usado) | Mantener la base cálida (ya tiene identidad propia, no es genérica). Eliminar los colores fuera de paleta. Un solo color de palo (el pastel de las mini-cartas, no el saturado de los headers de matriz). El indigo queda reservado a **una** función: acción principal + selección. | Principio 1. La paleta ya existe y es buena — el trabajo es de limpieza, no de reinvención. |
| **Botones** | 15 clases casi-duplicadas | Consolidar en 4 roles: primario (uno solo por pantalla), secundario, peligro, utilidad/ícono (un solo componente chico reusado) | Principio 2. Menos variantes, cada una con un propósito real. |
| **Escala tipográfica** | 19 tamaños sueltos, varios a medio píxel de diferencia | Una escala fija de 5-6 pasos (ej. 10/11/13/16/22/32), sin excepciones ad-hoc | Principio 4. |
| **Grillas de rango 13x13** | 3 implementaciones, 3 tamaños de celda (24px, 26px, 16px) | Un solo componente de grilla reusado en las 3 pantallas donde aparece (mi rango, rango del villano, matriz de pesos) | Principio 5 — no se puede tener "identidad" si el componente central del producto no es ni siquiera el mismo componente en cada lugar. |
| **Radios y bordes** | Tokens definidos pero usados solo ~50% de las veces; valores sueltos (2px, 20px) que no calzan con ningún token | Un solo sistema de radios (2-3 pasos), aplicado sin excepciones. Los bordes de selección pasan a cambiar levemente al seleccionar (ver sección 2). | Consistencia — hoy dos elementos "igual de redondeados" a veces no lo están. |
| **Tamaños de modal** | 6 medidas distintas, cada una definida por separado | 2-3 tamaños estándar (chico/mediano/grande) | Ninguna ventana necesita una medida única si su contenido no es único. |
| **Estado vacío / primer vistazo** | Sidebar + un texto tenue flotando en una superficie casi en blanco | Copy de invitación ("Nada que revelar todavía. Creá un spot para empezar.") en vez de una instrucción seca | Es literalmente donde más aplica la filosofía del nombre, y hoy es el momento más genérico de la app. |
| **Errores y confirmaciones** | 42 `alert()` y 10 `confirm()` nativos del navegador | Mensajes propios, discretos, en el lugar donde ocurre el problema | El elemento más alejado del manifiesto que existe hoy en la app — cambio de alto impacto y bajo riesgo (no toca lógica, solo cómo se muestra el mensaje). |
| **Resultados de equity** | Ya es la parte más pulida (la trabajamos en las últimas rondas); llega hasta "número + de qué jugada es" | Mantener la dirección actual y evaluar sumar un tercer nivel de contexto (comparación/variación) en una ronda dedicada | El brief pide "clara y visualmente poderosa, sin gráficos innecesariamente complejos" — ya vamos en esa línea; el nivel de "comprensión" del manifiesto es la evolución natural, no una reescritura. |
| **Navegación (spot → textura → calles)** | Un breadcrumb de texto simple, sin jerarquía visual entre spot/textura | Darle algo de peso visual al hecho de que el usuario está navegando un árbol de decisiones — sin inventar un ícono nuevo, usando la misma idea de nodos que ya vive en la estructura de datos | Conecta con la filosofía sin agregar decoración ajena al producto. |
| **Iconos y microcopy** | Casi sin iconos (bien); textos neutros y funcionales (bien) | Mantener, no agregar iconografía decorativa; afinar el tono en los pocos lugares más secos (sobre todo al reemplazar los `alert()`) | Ya están del lado correcto del manifiesto — el riesgo acá es agregar de más, no de menos. |

## 5. Qué NO se toca (por instrucción explícita)

- La arquitectura del archivo (sigue siendo un solo `index.html`, no se reestructura).
- La lógica de negocio y el motor de equity (JS + WASM) — cero cambios funcionales.
- Ninguna funcionalidad existente deja de comportarse igual.

Este trabajo es puramente visual: colores, tipografía, espaciado, tamaños, radios — la piel, no el esqueleto ni los órganos.

## 6. Cómo seguiríamos

Tal como venimos trabajando (y tal como pide el brief: *"antes de modificar código, presenta una propuesta"*), el siguiente paso natural sería un **boceto visual** aplicando estos principios a 1-2 pantallas concretas. Con todo lo de arriba, ahora hay tres candidatas razonables, de menor a mayor riesgo:

1. **El estado vacío** — el cambio más simbólico y el que menos arriesga tocar algo que ya funciona.
2. **Los `alert()` reemplazados por mensajes propios** — el de mayor impacto por menor esfuerzo, aunque es más "sistema" que "pantalla única" (no hay una sola imagen que lo represente del todo).
3. **La grilla de rango unificada** — el componente que el brief marca como el corazón del producto.

¿Por cuál arrancamos, o preferís que primero afinemos algo de lo escrito acá?
