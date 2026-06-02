import { useState, useCallback, useRef } from 'react';
import { InverionState, FallacyVector, ManifoldUpdate } from '../types';
import { SlidingWindowBuffer } from '../cluster/SlidingWindowBuffer';
import { ManifoldDeformer, SemanticBridge } from '../cluster/GravityWell';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';

const ROBERTA_ENDPOINT = 'http://localhost:5002/classify-single';
const FREE_AGENTS_ENDPOINT = 'http://localhost:5003/validate';
const USE_ROBERTA = true;
const USE_FREE_AGENTS = true;
const ROBERTA_THRESHOLD = 0.60;  // Trigger free agent check above this confidence
const WORD_COUNT_CAP = 200;       // Only skip free agents for very long inputs (performance)

interface StatementLog {
  id: string;
  text: string;
  timestamp: number;
  fallacies: FallacyVector[];
  inverionState: InverionState;
  radicalVeracityPassed: boolean;
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

  // Stable refs - not recreated on every render
  const slidingWindowRef = useRef(new SlidingWindowBuffer(512, 0.5));
  const manifoldDeformerRef = useRef(new ManifoldDeformer(64));
  const semanticBridgeRef = useRef(new SemanticBridge(manifoldDeformerRef.current));

  const analyzeInput = useCallback(async (rawInput: string): Promise<ManifoldUpdate> => {
    const slidingWindow = slidingWindowRef.current;
    const manifoldDeformer = manifoldDeformerRef.current;
    const semanticBridge = semanticBridgeRef.current;

    if (rawInput.trim().split(/\s+/).length < 2) {
      setDetectedFallacies([]);
      return semanticBridge.processLLMOutput([], 1);
    }

    slidingWindow.ingest(rawInput);

    const detectedFallacies: FallacyVector[] = [];
    let maxConfidence = 0;

    // Try RoBERTa classifier first
    let robertaResults: Array<{mappedLabel: string, confidence: number}> = [];
    if (USE_ROBERTA) {
      try {
        const response = await fetch(ROBERTA_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawInput }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.fallacies && Array.isArray(data.fallacies)) {
            robertaResults = data.fallacies;
            for (const fallacy of robertaResults) {
              maxConfidence = Math.max(maxConfidence, fallacy.confidence);
              detectedFallacies.push({
                fallacyId: fallacy.mappedLabel,
                confidenceScore: fallacy.confidence,
                validationProof: btoa(`roberta:${fallacy.mappedLabel}:${fallacy.confidence}:${Date.now()}`),
              });
            }
          }
        }
      } catch {
        // RoBERTa not available, fall back to local analysis
      }
    }

    // Free agent validation - triggers on any detection above confidence threshold
    // Skip only for very long inputs (performance) - cap at 200 words
    const wordCount = rawInput.trim().split(/\s+/).length;
    let freeAgentValidation: StatementLog['freeAgentValidation'] = null;

    if (USE_FREE_AGENTS && robertaResults.length > 0 && wordCount <= WORD_COUNT_CAP && maxConfidence >= ROBERTA_THRESHOLD) {
      try {
        const response = await fetch(FREE_AGENTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawInput }),
        });
        if (response.ok) {
          const data = await response.json();
          // Use consensus from all agents
          const consensus = data.consensus;
          if (consensus) {
            freeAgentValidation = {
              detected: consensus.detected,
              reason: `${consensus.agents_detected}/${consensus.agents_queried} agents agree. ${consensus.reasoning}`,
              agent: `${consensus.agents_queried} agents`,
            };
            // If majority disagree with RoBERTa, reduce confidence
            if (!consensus.detected && maxConfidence < 0.8) {
              maxConfidence = maxConfidence * 0.5;
            }
          }
        }
      } catch {
        // Free agent not available, continue with RoBERTa result
      }
    }

    // Fall back to local contextual analysis if no RoBERTa results
    if (robertaResults.length === 0) {
      const analysis = analyzeFallaciesContextual(rawInput);
      for (const detection of analysis.detections) {
        maxConfidence = Math.max(maxConfidence, detection.confidence);
        detectedFallacies.push({
          fallacyId: detection.fallacyId,
          confidenceScore: detection.confidence,
          validationProof: btoa(`${detection.fallacyId}:${detection.confidence}:${Date.now()}:${rawInput.substring(0, 50)}`),
        });
      }
    }

    setDetectedFallacies(detectedFallacies);

    const state = maxConfidence >= FALLACY_CRITICAL_THRESHOLD
      ? InverionState.SUBJECTIVE_NOISE
      : maxConfidence > 0
        ? InverionState.TRANSITIONAL
        : InverionState.OBJECTIVE_REALITY;

    setInverionState(state);

    const radicalVeracityPassed = maxConfidence < FALLACY_CRITICAL_THRESHOLD;

    const logEntry: StatementLog = {
      id: crypto.randomUUID(),
      text: rawInput,
      timestamp: Date.now(),
      fallacies: detectedFallacies,
      inverionState: state,
      radicalVeracityPassed,
      freeAgentValidation,
    };
    setStatementLog((prev: StatementLog[]) => [logEntry, ...prev].slice(0, 50));

    if (onFrameCreated && (maxConfidence >= FALLACY_CRITICAL_THRESHOLD || detectedFallacies.length > 0)) {
      onFrameCreated({ detectedFallacies, inverionState: state, radicalVeracityPassed }, rawInput);
    }

    manifoldDeformer.initializeMesh(10.0);
    const llmJson = detectedFallacies.map(f => ({
      claim_text: rawInput,
      fallacy_type: f.fallacyId.replace('CU-FALLACY-', '').toLowerCase(),
      magnitude: f.confidenceScore,
      persistence: 0.5,
    }));

    return semanticBridge.processLLMOutput(llmJson, radicalVeracityPassed ? 1 : maxConfidence);

  }, [nodeId, onFrameCreated]);

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
    analyzeInput,
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
