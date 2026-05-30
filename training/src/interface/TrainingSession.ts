import { useState, useCallback } from 'react';
import { InverionState, FallacyVector, ManifoldUpdate } from '../types';
import { SlidingWindowBuffer } from '../cluster/SlidingWindowBuffer';
import { ManifoldDeformer, SemanticBridge } from '../cluster/GravityWell';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';

interface TrainingSessionProps {
  nodeId: string;
  onFrameCreated?: (frame: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean }, rawInput: string) => void;
}

export function useTrainingSession({ nodeId, onFrameCreated }: TrainingSessionProps) {
  const [interceptActive, setInterceptActive] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [refactoredInput, setRefactoredInput] = useState('');
  const [detectedFallacies, setDetectedFallacies] = useState<FallacyVector[]>([]);
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
    const chunks = slidingWindow.ingest(rawInput);
    
    const detectedFallacies: FallacyVector[] = [];
    let maxConfidence = 0;

    const patterns: Array<{ id: string; regex: RegExp; weight: number }> = [
      { id: 'CU-FALLACY-TRIBALISM', regex: /\b(our|my team|our side|we are right|they are wrong)\b/i, weight: 0.90 },
      { id: 'CU-FALLACY-AD-HOMINEM', regex: /\b(they|you|he|she|those people)\s+(are|is|were|was)\s+(stupid|dumb|idiot|incompetent)\b/i, weight: 0.85 },
      { id: 'CU-FALLACY-FALSE-DICHOTOMY', regex: /\b(either|it's either|only two options|you either)\b/i, weight: 0.70 },
      { id: 'CU-FALLACY-STATUS-SEEKING', regex: /\b(I am superior|I am better|I am right|my status)\b/i, weight: 0.80 },
      { id: 'CU-FALLACY-OUT-GROUP-HOSTILITY', regex: /\b(enemy|threat|dangerous|against us|harmful)\b/i, weight: 0.85 },
      { id: 'CU-FALLACY-EMOTIONAL-REASONING', regex: /\b(I feel|I feel like|I feel that|I sense)\b/i, weight: 0.60 },
      { id: 'CU-FALLACY-BLACK-WHITE', regex: /\b(always|never|nothing|everything)\b/i, weight: 0.65 },
      { id: 'CU-FALLACY-CONFIRMATION', regex: /\b(proves|confirms|validates|shows)\s+(that|how)\b/i, weight: 0.75 },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(rawInput)) {
        const confidence = Math.min(1.0, pattern.weight);
        maxConfidence = Math.max(maxConfidence, confidence);

        detectedFallacies.push({
          fallacyId: pattern.id,
          confidenceScore: confidence,
          validationProof: btoa(`${pattern.id}:${confidence}:${Date.now()}`),
        });
      }
    }

    setDetectedFallacies(detectedFallacies);

    const inverionState = maxConfidence >= FALLACY_CRITICAL_THRESHOLD
      ? InverionState.SUBJECTIVE_NOISE
      : maxConfidence > 0
        ? InverionState.TRANSITIONAL
        : InverionState.OBJECTIVE_REALITY;

    const radicalVeracityPassed = maxConfidence < FALLACY_CRITICAL_THRESHOLD;

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
    setInterceptActive(false);
    slidingWindow.reset();
    semanticBridge.reset();
  }, [slidingWindow, semanticBridge]);

  return {
    interceptActive,
    currentInput,
    refactoredInput,
    detectedFallacies,
    metrics,
    analyzeInput,
    triggerIntercept,
    resolveIntercept,
    resetSession,
    setCurrentInput,
  };
}