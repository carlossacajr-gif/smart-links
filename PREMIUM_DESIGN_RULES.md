# SACA PREMIUM DESIGN RULES (2026 STANDARDS)

Este documento es la **Biblia de Diseño** para la plataforma Smart Links y cualquier futuro desarrollo. Cada vez que vayas a construir, inspeccionar o proponer un cambio en la interfaz de usuario, debes contrastarlo contra estos 5 pilares psicológicos absolutos.

---

## 1. Efecto Halo & Primera Impresión (50ms Rule)
**"Premium no es lo que hace, es lo que te hace sentir."**
El cerebro juzga la calidad del backend, del código y de la compañía basándose exclusivamente en el impacto visual de los primeros 50 milisegundos.
- **Ley de la Cabecera (Hero Section):** La cabecera (Header) o la parte superior de un panel de control es el bien inmueble más caro. Si se ve abarrotado o con proporciones dudosas, la percepción de la App completa cae a "barata" y amateur.
- **Aplicación Saca:** Logo 100% inmaculado, cero desenfoques en vectores. Fondos oscuros deben ser de máxima profundidad (p. ej., `#0A0A0A` puro o `#111`), sin manchas de colores neón estruendosas, a menos que sean un degradado extremadamente sutil (1-3% de opacidad) para guiar la mirada.

## 2. Fluidez Cognitiva (Carga Cognitiva = Cero)
**"Reduce the effort, increase the trust."**
El cerebro humano es perezoso. Las interfaces complejas, abrumadoras o que carecen de espacios dan la ilusión de "estrés" y poca profesionalidad. Las marcas premium transmiten *calma temporal*.
- **Whitespace Agresivo:** El espacio en blanco (o negro) no es espacio "vacío". Es un indicador psicológico de confianza. Separaciones generosas (`gap-8` a `gap-12`, paddings inmensos de `32px` a `48px` en contenedores maestros).
- **Jerarquía Única:** Solo un elemento debe gritar por atención en cada contexto. (El botón primario usa el `Saca Red #EB3333`, el resto de acciones secundarias deben ser etéreas: `bg-white/5` o texto crudo).
- **Layout Inquebrantable:** Si un contenedor se expande (como un dropdown), *NUNCA* debe chocar, exprimir o destruir los márgenes del contenido a su lado. La física del DOM debe comportarse armónicamente (flexbox direccional impecable).

## 3. Micro-Interacciones y Regla "Peak-End"
Los sitios web baratos están muertos. Las web premium se sienten *vivas*. Pequeñas interacciones comunican que el desarrollador "se preocupa" por el artesano virtual.
- **Acción & Reacción:** Botones que se hunden imperceptiblemente al presionarse (`active:scale-95`), bordes que brillan un milisegundo al enfocarse, transiciones a `0.3s` o con resortes (Framer Motion `spring`).
- **Estados de Carga:** No arrojes un spinner aleatorio. Muestra un "skeleton" hermoso, o un spinner magnético que sea una obra de arte por sí mismo, integrado en el contexto.

## 4. Personalidad y "Tactile Maximalism"
**"Una identidad que respira lujo, no un brochure genérico corporativo."**
- **Materiales del DOM:** En lugar del típico fondo gris, utilizamos el estándar `Apple Glassmorphism`: bordes finísimos de `1px` color `white/10`, cajas con sombras `shadow-2xl` masivas pero de escasa opacidad (`rgba(0,0,0,0.5)`), para dar sensación de "capas físicas" o tarjetas de cristal.
- **Saca Red como Acento:** El rojo Saca es extremadamente intenso. No lo manches por toda la pantalla. Úsalo como arma quirúrgica para resaltar lo realmente importante o en pequeños badges texturizados.

## 5. Diseño Fluido, Contextual e Intencional
El sitio no solo debe ser "Responsive". Debe pensar en el usuario.
- **Animación Intencional:** Entrar a un panel y ver los elementos deslizarse suavemente en su lugar da paz. Ver cosas saltar de golpe por carga asíncrona causa ansiedad.
- **Disposición Móvil vs Desktop:** Si un panel es Horizontal en escritorio, asume automáticamente que debe ser Vertical (`flex-col`) en Móvil, y revisa obsesivamente sus `paddings` para que en pantallas de 375px siga sintiéndose *premium* y no claustrofóbico.

> **Mandamiento del Agente:** Si tu bloque de CSS o JSX compromete alguna de estas reglas creando agrupaciones (`div`s) donde el contenido "pelea por espacio", borra tu código y empieza el layout desde cero con fundamentos sólidos.
