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
  const [flaggedStatements, setFlaggedStatements] = useState<Set<string>>(new Set());

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
    if (fallacy.confidenceScore >= 0.7) return '#F43F5E';
    if (fallacy.confidenceScore >= 0.5) return '#F97316';
    if (fallacy.confidenceScore >= 0.3) return '#F97316';
    return 'rgba(249,115,22,0.5)';
  };

  const PASSES_NEEDED = 5;
  const passCount = statementLog.filter(e => e.radicalVeracityPassed).length;
  const isComplete = passCount >= PASSES_NEEDED;

  useEffect(() => {
    if (isComplete) {
      window.kylosOnPillarComplete?.('1');
    }
  }, [isComplete]);

  return (
    <div className="cui-container">
      <header className="cui-header">
        <span className="nid">NID: NODE-0x4F8A</span>
        <span className="title">COGNOSCENTAE ULTRANS</span>
        <span className="stage">STAGE: 01</span>
      </header>

      {isComplete && (
        <div className="cui-complete-banner">
          <span className="cui-complete-icon">✓</span>
          <div>
            <div className="cui-complete-title">Pillar 1 Complete</div>
            <div className="cui-complete-sub">You have demonstrated epistemic discipline. Pillar 2 is now unlocked.</div>
          </div>
        </div>
      )}

      <main className="cui-main">
        <div className="panel left-panel">
          <div className="panel-header">
            <span className="panel-label">THE DARWINIAN SHADOW</span>
            <span className="panel-sublabel">Linguistic Input &amp; Fallacy Detection</span>
          </div>

          <div className="cui-instructions">
            <p>Submit statements to analyze them for logical fallacies and cognitive biases. Any statement works — a belief you hold, a claim you've heard, or an argument you want to test.</p>
            <p><strong>To complete this module:</strong> earn {PASSES_NEEDED} passing statements (a statement passes when its fallacy score is below the veracity threshold).</p>
          </div>

          <div className="cui-progress">
            <div className="cui-progress-label">
              <span>Module Progress</span>
              <span className="cui-progress-count">{Math.min(passCount, PASSES_NEEDED)} / {PASSES_NEEDED} passing</span>
            </div>
            <div className="cui-progress-track">
              <div className="cui-progress-fill" style={{ width: `${Math.min(passCount / PASSES_NEEDED * 100, 100)}%` }} />
            </div>
          </div>

          <textarea
            className="input-area"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your statement for analysis..."
            disabled={interceptActive}
          />
          <button
            onClick={handleAnalyze}
            disabled={interceptActive || !inputText.trim() || isAnalyzing}
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              background: inputText.trim() && !interceptActive && !isAnalyzing ? '#F43F5E' : 'rgba(255,255,255,0.06)',
              color: inputText.trim() && !interceptActive && !isAnalyzing ? '#fff' : 'rgba(255,255,255,0.25)',
              border: 'none',
              borderRadius: '6px',
              cursor: inputText.trim() && !interceptActive && !isAnalyzing ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: '600',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center',
              width: '100%',
              transition: 'background 0.15s',
            }}
          >
            {isAnalyzing && <span className="cui-spinner" aria-label="Analyzing" />}
            {isAnalyzing ? 'ANALYZING...' : 'ANALYZE STATEMENT'}
          </button>
          {isAnalyzing && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'rgba(99,102,241,0.6)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="cui-pulse" />
              Routing to classifiers...
            </div>
          )}
          <div className="fallacy-spectrograph">
            <span className="spectrograph-label">FALLACY SPECTROGRAPH</span>
            {lastBreakdown && (
              <div className="weights-strip">
                <span style={{ marginRight: '0.75rem' }}>Weighted: {lastBreakdown.weightedScore.toFixed(2)}</span>
                <span style={{ marginRight: '0.75rem' }}>R:{weights.roberta?.toFixed(2) ?? '1.00'}</span>
                {lastBreakdown.groq && <span style={{ marginRight: '0.75rem' }}>G:{weights.groq?.toFixed(2) ?? '1.00'}</span>}
                {lastBreakdown.openrouter.length > 0 && <span style={{ marginRight: '0.75rem' }}>OR:{weights.openrouter?.toFixed(2) ?? '1.00'}</span>}
              </div>
            )}
            {detectedFallacies.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="no-fallacies">No fallacies detected</span>
                {lastBreakdown && (() => {
                  const flagged = flaggedStatements.has(lastBreakdown.statementId);
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (!flagged) {
                          markFalseNegative(lastBreakdown.statementId);
                          setFlaggedStatements(prev => new Set(prev).add(lastBreakdown.statementId));
                        }
                      }}
                      className={`flag-btn${flagged ? ' flag-btn--done' : ''}`}
                      title={flagged ? 'Flagged — thank you' : 'Flag as missed fallacy'}
                    >{flagged ? '✓ Flagged' : 'Flag missed'}</button>
                  );
                })()}
              </div>
            ) : (
              <div className="fallacy-list">
                {detectedFallacies.map((fallacy, index) => {
                  const verdict = lastBreakdown?.fallacyVerdicts?.[fallacy.fallacyId];
                  return (
                    <div
                      key={index}
                      className="fallacy-item"
                      style={{ borderLeftColor: getStateColor(fallacy) }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="fallacy-id">{fallacy.fallacyId}</span>
                        <span className="fallacy-score">({fallacy.confidenceScore.toFixed(2)})</span>
                        <button
                          type="button"
                          onClick={() => handleMark(fallacy.fallacyId, 'correct')}
                          disabled={!!verdict}
                          title="Mark as correct detection"
                          style={{ background: verdict === 'correct' ? '#4F46E5' : 'transparent', color: verdict === 'correct' ? '#fff' : '#818cf8', border: '1px solid rgba(79,70,229,0.5)', borderRadius: '3px', cursor: verdict ? 'default' : 'pointer', fontSize: '0.75rem', padding: '1px 6px' }}
                        >✓</button>
                        <button
                          type="button"
                          onClick={() => handleMark(fallacy.fallacyId, 'incorrect')}
                          disabled={!!verdict}
                          title="Mark as false positive"
                          style={{ background: verdict === 'incorrect' ? '#F43F5E' : 'transparent', color: verdict === 'incorrect' ? '#fff' : '#F43F5E', border: '1px solid rgba(244,63,94,0.45)', borderRadius: '3px', cursor: verdict ? 'default' : 'pointer', fontSize: '0.75rem', padding: '1px 6px' }}
                        >✗</button>
                      </div>
                      {lastBreakdown && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(212,212,216,0.4)', marginTop: '0.25rem' }}>
                          {lastBreakdown.groq && (
                            <span style={{ marginRight: '0.6rem' }} title={lastBreakdown.groq.reasoning}>
                              groq: {lastBreakdown.groq.detected ? 'yes' : 'no'} ({lastBreakdown.groq.confidence.toFixed(2)})
                            </span>
                          )}
                          {lastBreakdown.openrouter.length > 0 && (
                            <span style={{ marginRight: '0.6rem' }}>
                              or: {lastBreakdown.openrouter.filter(o => o.detected).length}/{lastBreakdown.openrouter.length}
                            </span>
                          )}
                          {verdict && <span style={{ color: verdict === 'correct' ? '#818cf8' : '#F43F5E' }}>[{verdict === 'correct' ? 'confirmed' : 'vetoed'}]</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {lastBreakdown && (
            <div className="rebuttal-panel">
              <div style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span>↻</span>
                <span>Reframe Module</span>
              </div>
              {isReframing ? (
                <div style={{ color: 'rgba(212,212,216,0.4)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="cui-pulse" />
                  Rewriting...
                </div>
              ) : reframe ? (
                <div style={{ color: '#d4d4d8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {reframe}
                </div>
              ) : rebuttalSuggestion ? (
                <div style={{ color: 'rgba(212,212,216,0.65)', fontSize: '0.9rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                  {rebuttalSuggestion}
                </div>
              ) : (
                <div style={{ color: 'rgba(212,212,216,0.25)', fontSize: '0.875rem' }}>
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
                return <div className="veracity-pending"><span>—</span><span>Awaiting first analysis</span></div>;
              }
              return passed ? (
                <div className="veracity-passed">
                  <span className="check-icon">✓</span>
                  <span>Radical Veracity Passed{weighted !== null ? ` (${weighted.toFixed(2)} &lt; ${FALLACY_CRITICAL_THRESHOLD})` : ''}</span>
                </div>
              ) : (
                <div className="veracity-failed">
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
            <div className="metric-row" style={{ fontSize: '0.8rem' }} title="Agent voting weights (adjust on Mark correct/incorrect)">
              <span className="metric-label">Weights:</span>
              <span className="metric-value">R:{weights.roberta?.toFixed(2)} G:{weights.groq?.toFixed(2)} OR:{weights.openrouter?.toFixed(2)}</span>
            </div>
          </div>
          <div className="current-statement" style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: '6px' }} title="The most recent statement analyzed">
            <div style={{ color: '#818cf8', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.07em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Current Statement</div>
            <div style={{ color: '#d4d4d8', fontSize: '0.9rem', wordBreak: 'break-word', lineHeight: '1.55' }}>
              {lastBreakdown?.text || inputText || <em style={{ color: 'rgba(212,212,216,0.3)' }}>(type a statement and click Analyze)</em>}
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
