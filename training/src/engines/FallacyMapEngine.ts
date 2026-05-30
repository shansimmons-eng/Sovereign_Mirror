import { FallacyVector, InverionState } from '../types';

export type FallacyId =
  | 'CU-FALLACY-AD-HOMINEM'
  | 'CU-FALLACY-CONFIRMATION'
  | 'CU-FALLACY-TRIBALISM'
  | 'CU-FALLACY-FALSE-DICHOTOMY'
  | 'CU-FALLACY-STATUS-SEEKING'
  | 'CU-FALLACY-OUT-GROUP-HOSTILITY'
  | 'CU-FALLACY-EMOTIONAL-REASONING'
  | 'CU-FALLACY-BLACK-WHITE'
  | 'CU-FALLACY-COMFIRMATION-BIAS'
  | 'CU-FALLACY-DEFENSIVE-POSTURING';

interface FallacyPattern {
  id: FallacyId;
  patterns: RegExp[];
  weight: number;
}

const FALLACY_PATTERNS: FallacyPattern[] = [
  {
    id: 'CU-FALLACY-AD-HOMINEM',
    patterns: [
      /\b(they|you|he|she|those people)\s+(are|is|were|was)\s+(stupid|dumb|idiot|incompetent|corrupt|evil)/i,
      /\b(they|you|he|she)\s+(can't|wouldn't|couldn't)\s+(understand|comprehend|get)/i,
      /\b(of course|clearly|obviously)\s+(you|they)\s+(are|is)/i,
    ],
    weight: 0.85,
  },
  {
    id: 'CU-FALLACY-CONFIRMATION',
    patterns: [
      /\b(proves|confirms|validates|shows)\s+(that|how)\s+(I am|we are|they are)/i,
      /\b(I knew|we knew|they knew)\s+(it|this|all along)/i,
      /\b(always|never|every time)\s+(happens|works|fails)/i,
    ],
    weight: 0.75,
  },
  {
    id: 'CU-FALLACY-TRIBALISM',
    patterns: [
      /\b(our|my team|our side|we are right|they are wrong)/i,
      /\b(our group|my people|like-minded|in-group)/i,
      /\b(belongs to|part of|aligned with)\s+(us|our|team)/i,
    ],
    weight: 0.90,
  },
  {
    id: 'CU-FALLACY-FALSE-DICHOTOMY',
    patterns: [
      /\b(either|it's either|only two options|you either|we either)/i,
      /\b(only way|only choice|must choose|if not then)/i,
      /\b(all or nothing|must win|has to be|black and white)/i,
    ],
    weight: 0.70,
  },
  {
    id: 'CU-FALLACY-STATUS-SEEKING',
    patterns: [
      /\b(I am superior|I am better|I am right|my status)/i,
      /\b(need to prove|want to show|must demonstrate)/i,
      /\b(worth more|more valuable|above others)/i,
    ],
    weight: 0.80,
  },
  {
    id: 'CU-FALLACY-OUT-GROUP-HOSTILITY',
    patterns: [
      /\b(enemy|threat|dangerous|against us|harmful)/i,
      /\b(them|those|they)\s+(want to|must|need to|are trying to)/i,
      /\b(out-group|others|foreign|different)/i,
    ],
    weight: 0.85,
  },
  {
    id: 'CU-FALLACY-EMOTIONAL-REASONING',
    patterns: [
      /\b(I feel|I feel like|I feel that|I sense)/i,
      /\b(makes me|feels like|seems like|appears to)/i,
      /\b(emotional|feeling|sensing|intuitively)/i,
    ],
    weight: 0.60,
  },
  {
    id: 'CU-FALLACY-BLACK-WHITE',
    patterns: [
      /\b(always|never|nothing|everything)/i,
      /\b(completely|entirely|absolutely|totally)/i,
      /\b(no way|always wrong|always right|definitely)/i,
    ],
    weight: 0.65,
  },
  {
    id: 'CU-FALLACY-COMFIRMATION-BIAS',
    patterns: [
      /\b(only evidence|only data|only facts|everything shows)/i,
      /\b(cannot be wrong|must be right|proven correctly)/i,
      /\b(ignores|disregards|doesn't consider)\s+(other|alternative|different)/i,
    ],
    weight: 0.72,
  },
  {
    id: 'CU-FALLACY-DEFENSIVE-POSTURING',
    patterns: [
      /\b(I'm not|I don't|I won't|can't touch|beyond reproach)/i,
      /\b(not possible|would never|wouldn't happen)/i,
      /\b(defensive|protecting|guarding|shielding)/i,
    ],
    weight: 0.68,
  },
];

export interface FallacyAnalysisResult {
  detectedFallacies: FallacyVector[];
  inverionState: InverionState;
  radicalVeracityPassed: boolean;
  maxConfidenceScore: number;
  tokens: string[];
}

export class FallacyMapEngine {
  private static instance: FallacyMapEngine | null = null;

  private constructor() {}

  static getInstance(): FallacyMapEngine {
    if (!FallacyMapEngine.instance) {
      FallacyMapEngine.instance = new FallacyMapEngine();
    }
    return FallacyMapEngine.instance;
  }

  analyzeInput(rawInput: string): FallacyAnalysisResult {
    const tokens = this.tokenize(rawInput);
    const detectedFallacies: FallacyVector[] = [];
    let maxConfidenceScore = 0;

    for (const pattern of FALLACY_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(rawInput)) {
          const confidenceScore = this.calculateConfidence(pattern.weight, rawInput);
          maxConfidenceScore = Math.max(maxConfidenceScore, confidenceScore);

          const existingFallacy = detectedFallacies.find(f => f.fallacyId === pattern.id);
          if (!existingFallacy || existingFallacy.confidenceScore < confidenceScore) {
            if (existingFallacy) {
              detectedFallacies.splice(detectedFallacies.indexOf(existingFallacy), 1);
            }
            detectedFallacies.push({
              fallacyId: pattern.id,
              confidenceScore,
              validationProof: this.generateValidationProof(rawInput, pattern.id, confidenceScore),
            });
          }
          break;
        }
      }
    }

    const radicalVeracityPassed = maxConfidenceScore < 0.15;
    const inverionState = this.determineInverionState(detectedFallacies, radicalVeracityPassed);

    return {
      detectedFallacies,
      inverionState,
      radicalVeracityPassed,
      maxConfidenceScore,
      tokens,
    };
  }

  private tokenize(input: string): string[] {
    return input
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private calculateConfidence(baseWeight: number, rawInput: string): number {
    const intensityModifiers: Record<string, number> = {
      'always': 0.15,
      'never': 0.15,
      'completely': 0.10,
      'totally': 0.10,
      'must': 0.08,
      'need': 0.08,
      'should': 0.05,
      'must not': 0.12,
    };

    let intensityBoost = 0;
    for (const [modifier, boost] of Object.entries(intensityModifiers)) {
      if (rawInput.toLowerCase().includes(modifier)) {
        intensityBoost += boost;
      }
    }

    return Math.min(1.0, baseWeight + intensityBoost);
  }

  private generateValidationProof(rawInput: string, fallacyId: string, confidenceScore: number): string {
    const timestamp = Date.now();
    const proofData = `${fallacyId}:${confidenceScore}:${timestamp}:${rawInput.substring(0, 50)}`;
    return btoa(proofData);
  }

  private determineInverionState(fallacies: FallacyVector[], veracityPassed: boolean): InverionState {
    if (veracityPassed) {
      return InverionState.OBJECTIVE_REALITY;
    }
    if (fallacies.length > 0) {
      return InverionState.SUBJECTIVE_NOISE;
    }
    return InverionState.TRANSITIONAL;
  }

  refactorInput(rawInput: string, fallacies: FallacyVector[]): string {
    let refactored = rawInput;

    const stripPatterns: Record<FallacyId, RegExp[]> = {
      'CU-FALLACY-AD-HOMINEM': [/(they|you|he|she|those people)\s+(are|is|were|was)\s+(stupid|dumb|idiot|incompetent|corrupt|evil)/gi],
      'CU-FALLACY-TRIBALISM': [/(our|my team|our side|we are right|they are wrong)/gi],
      'CU-FALLACY-FALSE-DICHOTOMY': [/(either|it's either|only two options|you either|we either)/gi],
      'CU-FALLACY-STATUS-SEEKING': [/(I am superior|I am better|I am right|my status)/gi],
      'CU-FALLACY-OUT-GROUP-HOSTILITY': [/(enemy|threat|dangerous|against us|harmful)/gi],
      'CU-FALLACY-EMOTIONAL-REASONING': [/(I feel|I feel like|I feel that|I sense)/gi],
      'CU-FALLACY-BLACK-WHITE': [/(always|never|nothing|everything)/gi],
      'CU-FALLACY-CONFIRMATION': [/(proves|confirms|validates|shows)\s+(that|how)/gi],
      'CU-FALLACY-COMFIRMATION-BIAS': [/(only evidence|only data|only facts|everything shows)/gi],
      'CU-FALLACY-DEFENSIVE-POSTURING': [/(I'm not|I don't|I won't|can't touch|beyond reproach)/gi],
    };

    for (const fallacy of fallacies) {
      const patterns = stripPatterns[fallacy.fallacyId as FallacyId];
      if (patterns) {
        for (const pattern of patterns) {
          refactored = refactored.replace(pattern, '[REDACTED]');
        }
      }
    }

    refactored = refactored.replace(/\s+/g, ' ').trim();
    return refactored;
  }
}

export const fallacyMapEngine = FallacyMapEngine.getInstance();