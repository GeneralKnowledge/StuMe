import { SPECIALIST_EQUIPMENT } from "./config";
import type { TransformationRecord } from "./types";

const EQUIPMENT_SUBSTITUTIONS: Array<{
  from: RegExp;
  to: string;
  reason: string;
  safe: boolean;
}> = [
  {
    from: /\bfood processor\b/gi,
    to: "knife",
    reason: "Chop by hand instead of food processor",
    safe: true,
  },
  {
    from: /\bstand mixer\b/gi,
    to: "bowl",
    reason: "Mix by hand in a bowl",
    safe: true,
  },
  {
    from: /\b(immersion )?blender\b/gi,
    to: "fork",
    reason: "Mash/mix manually where texture allows",
    safe: true,
  },
  {
    from: /\bmandoline\b/gi,
    to: "knife",
    reason: "Slice with a knife",
    safe: true,
  },
  {
    from: /\bwok\b/gi,
    to: "frying pan",
    reason: "Use a frying pan instead of a wok",
    safe: true,
  },
  {
    from: /\bdutch oven\b/gi,
    to: "saucepan",
    reason: "Use a saucepan / ovenproof dish",
    safe: true,
  },
  {
    from: /\bcast iron skillet\b/gi,
    to: "frying pan",
    reason: "Any frying pan is fine",
    safe: true,
  },
  {
    from: /\b(bain marie|double boiler)\b/gi,
    to: "bowl over saucepan",
    reason: "Improvised gentle heat",
    safe: true,
  },
];

export function simplifyEquipmentInSteps(steps: string[]): {
  steps: string[];
  equipment: string[];
  transformations: TransformationRecord[];
} {
  const transformations: TransformationRecord[] = [];
  let nextSteps = [...steps];

  for (const rule of EQUIPMENT_SUBSTITUTIONS) {
    let applied = false;
    nextSteps = nextSteps.map((step) => {
      if (!rule.from.test(step)) return step;
      applied = true;
      return step.replace(rule.from, rule.to);
    });
    // reset lastIndex for global regexes
    rule.from.lastIndex = 0;
    if (applied && rule.safe) {
      transformations.push({
        kind: "equipment_simplify",
        from: rule.from.source,
        to: rule.to,
        reason: rule.reason,
      });
    }
  }

  // Collapse "in another pan" language toward one-pan when safe (no baking stage conflict)
  const joined = nextSteps.join(" ").toLowerCase();
  const hasOvenBake = /\boven\b|\bbake\b/.test(joined);
  const multiPanLanguage = /\bin another (pan|pot|skillet)\b|\bmeanwhile\b/i;
  if (!hasOvenBake && nextSteps.some((step) => multiPanLanguage.test(step))) {
    nextSteps = nextSteps.map((step) =>
      step
        .replace(/\bin another (pan|pot|skillet)\b/gi, "in the same pan")
        .replace(/\bMeanwhile,\s*/gi, ""),
    );
    transformations.push({
      kind: "equipment_simplify",
      from: "multiple pans",
      to: "one-pan strategy",
      reason: "Collapsed multi-pan wording where no bake stage conflicts",
    });
  }

  const equipment = new Set<string>(["bowl", "knife"]);
  const text = nextSteps.join(" ").toLowerCase();
  if (/\bfrying pan\b|\bpan\b|\bfry\b/.test(text)) equipment.add("frying pan");
  if (/\bsaucepan\b|\bboil\b|\bsimmer\b/.test(text)) equipment.add("saucepan");
  if (/\bmicrowave\b/.test(text)) equipment.add("microwave");
  if (/\boven\b|\bbake\b/.test(text)) equipment.add("oven");
  if (/\btoaster\b|\btoast\b/.test(text)) equipment.add("toaster");

  // Drop specialist leftovers if still mentioned unsafely
  for (const specialist of SPECIALIST_EQUIPMENT) {
    if (text.includes(specialist)) {
      // leave as-is but note — caller may reject
      equipment.add(specialist);
    }
  }

  return {
    steps: nextSteps,
    equipment: [...equipment],
    transformations,
  };
}

export function collapseSteps(steps: string[]): {
  steps: string[];
  transformations: TransformationRecord[];
} {
  const transformations: TransformationRecord[] = [];
  const collapsed: string[] = [];

  for (const step of steps) {
    const trimmed = step.trim();
    if (!trimmed) continue;
    if (/^(set aside|reserve|keep warm)\.?$/i.test(trimmed)) {
      transformations.push({
        kind: "step_collapse",
        from: trimmed,
        to: "",
        reason: "Removed low-value holding step",
      });
      continue;
    }
    if (
      collapsed.length > 0 &&
      /^(stir|mix|combine)( well)?\.?$/i.test(trimmed) &&
      collapsed[collapsed.length - 1]!.length < 120
    ) {
      collapsed[collapsed.length - 1] = `${collapsed[collapsed.length - 1]!.replace(/\.$/, "")}; ${trimmed}`;
      transformations.push({
        kind: "step_collapse",
        from: trimmed,
        to: "merged with previous",
        reason: "Merged tiny stir/mix step",
      });
      continue;
    }
    collapsed.push(trimmed);
  }

  return { steps: collapsed.slice(0, 8), transformations };
}
