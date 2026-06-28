import { useState, useCallback, useEffect } from 'react';
import { InverionState, FallacyVector } from '../types';
import { useTrainingSession } from './TrainingSession';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';
import { loadFallacyDataset, findMatchingFallacy, FallacyDataset } from '../engines/FallacyDataset';

export function CognoscentaeUltrans() {
  const [inputText, setInputText] = useState('');
  const [refactorText, setRefactorText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fallacyDataset, setFallacyDataset] = useState<FallacyDataset | null>(null);
  const [rebuttalSuggestion, setRebuttalSuggestion] = useState<string | null>(null);
  const [reframe, setReframe] = useState<string | null>(null);
  const [isReframing, setIsReframing] = useState(false);

  useEffect(() => {
    loadFallacyDataset().then(setFallacyDataset);
  }, []);

  const handleFrameCreated = useCallback((_frame: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean }, _rawInput: string) => {
    // Frame creation handled via statementLog
  }, []);

  const {
    interceptActive,
    detectedFallacies,
    statementLog,
    inverionState,
    metrics,
    weights,
    lastBreakdown,
    analyzeInput,
    markVerdict,
    markFalseNegative,
    triggerIntercept,
    resolveIntercept,
    reframeStatement,
  } = useTrainingSession({ nodeId: 'NODE_001', onFrameCreated: handleFrameCreated });

  useEffect(() => {
    if (!fallacyDataset || !lastBreakdown || detectedFallacies.length === 0) {
      setRebuttalSuggestion(null);
      return;
    }
    const highest = detectedFallacies.reduce((a, b) =>
      a.confidenceScore > b.confidenceScore ? a : b
    );
    const typeMatch = fallacyDataset.by_type[highest.fallacyId]?.[0];
    if (typeMatch) {
      setRebuttalSuggestion(typeMatch.response);
    } else {
      const textMatch = findMatchingFallacy(lastBreakdown.text, fallacyDataset);
      setRebuttalSuggestion(textMatch?.response ?? null);
    }
  }, [fallacyDataset, lastBreakdown, detectedFallacies]);

  const handleAnalyze = async () => {
    if (inputText.trim() && !isAnalyzing) {
      setIsAnalyzing(true);
      setReframe(null);
      try {
        const result = await analyzeInput(inputText);
        if (result.inverion_triggered || result.bypass_triggered) {
          triggerIntercept();
        }
        // Always attempt reframe — fires in background, doesn't block UI
        setIsReframing(true);
        reframeStatement(inputText).then((r) => {
          setReframe(r);
          setIsReframing(false);
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleMark = (fallacyId: string, verdict: 'correct' | 'incorrect') => {
    if (lastBreakdown) markVerdict(lastBreakdown.statementId, fallacyId, verdict);
  };

  const handleRefactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refactorText.trim()) {
      resolveIntercept(refactorText);
      setRefactorText('');
      setInputText('');
    }
  };

  const getStateLabel = (state: InverionState): string => {
    switch (state) {
      case InverionState.SUBJECTIVE_NOISE: return 'SUBJECTIVE_NOISE';
      case InverionState.TRANSITIONAL: return 'TRANSITIONAL';
      case InverionState.OBJECTIVE_REALITY: return 'OBJECTIVE_REALITY';
      default: return 'UNSPECIFIED';
    }
  };

  const getStateColor = (fallacy: FallacyVector): string => {
    if (fallacy.confidenceScore >= 0.7) return '#FF4500';
    if (fallacy.confidenceScore >= 0.5) return '#FFB300';
    if (fallacy.confidenceScore >= 0.3) return '#FFA500';
    return '#FFD700';
  };

  return (
    <div className="cui-container">
      <header className="cui-header">
        <span className="nid">NID: NODE-0x4F8A</span>
        <span className="title">COGNOSCENTAE ULTRANS</span>
        <span className="stage">STAGE: 01</span>
      </header>

      <main className="cui-main">
        <div className="panel left-panel">
          <div className="panel-header">
            <span className="panel-label">THE DARWINIAN SHADOW</span>
            <span className="panel-sublabel">(Linguistic Input & Projections)</span>
          </div>
          <textarea
            className="input-area"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your statement for analysis..."
            disabled={interceptActive}
            style={{ width: '100%', minHeight: '80px', background: '#0a0a0a', border: '1px solid rgba(255,179,0,0.3)', color: '#fff', padding: '8px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
          />
          <button
            onClick={handleAnalyze}
            disabled={interceptActive || !inputText.trim() || isAnalyzing}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: inputText.trim() && !interceptActive && !isAnalyzing ? '#FFB300' : '#333',
              color: inputText.trim() && !interceptActive && !isAnalyzing ? '#000' : '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: inputText.trim() && !interceptActive && !isAnalyzing ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {isAnalyzing && <span className="cui-spinner" aria-label="Analyzing" />}
            {isAnalyzing ? 'ANALYZING...' : 'ANALYZE'}
          </button>
          {isAnalyzing && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#FFB300', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="cui-pulse" />
              ROUTING TO RO+BERTa · GROQ · OPENROUTER
            </div>
          )}
          <div className="fallacy-spectrograph">
            <span className="spectrograph-label">FALLACY SPECTROGRAPH</span>
            {lastBreakdown && (
              <div className="weights-strip" style={{ fontSize: '10px', color: '#FFB300', marginBottom: '6px', fontFamily: 'monospace' }}>
                <span style={{ marginRight: '8px' }}>WEIGHTED: {lastBreakdown.weightedScore.toFixed(2)}</span>
                <span style={{ marginRight: '8px' }}>R:{weights.roberta?.toFixed(2) ?? '1.00'}</span>
                {lastBreakdown.groq && <span style={{ marginRight: '8px' }}>G:{weights.groq?.toFixed(2) ?? '1.00'}</span>}
                {lastBreakdown.openrouter.length > 0 && <span style={{ marginRight: '8px' }}>OR:{weights.openrouter?.toFixed(2) ?? '1.00'}</span>}
              </div>
            )}
            {detectedFallacies.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="no-fallacies">No fallacies detected</span>
                {lastBreakdown && (
                  <button
                    type="button"
                    onClick={() => markFalseNegative(lastBreakdown.statementId)}
                    title="Flag as missed fallacy — analyzer should have caught something here"
                    style={{ background: 'transparent', color: '#F47B3F', border: '1px solid #F47B3F', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', padding: '1px 5px', fontFamily: 'monospace' }}
                  >FLAG MISSED</button>
                )}
              </div>
            ) : (
              <div className="fallacy-list">
                {detectedFallacies.map((fallacy, index) => {
                  const verdict = lastBreakdown?.fallacyVerdicts?.[fallacy.fallacyId];
                  return (
                    <div
                      key={index}
                      className="fallacy-item"
                      style={{ borderLeftColor: getStateColor(fallacy), paddingLeft: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="fallacy-id">{fallacy.fallacyId}</span>
                        <span className="fallacy-score">({fallacy.confidenceScore.toFixed(2)})</span>
                        <button
                          type="button"
                          onClick={() => handleMark(fallacy.fallacyId, 'correct')}
                          disabled={!!verdict}
                          title="Mark this detection as correct"
                          style={{ background: verdict === 'correct' ? '#2e7d32' : 'transparent', color: verdict === 'correct' ? '#fff' : '#2e7d32', border: '1px solid #2e7d32', borderRadius: '3px', cursor: verdict ? 'default' : 'pointer', fontSize: '10px', padding: '0 4px', fontFamily: 'monospace' }}
                        >✓</button>
                        <button
                          type="button"
                          onClick={() => handleMark(fallacy.fallacyId, 'incorrect')}
                          disabled={!!verdict}
                          title="Mark this detection as a false positive"
                          style={{ background: verdict === 'incorrect' ? '#c62828' : 'transparent', color: verdict === 'incorrect' ? '#fff' : '#c62828', border: '1px solid #c62828', borderRadius: '3px', cursor: verdict ? 'default' : 'pointer', fontSize: '10px', padding: '0 4px', fontFamily: 'monospace' }}
                        >✗</button>
                      </div>
                      {lastBreakdown && (
                        <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', fontFamily: 'monospace' }}>
                          {lastBreakdown.groq && (
                            <span style={{ marginRight: '6px' }} title={lastBreakdown.groq.reasoning}>
                              groq: {lastBreakdown.groq.detected ? 'YES' : 'no'} ({lastBreakdown.groq.confidence.toFixed(2)})
                            </span>
                          )}
                          {lastBreakdown.openrouter.length > 0 && (
                            <span style={{ marginRight: '6px' }}>
                              or: {lastBreakdown.openrouter.filter(o => o.detected).length}/{lastBreakdown.openrouter.length} ({lastBreakdown.openrouter.map(o => o.detected ? '✓' : '✗').join(' ')})
                            </span>
                          )}
                          {verdict && <span style={{ color: verdict === 'correct' ? '#2e7d32' : '#c62828' }}>[{verdict === 'correct' ? 'CONFIRMED' : 'VETOED'}]</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {lastBreakdown && (
            <div className="rebuttal-panel" style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(63,244,213,0.05)', border: '1px solid rgba(63,244,213,0.2)', borderRadius: '4px' }}>
              <div style={{ color: '#3FF4D5', fontSize: '9px', marginBottom: '3px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>↻</span>
                <span>REFRAME</span>
              </div>
              {isReframing ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="cui-pulse" />
                  REWRITING...
                </div>
              ) : reframe ? (
                <div style={{ color: '#C2C9CC', fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                  {reframe}
                </div>
              ) : rebuttalSuggestion ? (
                <div style={{ color: '#9BA3A8', fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.5', fontStyle: 'italic' }}>
                  {rebuttalSuggestion}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontFamily: 'monospace' }}>
                  —
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divider">
          <div className="inverion-horizon">
            <span>THE INVERION DIVIDE HORIZON</span>
          </div>
        </div>

        <div className="panel right-panel">
          <div className="panel-header">
            <span className="panel-label">THE LEDGER CORE</span>
            <span className="panel-sublabel">(Verified Epistemic Invariants)</span>
          </div>
          <div className={`ledger-content ${interceptActive ? 'locked' : ''}`}>
            {interceptActive ? (
              <div className="intercept-notice">
                <span className="notice-icon">⚠</span>
                <span>[NULL STATE - WAITING FOR RADICAL VERACITY SETTLEMENT]</span>
              </div>
            ) : (() => {
              const weighted = lastBreakdown?.weightedScore ?? null;
              const passed = weighted === null ? null : weighted < FALLACY_CRITICAL_THRESHOLD;
              if (passed === null) {
                return <div className="veracity-pending" style={{ color: '#888' }}><span>—</span><span>Awaiting first analysis</span></div>;
              }
              return passed ? (
                <div className="veracity-passed">
                  <span className="check-icon">✓</span>
                  <span>Radical Veracity Passed{weighted !== null ? ` (${weighted.toFixed(2)} &lt; ${FALLACY_CRITICAL_THRESHOLD})` : ''}</span>
                </div>
              ) : (
                <div className="veracity-failed" style={{ color: '#FF4500' }}>
                  <span className="cross-icon">✗</span>
                  <span>Radical Veracity Failed{weighted !== null ? ` (${weighted.toFixed(2)} ≥ ${FALLACY_CRITICAL_THRESHOLD})` : ''}</span>
                </div>
              );
            })()}
          </div>
          <div className="metrics-panel">
            <div className="metric-row" title="Count of times you were prompted to refactor a statement that failed veracity">
              <span className="metric-label">Intercepts:</span>
              <span className="metric-value">{metrics.totalIntercepts}</span>
            </div>
            <div className="metric-row" title="Consecutive successful refactors / Best streak ever">
              <span className="metric-label">Streak:</span>
              <span className="metric-value">{metrics.currentStreak} / {metrics.maxStreak}</span>
            </div>
            <div className="metric-row" style={{ fontSize: '10px', color: '#FFB300' }} title="Agent voting weights (adjust on Mark correct/incorrect)">
              <span className="metric-label">Weights:</span>
              <span className="metric-value">R:{weights.roberta?.toFixed(2)} G:{weights.groq?.toFixed(2)} OR:{weights.openrouter?.toFixed(2)}</span>
            </div>
          </div>
          <div className="current-statement" style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }} title="The most recent statement analyzed">
            <div style={{ color: '#FFB300', fontSize: '9px', marginBottom: '2px' }}>CURRENT</div>
            <div style={{ color: '#fff', wordBreak: 'break-word' }}>
              {lastBreakdown?.text || inputText || <em style={{ color: '#666' }}>(type a statement and click ANALYZE)</em>}
            </div>
          </div>
          <div className="statement-log">
            <span className="log-label">STATEMENT LOG</span>
            <div className="log-entries">
              {statementLog.length === 0 ? (
                <div className="log-empty">{lastBreakdown ? 'Statement analyzed (log sync pending)' : 'No statements analyzed'}</div>
              ) : (
                statementLog.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="log-entry">
                    <div className="log-text">{entry.text.substring(0, 60)}{entry.text.length > 60 ? '...' : ''}</div>
                    <div className="log-meta">
                      <span className={`log-state ${entry.radicalVeracityPassed ? 'passed' : 'failed'}`}>
                        {entry.radicalVeracityPassed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="log-count">{entry.fallacies.length} fallacies</span>
                      {entry.freeAgentValidation && (
                        <span className="log-agent" title={entry.freeAgentValidation.reason}>
                          [{entry.freeAgentValidation.agent.toUpperCase()}]
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {interceptActive && (
        <div className="intercept-modal">
          <div className="modal-content">
            <div className="modal-header">
              <span className="status-badge">STATUS: INTERCEPT ACTIVE</span>
            </div>
            <p className="modal-instruction">
              Refactor input to strip zero-sum survival bias.
              The current configuration contains Darwinian noise.
            </p>
            <form onSubmit={handleRefactorSubmit}>
              <textarea
                className="refactor-input"
                value={refactorText}
                onChange={(e) => setRefactorText(e.target.value)}
                placeholder="Enter corrected statement without cognitive distortions..."
              />
              <button type="submit" className="submit-btn">
                Settle to Ledger
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="cui-footer">
        <div className="state-indicator" title="SUBJECTIVE_NOISE = statement failed (weighted score ≥ threshold). TRANSITIONAL = possible fallacy, between 0 and threshold. OBJECTIVE_REALITY = passed cleanly.">
          Current State: {getStateLabel(inverionState)}
        </div>
        <div className="threshold-note" title="Weighted score at or above this = statement fails veracity. Below this = passes.">
          Threshold: {FALLACY_CRITICAL_THRESHOLD} {lastBreakdown && `(score: ${lastBreakdown.weightedScore.toFixed(2)})`}
        </div>
      </footer>
    </div>
  );
}
