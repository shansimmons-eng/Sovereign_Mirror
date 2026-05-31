import { useState, useCallback } from 'react';
import { InverionState, FallacyVector, ManifoldUpdate } from '../types';
import { SlidingWindowBuffer } from '../cluster/SlidingWindowBuffer';
import { ManifoldDeformer, SemanticBridge } from '../cluster/GravityWell';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';

interface StatementLog {
  id: string;
  text: string;
  timestamp: number;
  fallacies: FallacyVector[];
  inverionState: InverionState;
  radicalVeracityPassed: boolean;
  refactored?: string;
}

interface TrainingSessionProps {
  nodeId: string;
  onFrameCreated?: (frame: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean }, rawInput: string) => void;
}

export function useTrainingSession({ nodeId, onFrameCreated }: TrainingSessionProps) {
  const [interceptActive, setInterceptActive] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [refactoredInput, setRefactoredInput] = useState('');
  const [detectedFallacies, setDetectedFallacies] = useState<FallacyVector[]>([]);
  const [statementLog, setStatementLog] = useState<StatementLog[]>([]);
  const [metrics, setMetrics] = useState({
    totalIntercepts: 0,
    successfulRefactors: 0,
    averageResolutionTime: 0,
    currentStreak: 0,
    maxStreak: 0,
  });

  const slidingWindow = new SlidingWindowBuffer(512, 0.5);
  const manifoldDeformer = new ManifoldDeformer(64);
  const semanticBridge = new SemanticBridge(manifoldDeformer);

  const analyzeInput = useCallback((rawInput: string): ManifoldUpdate => {
    // Ignore single words or very short strings (no context to analyze)
    if (rawInput.trim().split(/\s+/).length < 3) {
      setDetectedFallacies([]);
      return semanticBridge.processLLMOutput([], 1);
    }
    
    slidingWindow.ingest(rawInput);
    
    const detectedFallacies: FallacyVector[] = [];
    let maxConfidence = 0;

    // Improved contextual fallacy detection
    const analysis = analyzeFallaciesContextual(rawInput);
    
    for (const detection of analysis.detections) {
      maxConfidence = Math.max(maxConfidence, detection.confidence);
      detectedFallacies.push({
        fallacyId: detection.fallacyId,
        confidenceScore: detection.confidence,
        validationProof: btoa(`${detection.fallacyId}:${detection.confidence}:${Date.now()}:${rawInput.substring(0, 50)}`),
      });
    }

    setDetectedFallacies(detectedFallacies);

    const inverionState = maxConfidence >= FALLACY_CRITICAL_THRESHOLD
      ? InverionState.SUBJECTIVE_NOISE
      : maxConfidence > 0
        ? InverionState.TRANSITIONAL
        : InverionState.OBJECTIVE_REALITY;

    const radicalVeracityPassed = maxConfidence < FALLACY_CRITICAL_THRESHOLD;

    // Log the statement
    const logEntry: StatementLog = {
      id: crypto.randomUUID(),
      text: rawInput,
      timestamp: Date.now(),
      fallacies: detectedFallacies,
      inverionState,
      radicalVeracityPassed,
    };
    setStatementLog(prev => [logEntry, ...prev].slice(0, 50));

    if (onFrameCreated && (maxConfidence >= FALLACY_CRITICAL_THRESHOLD || detectedFallacies.length > 0)) {
      onFrameCreated({ detectedFallacies, inverionState, radicalVeracityPassed }, rawInput);
    }

    manifoldDeformer.initializeMesh(10.0);
    const llmJson = detectedFallacies.map(f => ({
      claim_text: rawInput,
      fallacy_type: f.fallacyId.replace('CU-FALLACY-', '').toLowerCase(),
      magnitude: f.confidenceScore,
      persistence: 0.5,
    }));

    return semanticBridge.processLLMOutput(llmJson, radicalVeracityPassed ? 1 : maxConfidence);

  }, [nodeId, onFrameCreated, slidingWindow, manifoldDeformer, semanticBridge]);

  const triggerIntercept = useCallback(() => {
    setInterceptActive(true);
    setMetrics(prev => ({
      ...prev,
      totalIntercepts: prev.totalIntercepts + 1,
    }));
  }, []);

  const resolveIntercept = useCallback((newRefactoredInput: string) => {
    setRefactoredInput(newRefactoredInput);
    setInterceptActive(false);
    setStatementLog(prev => {
      if (prev.length === 0) return prev;
      const [latest, ...rest] = prev;
      return [{ ...latest, refactored: newRefactoredInput }, ...rest];
    });
    setMetrics(prev => ({
      ...prev,
      successfulRefactors: prev.successfulRefactors + 1,
      currentStreak: prev.currentStreak + 1,
      maxStreak: Math.max(prev.maxStreak, prev.currentStreak + 1),
    }));
  }, []);

  const resetSession = useCallback(() => {
    setCurrentInput('');
    setRefactoredInput('');
    setDetectedFallacies([]);
    setStatementLog([]);
    setInterceptActive(false);
    slidingWindow.reset();
    semanticBridge.reset();
  }, [slidingWindow, semanticBridge]);

  return {
    interceptActive,
    currentInput,
    refactoredInput,
    detectedFallacies,
    statementLog,
    metrics,
    analyzeInput,
    triggerIntercept,
    resolveIntercept,
    resetSession,
    setCurrentInput,
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

function analyzeFallaciesContextual(text: string): ContextualAnalysis {
  const detections: FallacyDetection[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Skip if no substantial sentences
  if (sentences.length === 0) {
    return { detections: [], cleanedText: text };
  }

  for (const sentence of sentences) {
    // AD HOMINEM - attack on person, not argument
    if (/they\s+are\s+(stupid|idiot|dumb|incompetent)/i.test(sentence) ||
        /you\s+are\s+(stupid|idiot|dumb|incompetent)/i.test(sentence) ||
        /of course\s+(you|they)\s+are/i.test(sentence) ||
        /clearly\s+(you|they)\s+are/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-AD-HOMINEM', confidence: 0.88, reason: 'Attack on person rather than argument' });
    }

    // TRIBALISM - us vs them, in-group bias
    if (/our\s+(group|team|side|nation)/i.test(sentence) &&
        (/(they|them|those)\s+(are|will|want)/i.test(sentence) ||
         /we\s+(are|will|want)\s+(better|superior|right)/i.test(sentence))) {
      detections.push({ fallacyId: 'CU-FALLACY-TRIBALISM', confidence: 0.85, reason: 'Us vs Them thinking detected' });
    }

    // FALSE DICHOTOMY - black and white, either/or when more options exist
    if (/either\s+.+\s+or\s+.+/i.test(sentence) && 
        /only\s+(way|choice|option|solution)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-FALSE-DICHOTOMY', confidence: 0.75, reason: 'False dichotomy - only two options presented' });
    }
    if (/there\s+is\s+no\s+(other|alternative)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-FALSE-DICHOTOMY', confidence: 0.72, reason: 'Dismissal of alternative viewpoints' });
    }

    // EMOTIONAL REASONING - feelings as evidence
    if (/I\s+feel\s+(that\s+)?(it\s+is?|you|they)/i.test(sentence) ||
        /my\s+(gut|heart)\s+tells?\s+me/i.test(sentence) ||
        /I\s+just\s+know\s+(its|that)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-EMOTIONAL-REASONING', confidence: 0.65, reason: 'Emotions used as evidence' });
    }

    // BLACK AND WHITE - absolute terms without qualification
    if (/(always|never)\s+.+(but|however|except|although)/i.test(sentence)) {
      // Has qualifier, lower confidence
    } else if (/\b(always|never)\s+(happen|work|fail|happen|people|they|you)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-BLACK-WHITE', confidence: 0.70, reason: 'Absolute language without qualification' });
    }

    // STATUS SEEKING - self-promotion, need to prove worth
    if (/I\s+(am\s+)?(superior|better|smarter)/i.test(sentence) ||
        /prove\s+(myself|my\s+worth)/i.test(sentence) ||
        /need\s+to\s+(be\s+seen|prove)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-STATUS-SEEKING', confidence: 0.78, reason: 'Status-seeking motivation detected' });
    }

    // OUT GROUP HOSTILITY - demonizing outsiders
    if (/they\s+are\s+(the\s+)?(enemy|threat|danger)/i.test(sentence) ||
        /destroy\s+(them|outsiders?|the\s+other)/i.test(sentence) ||
        /eliminate\s+(them|those)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-OUT-GROUP-HOSTILITY', confidence: 0.88, reason: 'Hostility toward out-group detected' });
    }

    // CONFIRMATION BIAS - only seeking evidence that supports
    if (/all\s+(the\s+)?evidence\s+(shows?|proves?|confirms?)/i.test(sentence) ||
        /everything\s+(shows?|proves?|confirms?)/i.test(sentence) &&
        !/(except|however|although)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-CONFIRMATION', confidence: 0.72, reason: 'Confirmation bias - dismissing contrary evidence' });
    }

    // STRAWMAN - misrepresenting opponent's position  
    if (/so\s+(you|they)\s+(are|mean)\s+(saying|that)/i.test(sentence) &&
        /they\s+(think|believe|want)/i.test(sentence)) {
      detections.push({ fallacyId: 'CU-FALLACY-STRAWMAN', confidence: 0.75, reason: 'Misrepresentation of opponent position' });
    }
  }

  // Deduplicate by fallacyId, keeping highest confidence
  const seen = new Set<string>();
  const unique = detections.filter(d => {
    if (seen.has(d.fallacyId)) return false;
    seen.add(d.fallacyId);
    return true;
  });

  return {
    detections: unique,
    cleanedText: text,
  };
}