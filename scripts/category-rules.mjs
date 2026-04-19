/**
 * Reglas de categorización para el importador de movimientos bancarios.
 * Se evalúan EN ORDEN. La primera que matchea gana, así que pon las más
 * específicas arriba. El resto cae en 'otros/sin_clasificar'.
 *
 * Cada regla: { match: RegExp | (concept: string) => boolean, cat, sub, kind? }
 *   - cat/sub  → data.category / data.subcategory
 *   - kind?    → fuerza 'expense' | 'income' | 'transfer' (opcional).
 *                Puede ser una función (amount) => kind para decidir por signo.
 *                Por defecto se infiere del signo del importe.
 *
 * Se aplica sobre el campo CONCEPTO original del extracto, en minúsculas.
 */
export const RULES = [
  // --- Traspasos internos (primero: tienen prioridad sobre todo) ---
  // Pareja: entrantes = ingreso (sustituye a la nómina que está fuera); salientes = traspaso (ahorro externo).
  { match: /(bizum|transferencia).*(jose\s+miguel\s+magdaleno|jose miguel magdaleno)/i, cat: "traspasos", sub: "pareja", kind: (a) => (a >= 0 ? "income" : "transfer") },
  { match: /(bizum|transferencia).*(cristina\s+calvo|cristina calvo gonzalez)/i, cat: "traspasos", sub: "pareja", kind: (a) => (a >= 0 ? "income" : "transfer") },
  { match: /\bbizum (de|a|enviado|recibido)/i, cat: "traspasos", sub: "bizum", kind: "transfer" },
  { match: /\btraspaso\b/i, cat: "traspasos", sub: "otros", kind: "transfer" },
  // Ingreso contra cuenta (siempre positivo) = aporte desde cuenta externa de la pareja.
  { match: /ingreso\s+contra\s+cuenta/i, cat: "traspasos", sub: "internos", kind: "income" },

  // --- Vivienda ---
  { match: /alquiler seguro/i, cat: "vivienda", sub: "alquiler" },
  { match: /comercializadora regulada/i, cat: "vivienda", sub: "luz_gas_agua" },
  { match: /\b(iberdrola|endesa|naturgy|repsol\s+energ)/i, cat: "vivienda", sub: "luz_gas_agua" },
  { match: /canal isabel|emasesa|aguas/i, cat: "vivienda", sub: "luz_gas_agua" },
  { match: /gas\s+s\.?u\.?r\.?|gas natural|gas metra/i, cat: "vivienda", sub: "luz_gas_agua" },
  { match: /\bikea\b|leroy merlin|bauhaus|aki\b|bricomart|bricodepot/i, cat: "vivienda", sub: "hogar" },

  // --- Niños (colegio, academias) ---
  { match: /juan\s*xxiii|sociedad anonima juan/i, cat: "ninos", sub: "colegio" },
  { match: /colegio|instituto|guarderia|escuela infantil|ampa\b/i, cat: "ninos", sub: "colegio" },
  { match: /eneso|kumon|kids ?and ?us|helen doron/i, cat: "ninos", sub: "actividades" },

  // --- Mascotas (antes que ropa genérica, y antes que "seguros") ---
  { match: /barkibu/i, cat: "mascotas", sub: "seguro" },
  { match: /kiwoko|tiendanimal|maxi zoo/i, cat: "mascotas", sub: "tienda" },
  { match: /veterinar/i, cat: "mascotas", sub: "veterinario" },

  // --- Transporte ---
  { match: /repsol|waylet|cepsa|galp|\bshell\b|\bbp\s|solred/i, cat: "transporte", sub: "combustible" },
  { match: /midas|euromaster|feu vert|talleres|neumaticos/i, cat: "transporte", sub: "coche" },
  { match: /easypark|saba|empark|parking|aparcamiento|ora\b|autopist|castellana\s+de\s+autopista|peaje/i, cat: "transporte", sub: "coche" },
  { match: /\brenfe\b|cercanias|metro\s+madrid|\bemt\b|avanza|alsa|\biryo|trenitalia|\bouigo\b|autolinee/i, cat: "transporte", sub: "publico" },
  { match: /uber(?!\s*eats)|cabify|freenow|mytaxi|bolt/i, cat: "transporte", sub: "taxi_vtc" },

  // --- Alimentación ---
  { match: /mercadona|lidl|carref|\bdia\b|alcampo|consum|eroski|hipercor|aldi\b|spar\b/i, cat: "alimentacion", sub: "supermercado" },
  { match: /ahorram|grupo sup ahorr/i, cat: "alimentacion", sub: "supermercado" },
  { match: /kiwi market|primaprix|costco|\bfamila\b|supermercato\s+pam|mercato\s+central|forno\s+top|foodx/i, cat: "alimentacion", sub: "supermercado" },
  { match: /salumeria|esselunga|antica/i, cat: "alimentacion", sub: "especialidades" },

  // --- Restauración ---
  { match: /just\s*eat|justeat/i, cat: "restauracion", sub: "delivery" },
  { match: /\bglovo\b|uber\s*eats|deliveroo/i, cat: "restauracion", sub: "delivery" },
  { match: /dominos|telepizza|pizza\s*hut|pizz\s+carlo|pizzeria/i, cat: "restauracion", sub: "comida_rapida" },
  { match: /mc\s*donald|burger king|\bkfc\b|five guys|taco bell|goiko/i, cat: "restauracion", sub: "comida_rapida" },
  { match: /starbucks/i, cat: "restauracion", sub: "cafeterias" },
  { match: /cafeteria|\bbar\s|taberna|cervec/i, cat: "restauracion", sub: "bares_restaurantes" },
  { match: /restaurante|asador|\basador\b|sushi|ramen|tsuruta|mito|takomama|il\s+\w+\b|cuspide|\bbibigo\b|runni\s*pandora|maxi china/i, cat: "restauracion", sub: "bares_restaurantes" },
  { match: /gelateria|pasticceri|trattoria|ristorante|osteria|enoteca|caffetteri|pizzeria|wine\s*bar|piadineri|\bcaffe\b|\bcaff[eé]'\b/i, cat: "restauracion", sub: "bares_restaurantes" },
  { match: /newrest|travel retail/i, cat: "restauracion", sub: "bares_restaurantes" },
  { match: /\brancho\b|\brancho santa\b|sumup.*mercado|gosto e mea|deja vu|l'angelo|c'era una volta|wine not|florence s\.n\.c/i, cat: "restauracion", sub: "bares_restaurantes" },
  { match: /quiosco/i, cat: "restauracion", sub: "cafeterias" },

  // --- Salud ---
  { match: /farmacia|\bfcia\.?\b/i, cat: "salud", sub: "farmacia" },
  { match: /inst\.?medico|clinica|dentista|odontolog|hospital|sanatorio/i, cat: "salud", sub: "medico_dentista" },
  { match: /sanitas|adeslas|mapfre\s+salud|\bdkv\b|asisa|aegon salud|mutua madrile/i, cat: "salud", sub: "seguro" },

  // --- Moda ---
  { match: /primark|\bzara\b|mango|bershka|stradivarius|pull\s*and\s*bear|pull&bear/i, cat: "moda", sub: "ropa" },
  { match: /kiabi|lefties|h\s*&\s*m|\bc&a\b|uniqlo|\bcos\b|shein|factory\s+store|\btimpers\b/i, cat: "moda", sub: "ropa" },
  { match: /\bforus\b/i, cat: "moda", sub: "deporte" },
  { match: /decathlon|forum sport|intersport|jd\s+sports|foot locker/i, cat: "moda", sub: "deporte" },
  { match: /druni|sephora|\bprimor\b|marvimundo|mercadona\s+perfum|ritualscosmetics|\brituals\b/i, cat: "moda", sub: "belleza" },

  // --- Ocio ---
  { match: /\bocine\b|yelmo|cinesa|kinepolis|artesiete/i, cat: "ocio", sub: "cine_teatro" },
  { match: /airbnb|booking\.com|\bhotel\b|hostel|expedia|hoteles/i, cat: "ocio", sub: "viajes" },
  { match: /europcar|\bhertz\b|enterprise|\bavis\b|\bsixt\b|ryanair|vueling|iberia|easyjet/i, cat: "ocio", sub: "viajes" },
  { match: /libertalia|palillos\s+y\s+cuch|faunia|zoo|parque\s+warner|parque\s+atracciones|funicolare|\bmuseo\b|biglietteria|giardino|comune\s+s\.|chincaglieri|duomo\.firenze|riverland|festival/i, cat: "ocio", sub: "actividades" },
  { match: /\balbergo\b|\bhotel\b|\bhostal\b/i, cat: "ocio", sub: "viajes" },
  { match: /\btabaccheria\b/i, cat: "ocio", sub: "tabaco" },

  // --- Tecnología / suscripciones ---
  { match: /pccomponentes|mediamarkt|worten|apple store|\bfnac\b|sony\s+gift\s+card/i, cat: "tecnologia", sub: "electronica" },
  { match: /apple\.com\/bill|apple\.com/i, cat: "tecnologia", sub: "suscripciones" },
  { match: /netflix|\bhbo\b|disney\s*\+|disneyplus|spotify|prime video/i, cat: "tecnologia", sub: "suscripciones" },
  { match: /chatgpt|openai|\bclaude\b|anthropic|google\s+(one|storage|workspace|cloud)/i, cat: "tecnologia", sub: "suscripciones" },
  { match: /microsoft|\bcanva\b|notion|adobe|jetbrains|github/i, cat: "tecnologia", sub: "suscripciones" },

  // --- Servicios ---
  { match: /o2\s*fibra|movistar|vodafone|orange|yoigo|masmovil|jazztel|pepephone|digi/i, cat: "servicios", sub: "telefonia_internet" },
  { match: /notaria|asesoria|gestoria|abogado/i, cat: "servicios", sub: "profesionales" },

  // --- Financiero ---
  { match: /cetelem/i, cat: "financiero", sub: "prestamo" },
  { match: /^comision\b|comision\s+de\s+mantenimiento|comision\s+por\s+transferencia/i, cat: "financiero", sub: "comisiones" },
  { match: /seguro\s+(hogar|vida|accidente|coche|auto|moto)/i, cat: "financiero", sub: "seguros" },
  { match: /mapfre(?!\s+salud)|axa|allianz|linea directa/i, cat: "financiero", sub: "seguros" },
  { match: /liquidacion|intereses/i, cat: "financiero", sub: "otros" },

  // --- Impuestos ---
  { match: /agencia tributa|\baeat\b|hacienda/i, cat: "impuestos", sub: "hacienda" },
  { match: /ayuntamiento|\bibi\b|impuesto bienes|basuras|\bay\.?\s+mostoles|ay\.?\s+alcorcon/i, cat: "impuestos", sub: "ayuntamiento" },
  { match: /\bdgt\b|direccion general trafico/i, cat: "impuestos", sub: "dgt" },

  // --- Ingresos (devoluciones, etc.) ---
  { match: /devolucion.*tributari|devoluciones tributarias/i, cat: "ingresos", sub: "devoluciones", kind: "income" },
  { match: /devolucion\s+compra/i, cat: "ingresos", sub: "devoluciones", kind: "income" },

  // --- Efectivo ---
  { match: /retirada de efectivo|reintegro|cajero/i, cat: "efectivo", sub: "cajero" },
  { match: /\bestanco\b/i, cat: "ocio", sub: "tabaco" },

  // --- Amazon / marketplace online genéricos (al final) ---
  { match: /\bamazon\b|www\.amazon|\bamzn\b|amzn\s*mktp/i, cat: "otros", sub: "amazon" },
  { match: /aliexpress|\bebay\b|temu/i, cat: "otros", sub: "compras_online" },

  // --- Transferencia genérica al final (no captura los especificos de arriba) ---
  { match: /transferencia/i, cat: "traspasos", sub: "otros", kind: "transfer" },
];

/** Normaliza el concepto para mostrarlo bonito como title del item. */
export function prettyMerchant(concept) {
  let s = String(concept);
  // Quitar info de tarjeta
  s = s.replace(/tarj(eta)?\.?\s*:?\s*\*?\d+/gi, "");
  s = s.replace(/tarjeta\s+\d+/gi, "");
  s = s.replace(/,\s*comision\s+[\d.,]+/gi, "");
  // Quitar prefijos
  s = s.replace(/^(pago movil en|compra(\s+internet)?\s+en|compra|transferencia\s+(inmediata\s+)?(de|a favor de)|recibo|bizum\s+(enviado a|recibido de)|pago recibo de)\s+/gi, "");
  // Quitar trailing ", Alcorcon Es" y similar
  s = s.replace(/,\s*[a-záéíóúñ\s.]+\s+es\b.*$/gi, "");
  s = s.replace(/,\s*(luxembourg|madrid|mostoles|alcorcon|getafe|barcelona).*$/gi, "");
  // Limpiar
  s = s.replace(/[\s,.]+$/g, "").replace(/\s+/g, " ").trim();
  // Capitalizar primera letra de cada palabra, manteniendo S.L., S.A.
  s = s.replace(/\b([a-záéíóúñ])([a-záéíóúñ]*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());
  return s.slice(0, 80);
}

export function classify(concept, amount) {
  const lowered = String(concept).toLowerCase();
  for (const rule of RULES) {
    const matched = rule.match instanceof RegExp ? rule.match.test(lowered) : rule.match(lowered);
    if (matched) {
      const kind =
        typeof rule.kind === "function"
          ? rule.kind(amount)
          : (rule.kind ?? (amount >= 0 ? "income" : "expense"));
      return { category: rule.cat, subcategory: rule.sub, kind };
    }
  }
  return {
    category: "otros",
    subcategory: "sin_clasificar",
    kind: amount >= 0 ? "income" : "expense",
  };
}
