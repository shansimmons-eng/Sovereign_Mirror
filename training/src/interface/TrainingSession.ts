import { useState, useCallback, useRef, useEffect } from 'react';
import { InverionState, FallacyVector, ManifoldUpdate } from '../types';
import { SlidingWindowBuffer } from '../cluster/SlidingWindowBuffer';
import { ManifoldDeformer, SemanticBridge } from '../cluster/GravityWell';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';

const ROBERTA_ENDPOINT = '/classify/classify-single';
const FREE_AGENTS_ENDPOINT = '/validate/validate';
const FEEDBACK_WEIGHTS_ENDPOINT = '/api/feedback/weights';
const FEEDBACK_ANALYZE_ENDPOINT = '/api/feedback/analyze';
const FEEDBACK_VERDICT_ENDPOINT = '/api/feedback';
const USE_ROBERTA = true;
const USE_FREE_AGENTS = true;
const ROBERTA_THRESHOLD = 0.60;
const WORD_COUNT_CAP = 200;

const DEFAULT_WEIGHTS = { roberta: 1.0, groq: 1.0, openrouter: 1.0 };

interface AgentScore {
  agent: string;
  detected: boolean;
  confidence: number;
  score: number;
  reasoning?: string;
  model?: string;
  error?: string;
}

export interface AnalysisBreakdown {
  statementId: string;
  text: string;
  roberta: { detected: boolean; score: number; fallacies: Array<{ id: string; score: number }>; raw: unknown };
  groq: AgentScore | null;
  openrouter: AgentScore[];
  weights: Record<string, number>;
  weightedScore: number;
  state: InverionState;
  inverionTriggered: boolean;
  bypassTriggered: boolean;
  timestamp: number;
  processingMs: number;
  fallacyVerdicts: Record<string, 'correct' | 'incorrect' | undefined>;
}

interface StatementLog {
  id: string;
  text: string;
  timestamp: number;
  fallacies: FallacyVector[];
  inverionState: InverionState;
  radicalVeracityPassed: boolean;
  breakdown?: AnalysisBreakdown;
  freeAgentValidation?: { detected: boolean; reason: string; agent: string } | null;
  refactored?: string;
}

interface TrainingSessionProps {
  nodeId: string;
  onFrameCreated?: (frame: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean }, rawInput: string) => void;
}

export function useTrainingSession({ nodeId, onFrameCreated }: TrainingSessionProps) {
  const [interceptActive, setInterceptActive] = useState(false);
  const [refactoredInput, setRefactoredInput] = useState('');
  const [detectedFallacies, setDetectedFallacies] = useState<FallacyVector[]>([]);
  const [statementLog, setStatementLog] = useState<StatementLog[]>([]);
  const [inverionState, setInverionState] = useState<InverionState>(InverionState.OBJECTIVE_REALITY);
  const [metrics, setMetrics] = useState({
    totalIntercepts: 0,
    successfulRefactors: 0,
    averageResolutionTime: 0,
    currentStreak: 0,
    maxStreak: 0,
  });
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [lastBreakdown, setLastBreakdown] = useState<AnalysisBreakdown | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[TRAINING] lastBreakdown state changed', { hasBreakdown: !!lastBreakdown, statementId: lastBreakdown?.statementId, weightedScore: lastBreakdown?.weightedScore });
    }
  }, [lastBreakdown]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[TRAINING] statementLog state changed', { count: statementLog.length, firstId: statementLog[0]?.id });
    }
  }, [statementLog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(FEEDBACK_WEIGHTS_ENDPOINT);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.weights) {
          const w: Record<string, number> = { ...DEFAULT_WEIGHTS };
          for (const [k, v] of Object.entries(data.weights)) {
            if (typeof (v as { weight: number }).weight === 'number') w[k] = (v as { weight: number }).weight;
          }
          setWeights(w);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Stable refs - not recreated on every render
  const slidingWindowRef = useRef(new SlidingWindowBuffer(512, 0.5));
  const manifoldDeformerRef = useRef(new ManifoldDeformer(64));
  const semanticBridgeRef = useRef(new SemanticBridge(manifoldDeformerRef.current));

  const analyzeInput = useCallback(async (rawInput: string): Promise<ManifoldUpdate> => {
    const slidingWindow = slidingWindowRef.current;
    const manifoldDeformer = manifoldDeformerRef.current;
    const semanticBridge = semanticBridgeRef.current;
    const startedAt = Date.now();

    if (rawInput.trim().split(/\s+/).length < 2) {
      setDetectedFallacies([]);
      return semanticBridge.processLLMOutput([], 1);
    }

    slidingWindow.ingest(rawInput);

    const detectedFallacies: FallacyVector[] = [];
    let maxConfidence = 0;
    let robertaRaw: unknown = null;
    let robertaResults: Array<{mappedLabel: string, confidence: number}> = [];
    let robertaFallaciesForLog: Array<{ id: string; score: number }> = [];

    if (USE_ROBERTA) {
      try {
        const response = await fetch(ROBERTA_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawInput }),
        });
        if (response.ok) {
          const data = await response.json();
          robertaRaw = data;
          if (data.fallacies && Array.isArray(data.fallacies)) {
            robertaResults = data.fallacies;
            for (const fallacy of robertaResults) {
              maxConfidence = Math.max(maxConfidence, fallacy.confidence);
              robertaFallaciesForLog.push({ id: fallacy.mappedLabel, score: fallacy.confidence });
              detectedFallacies.push({
                fallacyId: fallacy.mappedLabel,
                confidenceScore: fallacy.confidence,
                validationProof: btoa(`roberta:${fallacy.mappedLabel}:${fallacy.confidence}:${Date.now()}`),
              });
            }
          }
        }
      } catch {}
    }

    const wordCount = rawInput.trim().split(/\s+/).length;
    let freeAgentValidation: StatementLog['freeAgentValidation'] = null;
    let freeAgentsRaw: unknown = null;
    let groqScore: AgentScore | null = null;
    const openrouterScores: AgentScore[] = [];

    if (USE_FREE_AGENTS && robertaResults.length > 0 && wordCount <= WORD_COUNT_CAP && maxConfidence >= ROBERTA_THRESHOLD) {
      try {
        const response = await fetch(FREE_AGENTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawInput }),
        });
        if (response.ok) {
          const data = await response.json();
          freeAgentsRaw = data;
          const consensus = data.consensus;
          if (consensus) {
            freeAgentValidation = {
              detected: consensus.detected,
              reason: `${consensus.agents_detected}/${consensus.agents_queried} agents agree. ${consensus.reasoning}`,
              agent: `${consensus.agents_queried} agents`,
            };
          }
          const agents = data.agents || {};
          if (agents.groq) {
            const g = agents.groq;
            groqScore = {
              agent: 'groq',
              detected: !!g.detected,
              confidence: typeof g.confidence === 'number' ? g.confidence : 0,
              score: g.detected ? Math.min(1, Math.max(0, (g.confidence ?? 0))) : (1 - Math.min(1, Math.max(0, (g.confidence ?? 0)))),
              reasoning: g.reasoning || '',
              model: g.model || '',
              error: g.error,
            };
          }
          if (Array.isArray(agents.openrouter)) {
            for (const o of agents.openrouter) {
              openrouterScores.push({
                agent: 'openrouter',
                detected: !!o.detected,
                confidence: typeof o.confidence === 'number' ? o.confidence : 0,
                score: o.detected ? Math.min(1, Math.max(0, (o.confidence ?? 0))) : (1 - Math.min(1, Math.max(0, (o.confidence ?? 0)))),
                reasoning: o.reasoning || '',
                model: o.model || '',
                error: o.error,
              });
            }
          }
        }
      } catch {}
    }

    if (robertaResults.length === 0) {
      const analysis = analyzeFallaciesContextual(rawInput);
      for (const detection of analysis.detections) {
        maxConfidence = Math.max(maxConfidence, detection.confidence);
        robertaFallaciesForLog.push({ id: detection.fallacyId, score: detection.confidence });
        detectedFallacies.push({
          fallacyId: detection.fallacyId,
          confidenceScore: detection.confidence,
          validationProof: btoa(`${detection.fallacyId}:${detection.confidence}:${Date.now()}:${rawInput.substring(0, 50)}`),
        });
      }
    }

    setDetectedFallacies(detectedFallacies);

    const w = (n: string) => weights[n] ?? 1.0;
    const robertaScore = robertaResults.length > 0 ? maxConfidence : 0;
    const groqNumeric = groqScore ? groqScore.score : null;
    const openrouterMean = openrouterScores.length > 0
      ? openrouterScores.reduce((s, a) => s + a.score, 0) / openrouterScores.length
      : null;

    const contributors: Array<{ name: string; score: number; weight: number }> = [];
    contributors.push({ name: 'roberta', score: robertaScore, weight: w('roberta') });
    if (groqNumeric !== null) contributors.push({ name: 'groq', score: groqNumeric, weight: w('groq') });
    if (openrouterMean !== null) contributors.push({ name: 'openrouter', score: openrouterMean, weight: w('openrouter') });

    const totalWeight = contributors.reduce((s, c) => s + c.weight, 0) || 1;
    const weightedScore = contributors.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight;
    const safeScore = Math.min(1, Math.max(0, isFinite(weightedScore) ? weightedScore : 0));

    const state = safeScore >= FALLACY_CRITICAL_THRESHOLD
      ? InverionState.SUBJECTIVE_NOISE
      : safeScore > 0
        ? InverionState.TRANSITIONAL
        : InverionState.OBJECTIVE_REALITY;

    setInverionState(state);

    const radicalVeracityPassed = safeScore < FALLACY_CRITICAL_THRESHOLD;
    const statementId = crypto.randomUUID();

    const breakdown: AnalysisBreakdown = {
      statementId,
      text: rawInput,
      roberta: { detected: robertaResults.length > 0, score: robertaScore, fallacies: robertaFallaciesForLog, raw: robertaRaw },
      groq: groqScore,
      openrouter: openrouterScores,
      weights: { ...weights },
      weightedScore: safeScore,
      state,
      inverionTriggered: state === InverionState.SUBJECTIVE_NOISE,
      bypassTriggered: state === InverionState.OBJECTIVE_REALITY && robertaResults.length > 0,
      timestamp: startedAt,
      processingMs: Date.now() - startedAt,
      fallacyVerdicts: {},
    };
    setLastBreakdown(breakdown);

    const verdictMap: Record<string, { detected: boolean; confidence: number; model?: string }> = {};
    verdictMap.roberta = { detected: robertaResults.length > 0, confidence: robertaScore };
    if (groqScore) verdictMap.groq = { detected: groqScore.detected, confidence: groqScore.confidence, model: groqScore.model };
    for (const o of openrouterScores) {
      verdictMap[`openrouter:${o.model || 'unknown'}`] = { detected: o.detected, confidence: o.confidence, model: o.model };
    }

    fetch(FEEDBACK_ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statementId,
        text: rawInput,
        robertaFallacies: robertaFallaciesForLog,
        robertaMax: robertaScore,
        groqScore: groqNumeric,
        groqDetected: groqScore ? groqScore.detected : null,
        openrouterScores: openrouterScores.map(o => ({ model: o.model, score: o.score, confidence: o.confidence, detected: o.detected })),
        openrouterMean,
        weightsUsed: { ...weights },
        weightedScore: safeScore,
        state: InverionState[state] ?? 'UNSPECIFIED',
        inverionTriggered: breakdown.inverionTriggered,
        bypassTriggered: breakdown.bypassTriggered,
        rawRobertaResponse: robertaRaw,
        rawFreeAgentsResponse: freeAgentsRaw,
        processingMs: breakdown.processingMs,
      }),
    }).catch(() => {});

    const logEntry: StatementLog = {
      id: statementId,
      text: rawInput,
      timestamp: breakdown.timestamp,
      fallacies: detectedFallacies,
      inverionState: state,
      radicalVeracityPassed,
      breakdown,
      freeAgentValidation,
    };
    if (typeof window !== 'undefined') console.log('[TRAINING] analyze complete', { statementId, weightedScore: safeScore, state: InverionState[state], fallacies: detectedFallacies.length, logEntryId: logEntry.id });
    setStatementLog((prev: StatementLog[]) => {
      const next = [logEntry, ...prev].slice(0, 50);
      if (typeof window !== 'undefined') console.log('[TRAINING] statementLog updated', { count: next.length, firstId: next[0]?.id });
      return next;
    });

    if (onFrameCreated && (safeScore >= FALLACY_CRITICAL_THRESHOLD || detectedFallacies.length > 0)) {
      onFrameCreated({ detectedFallacies, inverionState: state, radicalVeracityPassed }, rawInput);
    }

    manifoldDeformer.initializeMesh(10.0);
    const llmJson = detectedFallacies.map(f => ({
      claim_text: rawInput,
      fallacy_type: f.fallacyId.replace('CU-FALLACY-', '').toLowerCase(),
      magnitude: f.confidenceScore,
      persistence: 0.5,
    }));

    return semanticBridge.processLLMOutput(llmJson, radicalVeracityPassed ? 1 : safeScore);

  }, [nodeId, onFrameCreated, weights]);

  const markVerdict = useCallback(async (statementId: string, fallacyId: string, verdict: 'correct' | 'incorrect') => {
    const entry = statementLog.find(e => e.id === statementId);
    const breakdown = entry?.breakdown ?? lastBreakdown;
    if (!breakdown) return;

    const agentScores: Record<string, { detected: boolean; confidence: number; model?: string }> = {};
    agentScores.roberta = { detected: breakdown.roberta.detected, confidence: breakdown.roberta.score };
    if (breakdown.groq) {
      agentScores.groq = { detected: breakdown.groq.detected, confidence: breakdown.groq.confidence, model: breakdown.groq.model };
    }
    for (const o of breakdown.openrouter) {
      agentScores[`openrouter:${o.model || 'unknown'}`] = { detected: o.detected, confidence: o.confidence, model: o.model };
    }

    try {
      const res = await fetch(FEEDBACK_VERDICT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId, fallacyId, text: breakdown.text, verdict, agentScores }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.weights) {
        const w: Record<string, number> = { ...DEFAULT_WEIGHTS };
        for (const [k, v] of Object.entries(data.weights)) {
          if (typeof (v as { weight: number }).weight === 'number') w[k] = (v as { weight: number }).weight;
        }
        setWeights(w);
      }
    } catch {}

    setLastBreakdown(prev => prev?.statementId === statementId
      ? { ...prev, fallacyVerdicts: { ...prev.fallacyVerdicts, [fallacyId]: verdict } }
      : prev);
    setStatementLog(prev => prev.map(e => e.id === statementId && e.breakdown
      ? { ...e, breakdown: { ...e.breakdown, fallacyVerdicts: { ...e.breakdown.fallacyVerdicts, [fallacyId]: verdict } } }
      : e));
  }, [statementLog, lastBreakdown]);

interface SessionMetrics {
  totalIntercepts: number;
  successfulRefactors: number;
  averageResolutionTime: number;
  currentStreak: number;
  maxStreak: number;
}

  const triggerIntercept = useCallback(() => {
    setInterceptActive(true);
    setMetrics((prev: SessionMetrics) => ({
      ...prev,
      totalIntercepts: prev.totalIntercepts + 1,
    }));
  }, []);

  const resolveIntercept = useCallback((newRefactoredInput: string) => {
    setRefactoredInput(newRefactoredInput);
    setInterceptActive(false);
    setStatementLog((prev: StatementLog[]) => {
      if (prev.length === 0) return prev;
      const [latest, ...rest] = prev;
      return [{ ...latest, refactored: newRefactoredInput }, ...rest];
    });
    setMetrics((prev: SessionMetrics) => ({
      ...prev,
      successfulRefactors: prev.successfulRefactors + 1,
      currentStreak: prev.currentStreak + 1,
      maxStreak: Math.max(prev.maxStreak, prev.currentStreak + 1),
    }));
  }, []);

  const resetSession = useCallback(() => {
    setRefactoredInput('');
    setDetectedFallacies([]);
    setStatementLog([]);
    setInterceptActive(false);
    setInverionState(InverionState.OBJECTIVE_REALITY);
    slidingWindowRef.current.reset();
    semanticBridgeRef.current.reset();
  }, []);

  return {
    interceptActive,
    refactoredInput,
    detectedFallacies,
    statementLog,
    inverionState,
    metrics,
    weights,
    lastBreakdown,
    analyzeInput,
    markVerdict,
    triggerIntercept,
    resolveIntercept,
    resetSession,
  };
}

interface FallacyDetection {
  fallacyId: string;
  confidence: number;
  reason: string;
}

interface ContextualAnalysis {
  detections: FallacyDetection[];
  cleanedText: string;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'or', 'if', 'because', 'until', 'while', 'although',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
]);

const PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours',
  'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'they', 'them', 'their', 'theirs',
  'this', 'that', 'these', 'those', 'who', 'whom', 'whose',
]);

const ABSOLUTE_TRIGGERS = ['always', 'never', 'everyone', 'noone', 'nobody', 'everybody', 'all', 'none'];

function hasContentWords(text: string, minWords = 2): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contentWords = words.filter(w => !STOP_WORDS.has(w) && !PRONOUNS.has(w));
  return contentWords.length >= minWords;
}

function analyzeFallaciesContextual(text: string): ContextualAnalysis {
  const detections: FallacyDetection[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  if (sentences.length === 0) {
    return { detections: [], cleanedText: text };
  }

  for (const sentence of sentences) {
    if (!hasContentWords(sentence, 3)) continue;

    // AD HOMINEM
    const adHominemPatterns = [
      /they\s+(are|was)\s+(stupid|idiot|dumb|incompetent|corrupt|evil)/i,
      /you\s+(are|was)\s+(stupid|idiot|dumb|incompetent|corrupt|evil)/i,
      /of\s+course\s+(you|they)\s+are/i,
      /clearly\s+(you|they)\s+are/i,
      /the\s+(guy|person|man|woman|kid)\s+(is|are)\s+(stupid|dumb)/i,
    ];
    for (const pattern of adHominemPatterns) {
      if (pattern.test(sentence)) {
        detections.push({ fallacyId: 'CU-FALLACY-AD-HOMINEM', confidence: 0.88, reason: 'Attack on person rather than argument' });
        break;
      }
    }

    // TRIBALISM - requires both trigger AND contrast
    const hasTribalTrigger = [/our\s+(group|team|side|nation|people|culture|way|values)/i].some(t => t.test(sentence));
    const hasTribalContrast = [
      /(they|them|those|others?)\s+(are|will|want|have|gonna)/i,
      /we\s+(are|will|want)\s+(better|superior|right|different)/i,
      /our\s+(side|team|nation)\s+(is|are)\s+(right|better|superior)/i,
    ].some(c => c.test(sentence));
    if (hasTribalTrigger && hasTribalContrast) {
      detections.push({ fallacyId: 'CU-FALLACY-TRIBALISM', confidence: 0.85, reason: 'Us vs Them thinking detected' });
    }

    // FALSE DICHOTOMY
    if (/\b(either)\b/i.test(sentence) && /\b(or)\b/i.test(sentence)) {
      if (/(only|just)\s+(way|choice|option|solution|possibility)/i.test(sentence) ||
          /no\s+(other|third|alternative)/i.test(sentence) ||
          /have\s+to\s+(accept|choose|pick|go)/i.test(sentence)) {
        detections.push({ fallacyId: 'CU-FALLACY-FALSE-DICHOTOMY', confidence: 0.78, reason: 'False dichotomy - only two options presented' });
      }
    }

    // EMOTIONAL REASONING - requires emotional trigger + truth claim
    const hasEmotional = [
      /I\s+(feel|feels?|feeling|feels? like)/i,
      /my\s+(gut|heart|intuition)\s+(tells?|says?|whispers?)/i,
      /I\s+just\s+(know|feel|sense)/i,
      /it\s+(feels?|feels?)(\s+like|\s+right|\s+true)/i,
    ].some(t => t.test(sentence));
    const hasTruthClaim = [
      /\s+(is|are|was|were)\s+(true|right|wrong|obvious|certain)/i,
      /\s+(means?|proves?|shows?)/i,
      /\s+(must be|has to be|can't be)/i,
    ].some(t => t.test(sentence));
    if (hasEmotional && hasTruthClaim) {
      detections.push({ fallacyId: 'CU-FALLACY-EMOTIONAL-REASONING', confidence: 0.68, reason: 'Emotions used as evidence for truth claim' });
    }

    // BLACK AND WHITE - absolute terms without qualification
    const hasQualifier = /(but|however|except|although|though|save|unless)/i.test(sentence);
    if (!hasQualifier) {
      for (const trigger of ABSOLUTE_TRIGGERS) {
        const pattern = new RegExp(`\\b${trigger}\\b.*(people|they|you|we|everyone|nobody|all|most|some|things?|life|things? happen|work|fail|get|make)`, 'i');
        if (pattern.test(sentence)) {
          detections.push({ fallacyId: 'CU-FALLACY-BLACK-WHITE', confidence: 0.70, reason: 'Absolute language without qualification' });
          break;
        }
      }
    }

    // STATUS SEEKING
    const statusPatterns = [
      /I\s+(am\s+)?(superior|better|smarter|stronger|more\s+(important|valuable|powerful|success))/i,
      /prove\s+(myself|my\s+worth|my\s+value)/i,
      /need\s+to\s+(be\s+seen|prove|demonstrate)/i,
      /look\s+(better|superior|good|important)/i,
      /I'm?\s+(right|the\s+best|better|smarter)/i,
    ];
    for (const pattern of statusPatterns) {
      if (pattern.test(sentence)) {
        detections.push({ fallacyId: 'CU-FALLACY-STATUS-SEEKING', confidence: 0.78, reason: 'Status-seeking motivation detected' });
        break;
      }
    }

    // OUT GROUP HOSTILITY
    const outgroupPatterns = [
      /(they|them|those|outsiders?|others?)\s+(are|were|will\s+be)\s+(the\s+)?(enemy|threat|danger|poison|cancer|rot|evil)/i,
      /destroy\s+(them|those|outsiders?|the\s+other)/i,
      /eliminate\s+(them|those)/i,
      /(enemy|threat|danger)\s+to\s+(us|our|society|freedom)/i,
    ];
    for (const pattern of outgroupPatterns) {
      if (pattern.test(sentence)) {
        detections.push({ fallacyId: 'CU-FALLACY-OUT-GROUP-HOSTILITY', confidence: 0.88, reason: 'Hostility toward out-group detected' });
        break;
      }
    }

    // CONFIRMATION BIAS
    if (/(dismiss|ignore|reject|disregard)\s+(all\s+)?(other|alternative|contrary|different)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-CONFIRMATION', confidence: 0.72, reason: 'Confirmation bias - dismissing contrary evidence' });
    }

    // STRAWMAN
    const strawmanPatterns = [
      /so\s+(you|they)\s+(are|mean|say)\s+(that|what|it's)/i,
      /you're?\s+(just|really|actually)\s+(saying|arguing|claiming)/i,
      /you\s+(think|believe|want)\s+(that|what|it)/i,
    ];
    const strawmanTarget = /(they|he|she|you|we)\s+(think|believe|want|intend)/i;
    if (strawmanPatterns.some(p => p.test(sentence)) && strawmanTarget.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-STRAWMAN', confidence: 0.75, reason: 'Misrepresentation of opponent position' });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = detections.filter(d => {
    if (seen.has(d.fallacyId)) return false;
    seen.add(d.fallacyId);
    return true;
  });

  return { detections: unique, cleanedText: text };
}
