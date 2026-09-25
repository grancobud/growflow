---
name: ciencia-nutrientes-cannabis
description: Base de datos científica de nutrición mineral para cannabis e hidroponía. Química de sales (fórmulas, % elemental, solubilidad, compatibilidad), fisiología de cada nutriente, targets por etapa (EC/pH/ppm), antagonismos, métodos de cálculo profesionales (ppm↔mmol↔meq, EC iónica, balance de cargas, ratios Steiner/Sonneveld), deficiencias y formulación. Usar al calcular/formular nutrientes, diagnosticar carencias, o razonar química de fertilizantes.
---

# Ciencia de nutrientes minerales para cannabis (referencia profesional)

Base de conocimiento para formular, calcular y diagnosticar nutrición mineral en cannabis (coco/hidro). Complementa el skill `creador-fertilizantes` (que es la config de la calculadora growflow). Acá está la CIENCIA.

## 1. Los 18 elementos esenciales (y los 16 del modelo)
Esenciales: C, H, O (del aire/agua) + **macros primarios** N, P, K + **secundarios** Ca, Mg, S + **micros** Fe, Mn, Zn, Cu, B, Mo, (Ni, Cl trazas).
Modelo de cálculo (HydroBuddy, 16): NO₃, NH₄, P, K, Mg, Ca, S, Fe, Zn, B, Cu, Mo, Mn, Na, Si, Cl. N se separa en NO₃ (nítrico) y NH₄ (amoniacal); N total = suma.
Si (silicio) y Na (sodio): no esenciales pero Si es beneficioso (estructura, resistencia). Na y Cl son indeseados en exceso (calidad).

## 2. Rol fisiológico de cada nutriente (cannabis)
- **N (nitrógeno)**: motor del crecimiento vegetativo, clorofila, aminoácidos. Exceso en flora = plantas blandas, menos resina, retrasa maduración. Nítrico (NO₃⁻) = estable, seguro; amoniacal (NH₄⁺) = rápido pero acidifica y en exceso da toxicidad/quema. Ratio ideal NH₄:NO₃ ~ 5-15% NH₄ del N total en coco.
- **P (fósforo)**: energía (ATP), raíces, floración/formación de flores. Se sobreestima ("PK boosters"): con 40-60 ppm alcanza. Exceso bloquea Zn/Fe/Ca.
- **K (potasio)**: osmorregulación, transporte de azúcares, engorde de flores, calidad. Sube en flora. Exceso antagoniza Ca y Mg.
- **Ca (calcio)**: paredes celulares, integridad, señalización. Inmóvil → deficiencia en hojas nuevas/puntas. Clave en coco (el coco secuestra Ca/Mg). Precipita con sulfato/fosfato.
- **Mg (magnesio)**: átomo central de la clorofila. Deficiencia = clorosis internervial en hojas viejas. Ratio Ca:Mg ~3-4:1.
- **S (azufre)**: aminoácidos (cisteína/metionina), terpenos/aromas, enzimas. Rara vez deficiente (viene en sulfatos).
- **Fe (hierro)**: síntesis de clorofila (no la contiene). Deficiencia = clorosis internervial en hojas NUEVAS (vs Mg = viejas). Se bloquea a pH alto → usar quelatos.
- **Mn**: fotosíntesis (fotólisis del agua), enzimas. Antagoniza/es antagonizado por Fe.
- **Zn**: auxinas (elongación), enzimas. Deficiencia = entrenudos cortos, hojas pequeñas.
- **B (boro)**: paredes celulares, transporte de azúcar, polen. Ventana estrecha (deficiencia y toxicidad cercanas).
- **Cu**: enzimas redox, lignina. Trazas.
- **Mo**: enzima nitrato-reductasa (convierte NO₃ a aminoácidos). Trazas (0.02-0.05 ppm).

## 3. Base de datos de sales minerales (fórmula → % elemental)
Fracción elemental = (átomos×PA del elemento) / peso molecular. ppm = fracción × g/L × 1000. N SIEMPRE como N (no como ion). Pesos atómicos: N 14.01, P 30.97, K 39.10, Ca 40.08, Mg 24.31, S 32.06, Fe 55.85, Mn 54.94, Zn 65.38, Cu 63.55, B 10.81, Mo 95.94, Na 22.99, Cl 35.45, O 16.00, H 1.008, C 12.01.

**Fuentes de CALCIO** (bidón A, van SEPARADAS):
- Nitrato de calcio agrícola (CN-9) Ca(NO₃)₂·NH₄·H₂O: Ca 19%, N 15.5% (14.4 NO₃ + 1.1 NH₄). Soluble ~1200 g/L. Caballo de batalla.
- Nitrato de calcio puro Ca(NO₃)₂: Ca 24.4%, N 17%.
- Cloruro de calcio CaCl₂·2H₂O: Ca 27.3%, Cl 48.2%. Muy soluble pero mete cloro (Athena Fade).
- Yeso CaSO₄·2H₂O: Ca 23.3%, S 18.6%. POCO soluble (~2 g/L) → solo POLVO, no concentrado (Finis).
- Gluconato de calcio: Ca ~8.9%. Limpio (sin N/Cl) pero poco soluble (~35 g/L) → limita concentración.
- Lactato de calcio: Ca ~13%. Limpio, más soluble que gluconato (~50-90 g/L).
- Ca-EDTA: Ca ~9.7%. Quelatado (foliar/corrección). OJO: EDTA prefiere Fe, suelta el Ca.

**Fuentes de NITRÓGENO / P / K** (bidón B):
- Nitrato de potasio KNO₃: K 38.7%, N 13.9% (nítrico). Muy usado.
- Nitrato de amonio NH₄NO₃: N 17.5% NO₃ + 17.5% NH₄. Controlado en AR.
- Sulfato de amonio (NH₄)₂SO₄: N 21.2% (amoniacal), S 24.2%.
- Urea CO(NH₂)₂: N 46.6% (amídico → se asimila como NH₄).
- MKP (fosfato monopotásico) KH₂PO₄: P 22.8%, K 28.7%. Cero N. Soluble ~230 g/L.
- MAP (fosfato monoamónico) NH₄H₂PO₄: N 12.2%, P 26.9%.
- DAP (fosfato diamónico) (NH₄)₂HPO₄: N 21.2%, P 23.3%.
- Ácido fosfórico H₃PO₄ 85%: P ~26%. Baja pH + aporta P.
- Sulfato de potasio K₂SO₄: K 44.9%, S 18.4%. Solubilidad LIMITADA (~110 g/L) → el que topa primero en concentrado.
- Bicarbonato de potasio KHCO₃: K 39.1%. K PURO sin S/N/P → desacopla K. Sube pH.
- Cloruro de potasio KCl: K 52.4%, Cl 47.6%. ⚠️ EVITAR en cannabis (cloro arruina calidad).

**Fuentes de MAGNESIO / AZUFRE**:
- Sulfato de magnesio (Epsom) MgSO₄·7H₂O: Mg 9.8%, S 13%. Muy soluble (~700 g/L).
- Nitrato de magnesio Mg(NO₃)₂·6H₂O: Mg 9.4%, N 10.9%.

**MICROS** (bidón C):
- Sulfato de Fe FeSO₄·7H₂O: Fe 20.1%, S 11.5%. Se oxida (usar pH bajo).
- **Quelatos de hierro** (elegir según pH): Fe-EDTA 13% (hasta pH 6.5), Fe-DTPA 11% (hasta pH 7), Fe-EDDHA 6% (el rojo, aguanta pH alto >7.5 o-o). En coco pH 5.8-6.2 → EDDHA o DTPA.
- Sulfato de Mn MnSO₄·H₂O: Mn 32.5%, S 19%. Mn-EDTA: Mn ~13%.
- Sulfato de Zn ZnSO₄·7H₂O: Zn 22.7%, S 11%. Zn-EDTA: Zn ~15%.
- Sulfato de Cu CuSO₄·5H₂O: Cu 25.5%, S 12.8%. Cu-EDTA: Cu ~14%.
- Ácido bórico H₃BO₃: B 17.5%. Solubor Na₂B₈O₁₃·4H₂O: B 20.5%.
- Molibdato de sodio Na₂MoO₄·2H₂O: Mo 39.7%. Molibdato de amonio: Mo 54%.
- Silicato de potasio K₂SiO₃: Si ~18-25%, K variable. Sube pH → bidón aparte.

**Micromix comerciales** (todo en uno): Fetrilon Combi 2 (Compo): Fe 4/Mn 4/Zn 1.5/Cu 1.5/B 0.5/Mo 0.1/MgO 3.3/S 3, EDTA. Afital Micromix (Arriazu). Masterblend 4-18-38.

**Sulfato vs Quelato (micros)**: quelato (EDTA/DTPA/EDDHA) = más estable en concentrado líquido y a pH alto, no precipita con fosfato. Sulfato = barato pero acopla S y menos estable en stock. Para línea embotellada/calidad → quelato. Para mezcla fresca diluida → sulfato alcanza.

## 4. Métodos de cálculo profesionales
- **Óxido → elemental** (etiquetas): P₂O₅×0.4364=P; K₂O×0.8301=K; CaO×0.7147=Ca; MgO×0.6030=Mg; SO₃×0.4005=S; Na₂O×0.7419=Na.
- **ppm → mmol/L**: ppm / PA. **ppm → meq/L**: ppm × carga / PA.
- **EC (mS/cm) ≈ 0.1 × Σ cationes(meq/L)** (regla estándar EC[µS/cm] ≈ 100 × meq cationes). NO sumar ppm elementales/escala (subestima ~2x porque N/S/P pesan menos como elemento que como ion). Alternativa por conductividad iónica molar (más exacta pero compleja).
- **Balance iónico**: Σ cationes(meq) = Σ aniones(meq). Cationes: Ca²⁺, Mg²⁺, K⁺, NH₄⁺, Na⁺. Aniones: NO₃⁻, SO₄²⁻, H₂PO₄⁻ (carga 1 a pH 5.5-6.5), Cl⁻, HCO₃⁻. Sales con anión orgánico/bicarbonato/silicato aportan carga negativa "invisible" (no es nutriente) → contarla para no dar falso desbalance. Desbalance ≤5% = receta física real.
- **Tendencia de pH del riego**: uptake de NO₃⁻ libera OH⁻/HCO₃⁻ (pH sube); uptake de NH₄⁺ libera H⁺ (pH baja). %NH₄ del N total controla la deriva. <8% NH₄ → pH tiende a subir; >15% → baja.
- **Estequiometría / desacople**: cada sal fija el ratio de SUS elementos (K₂SO₄ acopla K:S a 2.44:1). Para un ratio distinto necesitás una sal desacoplada (bicarbonato para K puro, gluconato/lactato para Ca sin N, yeso para Ca+S). Por eso las marcas usan múltiples sales: desacoplar lo que las sales simples atan.
- **Solver NNLS**: minimiza ||Ax−b||² con x≥0 (no negativos). A = matriz sal×elemento, b = objetivo − agua. Riesgo: si hay sales equivalentes, reparte → mejor elegir 1 sal limpia por nutriente (kitParaPerfil).

## 5. Targets por etapa (cannabis en coco, agua RO)
| Etapa | EC (mS/cm) | pH | N | P | K | Ca | Mg | S |
|-------|-----------|-----|---|---|---|-----|----|----|
| Plántula/clon | 0.6-0.9 | 5.8-6.0 | 75 | 30 | 90 | 80 | 30 | 40 |
| Vegetativo | 1.2-1.8 | 5.8-6.2 | 150 | 50 | 180 | 150 | 50 | 70 |
| Floración | 1.8-2.4 | 5.8-6.2 | 140 | 55 | 200 | 170 | 55 | 80 |
| Engorde/madurado | 2.0-2.6 | 6.0-6.2 | ↓100 | 55 | 210 | 150 | 50 | 90 |
| Finish (sin N) | 1.3-1.6 | 6.0-6.4 | 0 | 60 | 190 | 110 | 45 | 90 |
Micros flora (ppm): Fe 2-3, Mn 0.4-0.8, Zn 0.15-0.3, B 0.3-0.5, Cu 0.05-0.1, Mo 0.02-0.05.
pH coco 5.8-6.2 (óptima disponibilidad). NO regar a pH <5.5 (bloquea Ca/Mg) ni >6.5 (bloquea Fe/P/micros).

## 6. Ratios y antagonismos (competencia por absorción)
Se miden por MASA o mejor por meq. Referencias flora coco:
- **K:Ca ~1.0-1.2** — K alto bloquea Ca (blossom-end rot, deficiencia de Ca en puntas).
- **Ca:Mg ~3-4:1** — Ca alto frena Mg (clorosis internervial); Mg alto frena Ca.
- **K:Mg ~4-5:1** — K alto bloquea Mg.
- **N:K** baja de veg (más N) a flora (más K).
- **NO₃:NH₄ ~8-10:1** (5-15% NH₄) — más amonio = pH baja + plantas blandas.
- **Fe:Mn ~2:1** — se antagonizan mutuamente.
Regla: un elemento muy alto respecto a su antagonista causa deficiencia "fantasma" del otro aunque esté presente. Por eso importa el BALANCE, no solo la cantidad.

## 7. Diagnóstico de deficiencias (por movilidad)
- **Móviles** (deficiencia en hojas VIEJAS primero): N (amarilleo general desde abajo), P (púrpura/rojizo, morado en tallos), K (bordes quemados/necróticos, moteado), Mg (clorosis internervial en viejas, nervios verdes).
- **Inmóviles** (deficiencia en hojas NUEVAS/puntas): Ca (puntas retorcidas/marrones, hojas nuevas deformes), Fe (clorosis internervial en nuevas, nervios verdes finos), S (amarilleo uniforme en nuevas), B (puntas muertas, tallos huecos), Zn (entrenudos cortos, hojas chicas), Mn (clorosis con puntos), Mo (raro, borde amarillo).
Truco Mg vs Fe: ambos clorosis internervial, pero Mg = hojas VIEJAS, Fe = hojas NUEVAS.
Antes de "deficiencia" verificar pH (bloqueo) — 90% de los "problemas de nutrientes" son pH fuera de rango, no falta real.

## 8. Formulación y estabilidad de concentrados
- **Separación A/B**: Ca²⁺ precipita con SO₄²⁻ (yeso) y PO₄³⁻ (fosfato de Ca). Bidón A = calcio + nitrato + micros; Bidón B = sulfatos + fosfatos. Al tanque: A primero, agitar, luego B. Nunca juntar concentrados.
- **Sales poco solubles** (yeso, CaCO₃, MgO): NO se pueden concentrar líquidas → van en polvo seco al tanque (se disuelven a dilución final).
- **Solubilidad limitante en stock**: K₂SO₄ ~110 g/L, gluconato Ca ~35 g/L. Con factor 100x, verificar que ninguna sal supere su límite → bajar factor o usar grado soluble.
- **Estabilizantes**: pH del concentrado ~5 (con ácido cítrico) para que fosfato/Mg no precipiten; cítrico (buffer + quelante + antiox); benzoato de Na 150-250 mg/L (conservante anti-hongo); ác. ascórbico si el Fe se oxida marrón; EDDHA para mantener Fe soluble.
- **Solución stock (micros impesables)**: pesás grande (1 g), disolvés en 1 L, dosificás por mL (jeringa). Ej: 1 g molibdato en 1 L → 0.6 mL/L = 0.0006 g.

## 9. Química del agua
- Agua RO/ósmosis: EC <0.1, sin buffer → pH inestable (poca alcalinidad). Ventaja: partís de cero.
- Agua de canilla/pozo: trae Ca, Mg, Na, HCO₃⁻ (alcalinidad). Restar del objetivo. Alcalinidad (ppm CaCO₃) buffea el pH: neutralizar con ácido. 1 meq alcalinidad = 50 mg CaCO₃.
- Cloraminas/cloro: airear o usar el propio manejo; el HOCl (Athena Cleanse) SÍ va en reservorio (raíces limpias); el ácido peracético (Reset) NO va en raíces (solo superficies/equipos).

## 10. Fuentes y referencias
- **HydroBuddy** (Daniel Fernández, scienceinhydroponics.com) — calculadora y blog de química de nutrientes, el estándar open source.
- **Sonneveld & Voogt**, "Plant Nutrition of Greenhouse Crops" — ratios y soluciones nutritivas de referencia.
- **Steiner (1961)** — solución nutritiva universal balanceada por meq (ratios aniónicos/catiónicos).
- **Marschner**, "Mineral Nutrition of Higher Plants" — fisiología (la biblia).
- Coco: el sustrato secuestra Ca/Mg (CEC) → subir Ca/Mg vs hidro puro; buffer de coco importa.
- Cannabis específico: los "boosters PK" están sobrevendidos; N bajo en flora = mejor resina/aroma; el flush con agua está debunked (estudio RX Green Technologies) — la calidad la define el CURADO.

## Memorias/skills relacionados
`creador-fertilizantes` (config de la calc), `reference_hidroponia_sales_calcio`, `reference_estabilizantes_fertilizantes_liquidos`, `reference_precios_sales_fertirriego_ar`, `project_growflow_creador_nutrientes`.
