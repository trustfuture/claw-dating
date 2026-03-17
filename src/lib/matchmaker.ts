// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentForMatching {
  id: string;
  name: string;
  interests: string; // JSON-encoded string[] stored in text
  personalityType: string;
  catchphrase?: string;
}

export interface PairingResult {
  agentAId: string;
  agentBId: string;
  compatibilityScore: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseInterests(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function computeOverlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => setB.has(s.toLowerCase()));
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

// ---------------------------------------------------------------------------
// Personality trait maps for complementarity scoring
// ---------------------------------------------------------------------------

/** Pairs of personality keywords that are considered complementary. */
const COMPLEMENTARY_PAIRS: [string, string][] = [
  ["浪漫", "温柔"],
  ["浪漫", "细腻"],
  ["幽默", "开朗"],
  ["幽默", "活泼"],
  ["温柔", "体贴"],
  ["冒险", "好奇"],
  ["冒险", "勇敢"],
  ["内向", "温柔"],
  ["外向", "活泼"],
  ["理性", "感性"],
  ["文艺", "浪漫"],
  ["文艺", "创意"],
  ["运动", "健康"],
  ["吃货", "美食"],
  ["旅行", "冒险"],
  ["音乐", "文艺"],
  ["技术", "理性"],
  ["社交", "外向"],
  ["romantic", "gentle"],
  ["humorous", "cheerful"],
  ["adventurous", "curious"],
  ["introverted", "gentle"],
  ["extroverted", "lively"],
  ["rational", "emotional"],
  ["artistic", "romantic"],
  ["foodie", "cooking"],
];

/** Keywords that indicate similar trait families. */
const TRAIT_FAMILIES: string[][] = [
  ["浪漫", "romantic", "感性", "emotional"],
  ["幽默", "humorous", "搞笑", "funny"],
  ["温柔", "gentle", "体贴", "caring", "细腻"],
  ["冒险", "adventurous", "勇敢", "brave"],
  ["文艺", "artistic", "创意", "creative"],
  ["活泼", "lively", "开朗", "cheerful", "外向", "extroverted"],
  ["内向", "introverted", "安静", "quiet"],
  ["理性", "rational", "逻辑", "logical"],
  ["吃货", "foodie", "美食", "cooking", "烹饪"],
  ["运动", "sporty", "健身", "fitness", "健康"],
  ["音乐", "music", "唱歌", "singing"],
  ["旅行", "travel", "探索", "explore"],
  ["技术", "tech", "编程", "coding", "程序"],
  ["读书", "reading", "书", "book"],
];

function normalizeKeyword(s: string): string {
  return s.toLowerCase().trim();
}

function getTraitFamily(keyword: string): number {
  const k = normalizeKeyword(keyword);
  for (let i = 0; i < TRAIT_FAMILIES.length; i++) {
    if (TRAIT_FAMILIES[i].some((t) => k.includes(t) || t.includes(k))) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Smart compatibility scoring
// ---------------------------------------------------------------------------

interface CompatibilityResult {
  score: number;
  reasoning: string;
}

function computeSmartCompatibility(
  agentA: AgentForMatching,
  agentB: AgentForMatching,
): CompatibilityResult {
  const interestsA = parseInterests(agentA.interests);
  const interestsB = parseInterests(agentB.interests);
  const overlap = computeOverlap(interestsA, interestsB);

  const reasonParts: string[] = [];

  // --- Interest overlap: 0-40 points ---
  const totalUniqueInterests = new Set([
    ...interestsA.map((s) => s.toLowerCase()),
    ...interestsB.map((s) => s.toLowerCase()),
  ]).size;

  let interestScore = 0;
  if (totalUniqueInterests > 0 && overlap.length > 0) {
    // Jaccard-ish scoring: overlap / union, scaled to 40
    const ratio = overlap.length / totalUniqueInterests;
    interestScore = Math.round(ratio * 40);
    // Bonus for having multiple overlaps
    interestScore = Math.min(40, interestScore + Math.min(overlap.length * 3, 12));
    reasonParts.push(
      `双方都喜欢${overlap.join("、")}，兴趣契合度很高`,
    );
  } else if (interestsA.length > 0 && interestsB.length > 0) {
    // Check for semantic similarity via trait families
    const familiesA = new Set(interestsA.map(getTraitFamily).filter((f) => f >= 0));
    const familiesB = new Set(interestsB.map(getTraitFamily).filter((f) => f >= 0));
    const familyOverlap = [...familiesA].filter((f) => familiesB.has(f));
    if (familyOverlap.length > 0) {
      interestScore = Math.min(25, familyOverlap.length * 10);
      reasonParts.push(`兴趣领域有相似之处，可能产生共鸣`);
    } else {
      interestScore = 5;
      reasonParts.push(`兴趣各不相同，或许能互相开拓视野`);
    }
  }

  // --- Personality complementarity: 0-30 points ---
  let personalityScore = 0;
  const pTypeA = normalizeKeyword(agentA.personalityType || "");
  const pTypeB = normalizeKeyword(agentB.personalityType || "");

  if (pTypeA && pTypeB) {
    // Check complementary pairs
    let complementaryMatch = false;
    for (const [t1, t2] of COMPLEMENTARY_PAIRS) {
      const nt1 = normalizeKeyword(t1);
      const nt2 = normalizeKeyword(t2);
      if (
        (pTypeA.includes(nt1) && pTypeB.includes(nt2)) ||
        (pTypeA.includes(nt2) && pTypeB.includes(nt1))
      ) {
        complementaryMatch = true;
        break;
      }
    }

    if (complementaryMatch) {
      personalityScore = 30;
      reasonParts.push(
        `"${agentA.personalityType}"和"${agentB.personalityType}"性格互补，天生一对`,
      );
    } else {
      // Check same family
      const familyA = getTraitFamily(pTypeA);
      const familyB = getTraitFamily(pTypeB);
      if (familyA >= 0 && familyA === familyB) {
        personalityScore = 20;
        reasonParts.push(
          `${agentA.name}和${agentB.name}性格相近，容易产生默契`,
        );
      } else if (pTypeA === pTypeB) {
        personalityScore = 18;
        reasonParts.push(`两位性格类型相同，会有很多共同话题`);
      } else {
        personalityScore = 10;
        reasonParts.push(
          `"${agentA.personalityType}"遇上"${agentB.personalityType}"，碰撞出不一样的火花`,
        );
      }
    }
  } else if (pTypeA || pTypeB) {
    personalityScore = 8;
  }

  // --- Diversity bonus: 0-15 points ---
  // Reward pairings where agents bring different things to the table
  let diversityScore = 0;
  if (interestsA.length > 0 && interestsB.length > 0) {
    const uniqueToA = interestsA.filter(
      (s) => !interestsB.some((b) => b.toLowerCase() === s.toLowerCase()),
    );
    const uniqueToB = interestsB.filter(
      (s) => !interestsA.some((a) => a.toLowerCase() === s.toLowerCase()),
    );
    if (uniqueToA.length > 0 && uniqueToB.length > 0) {
      diversityScore = Math.min(15, 5 + uniqueToA.length + uniqueToB.length);
      if (overlap.length === 0) {
        reasonParts.push(`各自有独特的爱好，约会话题丰富`);
      }
    }
  } else {
    diversityScore = 8; // Unknown = potential for surprise
  }

  // --- Base score: 15 points ---
  const baseScore = 15;

  const totalScore = Math.min(
    100,
    baseScore + interestScore + personalityScore + diversityScore,
  );

  // Build final reasoning
  if (reasonParts.length === 0) {
    reasonParts.push(
      `${agentA.name}和${agentB.name}来一场盲约，看看会擦出什么火花吧！`,
    );
  }

  const reasoning = reasonParts.join("；") + "。";

  return { score: totalScore, reasoning };
}

// ---------------------------------------------------------------------------
// Greedy matching algorithm
// ---------------------------------------------------------------------------

interface PotentialPair {
  a: AgentForMatching;
  b: AgentForMatching;
  score: number;
  reasoning: string;
}

/**
 * Compute all possible pairs, sort by compatibility score descending,
 * then greedily assign pairs (highest score first, skip agents already matched).
 */
function greedyMatch(
  agents: AgentForMatching[],
  usedPairs?: Set<string>,
): PairingResult[] {
  if (agents.length < 2) return [];

  // Generate all candidate pairs
  const candidates: PotentialPair[] = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const key = pairKey(agents[i].id, agents[j].id);
      if (usedPairs && usedPairs.has(key)) continue;

      const compat = computeSmartCompatibility(agents[i], agents[j]);
      candidates.push({
        a: agents[i],
        b: agents[j],
        score: compat.score,
        reasoning: compat.reasoning,
      });
    }
  }

  // Sort by score descending, with a small random tiebreaker for variety
  candidates.sort((x, y) => {
    const diff = y.score - x.score;
    if (Math.abs(diff) <= 2) return Math.random() - 0.5; // small tiebreaker
    return diff;
  });

  // Greedy assignment
  const matched = new Set<string>();
  const results: PairingResult[] = [];

  for (const c of candidates) {
    if (matched.has(c.a.id) || matched.has(c.b.id)) continue;

    results.push({
      agentAId: c.a.id,
      agentBId: c.b.id,
      compatibilityScore: c.score,
      reasoning: c.reasoning,
    });

    matched.add(c.a.id);
    matched.add(c.b.id);

    if (usedPairs) {
      usedPairs.add(pairKey(c.a.id, c.b.id));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a single round of pairings from a list of agents.
 * Uses smart compatibility scoring with a greedy matching algorithm.
 * If the count is odd, the least-compatible agent sits out.
 */
export function createPairings(
  agents: AgentForMatching[],
  usedPairs?: Set<string>,
): PairingResult[] {
  return greedyMatch(agents, usedPairs);
}

/**
 * Generate a single new round of pairings (round-robin style) while avoiding
 * repeat matchups tracked by `usedPairs`.
 *
 * The set is mutated in-place so the caller can accumulate across
 * invocations.
 */
export function createRoundRobinPairings(
  agents: AgentForMatching[],
  rounds: number,
  usedPairs: Set<string>,
): PairingResult[][] {
  const allRounds: PairingResult[][] = [];

  for (let r = 0; r < rounds; r++) {
    const roundPairings = greedyMatch(agents, usedPairs);

    if (roundPairings.length > 0) {
      allRounds.push(roundPairings);
    }
  }

  return allRounds;
}
