// ============================================================================
// Motor de cálculo de nutrientes — port completo de HydroBuddy a TS, en español.
// Modelo de 16 nutrientes (igual que HydroBuddy), base de sales real, solver
// NNLS, soluciones madre A/B, ratios, EC, costos y persistencia.
// Inspirado en HydroBuddy (Daniel Fernández, scienceinhydroponics.com).
// ============================================================================

import { supabase } from './supabase'

// 16 elementos, mismo orden y separación NO3/NH4 que HydroBuddy.
export type ElementKey =
  | 'NO3' | 'NH4' | 'P' | 'K' | 'Mg' | 'Ca' | 'S'
  | 'Fe' | 'Zn' | 'B' | 'Cu' | 'Mo' | 'Mn' | 'Na' | 'Si' | 'Cl'

export const ELEMENTOS: { key: ElementKey; label: string; grupo: 'macro' | 'micro' | 'otro' }[] = [
  { key: 'NO3', label: 'N (NO₃⁻) nítrico', grupo: 'macro' },
  { key: 'NH4', label: 'N (NH₄⁺) amoniacal', grupo: 'macro' },
  { key: 'P', label: 'Fósforo', grupo: 'macro' },
  { key: 'K', label: 'Potasio', grupo: 'macro' },
  { key: 'Mg', label: 'Magnesio', grupo: 'macro' },
  { key: 'Ca', label: 'Calcio', grupo: 'macro' },
  { key: 'S', label: 'Azufre', grupo: 'macro' },
  { key: 'Fe', label: 'Hierro', grupo: 'micro' },
  { key: 'Zn', label: 'Zinc', grupo: 'micro' },
  { key: 'B', label: 'Boro', grupo: 'micro' },
  { key: 'Cu', label: 'Cobre', grupo: 'micro' },
  { key: 'Mo', label: 'Molibdeno', grupo: 'micro' },
  { key: 'Mn', label: 'Manganeso', grupo: 'micro' },
  { key: 'Na', label: 'Sodio', grupo: 'otro' },
  { key: 'Si', label: 'Silicio', grupo: 'otro' },
  { key: 'Cl', label: 'Cloro', grupo: 'otro' },
]

export const N_TOTAL_KEYS: ElementKey[] = ['NO3', 'NH4']
export function nTotal(p: Partial<Record<ElementKey, number>>): number {
  return (p.NO3 ?? 0) + (p.NH4 ?? 0)
}

export type Bidon = 'A' | 'B' | 'C'

export interface Sal {
  id: string
  nombre: string
  formula?: string
  comp: Partial<Record<ElementKey, number>> // fracción elemental (0-1)
  bidon: Bidon
  liquido?: boolean       // concentrado líquido (composición %W/V)
  densidad?: number       // g/mL (si líquido)
  costoKg?: number        // costo por kg (o por L si líquido), ARS
  stock?: number          // cantidad que tenés en el galpón
  stockUnidad?: string    // kg, g, L
  nota?: string
  descripcion?: string    // qué es / para qué sirve (educativo)
  aditivo?: boolean       // estabilizante/conservante: no aporta nutrientes
  custom?: boolean
}

/** Descripción educativa por sal (qué es y para qué sirve). */
export const DESCRIPCIONES: Record<string, string> = {
  cano3_ag: 'Sal estrella del calcio. Aporta casi todo el Ca de la fórmula y de paso el nitrógeno nítrico. Es la base del bidón A de cualquier sistema (Athena, Ryanodine Calcis, etc.).',
  cano3_puro: 'Versión sin amonio. Más Ca y solo N nítrico. Útil si querés cero amonio.',
  cacl2: 'Aporta calcio SIN nitrógeno, pero mete cloruro. Es lo que usa el Athena Fade. Para finish si querés Ca sin sumar N.',
  yeso: 'Calcio + azufre baratos, pero poco soluble: solo sirve en seco o en sustrato, nunca en concentrado líquido.',
  caco3: 'Cal. Casi no se disuelve: se usa para subir pH/buffer del sustrato, no como nutriente en solución.',
  cagluc: 'Calcio LIMPIO de verdad: sin nitrógeno ni cloro. El guante (gluconato) no suelta el Ca. Ideal para reforzar Ca en finish/foliar.',
  caedta: 'Calcio quelatado. Aguanta pH alto. Caro y diluido en Ca: corrector foliar, no fuente base.',
  calact: 'Otro calcio limpio soluble, fácil de conseguir en alimentos/farmacia.',
  kno3: 'La fuente de potasio + nitrato más usada. Sube K y N juntos. Va en el bidón B.',
  mgno3: 'Magnesio sin azufre. Útil si ya tenés mucho sulfato y querés Mg igual.',
  nh4no3: 'Nitrógeno puro (mitad nítrico, mitad amoniacal). Muy soluble. Manejar con cuidado: mucho amonio quema.',
  amsulf: 'Nitrógeno amoniacal + azufre. El amonio baja el pH del sustrato (útil en coco).',
  urea: 'Nitrógeno barato y concentrado. En hidro se usa poco; el N amídico se asimila como amonio.',
  kcl: 'Potasio barato pero mete mucho cloro. Evitar en hidro salvo necesidad puntual.',
  khco3: 'Sube K y hace de buffer (sube pH) sin meter azufre ni nitrógeno. Clave en finalizadores como el Finis.',
  k2co3: 'Sube pH fuerte y aporta K. Más agresivo que el bicarbonato.',
  koh: 'Base pura para subir pH. Aporta algo de K. Manipular con cuidado.',
  mkp: 'El corazón de la floración/finish: fósforo + potasio, CERO nitrógeno. Lo que hay dentro de los PK boosters.',
  map: 'Fósforo + nitrógeno amoniacal. Alternativa al MKP cuando querés algo de N.',
  dap: 'Más nitrógeno amoniacal que el MAP. Ojo con el pH.',
  h3po4: 'Ácido fosfórico líquido: baja el pH y de paso aporta fósforo. Doble función.',
  k2so4: 'Potasio + azufre sin nitrógeno. Para subir K en flora sin tocar el N.',
  epsom: 'Sal de magnesio clásica (sulfato de Mg). Aporta Mg + S. Imprescindible, sobre todo en coco.',
  mgo: 'Magnesio muy concentrado pero poco soluble. Más para corregir sustrato.',
  feso4: 'Hierro barato pero se oxida y precipita fácil: solo con pH bajo y recién mezclado.',
  feedta: 'Hierro quelatado estándar. Bien hasta pH ~6.5. El más común.',
  fedtpa: 'Hierro quelatado para aguas un poco más duras (hasta pH ~7).',
  feeddha: 'El hierro rojo. Aguanta pH alto (hasta ~9). El mejor pero el más caro.',
  mnso4: 'Manganeso + azufre. Micro esencial.',
  mnedta: 'Manganeso quelatado, más estable.',
  znso4: 'Zinc + azufre. Micro esencial.',
  znedta: 'Zinc quelatado, más estable.',
  cuso4: 'Cobre + azufre. Micro, va en dosis muy chicas.',
  cuedta: 'Cobre quelatado, más estable.',
  boric: 'Boro (ácido bórico). Micro esencial; el margen entre poco y tóxico es chico.',
  solubor: 'Boro más soluble que el ácido bórico, ideal para foliar.',
  borax: 'Boro barato, mete algo de sodio.',
  namolib: 'Molibdeno. Se usa en cantidades mínimas.',
  amolib: 'Molibdeno sin sodio.',
  ksilic: 'Silicio + potasio: engrosa paredes celulares y da resistencia. Sube pH: va en bidón aparte.',
  masterblend: 'Sal compuesta "todo en uno" (NPK + micros quelatados). Con nitrato de calcio + Epsom armás un nutriente completo de 3 partes.',
}

/** Compatibilidad de mezcla en concentrado (qué NO puede compartir bidón). */
export function compatibilidad(sal: Sal): string {
  if (sal.aditivo) return 'Aditivo estabilizante: no aporta nutrientes. Se agrega al concentrado para que no decante/precipite (ver pestaña Estabilizantes para la dosis).'
  const ca = (sal.comp.Ca ?? 0) > 0
  const sp = (sal.comp.S ?? 0) > 0 || (sal.comp.P ?? 0) > 0
  if (ca && sp) return '⚠️ Tiene Ca y S/P juntos: usar en seco, no en concentrado líquido.'
  if (ca) return 'Va en bidón A (calcio) SOLO. No la mezcles concentrada con sulfatos ni fosfatos (precipita).'
  if (sp) return 'Va en bidón B. No la mezcles concentrada con sales de calcio (precipita).'
  if (sal.bidon === 'C') return 'Micro: mejor en bidón C aparte, con pH ligeramente ácido.'
  return 'Compatible con casi todo (no tiene Ca ni sulfato/fosfato fuerte).'
}

// Base de sales por defecto (composición elemental W/W, fracción).
// Replica el set de HydroBuddy + agregados útiles para coco/cannabis.
export const SALES_DEFECTO: Sal[] = [
  // --- Calcio / nitratos (bidón A) ---
  { id: 'cano3_ag', nombre: 'Nitrato de calcio (agrícola CN-9)', formula: 'Ca(NO₃)₂·NH₄·H₂O', bidon: 'A',
    comp: { Ca: 0.19, NO3: 0.144, NH4: 0.011 }, nota: 'Calcinit/YaraLiva. Caballo de batalla del Ca.' },
  { id: 'cano3_puro', nombre: 'Nitrato de calcio (puro anhidro)', formula: 'Ca(NO₃)₂', bidon: 'A',
    comp: { Ca: 0.244, NO3: 0.17 } },
  { id: 'cacl2', nombre: 'Cloruro de calcio', formula: 'CaCl₂·2H₂O', bidon: 'A',
    comp: { Ca: 0.273, Cl: 0.482 }, nota: 'Ca sin N. Mete cloro (es lo que usa Athena Fade).' },
  { id: 'yeso', nombre: 'Yeso (sulfato de calcio)', formula: 'CaSO₄·2H₂O', bidon: 'A',
    comp: { Ca: 0.233, S: 0.186 }, nota: 'Poco soluble: usar en seco.' },
  { id: 'caco3', nombre: 'Carbonato de calcio', formula: 'CaCO₃', bidon: 'A',
    comp: { Ca: 0.40 }, nota: 'Buffer de pH, casi insoluble.' },
  { id: 'cagluc', nombre: 'Gluconato de calcio', formula: 'C₁₂H₂₂CaO₁₄', bidon: 'A',
    comp: { Ca: 0.089 }, nota: 'Ca LIMPIO: sin N ni Cl. Quelante suave fiel al Ca.' },
  { id: 'caedta', nombre: 'Quelato de calcio (EDTA)', formula: 'Ca-EDTA', bidon: 'A',
    comp: { Ca: 0.097 }, nota: 'Ca quelatado, foliar/corrección.' },
  { id: 'calact', nombre: 'Lactato de calcio', formula: 'C₆H₁₀CaO₆', bidon: 'A',
    comp: { Ca: 0.13 }, nota: 'Ca limpio soluble.' },

  // --- Nitrógeno / potasio ---
  { id: 'kno3', nombre: 'Nitrato de potasio', formula: 'KNO₃', bidon: 'B',
    comp: { K: 0.387, NO3: 0.139 } },
  { id: 'mgno3', nombre: 'Nitrato de magnesio', formula: 'Mg(NO₃)₂·6H₂O', bidon: 'B',
    comp: { Mg: 0.094, NO3: 0.109 } },
  { id: 'nh4no3', nombre: 'Nitrato de amonio', formula: 'NH₄NO₃', bidon: 'B',
    comp: { NO3: 0.175, NH4: 0.175 } },
  { id: 'amsulf', nombre: 'Sulfato de amonio', formula: '(NH₄)₂SO₄', bidon: 'B',
    comp: { NH4: 0.212, S: 0.242 } },
  { id: 'urea', nombre: 'Urea', formula: 'CO(NH₂)₂', bidon: 'B',
    comp: { NH4: 0.466 }, nota: 'N amídico (se asimila como NH4).' },
  { id: 'kcl', nombre: 'Cloruro de potasio', formula: 'KCl', bidon: 'B',
    comp: { K: 0.524, Cl: 0.476 } },
  { id: 'khco3', nombre: 'Bicarbonato de potasio', formula: 'KHCO₃', bidon: 'B',
    comp: { K: 0.391 }, nota: 'Buffer de pH (sube). K sin S ni N.' },
  { id: 'k2co3', nombre: 'Carbonato de potasio', formula: 'K₂CO₃', bidon: 'B',
    comp: { K: 0.566 }, nota: 'Sube pH fuerte.' },
  { id: 'koh', nombre: 'Hidróxido de potasio', formula: 'KOH', bidon: 'B',
    comp: { K: 0.697 }, nota: 'Base para subir pH.' },

  // --- Fósforo ---
  { id: 'mkp', nombre: 'Fosfato monopotásico (MKP)', formula: 'KH₂PO₄', bidon: 'B',
    comp: { P: 0.228, K: 0.287 }, nota: 'Corazón del finish. Cero N.' },
  { id: 'map', nombre: 'Fosfato monoamónico (MAP)', formula: 'NH₄H₂PO₄', bidon: 'B',
    comp: { NH4: 0.122, P: 0.269 } },
  { id: 'dap', nombre: 'Fosfato diamónico (DAP)', formula: '(NH₄)₂HPO₄', bidon: 'B',
    comp: { NH4: 0.212, P: 0.233 } },
  { id: 'h3po4', nombre: 'Ácido fosfórico (75%)', formula: 'H₃PO₄', bidon: 'B', liquido: true, densidad: 1.57,
    comp: { P: 0.237 }, nota: 'Líquido. Baja pH y aporta P.' },

  // --- Azufre / magnesio ---
  { id: 'k2so4', nombre: 'Sulfato de potasio', formula: 'K₂SO₄', bidon: 'B',
    comp: { K: 0.449, S: 0.184 } },
  { id: 'epsom', nombre: 'Sulfato de magnesio (Epsom)', formula: 'MgSO₄·7H₂O', bidon: 'B',
    comp: { Mg: 0.098, S: 0.130 } },
  { id: 'mgo', nombre: 'Óxido de magnesio', formula: 'MgO', bidon: 'B',
    comp: { Mg: 0.603 }, nota: 'Muy concentrado, baja solubilidad.' },

  // --- Micros: hierro ---
  { id: 'feso4', nombre: 'Sulfato de hierro', formula: 'FeSO₄·7H₂O', bidon: 'C',
    comp: { Fe: 0.201, S: 0.115 }, nota: 'Se oxida; usar con pH bajo.' },
  { id: 'feedta', nombre: 'Quelato de hierro (EDTA)', formula: 'Fe-EDTA', bidon: 'C',
    comp: { Fe: 0.13 }, nota: 'Aguanta hasta pH ~6.5.' },
  { id: 'fedtpa', nombre: 'Quelato de hierro (DTPA)', formula: 'Fe-DTPA', bidon: 'C',
    comp: { Fe: 0.11 }, nota: 'Aguanta hasta pH ~7.' },
  { id: 'feeddha', nombre: 'Quelato de hierro (EDDHA)', formula: 'Fe-EDDHA', bidon: 'C',
    comp: { Fe: 0.06 }, nota: 'El rojo. Aguanta pH alto.' },
  // --- Micros: resto ---
  { id: 'mnso4', nombre: 'Sulfato de manganeso', formula: 'MnSO₄·H₂O', bidon: 'C',
    comp: { Mn: 0.325, S: 0.19 } },
  { id: 'mnedta', nombre: 'Quelato de manganeso (EDTA)', formula: 'Mn-EDTA', bidon: 'C',
    comp: { Mn: 0.13 } },
  { id: 'znso4', nombre: 'Sulfato de zinc', formula: 'ZnSO₄·7H₂O', bidon: 'C',
    comp: { Zn: 0.227, S: 0.11 } },
  { id: 'znedta', nombre: 'Quelato de zinc (EDTA)', formula: 'Zn-EDTA', bidon: 'C',
    comp: { Zn: 0.14 } },
  { id: 'cuso4', nombre: 'Sulfato de cobre', formula: 'CuSO₄·5H₂O', bidon: 'C',
    comp: { Cu: 0.255, S: 0.128 } },
  { id: 'cuedta', nombre: 'Quelato de cobre (EDTA)', formula: 'Cu-EDTA', bidon: 'C',
    comp: { Cu: 0.13 } },
  { id: 'boric', nombre: 'Ácido bórico', formula: 'H₃BO₃', bidon: 'C',
    comp: { B: 0.175 } },
  { id: 'solubor', nombre: 'Solubor', formula: 'Na₂B₈O₁₃·4H₂O', bidon: 'C',
    comp: { B: 0.205, Na: 0.06 } },
  { id: 'borax', nombre: 'Bórax', formula: 'Na₂B₄O₇·10H₂O', bidon: 'C',
    comp: { B: 0.113, Na: 0.121 } },
  { id: 'namolib', nombre: 'Molibdato de sodio', formula: 'Na₂MoO₄·2H₂O', bidon: 'C',
    comp: { Mo: 0.397, Na: 0.19 } },
  { id: 'amolib', nombre: 'Molibdato de amonio', formula: '(NH₄)₆Mo₇O₂₄', bidon: 'C',
    comp: { Mo: 0.54, NH4: 0.057 } },
  { id: 'ksilic', nombre: 'Silicato de potasio', formula: 'K₂SiO₃', bidon: 'C',
    comp: { Si: 0.18, K: 0.20 }, nota: 'Aporta Si. Sube pH; va en bidón aparte.' },

  // --- Compuestas ---
  { id: 'masterblend', nombre: 'Masterblend 4-18-38', bidon: 'B',
    comp: { NO3: 0.038, NH4: 0.002, P: 0.0785, K: 0.315, Mg: 0.015, S: 0.03, Fe: 0.004, Mn: 0.002, Zn: 0.0005, Cu: 0.0005, B: 0.002, Mo: 0.0001 },
    nota: 'Base completa con micros quelatados adentro.' },

  // --- Aditivos / estabilizantes (no aportan nutrientes; el solver los ignora) ---
  { id: 'add_citrico', nombre: 'Ácido cítrico', formula: 'C₆H₈O₇', bidon: 'B', aditivo: true, comp: {},
    descripcion: 'Aditivo: baja el pH del concentrado a ~5, quela suave y mantiene el hierro reducido. Dosis 1–2 g/L. Triple función (buffer + quelante + antioxidante).' },
  { id: 'add_benzoato', nombre: 'Benzoato de sodio', formula: 'NaC₇H₅O₂', bidon: 'B', aditivo: true, comp: {},
    descripcion: 'Aditivo conservante: evita que hongos/bacterias formen barro comiéndose los quelatos. 150–250 mg/L (máx 400). Lo usan casi todas las marcas sin declararlo.' },
  { id: 'add_ascorbico', nombre: 'Ácido ascórbico (vit. C)', formula: 'C₆H₈O₆', bidon: 'B', aditivo: true, comp: {},
    descripcion: 'Aditivo antioxidante: mantiene el Fe²⁺ reducido para que no precipite marrón. 0.1–0.3 g/L.' },
  { id: 'add_xantica', nombre: 'Goma xántica', formula: '(C₃₅H₄₉O₂₉)ₙ', bidon: 'B', aditivo: true, comp: {},
    descripcion: 'Aditivo anti-sedimentante: da cuerpo y evita que las partículas asienten en el fondo. 1–2 g/L (0.1–0.2%).' },
  { id: 'add_sorbato', nombre: 'Sorbato de potasio', formula: 'KC₆H₇O₂', bidon: 'B', aditivo: true, comp: {},
    descripcion: 'Aditivo conservante grado alimenticio, alternativa al benzoato. 0.01–1%.' },

  // --- Productos comerciales Ryanodine Labs (composición de etiqueta → elemental) ---
  { id: 'ryano_calcis', nombre: 'Ryanodine Calcis (C)', bidon: 'A', liquido: true, densidad: 1.1,
    comp: { NO3: 0.0248, NH4: 0.0019, Ca: 0.032 },
    descripcion: 'Comercial Ryanodine: fuente de calcio + nitrógeno nítrico. Es el bidón A del sistema. Se dosifica al final, después de A y B.' },
  { id: 'ryano_makro', nombre: 'Ryanodine Makro (A)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NH4: 0.0098, P: 0.0115, K: 0.0473, S: 0.0182 },
    descripcion: 'Comercial Ryanodine (sistema 3 partes): macros sin calcio. N 100% amoniacal, P, K, S.' },
  { id: 'ryano_mikro', nombre: 'Ryanodine Mikro (B)', bidon: 'C', liquido: true, densidad: 1.1,
    comp: { Mg: 0.01, S: 0.0135, Fe: 0.00109, Mn: 0.0002, Zn: 0.00005, B: 0.00008, Cu: 0.00003, Mo: 0.000005 },
    descripcion: 'Comercial Ryanodine: micros quelatados + magnesio. Fe EDDHA, Mn/Zn/Cu EDTA, B, Mo.' },
  { id: 'ryano_maikro', nombre: 'Ryanodine Maikro (AB)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NH4: 0.0098, P: 0.0115, K: 0.0472, S: 0.0317, Mg: 0.01, Fe: 0.00109, Mn: 0.0002, Zn: 0.00004, Cu: 0.00003, B: 0.00008, Mo: 0.000005 },
    descripcion: 'Comercial Ryanodine (sistema 2 partes): Makro + Mikro fusionados. Todo menos el calcio. Dosis típica 4 ml/L.' },
  { id: 'ryano_finis', nombre: 'Ryanodine Finis (finalizador)', bidon: 'B',
    comp: { P: 0.0659, K: 0.2058, Ca: 0.1082, S: 0.1254 },
    descripcion: 'Comercial Ryanodine: finalizador 0-15-25 en polvo. Cero N. Uso: 0.91 g/L + 4 ml/L de Mikro, pH 6.0-6.4, últimas 2-3 semanas. Trae Ca y S altos.' },
  { id: 'ryano_radics', nombre: 'Ryanodine Radics / Mini-Radics (enraizante)', formula: 'IBA 0.31%', bidon: 'C', aditivo: true, comp: {},
    descripcion: 'Hormona de enraizado en gel: ácido indol-3-butírico (IBA) 0.31% + excipientes. NO es nutriente. Untar la base del clon 3-5 cm e introducir en el sustrato. Un solo uso, descartar el sobrante. Refrigerar 2-9°C. Rinde +25 clones (7 g).' },

  // --- Advanced Nutrients Sensi Professional Grow (polvo, discontinuado) ---
  { id: 'an_sensi_grow_a', nombre: 'AN Sensi Pro Grow A (9-10-28)', bidon: 'B',
    comp: { NO3: 0.05, NH4: 0.04, P: 0.0436, K: 0.2324, Mg: 0.015, S: 0.02, Fe: 0.001, Mn: 0.0005, Zn: 0.00015, Cu: 0.0001, B: 0.0002, Mo: 0.0001 },
    descripcion: 'Comercial Advanced Nutrients (Sensi Pro Grow, polvo): base macros + micros quelatados (3 formas de Fe: DTPA/EDDHA/EDTA). Dosis ~0.46 g/L por EC 1.0, en partes iguales con B. Micros aproximados (ficha discontinuada).' },
  { id: 'an_sensi_grow_b', nombre: 'AN Sensi Pro Grow B (15-0-0)', bidon: 'A',
    comp: { NO3: 0.14, NH4: 0.01, Ca: 0.18 },
    descripcion: 'Comercial Advanced Nutrients (Sensi Pro Grow B, polvo): es el CALCIO del sistema (nitrato de calcio-amónico doble sal). Va en bidón A. Misma dosis que la Parte A.' },
  { id: 'an_sensi_bloom_a', nombre: 'AN Sensi Pro Bloom A (~3-16-30)', bidon: 'B',
    comp: { NH4: 0.02, NO3: 0.01, P: 0.0698, K: 0.249, Mg: 0.012, S: 0.018, Fe: 0.001, Mn: 0.0005, Zn: 0.00015, Cu: 0.0001, B: 0.0002, Mo: 0.0001 },
    descripcion: 'Comercial Advanced Nutrients (Sensi Pro Bloom A, polvo): base P-K de floración + micros quelatados (3 formas de Fe) + urea. NPK y micros APROXIMADOS (ficha discontinuada, no publicada).' },
  { id: 'an_sensi_bloom_b', nombre: 'AN Sensi Pro Bloom B (17-0-6)', bidon: 'A',
    comp: { NO3: 0.15, NH4: 0.02, K: 0.0498, Ca: 0.12 },
    descripcion: 'Comercial Advanced Nutrients (Sensi Pro Bloom B, polvo): aporta N + calcio + algo de K (nitrato de calcio/potasio). Va en bidón A. NPK 17-0-6 confirmado; Ca estimado.' },

  // --- Athena (Pro Line en polvo + finishers) ---
  { id: 'athena_pro_core', nombre: 'Athena Pro Core (14-0-0)', bidon: 'A',
    comp: { NO3: 0.14, Ca: 0.16, Fe: 0.001, Mn: 0.0005, Zn: 0.00015, Cu: 0.0001, B: 0.0002, Mo: 0.0001 },
    descripcion: 'Comercial Athena Pro Line: la base de calcio + nitrógeno + micros quelatados (nitrato de Ca, Fe/Mn/Cu/Zn EDTA, ác. bórico, molibdato Na). Va en bidón A. Se usa SIEMPRE (veg y flora) junto a Grow o Bloom. Ca estimado ~16%.' },
  { id: 'athena_pro_grow', nombre: 'Athena Pro Grow (2-8-20)', bidon: 'B',
    comp: { NO3: 0.01, NH4: 0.01, P: 0.0349, K: 0.166, Mg: 0.03, S: 0.08, Fe: 0.001 },
    descripcion: 'Comercial Athena Pro Line: base vegetativa P-K-Mg-S + Fe DTPA. NPK 2-8-20, Mg 3%, S 8%, Fe 0.1% confirmados. Va en bidón B, con Pro Core.' },
  { id: 'athena_pro_bloom', nombre: 'Athena Pro Bloom (0-12-24)', bidon: 'B',
    comp: { P: 0.0524, K: 0.1992, Mg: 0.015, S: 0.04, Fe: 0.001 },
    descripcion: 'Comercial Athena Pro Line: base de floración P-K. NPK 0-12-24 confirmado; Mg/S estimados. Va en bidón B, con Pro Core.' },
  { id: 'athena_fade', nombre: 'Athena Fade (finalizador Ca + micros)', bidon: 'A',
    comp: { Ca: 0.04, Cl: 0.07, Fe: 0.0008, Mn: 0.0004, Zn: 0.0002, Cu: 0.0001, B: 0.0003, Mo: 0.00005 },
    descripcion: 'Comercial Athena: finalizador SIN nitrógeno que aporta calcio + micros quelatados completos (cloruro de calcio + Fe/Mn/Zn/Cu-EDTA + B + Mo). Reemplaza al Pro Core en las últimas 3 semanas, junto a un PK (Pro Bloom). OJO: mete cloro (Cl ~7%). Para un finish completo: Fade + base PK + Mg.' },
  { id: 'athena_balance', nombre: 'Athena Balance (0-0-2)', bidon: 'C',
    comp: { K: 0.0166, Si: 0.01 },
    descripcion: 'Comercial Athena: aporta silicio (silicato de potasio) para estructura/resistencia y ayuda a balancear pH. Va aparte (sube pH). NPK 0-0-2.' },
  { id: 'athena_cleanse', nombre: 'Athena Cleanse (limpieza)', formula: 'HOCl', bidon: 'C', aditivo: true, comp: {},
    descripcion: 'Comercial Athena: NO es nutriente. Ácido hipocloroso (HOCl) derivado de sal, limpia raíces/sistema de riego y previene acumulación mineral/biofilm. Es un sanitizante, no aporta nada nutritivo.' },

  // --- Jacks 321 (JR Peters) — sistema de 3 sales ---
  { id: 'jacks_a', nombre: 'Jacks 5-12-26 (Parte A)', bidon: 'B',
    comp: { NO3: 0.05, P: 0.0524, K: 0.2158, Mg: 0.03, S: 0.013, Fe: 0.0015, Mn: 0.0005, Zn: 0.0005, Cu: 0.0005, B: 0.0002, Mo: 0.00001 },
    descripcion: 'Comercial Jacks 321 (JR Peters): la sal compuesta base (P-K-Mg + micros). Se combina con nitrato de calcio (parte 2) y Epsom (parte 3). Ratio clásico 3.6g A : 2.4g CaNO3 : 1.2g Epsom por galón.' },
  // (Las partes 2 y 3 de Jacks ya están: 'cano3_ag' nitrato de calcio + 'epsom')

  // --- Canna Coco A+B (líquido) — valores aproximados de etiqueta ---
  { id: 'canna_coco_a', nombre: 'Canna Coco A (aprox)', bidon: 'A', liquido: true, densidad: 1.1,
    comp: { NO3: 0.015, NH4: 0.003, Ca: 0.015, K: 0.01 },
    descripcion: 'Comercial Canna Coco A (líquido): aporta calcio + nitrógeno (parte A). Valores APROXIMADOS (Canna no publica análisis detallado). Se usa en partes iguales con B.' },
  { id: 'canna_coco_b', nombre: 'Canna Coco B (aprox)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { P: 0.008, K: 0.02, Mg: 0.005, S: 0.007, Fe: 0.0002, Mn: 0.0001, Zn: 0.00005, B: 0.0001 },
    descripcion: 'Comercial Canna Coco B (líquido): P-K-Mg-S + micros (parte B). Valores APROXIMADOS. Va con Canna Coco A en partes iguales.' },

  // --- Plagron — líneas Terra, Coco, Hydro, Alga + boosters ---
  { id: 'plagron_terra_grow', nombre: 'Plagron Terra Grow (3-1-3)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NO3: 0.02, NH4: 0.01, P: 0.0044, K: 0.0249, Mg: 0.003, S: 0.004 },
    descripcion: 'Comercial Plagron (línea Terra/tierra): base de crecimiento mineral completa. NPK 3-1-3 confirmado. Botella única (incluye lo necesario para tierra).' },
  { id: 'plagron_terra_bloom', nombre: 'Plagron Terra Bloom (2-2-4)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NO3: 0.015, NH4: 0.005, P: 0.0087, K: 0.0332, Mg: 0.003, S: 0.004 },
    descripcion: 'Comercial Plagron (línea Terra): base de floración. NPK 2-2-4 confirmado.' },
  { id: 'plagron_coco_a', nombre: 'Plagron Coco A (aprox)', bidon: 'A', liquido: true, densidad: 1.1,
    comp: { NO3: 0.015, NH4: 0.003, Ca: 0.015, K: 0.01 },
    descripcion: 'Comercial Plagron Coco A (líquido): calcio + nitrógeno. Valores APROXIMADOS. Va con Coco B en partes iguales.' },
  { id: 'plagron_coco_b', nombre: 'Plagron Coco B (aprox)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { P: 0.008, K: 0.02, Mg: 0.005, S: 0.007, Fe: 0.0002, Mn: 0.0001, Zn: 0.00005, B: 0.0001 },
    descripcion: 'Comercial Plagron Coco B (líquido): P-K-Mg-S + micros. Valores APROXIMADOS.' },
  { id: 'plagron_hydro_a', nombre: 'Plagron Hydro A (aprox)', bidon: 'A', liquido: true, densidad: 1.1,
    comp: { NO3: 0.015, NH4: 0.003, Ca: 0.016, K: 0.01 },
    descripcion: 'Comercial Plagron Hydro A (líquido): calcio + nitrógeno para hidroponía. Valores APROXIMADOS.' },
  { id: 'plagron_hydro_b', nombre: 'Plagron Hydro B (aprox)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { P: 0.009, K: 0.022, Mg: 0.005, S: 0.008, Fe: 0.0002, Mn: 0.0001, Zn: 0.00005, B: 0.0001 },
    descripcion: 'Comercial Plagron Hydro B (líquido): P-K-Mg-S + micros para hidroponía. Valores APROXIMADOS.' },
  { id: 'plagron_alga_grow', nombre: 'Plagron Alga Grow (~4-1-5, orgánico)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NH4: 0.04, P: 0.0044, K: 0.0415 },
    descripcion: 'Comercial Plagron (línea Natural): fertilizante orgánico a base de algas para crecimiento. N orgánico. NPK aproximado.' },
  { id: 'plagron_alga_bloom', nombre: 'Plagron Alga Bloom (3-2-5, orgánico)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { NH4: 0.033, P: 0.01, K: 0.0448, Mg: 0.005, S: 0.005, Ca: 0.005, Fe: 0.0001 },
    descripcion: 'Comercial Plagron Alga Bloom (orgánico a base de algas): N orgánico 3.3, P2O5 2.3, K2O 5.4 confirmados + Mg/S/Ca/micros. Para floración en tierra.' },
  { id: 'plagron_green_sensation', nombre: 'Plagron Green Sensation (0-8-9)', bidon: 'B', liquido: true, densidad: 1.1,
    comp: { P: 0.0349, K: 0.0747 },
    descripcion: 'Comercial Plagron: booster de floración 4-en-1 (PK + resistencia + suelo + rendimiento). NPK 0-8-9 confirmado. Se suma a la base.' },
  { id: 'plagron_sugar_royal', nombre: 'Plagron Sugar Royal (booster)', bidon: 'C', aditivo: true, comp: {},
    descripcion: 'Comercial Plagron: booster de sabor/azúcares, acorta el ciclo. No aporta NPK relevante; es un aditivo organoléptico.' },
  { id: 'plagron_power_roots', nombre: 'Plagron Power Roots (enraizante)', bidon: 'C', aditivo: true, comp: {},
    descripcion: 'Comercial Plagron: estimulador de raíces (no es nutriente). Mejora el desarrollo radicular en clones/trasplante.' },
  { id: 'plagron_pure_zym', nombre: 'Plagron Pure Zym (enzimas)', bidon: 'C', aditivo: true, comp: {},
    descripcion: 'Comercial Plagron: enzimas que descomponen restos radiculares y mejoran el sustrato. Aditivo, no aporta nutrientes.' },
]

export type Perfil = Partial<Record<ElementKey, number>> // ppm objetivo

// Detección de productos comerciales (para clonarlos con sales sueltas).
const PREFIJOS_COMERCIALES = ['ryano_', 'an_sensi_', 'athena_', 'jacks_', 'canna_', 'plagron_']
export function esComercial(sal: Sal): boolean {
  return PREFIJOS_COMERCIALES.some(p => sal.id.startsWith(p))
}
export function marcaDe(sal: Sal): string {
  if (sal.id.startsWith('ryano_')) return 'Ryanodine'
  if (sal.id.startsWith('an_sensi_')) return 'Advanced Nutrients'
  if (sal.id.startsWith('athena_')) return 'Athena'
  if (sal.id.startsWith('jacks_')) return 'Jacks'
  if (sal.id.startsWith('canna_')) return 'Canna'
  if (sal.id.startsWith('plagron_')) return 'Plagron'
  return 'Otro'
}
/** Categoría de una sal para agrupar la lista (orden + etiqueta). */
export function categoriaSal(sal: Sal): { orden: number; label: string } {
  if (esComercial(sal)) {
    const marca = marcaDe(sal)
    const idx = ['Ryanodine', 'Advanced Nutrients', 'Athena', 'Jacks', 'Canna', 'Plagron'].indexOf(marca)
    return { orden: 100 + (idx < 0 ? 9 : idx), label: 'Comercial · ' + marca }
  }
  if (sal.aditivo) return { orden: 90, label: 'Aditivos y estabilizantes' }
  const c = sal.comp
  if ((c.Ca ?? 0) > 0) return { orden: 10, label: 'Calcio' }
  if (sal.bidon === 'C') return { orden: 60, label: 'Micronutrientes' }
  if ((c.P ?? 0) > 0) return { orden: 30, label: 'Fósforo' }
  if ((c.Mg ?? 0) > 0) return { orden: 50, label: 'Magnesio y azufre' }
  if ((c.K ?? 0) > 0) return { orden: 40, label: 'Potasio' }
  if ((c.NO3 ?? 0) > 0 || (c.NH4 ?? 0) > 0) return { orden: 20, label: 'Nitrógeno' }
  return { orden: 80, label: 'Otros' }
}

/**
 * Selector inteligente de sales: dado un perfil objetivo, elige UNA fuente limpia
 * por nutriente (como hace cualquier marca pro) y SOLO los micros que se piden.
 * Evita que el solver arrastre elementos no deseados. Devuelve los ids de sal.
 */
export interface OpcionesKit {
  feChelate?: string        // id del quelato de hierro a usar (default feeddha)
  microsQuelatados?: boolean // true = Mn/Zn/Cu EDTA (como las marcas premium); false = sulfatos (barato)
}
/** Opciones de sales según cómo formula cada marca (tipo de hierro y micros). */
export function opcionesDeMarca(salId: string): OpcionesKit {
  if (salId.startsWith('athena_')) return { feChelate: 'fedtpa', microsQuelatados: true }   // Athena usa Fe-DTPA + micros EDTA
  if (salId.startsWith('an_sensi_')) return { feChelate: 'feeddha', microsQuelatados: true } // AN: 3 hierros + micros EDTA
  if (salId.startsWith('ryano_')) return { feChelate: 'feeddha', microsQuelatados: true }    // Ryanodine: Fe-EDDHA + micros EDTA
  return {} // Jacks/Canna/Plagron: sulfatos + EDDHA (defaults económicos)
}

export function kitParaPerfil(p: Perfil, opts: OpcionesKit = {}): string[] {
  const has = (k: ElementKey) => (p[k] ?? 0) > 0
  const N = nTotal(p)
  const kit = new Set<string>()
  const fe = opts.feChelate ?? 'feeddha'
  const mn = opts.microsQuelatados ? 'mnedta' : 'mnso4'
  const zn = opts.microsQuelatados ? 'znedta' : 'znso4'
  const cu = opts.microsQuelatados ? 'cuedta' : 'cuso4'
  // --- Calcio (bidón A) ---
  if (has('Ca')) {
    if (has('NO3') || N > 0) kit.add('cano3_ag')          // Ca + N nítrico (parte A de toda marca)
    else { kit.add('cagluc'); if (has('S')) kit.add('yeso') } // finish: Ca limpio sin N
  }
  // --- Fósforo (MKP limpio, cero N) ---
  if (has('P')) kit.add('mkp')
  // --- N amoniacal: elegir la fuente más limpia según qué más pide el perfil ---
  if (has('NH4')) {
    if (has('NO3')) kit.add('nh4no3')      // NH4 + NO3 sin S ni P (ideal: cubre el amoniacal sin tocar nada)
    else if (has('S')) kit.add('amsulf')   // NH4 + S (cuando no hay nítrico pero sí azufre)
    else if (has('P')) kit.add('map')      // NH4 + P (sin nítrico ni azufre)
    else kit.add('amsulf')                 // NH4 solo
  }
  // --- Potasio ---
  if (has('K')) {
    if (N > 0) kit.add('kno3')      // K + N nítrico
    if (has('S')) kit.add('k2so4')  // K + S
    kit.add('khco3')                // K PURO de respaldo (sin S/N/P): cubre el K alto que las otras no alcanzan
  }
  // --- Silicio (silicato de potasio; va en bidón aparte, sube pH) ---
  if (has('Si')) kit.add('ksilic')
  // --- Magnesio ---
  if (has('Mg')) kit.add('epsom')
  // --- Azufre, si todavía no hay ninguna fuente ---
  if (has('S') && !kit.has('k2so4') && !kit.has('epsom') && !kit.has('yeso')) kit.add('k2so4')
  // --- Micros: SOLO el que se pide, con el quelato/forma de la marca ---
  if (has('Fe')) kit.add(fe)
  if (has('Mn')) kit.add(mn)
  if (has('Zn')) kit.add(zn)
  if (has('Cu')) kit.add(cu)
  if (has('B')) kit.add('boric')
  if (has('Mo')) kit.add('namolib')
  return [...kit]
}

/** Genera el perfil ppm objetivo de un producto a una dosis (g/L de producto). */
export function perfilDesdeProducto(sal: Sal, doseGL: number): Perfil {
  const out: Perfil = {}
  for (const [k, v] of Object.entries(sal.comp) as [ElementKey, number][]) {
    if (v) out[k] = +(v * doseGL * 1000).toFixed(2)
  }
  return out
}

export interface PresetPerfil { id: string; nombre: string; desc: string; perfil: Perfil }

export const PRESETS: PresetPerfil[] = [
  { id: 'plantula', nombre: 'Plántula/clon', desc: 'EC ~0.6', perfil: { NO3: 70, NH4: 5, P: 30, K: 90, Ca: 80, Mg: 30, S: 40, Fe: 1.5, Mn: 0.3, Zn: 0.15, B: 0.3, Cu: 0.05, Mo: 0.05 } },
  { id: 'veg', nombre: 'Vegetativo (coco)', desc: 'EC ~1.4', perfil: { NO3: 140, NH4: 15, P: 50, K: 180, Ca: 150, Mg: 50, S: 70, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4, Cu: 0.08, Mo: 0.05 } },
  { id: 'flora', nombre: 'Floración (coco)', desc: 'EC ~2.0', perfil: { NO3: 125, NH4: 15, P: 55, K: 200, Ca: 170, Mg: 55, S: 80, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4, Cu: 0.08, Mo: 0.05 } },
  { id: 'finish', nombre: 'Finalización completa (sin N)', desc: 'PK + Ca + Mg + micros, cero N. Como Finis + Fade + micros juntos.',
    perfil: { P: 60, K: 187, Ca: 110, Mg: 45, S: 90, Fe: 1.5, Mn: 0.4, Zn: 0.15, B: 0.3, Cu: 0.05, Mo: 0.04 } },
  { id: 'fade', nombre: 'Fade Athena (Ca + micros)', desc: 'El aporte del Fade: calcio + micros sin N (se suma a un PK). Reemplaza al Pro Core en finish.',
    perfil: { Ca: 120, Mg: 40, Fe: 1.5, Mn: 0.4, Zn: 0.15, B: 0.3, Cu: 0.05, Mo: 0.04 } },
]

// Rangos objetivo min/max por elemento (estilo NuteMix). Verde si caés dentro.
export type RangoPerfil = Partial<Record<ElementKey, { min: number; max: number }>>

export const RANGOS_FLORA_COCO: RangoPerfil = {
  NO3: { min: 100, max: 160 }, NH4: { min: 5, max: 25 }, P: { min: 40, max: 70 },
  K: { min: 170, max: 240 }, Ca: { min: 140, max: 200 }, Mg: { min: 45, max: 70 },
  S: { min: 50, max: 120 }, Fe: { min: 1.5, max: 3 }, Mn: { min: 0.3, max: 0.8 },
  Zn: { min: 0.1, max: 0.3 }, B: { min: 0.2, max: 0.5 }, Cu: { min: 0.03, max: 0.1 }, Mo: { min: 0.02, max: 0.08 },
}

/** Estado de un elemento contra su rango: 'bajo' | 'ok' | 'alto' | 'sin'. */
export function estadoRango(valor: number, rango?: { min: number; max: number }): 'bajo' | 'ok' | 'alto' | 'sin' {
  if (!rango) return 'sin'
  if (valor < rango.min) return 'bajo'
  if (valor > rango.max) return 'alto'
  return 'ok'
}

// Kits de sales curados: conjuntos mínimos y limpios (1 sal por nutriente,
// separación A/B/C correcta, sin cloro ni redundancia). Resuelven el problema
// de que el solver reparta en muchas sales equivalentes.
// Dosis recomendada de uso de cada producto comercial (g/L sólidos, mL/L líquidos),
// para que al clonar el perfil quede a la concentración REAL de uso de esa marca.
export const DOSIS_REC: Record<string, number> = {
  // Ryanodine (líquidos, mL/L)
  ryano_calcis: 4, ryano_makro: 4, ryano_mikro: 4, ryano_maikro: 4, ryano_finis: 0.91,
  // Advanced Nutrients Sensi Pro (polvo, g/L) — ~0.46 g/L por EC 1.0
  an_sensi_grow_a: 1, an_sensi_grow_b: 1, an_sensi_bloom_a: 1, an_sensi_bloom_b: 1,
  // Athena Pro (polvo, g/L) — dosis baja, ~Ca 150 en uso
  athena_pro_core: 0.9, athena_pro_grow: 0.9, athena_pro_bloom: 0.9, athena_fade: 1, athena_balance: 0.5,
  // Jacks (g/L)
  jacks_a: 0.65,
  // Canna (líquido, mL/L)
  canna_coco_a: 4, canna_coco_b: 4,
  // Plagron (líquido, mL/L)
  plagron_terra_grow: 5, plagron_terra_bloom: 5, plagron_coco_a: 4, plagron_coco_b: 4,
  plagron_hydro_a: 4, plagron_hydro_b: 4, plagron_alga_grow: 5, plagron_alga_bloom: 5,
  plagron_green_sensation: 1.5,
}

export interface KitSales { id: string; nombre: string; desc: string; sales: string[] }
export const KITS_SALES: KitSales[] = [
  { id: 'limpio', nombre: 'Kit limpio (recomendado)',
    desc: 'Calidad pro: 1 sal por nutriente, sin cloro, sin redundancia. A=nitrato Ca · B=nitrato K+MKP+sulfato K+Epsom · C=micros.',
    sales: ['cano3_ag', 'kno3', 'mkp', 'k2so4', 'epsom', 'feeddha', 'mnso4', 'znso4', 'cuso4', 'boric', 'namolib'] },
  { id: 'economico', nombre: 'Kit económico',
    desc: 'El más barato por nutriente (MAP en vez de MKP, sulfato de hierro). Mete algo de N amoniacal.',
    sales: ['cano3_ag', 'kno3', 'map', 'k2so4', 'epsom', 'feso4', 'mnso4', 'znso4', 'cuso4', 'boric', 'namolib'] },
  { id: 'finish', nombre: 'Kit finish (sin N)',
    desc: 'Finalización PK sin nitrógeno. El azufre sale de sulfato de K + yeso (no de micros, que ensucian). Ca limpio.',
    sales: ['mkp', 'k2so4', 'khco3', 'yeso', 'cagluc'] },
]

export interface ResultadoSal { sal: Sal; gramosPorL: number }
export interface Resultado {
  dosis: ResultadoSal[]
  ppmLogrado: Record<ElementKey, number>
  ppmObjetivo: Perfil
}

/** NNLS por updates multiplicativos: minimiza ||A x - b||² con x>=0. */
function nnls(A: number[][], b: number[], iters = 1000): number[] {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (n === 0) return []
  const x = new Array(n).fill(1e-3)
  const Atb = new Array(n).fill(0)
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) Atb[j] += A[i][j] * b[i]
  const AtA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let j = 0; j < n; j++)
    for (let k = 0; k < n; k++) {
      let s = 0
      for (let i = 0; i < m; i++) s += A[i][j] * A[i][k]
      AtA[j][k] = s
    }
  const eps = 1e-9
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < n; j++) {
      let denom = 0
      for (let k = 0; k < n; k++) denom += AtA[j][k] * x[k]
      const num = Atb[j]
      if (num <= 0) { x[j] = 0; continue }
      x[j] = x[j] * (num / (denom + eps))
    }
  }
  return x.map(v => (v < 1e-6 ? 0 : v)) // umbral bajo para no perder micros traza (Mo)
}

/** Calcula gramos/L de cada sal para acercarse al perfil objetivo. */
export function calcularReceta(perfil: Perfil, salesDisp: Sal[], agua: Perfil = {}): Resultado {
  const elems = ELEMENTOS.map(e => e.key).filter(k => (perfil[k] ?? 0) > 0)
  const b = elems.map(k => Math.max(0, (perfil[k] ?? 0) - (agua[k] ?? 0)))
  const A = elems.map(k => salesDisp.map(s => (s.comp[k] ?? 0) * 1000))
  const scale = b.map(v => (v > 0 ? 1 / v : 1))
  const As = A.map((fila, i) => fila.map(v => v * scale[i]))
  const bs = b.map((v, i) => v * scale[i])
  const x = nnls(As, bs)
  const dosis: ResultadoSal[] = salesDisp
    .map((sal, j) => ({ sal, gramosPorL: +(x[j] ?? 0).toFixed(6) })) // 6 decimales: micros traza (Mo) exactos
    .filter(d => d.gramosPorL > 0)
    .sort((a, b2) => b2.gramosPorL - a.gramosPorL)
  const ppmLogrado = {} as Record<ElementKey, number>
  for (const e of ELEMENTOS) {
    let s = agua[e.key] ?? 0
    for (const d of dosis) s += (d.sal.comp[e.key] ?? 0) * d.gramosPorL * 1000
    ppmLogrado[e.key] = +s.toFixed(2)
  }
  return { dosis, ppmLogrado, ppmObjetivo: perfil }
}

/** Cálculo directo: dadas las dosis (g/L) → ppm resultante (modo "agregar por peso"). */
export function ppmDesdeDosis(dosis: ResultadoSal[], agua: Perfil = {}): Record<ElementKey, number> {
  const out = {} as Record<ElementKey, number>
  for (const e of ELEMENTOS) {
    let s = agua[e.key] ?? 0
    for (const d of dosis) s += (d.sal.comp[e.key] ?? 0) * d.gramosPorL * 1000
    out[e.key] = +s.toFixed(2)
  }
  return out
}

/** EC aproximada (mS/cm) a partir de ppm totales (escala 500). */
export function ecAprox(ppm: Record<ElementKey, number>): number {
  const total = Object.values(ppm).reduce((a, b) => a + b, 0)
  return +(total / 640).toFixed(2)
}

/** Ratios nutricionales clave (relaciones de masa). */
export interface Ratios { [k: string]: number }
export function calcularRatios(ppm: Record<ElementKey, number>): Ratios {
  const N = nTotal(ppm)
  const r = (a: number, b: number) => (b > 0 ? +(a / b).toFixed(2) : 0)
  return {
    'N:K': r(N, ppm.K ?? 0),
    'K:Ca': r(ppm.K ?? 0, ppm.Ca ?? 0),
    'Ca:Mg': r(ppm.Ca ?? 0, ppm.Mg ?? 0),
    'K:Mg': r(ppm.K ?? 0, ppm.Mg ?? 0),
    'NO3:NH4': r(ppm.NO3 ?? 0, ppm.NH4 ?? 0),
    'N:P:K': 0, // se muestra aparte
  }
}

// --- Soluciones madre (concentrados A/B/C) ---
export interface BidonConcentrado {
  bidon: Bidon
  volumenL: number
  items: { sal: Sal; gramos: number; mlSiLiquido?: number }[]
  advertencia: string | null
}

/**
 * Reparte la receta (g/L finales) en bidones concentrados.
 * @param factor cuántas veces concentrado (ej. 100 = stock 100x)
 * @param volumenBidonL litros de cada bidón concentrado
 */
export function calcularConcentrados(dosis: ResultadoSal[], factor: number, volumenBidonL: number): BidonConcentrado[] {
  const grupos: Record<Bidon, BidonConcentrado> = {
    A: { bidon: 'A', volumenL: volumenBidonL, items: [], advertencia: null },
    B: { bidon: 'B', volumenL: volumenBidonL, items: [], advertencia: null },
    C: { bidon: 'C', volumenL: volumenBidonL, items: [], advertencia: null },
  }
  for (const d of dosis) {
    // g totales en el bidón = g/L final * factor * (volumen final que rinde el bidón)
    // un bidón de volumenBidonL a factor X rinde volumenBidonL*factor litros finales.
    const gramos = d.gramosPorL * factor * volumenBidonL
    const item: { sal: Sal; gramos: number; mlSiLiquido?: number } = { sal: d.sal, gramos: +gramos.toFixed(1) }
    if (d.sal.liquido && d.sal.densidad) item.mlSiLiquido = +(gramos / d.sal.densidad).toFixed(1)
    grupos[d.sal.bidon].items.push(item)
  }
  // advertencia Ca + sulfato/fosfato en el mismo bidón
  for (const g of Object.values(grupos)) {
    const hayCa = g.items.some(i => (i.sal.comp.Ca ?? 0) > 0)
    const hayS = g.items.some(i => (i.sal.comp.S ?? 0) > 0)
    const hayP = g.items.some(i => (i.sal.comp.P ?? 0) > 0)
    if (hayCa && (hayS || hayP)) {
      g.advertencia = 'Calcio + sulfato/fosfato en el mismo bidón → precipita. Separá el calcio.'
    }
  }
  return Object.values(grupos).filter(g => g.items.length > 0)
}

/** Costo de un lote: precio por litro final de solución. */
export function calcularCosto(dosis: ResultadoSal[]): { porLitro: number; detalle: { sal: Sal; costo: number }[] } {
  const detalle = dosis.map(d => {
    const costoKg = d.sal.costoKg ?? 0
    const costo = (d.gramosPorL / 1000) * costoKg // ARS por litro
    return { sal: d.sal, costo: +costo.toFixed(2) }
  })
  const porLitro = +detalle.reduce((a, b) => a + b.costo, 0).toFixed(2)
  return { porLitro, detalle }
}

// ---------------------------------------------------------------------------
// Conversión óxido → elemental (para cargar etiquetas comerciales / agrícolas).
// ---------------------------------------------------------------------------
export const OXIDOS: { key: ElementKey; label: string; factor: number }[] = [
  { key: 'P', label: 'P₂O₅', factor: 0.4364 },
  { key: 'K', label: 'K₂O', factor: 0.8301 },
  { key: 'Ca', label: 'CaO', factor: 0.7147 },
  { key: 'Mg', label: 'MgO', factor: 0.6030 },
  { key: 'S', label: 'SO₃', factor: 0.4005 },
  { key: 'Na', label: 'Na₂O', factor: 0.7419 },
]
/** Convierte una etiqueta en óxidos (% P₂O₅, K₂O, etc.) a fracción elemental. */
export function oxidoAElemental(label: Partial<Record<ElementKey, number>>): Partial<Record<ElementKey, number>> {
  const out: Partial<Record<ElementKey, number>> = {}
  for (const [k, v] of Object.entries(label) as [ElementKey, number][]) {
    if (!v) continue
    const ox = OXIDOS.find(o => o.key === k)
    out[k] = (ox ? v * ox.factor : v) / 100 // % → fracción
  }
  return out
}

// ---------------------------------------------------------------------------
// Precisión de balanza: redondear gramos a la resolución de la balanza.
// ---------------------------------------------------------------------------
export function redondearBalanza(valor: number, resolucion: number): number {
  if (!resolucion || resolucion <= 0) return valor
  return +(Math.round(valor / resolucion) * resolucion).toFixed(4)
}

// ---------------------------------------------------------------------------
// Ajuste de pH por neutralización de alcalinidad (bicarbonatos).
// ---------------------------------------------------------------------------
export interface AgentePH {
  id: string; nombre: string; tipo: 'acido' | 'base'
  unidad: 'mL' | 'g'; meqPorUnidad: number; nota?: string
}
export const AGENTES_PH: AgentePH[] = [
  { id: 'h3po4', nombre: 'Ácido fosfórico 85%', tipo: 'acido', unidad: 'mL', meqPorUnidad: 12.4, nota: 'Baja pH y aporta P.' },
  { id: 'hno3', nombre: 'Ácido nítrico 60%', tipo: 'acido', unidad: 'mL', meqPorUnidad: 13.7, nota: 'Baja pH y aporta N nítrico.' },
  { id: 'h2so4', nombre: 'Ácido sulfúrico 35%', tipo: 'acido', unidad: 'mL', meqPorUnidad: 7.0, nota: 'Baja pH y aporta S. Cuidado al manipular.' },
  { id: 'citrico', nombre: 'Ácido cítrico (polvo)', tipo: 'acido', unidad: 'g', meqPorUnidad: 15.6, nota: 'Orgánico, suave, no aporta nutrientes minerales.' },
  { id: 'koh', nombre: 'Hidróxido de potasio (polvo)', tipo: 'base', unidad: 'g', meqPorUnidad: 17.8, nota: 'Sube pH y aporta K.' },
  { id: 'k2co3', nombre: 'Carbonato de potasio (polvo)', tipo: 'base', unidad: 'g', meqPorUnidad: 14.5, nota: 'Sube pH, buffer.' },
  { id: 'khco3b', nombre: 'Bicarbonato de potasio (polvo)', tipo: 'base', unidad: 'g', meqPorUnidad: 10.0, nota: 'Sube pH suave.' },
]

/**
 * Calcula cuánto agente agregar para llevar la alcalinidad del agua de
 * `alcActual` (ppm CaCO₃) a `alcObjetivo`, en `volumenL` litros.
 * 1 meq de alcalinidad = 50 mg de CaCO₃.
 */
export function calcularAjustePH(alcActual: number, alcObjetivo: number, volumenL: number, agente: AgentePH): { cantidad: number; unidad: string } {
  const deltaMeqPorL = (alcActual - alcObjetivo) / 50 // meq/L a neutralizar (acido) o a sumar (base)
  const meqTotal = Math.abs(deltaMeqPorL) * volumenL
  const cantidad = +(meqTotal / agente.meqPorUnidad).toFixed(2)
  return { cantidad, unidad: agente.unidad }
}

// ---------------------------------------------------------------------------
// Estabilizantes / aditivos para que el concentrado no decante ni precipite.
// Investigado en foros, patentes y scienceinhydroponics (autor de HydroBuddy).
// ---------------------------------------------------------------------------
export interface AditivoEstab {
  id: string; nombre: string; funcion: string; dosis: string; gPorL: number | null; porque: string
  nivel: 'esencial' | 'opcional' | 'evitar'
}
export const ADITIVOS_ESTAB: AditivoEstab[] = [
  { id: 'citrico', nombre: 'Ácido cítrico', funcion: 'Buffer + quelante + antioxidante', dosis: '1–2 g/L', gPorL: 1.5, nivel: 'esencial',
    porque: 'EL más importante. Baja el pH del concentrado a ~5 (zona estable), quela suave y mantiene el hierro reducido. Triple función en una sola cosa.' },
  { id: 'benzoato', nombre: 'Benzoato de sodio', funcion: 'Conservante / biocida', dosis: '150–250 mg/L', gPorL: 0.2, nivel: 'esencial',
    porque: 'El conservante. Sin esto, en semanas se llena de hongos/barro que se comen los quelatos. Es lo que usan las marcas y no lo declaran.' },
  { id: 'ascorbico', nombre: 'Ácido ascórbico (vit. C)', funcion: 'Antioxidante', dosis: '0.1–0.3 g/L', gPorL: 0.2, nivel: 'opcional',
    porque: 'SOLO si el hierro se te pone marrón/turbio. Refuerza al cítrico para que el Fe no se oxide. Con cítrico, casi nunca hace falta.' },
  { id: 'xantica', nombre: 'Goma xántica', funcion: 'Anti-sedimentante / suspensión', dosis: '1–2 g/L (0.1–0.2%)', gPorL: 1.5, nivel: 'evitar',
    porque: 'NO la uses en un concentrado de sales CLARO: te lo deja gelatinoso al pedo. Solo sirve para suspensiones espesas con partículas.' },
  { id: 'eddha_add', nombre: 'Quelato de hierro EDDHA', funcion: 'Quelante de hierro', dosis: 'según Fe objetivo', gPorL: null, nivel: 'esencial',
    porque: 'Mantiene el hierro soluble incluso a pH alto. Ya viene en tus micros; va en el bidón A con el calcio.' },
  { id: 'gluconato_add', nombre: 'Gluconato de calcio', funcion: 'Quelante de calcio', dosis: 'según Ca objetivo', gPorL: null, nivel: 'opcional',
    porque: 'Calcio limpio quelatado. El EDTA NO sirve para Ca (prefiere el hierro y lo suelta).' },
  { id: 'sorbato', nombre: 'Sorbato de potasio', funcion: 'Conservante (alternativa)', dosis: '0.01–1%', gPorL: 1, nivel: 'opcional',
    porque: 'Alternativa al benzoato si no lo conseguís. Grado alimenticio.' },
]

export interface RecomendacionEstab {
  aditivos: { info: AditivoEstab; cantidad: number | null }[]
  reglas: string[]
}

/** Recomienda estabilizantes + cantidades para un volumen de concentrado dado. */
export function recomendarEstabilizantes(dosis: ResultadoSal[], volumenL: number): RecomendacionEstab {
  const tieneFe = dosis.some(d => (d.sal.comp.Fe ?? 0) > 0)
  const tieneCa = dosis.some(d => (d.sal.comp.Ca ?? 0) > 0)
  const tieneSP = dosis.some(d => (d.sal.comp.S ?? 0) > 0 || (d.sal.comp.P ?? 0) > 0)
  const reglas: string[] = []
  if (tieneCa && tieneSP) reglas.push('Separá en bidón A (calcio) y bidón B (sulfatos/fosfatos): concentrados juntos precipitan seguro.')
  if (tieneFe) reglas.push('El hierro va en el bidón A junto al calcio, quelatado (EDDHA), con pH ~5 + antioxidante.')
  reglas.push('Bajá el pH del concentrado a ~4.5–5.5 con ácido cítrico o fosfórico: a pH alto los metales precipitan.')
  reglas.push('No te pases de la solubilidad de cada sal (sub-saturación): si se pone turbio, diluí.')
  reglas.push('Disolvé el conservante en el agua PRIMERO, y recién después agregás las sales.')
  reglas.push('Usá un poco de EXCESO de quelante libre: ese excedente es el que evita el barro en el almacenamiento.')
  const aditivos = ADITIVOS_ESTAB.map(info => ({
    info, cantidad: info.gPorL != null ? +(info.gPorL * volumenL).toFixed(2) : null,
  }))
  return { aditivos, reglas }
}

// ---------------------------------------------------------------------------
// Persistencia: perfiles guardados + sustancias personalizadas (Supabase/demo).
// ---------------------------------------------------------------------------

export interface PerfilGuardado {
  id: string
  user_id: string | null
  nombre: string
  perfil: Perfil
  agua: Perfil
  sales: string[]
  rangos?: RangoPerfil
  creado_en: string
}

export const perfilesNutrientesService = {
  async list(): Promise<PerfilGuardado[]> {
    const { data, error } = await supabase
      .from('perfiles_nutrientes').select('*').order('creado_en', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as PerfilGuardado[]
  },
  async crear(p: { nombre: string; perfil: Perfil; agua: Perfil; sales: string[]; rangos?: RangoPerfil }): Promise<PerfilGuardado> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...p, user_id: u?.user?.id ?? null }
    const { data, error } = await supabase.from('perfiles_nutrientes').insert(payload).select().single()
    if (error) throw error
    return data as unknown as PerfilGuardado
  },
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from('perfiles_nutrientes').delete().eq('id', id)
    if (error) throw error
  },
}

export interface SustanciaCustom {
  id: string
  user_id: string | null
  nombre: string
  formula: string | null
  comp: Partial<Record<ElementKey, number>>
  bidon: Bidon
  liquido: boolean
  densidad: number | null
  costo_kg: number | null
  creado_en: string
}

// Inventario: override de costo/kg y stock para CUALQUIER sustancia (default o custom),
// + nota personal. Permite "editar la ficha" sin tocar la base.
export interface InventarioItem {
  sal_id: string; costo_kg: number | null; stock: number | null; unidad: string | null; nota: string | null
}
export const inventarioService = {
  async list(): Promise<Record<string, InventarioItem>> {
    const { data, error } = await supabase.from('inventario_nutrientes').select('*')
    if (error) throw error
    const out: Record<string, InventarioItem> = {}
    for (const r of (data ?? []) as unknown as InventarioItem[]) out[r.sal_id] = r
    return out
  },
  async guardar(it: InventarioItem): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...it, user_id: u?.user?.id ?? null }
    const { error } = await supabase.from('inventario_nutrientes').upsert(payload, { onConflict: 'sal_id' })
    if (error) throw error
  },
}

/** Aplica overrides de inventario (costo/stock/nota) sobre una lista de sales. */
export function aplicarInventario(sales: Sal[], inv: Record<string, InventarioItem>): Sal[] {
  return sales.map(s => {
    const ov = inv[s.id]
    const descripcion = s.descripcion ?? DESCRIPCIONES[s.id]
    if (!ov) return { ...s, descripcion }
    return {
      ...s, descripcion,
      costoKg: ov.costo_kg ?? s.costoKg,
      stock: ov.stock ?? s.stock,
      stockUnidad: ov.unidad ?? s.stockUnidad,
      nota: ov.nota ?? s.nota,
    }
  })
}

export const sustanciasService = {
  async list(): Promise<Sal[]> {
    const { data, error } = await supabase
      .from('sustancias_nutrientes').select('*').order('creado_en', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown as SustanciaCustom[]).map(s => ({
      id: s.id, nombre: s.nombre, formula: s.formula ?? undefined, comp: s.comp ?? {},
      bidon: s.bidon, liquido: s.liquido, densidad: s.densidad ?? undefined,
      costoKg: s.costo_kg ?? undefined, custom: true,
    }))
  },
  async crear(s: { nombre: string; formula?: string; comp: Partial<Record<ElementKey, number>>; bidon: Bidon; liquido: boolean; densidad?: number | null; costo_kg?: number | null }): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = {
      nombre: s.nombre, formula: s.formula ?? null, comp: s.comp, bidon: s.bidon,
      liquido: s.liquido, densidad: s.densidad ?? null, costo_kg: s.costo_kg ?? null,
      user_id: u?.user?.id ?? null,
    }
    const { error } = await supabase.from('sustancias_nutrientes').insert(payload)
    if (error) throw error
  },
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from('sustancias_nutrientes').delete().eq('id', id)
    if (error) throw error
  },
}
