export const DEMO_COMPATIBILITY_RULES = {
  label: 'demo rules',
  title: 'Industrial Scrap Compatibility Rules (Demo Rules)',
  isDemo: true,
  description: 'Demo rules mapping waste material produced by factory A to raw materials accepted by factory B.',
  rules: [
    {
      id: 'rule-pp-runners',
      materialProduced: 'PP Moulding Runners',
      materialsAccepted: ['PP Moulding Runners', 'PP Runner Scrap', 'Injection Grade PP Scrap'],
      category: 'Polymers',
      defaultQuantityKg: 500,
      pricePerKgInr: 72,
      estimatedValueInr: 36000,
    },
    {
      id: 'rule-washed-pp-flakes',
      materialProduced: 'Washed PP Flakes',
      materialsAccepted: ['Washed PP Flakes', 'Clean PP Flake', 'Extrusion PP Feedstock'],
      category: 'Polymers',
      defaultQuantityKg: 550,
      pricePerKgInr: 68,
      estimatedValueInr: 37400,
    },
    {
      id: 'rule-thermoform-offcuts',
      materialProduced: 'Thermoform Sheet Offcuts',
      materialsAccepted: ['Thermoform Sheet Offcuts', 'PP Sheet Trim', 'Thermoforming Scrap'],
      category: 'Polymers',
      defaultQuantityKg: 480,
      pricePerKgInr: 70,
      estimatedValueInr: 33600,
    },
    {
      id: 'rule-regrind-pp-compound',
      materialProduced: 'Regrind PP Compound',
      materialsAccepted: ['Regrind PP Compound', 'Recycled PP Granules', 'Compounded PP Resin'],
      category: 'Polymers',
      defaultQuantityKg: 500,
      pricePerKgInr: 70,
      estimatedValueInr: 35000,
    },
    {
      id: 'rule-steel-swarf',
      materialProduced: 'Steel Turning Swarf',
      materialsAccepted: ['Steel Turning Swarf', 'CNC Steel Chips', 'Melting Steel Scrap'],
      category: 'Metals',
      defaultQuantityKg: 600,
      pricePerKgInr: 50,
      estimatedValueInr: 30000,
    },
    {
      id: 'rule-steel-billet-scrap',
      materialProduced: 'Refined Steel Billet Scrap',
      materialsAccepted: ['Refined Steel Billet Scrap', 'Foundry Steel Charge', 'Low-Carbon Billet Ends'],
      category: 'Metals',
      defaultQuantityKg: 550,
      pricePerKgInr: 60,
      estimatedValueInr: 33000,
    },
    {
      id: 'rule-cast-steel-blanks',
      materialProduced: 'Cast Steel Blanks',
      materialsAccepted: ['Cast Steel Blanks', 'Machining Steel Forgings', 'Foundry Castings'],
      category: 'Metals',
      defaultQuantityKg: 500,
      pricePerKgInr: 66,
      estimatedValueInr: 33000,
    },
  ],
  factories: [
    {
      id: 'fac-pune-moulders',
      name: 'Pune Auto Moulders',
      location: 'Pune, Maharashtra',
      industry: 'Automotive Injection Moulding',
      materialProduced: 'PP Moulding Runners',
      materialsAccepted: ['Regrind PP Compound', 'Recycled PP Granules'],
      quantityKg: 500,
      pricePerKg: 72,
      valueInr: 36000,
      inputs: [{ material: 'Regrind PP Compound', quantityKg: 500, pricePerKg: 70, valueInr: 35000 }],
      outputs: [{ material: 'PP Moulding Runners', quantityKg: 500, pricePerKg: 72, valueInr: 36000 }],
      x: 140,
      y: 130,
    },
    {
      id: 'fac-chakan-granulators',
      name: 'Chakan Polymer Granulators',
      location: 'Chakan, Maharashtra',
      industry: 'Polymer Granulation & Washing',
      materialProduced: 'Washed PP Flakes',
      materialsAccepted: ['PP Moulding Runners', 'Thermoform Sheet Offcuts'],
      quantityKg: 550,
      pricePerKg: 68,
      valueInr: 37400,
      inputs: [
        { material: 'PP Moulding Runners', quantityKg: 500, pricePerKg: 72, valueInr: 36000 },
        { material: 'Thermoform Sheet Offcuts', quantityKg: 480, pricePerKg: 70, valueInr: 33600 },
      ],
      outputs: [{ material: 'Washed PP Flakes', quantityKg: 550, pricePerKg: 68, valueInr: 37400 }],
      x: 420,
      y: 130,
    },
    {
      id: 'fac-thane-extruders',
      name: 'Thane Packaging Extruders',
      location: 'Thane, Maharashtra',
      industry: 'Packaging Sheet Extrusion',
      materialProduced: 'Thermoform Sheet Offcuts',
      materialsAccepted: ['Washed PP Flakes'],
      quantityKg: 480,
      pricePerKg: 70,
      valueInr: 33600,
      inputs: [{ material: 'Washed PP Flakes', quantityKg: 550, pricePerKg: 68, valueInr: 37400 }],
      outputs: [{ material: 'Thermoform Sheet Offcuts', quantityKg: 480, pricePerKg: 70, valueInr: 33600 }],
      x: 420,
      y: 370,
    },
    {
      id: 'fac-nashik-compounding',
      name: 'Nashik Compounding Works',
      location: 'Nashik, Maharashtra',
      industry: 'Polymer Compounding & Pelletising',
      materialProduced: 'Regrind PP Compound',
      materialsAccepted: ['Thermoform Sheet Offcuts'],
      quantityKg: 500,
      pricePerKg: 70,
      valueInr: 35000,
      inputs: [{ material: 'Thermoform Sheet Offcuts', quantityKg: 480, pricePerKg: 70, valueInr: 33600 }],
      outputs: [{ material: 'Regrind PP Compound', quantityKg: 500, pricePerKg: 70, valueInr: 35000 }],
      x: 140,
      y: 370,
    },
    {
      id: 'fac-faridabad-cnc',
      name: 'Faridabad CNC Machining',
      location: 'Faridabad, Haryana',
      industry: 'Precision Metal Machining',
      materialProduced: 'Steel Turning Swarf',
      materialsAccepted: ['Cast Steel Blanks'],
      quantityKg: 600,
      pricePerKg: 50,
      valueInr: 30000,
      inputs: [{ material: 'Cast Steel Blanks', quantityKg: 500, pricePerKg: 66, valueInr: 33000 }],
      outputs: [{ material: 'Steel Turning Swarf', quantityKg: 600, pricePerKg: 50, valueInr: 30000 }],
      x: 690,
      y: 115,
    },
    {
      id: 'fac-gurgaon-melting',
      name: 'Gurgaon Induction Melting',
      location: 'Gurgaon, Haryana',
      industry: 'Secondary Steel Melting',
      materialProduced: 'Refined Steel Billet Scrap',
      materialsAccepted: ['Steel Turning Swarf'],
      quantityKg: 550,
      pricePerKg: 60,
      valueInr: 33000,
      inputs: [{ material: 'Steel Turning Swarf', quantityKg: 600, pricePerKg: 50, valueInr: 30000 }],
      outputs: [{ material: 'Refined Steel Billet Scrap', quantityKg: 550, pricePerKg: 60, valueInr: 33000 }],
      x: 790,
      y: 295,
    },
    {
      id: 'fac-bhiwadi-foundry',
      name: 'Bhiwadi Precision Foundry',
      location: 'Bhiwadi, Rajasthan',
      industry: 'Alloy Casting & Foundry',
      materialProduced: 'Cast Steel Blanks',
      materialsAccepted: ['Refined Steel Billet Scrap'],
      quantityKg: 500,
      pricePerKg: 66,
      valueInr: 33000,
      inputs: [{ material: 'Refined Steel Billet Scrap', quantityKg: 550, pricePerKg: 60, valueInr: 33000 }],
      outputs: [{ material: 'Cast Steel Blanks', quantityKg: 500, pricePerKg: 66, valueInr: 33000 }],
      x: 600,
      y: 385,
    },
  ],
};

export const DEMO_RULES = DEMO_COMPATIBILITY_RULES.rules;
export const DEMO_FACTORIES = DEMO_COMPATIBILITY_RULES.factories;

const norm = v => String(v ?? '').trim().toUpperCase();
const finite = v => typeof v === 'number' && Number.isFinite(v);
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const qty6 = n => Math.round(n * 1000000) / 1000000;

export function normalizeCompatibilityRules(rulesInput = DEMO_COMPATIBILITY_RULES) {
  if (!rulesInput) {
    return {
      label: DEMO_COMPATIBILITY_RULES.label,
      isDemo: true,
      rules: DEMO_RULES.map(r => ({ ...r, materialsAccepted: [...r.materialsAccepted] })),
      factories: DEMO_FACTORIES,
    };
  }
  const rawList = Array.isArray(rulesInput)
    ? rulesInput
    : Array.isArray(rulesInput.rules)
      ? rulesInput.rules
      : [];
  const label = (typeof rulesInput === 'object' && !Array.isArray(rulesInput) && rulesInput.label)
    ? String(rulesInput.label)
    : 'demo rules';
  const rules = rawList.map((r, idx) => {
    const produced = String(r?.materialProduced ?? r?.produced ?? r?.wasteProduced ?? r?.material ?? '').trim();
    const acceptedRaw = r?.materialsAccepted ?? r?.accepted ?? r?.accepts ?? r?.rawMaterialsAccepted ?? [];
    const acceptedList = (Array.isArray(acceptedRaw) ? acceptedRaw : [acceptedRaw])
      .map(m => String(typeof m === 'object' ? m?.material ?? '' : m ?? '').trim())
      .filter(Boolean);
    const defaultQuantityKg = finite(r?.defaultQuantityKg) ? r.defaultQuantityKg : finite(r?.quantityKg) ? r.quantityKg : 0;
    const pricePerKgInr = finite(r?.pricePerKgInr) ? r.pricePerKgInr : finite(r?.pricePerKg) ? r.pricePerKg : 0;
    const estimatedValueInr = finite(r?.estimatedValueInr)
      ? r.estimatedValueInr
      : finite(r?.valueInr)
        ? r.valueInr
        : finite(r?.value)
          ? r.value
          : round2(defaultQuantityKg * pricePerKgInr);
    return {
      id: String(r?.id || `rule-${idx + 1}`),
      materialProduced: produced,
      materialsAccepted: acceptedList,
      category: String(r?.category || 'General'),
      defaultQuantityKg,
      pricePerKgInr,
      estimatedValueInr,
    };
  }).filter(r => r.materialProduced || r.materialsAccepted.length > 0);
  return {
    label,
    isDemo: rulesInput?.isDemo !== false,
    rules,
    factories: Array.isArray(rulesInput?.factories) ? rulesInput.factories : DEMO_FACTORIES,
  };
}

export function isMaterialCompatible(producedMaterial, acceptedMaterials = [], rulesInput = DEMO_RULES) {
  const prod = String(producedMaterial ?? '').trim();
  const prodNorm = norm(prod);
  if (!prodNorm) return { compatible: false, matchedInput: null, rule: null };
  const acceptedList = (Array.isArray(acceptedMaterials) ? acceptedMaterials : [acceptedMaterials])
    .map(item => String(typeof item === 'object' ? item?.material ?? '' : item ?? '').trim())
    .filter(Boolean);
  if (!acceptedList.length) return { compatible: false, matchedInput: null, rule: null };

  const { rules } = normalizeCompatibilityRules(rulesInput);
  const matchingRule = rules.find(r => norm(r.materialProduced) === prodNorm) || null;

  // 1. Direct material name match
  const directMatch = acceptedList.find(acc => norm(acc) === prodNorm);
  if (directMatch) {
    return { compatible: true, matchedInput: directMatch, rule: matchingRule };
  }

  // 2. Match via compatibility rules (materialProduced -> materialsAccepted)
  for (const rule of rules) {
    if (norm(rule.materialProduced) !== prodNorm) continue;
    const acceptedSet = new Set(rule.materialsAccepted.map(norm));
    const viaRule = acceptedList.find(acc => acceptedSet.has(norm(acc)));
    if (viaRule) {
      return { compatible: true, matchedInput: viaRule, rule };
    }
  }

  return { compatible: false, matchedInput: null, rule: null };
}

function normalizeStreamItem(item, fallbackNode, ruleByProduced) {
  if (typeof item === 'string') {
    const mat = item.trim();
    if (!mat) return null;
    const rule = ruleByProduced.get(norm(mat));
    const quantityKg = finite(fallbackNode?.quantityKg)
      ? qty6(fallbackNode.quantityKg)
      : finite(rule?.defaultQuantityKg)
        ? qty6(rule.defaultQuantityKg)
        : 0;
    const pricePerKg = finite(fallbackNode?.pricePerKg)
      ? round2(fallbackNode.pricePerKg)
      : finite(rule?.pricePerKgInr)
        ? round2(rule.pricePerKgInr)
        : 0;
    const valueInr = finite(fallbackNode?.valueInr)
      ? round2(fallbackNode.valueInr)
      : finite(fallbackNode?.value)
        ? round2(fallbackNode.value)
        : (quantityKg > 0 && pricePerKg > 0)
          ? round2(quantityKg * pricePerKg)
          : finite(rule?.estimatedValueInr)
            ? round2(rule.estimatedValueInr)
            : 0;
    return { material: mat, quantityKg, pricePerKg, valueInr, value: valueInr };
  }
  if (item && typeof item === 'object') {
    const mat = String(item.material ?? item.name ?? item.materialProduced ?? '').trim();
    if (!mat) return null;
    const rule = ruleByProduced.get(norm(mat));
    const quantityKg = finite(item.quantityKg)
      ? qty6(item.quantityKg)
      : finite(fallbackNode?.quantityKg)
        ? qty6(fallbackNode.quantityKg)
        : finite(rule?.defaultQuantityKg)
          ? qty6(rule.defaultQuantityKg)
          : 0;
    const pricePerKg = finite(item.pricePerKg)
      ? round2(item.pricePerKg)
      : finite(fallbackNode?.pricePerKg)
        ? round2(fallbackNode.pricePerKg)
        : finite(rule?.pricePerKgInr)
          ? round2(rule.pricePerKgInr)
          : 0;
    const valueInr = finite(item.valueInr)
      ? round2(item.valueInr)
      : finite(item.value)
        ? round2(item.value)
        : (quantityKg > 0 && pricePerKg > 0)
          ? round2(quantityKg * pricePerKg)
          : finite(fallbackNode?.valueInr)
            ? round2(fallbackNode.valueInr)
            : finite(fallbackNode?.value)
              ? round2(fallbackNode.value)
              : finite(rule?.estimatedValueInr)
                ? round2(rule.estimatedValueInr)
                : 0;
    return { material: mat, quantityKg, pricePerKg, valueInr, value: valueInr };
  }
  return null;
}

export function normalizeFactoryNodes(factoriesInput, rulesConfig = DEMO_COMPATIBILITY_RULES) {
  const normalizedRules = normalizeCompatibilityRules(rulesConfig);
  const ruleByProduced = new Map(normalizedRules.rules.map(r => [norm(r.materialProduced), r]));
  const rawFactories = Array.isArray(factoriesInput)
    ? factoriesInput
    : Array.isArray( normalizedRules.factories)
      ? normalizedRules.factories
      : DEMO_FACTORIES;

  const count = Math.max(1, rawFactories.length);
  return rawFactories.map((f, index) => {
    const id = String(f?.id ?? f?.factoryId ?? f?.name ?? f?.company ?? `factory-${index + 1}`);
    const name = String(f?.name ?? f?.company ?? f?.title ?? id).trim();

    // Collect outputs (waste materials produced by this factory)
    const rawOutputs = [];
    if (Array.isArray(f?.outputs)) rawOutputs.push(...f.outputs);
    if (f?.materialProduced) rawOutputs.push(f.materialProduced);
    if (Array.isArray(f?.materialsProduced)) rawOutputs.push(...f.materialsProduced);
    if (f?.produces) rawOutputs.push(...(Array.isArray(f.produces) ? f.produces : [f.produces]));
    if (f?.wasteProduced) rawOutputs.push(...(Array.isArray(f.wasteProduced) ? f.wasteProduced : [f.wasteProduced]));
    if (f?.waste) rawOutputs.push(...(Array.isArray(f.waste) ? f.waste : [f.waste]));
    if (!rawOutputs.length && f?.material) rawOutputs.push(f.material);

    const seenOut = new Set();
    const outputs = [];
    for (const item of rawOutputs) {
      const stream = normalizeStreamItem(item, f, ruleByProduced);
      if (!stream || seenOut.has(norm(stream.material))) continue;
      seenOut.add(norm(stream.material));
      outputs.push(stream);
    }

    // Collect inputs (raw materials accepted by this factory)
    const rawInputs = [];
    if (Array.isArray(f?.inputs)) rawInputs.push(...f.inputs);
    if (Array.isArray(f?.materialsAccepted)) rawInputs.push(...f.materialsAccepted);
    else if (typeof f?.materialsAccepted === 'string') rawInputs.push(f.materialsAccepted);
    if (Array.isArray(f?.acceptedMaterials)) rawInputs.push(...f.acceptedMaterials);
    if (f?.accepts) rawInputs.push(...(Array.isArray(f.accepts) ? f.accepts : [f.accepts]));
    if (f?.rawMaterials) rawInputs.push(...(Array.isArray(f.rawMaterials) ? f.rawMaterials : [f.rawMaterials]));

    const seenIn = new Set();
    const inputs = [];
    for (const item of rawInputs) {
      const stream = normalizeStreamItem(item, {}, ruleByProduced);
      if (!stream || seenIn.has(norm(stream.material))) continue;
      seenIn.add(norm(stream.material));
      inputs.push(stream);
    }

    const angle = (-Math.PI / 2) + (2 * Math.PI * index) / count;
    const defaultX = Math.round(430 + 250 * Math.cos(angle));
    const defaultY = Math.round(260 + 165 * Math.sin(angle));

    const primaryOutput = outputs[0] || null;
    const valueInr = finite(f?.valueInr)
      ? round2(f.valueInr)
      : finite(f?.value)
        ? round2(f.value)
        : primaryOutput
          ? primaryOutput.valueInr
          : 0;

    return {
      id,
      name,
      location: String(f?.location ?? f?.district ?? f?.state ?? '').trim(),
      industry: String(f?.industry ?? '').trim(),
      materialProduced: primaryOutput ? primaryOutput.material : String(f?.materialProduced ?? '').trim(),
      materialsProduced: outputs.map(o => o.material),
      materialsAccepted: inputs.map(i => i.material),
      inputs,
      outputs,
      quantityKg: primaryOutput ? primaryOutput.quantityKg : (finite(f?.quantityKg) ? qty6(f.quantityKg) : 0),
      pricePerKg: primaryOutput ? primaryOutput.pricePerKg : (finite(f?.pricePerKg) ? round2(f.pricePerKg) : 0),
      valueInr,
      value: valueInr,
      x: finite(f?.x) ? f.x : defaultX,
      y: finite(f?.y) ? f.y : defaultY,
      incomingEdges: [],
      outgoingEdges: [],
      isBestLoopNode: false,
    };
  });
}

export function buildLoopEdges(nodes, rulesConfig = DEMO_COMPATIBILITY_RULES) {
  const { rules } = normalizeCompatibilityRules(rulesConfig);
  const edges = [];
  for (const nodeA of nodes) {
    for (const nodeB of nodes) {
      if (nodeA.id === nodeB.id) continue;
      for (const outStream of nodeA.outputs) {
        const check = isMaterialCompatible(outStream.material, nodeB.materialsAccepted, rules);
        if (!check.compatible) continue;
        const matchedInStream = nodeB.inputs.find(i => norm(i.material) === norm(check.matchedInput)) || null;
        const quantityKg = outStream.quantityKg > 0
          ? outStream.quantityKg
          : (matchedInStream?.quantityKg > 0 ? matchedInStream.quantityKg : (check.rule?.defaultQuantityKg || 0));
        const pricePerKg = outStream.pricePerKg > 0
          ? outStream.pricePerKg
          : (matchedInStream?.pricePerKg > 0 ? matchedInStream.pricePerKg : (check.rule?.pricePerKgInr || 0));
        const valueInr = outStream.valueInr > 0
          ? outStream.valueInr
          : (quantityKg > 0 && pricePerKg > 0)
            ? round2(quantityKg * pricePerKg)
            : (check.rule?.estimatedValueInr || 0);
        edges.push({
          id: `${nodeA.id}->${nodeB.id}`,
          from: nodeA.id,
          to: nodeB.id,
          source: nodeA.id,
          target: nodeB.id,
          fromName: nodeA.name,
          toName: nodeB.name,
          material: outStream.material,
          acceptedAs: check.matchedInput,
          quantityKg: qty6(quantityKg),
          pricePerKg: round2(pricePerKg),
          valueInr: round2(valueInr),
          value: round2(valueInr),
          ruleId: check.rule?.id || null,
          meaning: `Waste of ${nodeA.name} (${outStream.material}) is raw material for ${nodeB.name}`,
          isBestLoopEdge: false,
        });
        break; // one directed edge per (A, B) pair using the primary matched waste stream
      }
    }
  }
  return edges;
}

function canonicalizeCycleIds(nodeIds, orderMap) {
  if (!nodeIds.length) return [];
  let minIdx = 0;
  let minRank = orderMap.get(nodeIds[0]) ?? Infinity;
  for (let i = 1; i < nodeIds.length; i++) {
    const rank = orderMap.get(nodeIds[i]) ?? Infinity;
    if (rank < minRank || (rank === minRank && String(nodeIds[i]).localeCompare(String(nodeIds[minIdx])) < 0)) {
      minRank = rank;
      minIdx = i;
    }
  }
  return [...nodeIds.slice(minIdx), ...nodeIds.slice(0, minIdx)];
}

export function buildLoopGraph(factoriesInput = DEMO_FACTORIES, rulesConfig = DEMO_COMPATIBILITY_RULES, options = {}) {
  let rawFactories = factoriesInput;
  let rawRules = rulesConfig;
  let explicitEdges = null;

  if (factoriesInput && typeof factoriesInput === 'object' && !Array.isArray(factoriesInput)) {
    rawFactories = factoriesInput.nodes || factoriesInput.factories || DEMO_FACTORIES;
    if (Array.isArray(factoriesInput.edges)) explicitEdges = factoriesInput.edges;
    if (factoriesInput.rules) rawRules = factoriesInput.rules;
  } else if (Array.isArray(rulesConfig) && rulesConfig.length > 0 && (rulesConfig[0]?.from !== undefined || rulesConfig[0]?.source !== undefined)) {
    explicitEdges = rulesConfig;
    rawRules = DEMO_COMPATIBILITY_RULES;
  }

  const minLength = finite(options?.minLength) ? Math.max(2, Math.floor(options.minLength)) : 2;
  const maxLength = finite(options?.maxLength) ? Math.max(minLength, Math.floor(options.maxLength)) : 4;

  const normalizedRules = normalizeCompatibilityRules(rawRules);
  const nodes = normalizeFactoryNodes(rawFactories, normalizedRules);
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const nodeOrder = new Map(nodes.map((n, idx) => [n.id, idx]));

  const edges = explicitEdges
    ? explicitEdges.map(e => {
        const from = String(e.from ?? e.source ?? '');
        const to = String(e.to ?? e.target ?? '');
        const nodeA = nodeById.get(from);
        const nodeB = nodeById.get(to);
        const quantityKg = finite(e.quantityKg) ? qty6(e.quantityKg) : (nodeA?.quantityKg || 0);
        const pricePerKg = finite(e.pricePerKg) ? round2(e.pricePerKg) : (nodeA?.pricePerKg || 0);
        const valueInr = finite(e.valueInr)
          ? round2(e.valueInr)
          : finite(e.value)
            ? round2(e.value)
            : (quantityKg > 0 && pricePerKg > 0)
              ? round2(quantityKg * pricePerKg)
              : (nodeA?.valueInr || 0);
        const material = String(e.material ?? nodeA?.materialProduced ?? 'Scrap material');
        return {
          id: `${from}->${to}`,
          from,
          to,
          source: from,
          target: to,
          fromName: nodeA?.name || from,
          toName: nodeB?.name || to,
          material,
          acceptedAs: String(e.acceptedAs ?? material),
          quantityKg,
          pricePerKg,
          valueInr,
          value: valueInr,
          ruleId: e.ruleId || null,
          meaning: `Waste of ${nodeA?.name || from} (${material}) is raw material for ${nodeB?.name || to}`,
          isBestLoopEdge: false,
        };
      }).filter(e => e.from && e.to && e.from !== e.to && nodeById.has(e.from) && nodeById.has(e.to))
    : buildLoopEdges(nodes, normalizedRules);

  const edgeByPair = new Map();
  const adj = new Map(nodes.map(n => [n.id, []]));
  for (const node of nodes) {
    node.incomingEdges = [];
    node.outgoingEdges = [];
  }
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    const existing = edgeByPair.get(key);
    if (!existing || edge.valueInr > existing.valueInr) {
      edgeByPair.set(key, edge);
    }
  }
  const uniqueEdges = [...edgeByPair.values()];
  for (const edge of uniqueEdges) {
    adj.get(edge.from)?.push(edge);
    nodeById.get(edge.from)?.outgoingEdges.push(edge);
    nodeById.get(edge.to)?.incomingEdges.push(edge);
  }

  // Find all closed loops (cycles) and open chains of length minLength..maxLength (2 to 4)
  const loopMap = new Map();
  const openChainList = [];

  function buildChainRecord(nodeIds, isLoop) {
    const chainEdges = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const e = edgeByPair.get(`${nodeIds[i]}->${nodeIds[i + 1]}`);
      if (!e) return null;
      chainEdges.push(e);
    }
    if (isLoop) {
      const closeEdge = edgeByPair.get(`${nodeIds[nodeIds.length - 1]}->${nodeIds[0]}`);
      if (!closeEdge) return null;
      chainEdges.push(closeEdge);
    }
    const totalValue = round2(chainEdges.reduce((sum, e) => sum + e.valueInr, 0));
    const totalQuantityKg = qty6(chainEdges.reduce((sum, e) => sum + e.quantityKg, 0));
    const nodeNames = nodeIds.map(id => nodeById.get(id)?.name || id);
    const path = isLoop ? [...nodeIds, nodeIds[0]] : [...nodeIds];
    const pathNames = isLoop ? [...nodeNames, nodeNames[0]] : [...nodeNames];
    return {
      id: `${isLoop ? 'loop' : 'chain'}-${nodeIds.join('-')}`,
      nodes: [...nodeIds],
      nodeNames,
      path,
      pathNames,
      edges: chainEdges,
      materials: chainEdges.map(e => e.material),
      length: nodeIds.length,
      nodeCount: nodeIds.length,
      edgeCount: chainEdges.length,
      isLoop,
      totalValue,
      valueInr: totalValue,
      value: totalValue,
      totalQuantityKg,
      isBest: false,
    };
  }

  function dfs(startId, currentId, visitedIds) {
    const len = visitedIds.length;
    if (len >= minLength && len <= maxLength) {
      // Check if currentId closes a loop back to startId
      if (edgeByPair.has(`${currentId}->${startId}`)) {
        const canonicalIds = canonicalizeCycleIds(visitedIds, nodeOrder);
        const key = canonicalIds.join('->');
        if (!loopMap.has(key)) {
          const loopRec = buildChainRecord(canonicalIds, true);
          if (loopRec) loopMap.set(key, loopRec);
        }
      }
      const openRec = buildChainRecord(visitedIds, false);
      if (openRec) openChainList.push(openRec);
    }
    if (len >= maxLength) return;

    const outgoing = adj.get(currentId) || [];
    for (const edge of outgoing) {
      const nextId = edge.to;
      if (visitedIds.includes(nextId)) continue;
      dfs(startId, nextId, [...visitedIds, nextId]);
    }
  }

  for (const node of nodes) {
    dfs(node.id, node.id, [node.id]);
  }

  const sortByValue = (a, b) => b.totalValue - a.totalValue || b.length - a.length || a.id.localeCompare(b.id);
  const loops = [...loopMap.values()].sort(sortByValue);
  const openChains = openChainList.sort(sortByValue);
  const bestLoop = loops[0] || null;
  if (bestLoop) bestLoop.isBest = true;

  const bestNodeIds = new Set(bestLoop ? bestLoop.nodes : []);
  const bestEdgeIds = new Set(bestLoop ? bestLoop.edges.map(e => `${e.from}->${e.to}`) : []);

  for (const node of nodes) {
    node.isBestLoopNode = bestNodeIds.has(node.id);
  }
  for (const edge of uniqueEdges) {
    edge.isBestLoopEdge = bestEdgeIds.has(`${edge.from}->${edge.to}`);
  }

  const chains = options?.includeOpen
    ? [...loops, ...openChains]
    : (loops.length > 0 ? loops : openChains);

  return {
    rulesLabel: normalizedRules.label,
    isDemoRules: normalizedRules.isDemo,
    rules: normalizedRules.rules,
    nodes,
    edges: uniqueEdges,
    loops,
    openChains,
    chains,
    bestLoop,
  };
}

export function findLoopChains(factoriesInput = DEMO_FACTORIES, rulesConfig = DEMO_COMPATIBILITY_RULES, options = {}) {
  const graph = buildLoopGraph(factoriesInput, rulesConfig, options);
  const result = [...graph.chains];
  result.chains = graph.chains;
  result.loops = graph.loops;
  result.openChains = graph.openChains;
  result.bestLoop = graph.bestLoop;
  result.nodes = graph.nodes;
  result.edges = graph.edges;
  result.rules = graph.rules;
  result.rulesLabel = graph.rulesLabel;
  return result;
}

export const findChains = findLoopChains;
