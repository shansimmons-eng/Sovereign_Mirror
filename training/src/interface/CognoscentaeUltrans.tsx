import React, { useState, useCallback } from 'react';
import { InverionState, FallacyVector } from '../types';
import { useTrainingSession } from './TrainingSession';
import { FALLACY_CRITICAL_THRESHOLD } from '../types';

export function CognoscentaeUltrans() {
  const [inputText, setInputText] = useState('');
  const [refactorText, setRefactorText] = useState('');

  const handleFrameCreated = useCallback((frame: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean }, rawInput: string) => {
    console.log('Frame created:', frame, rawInput);
  }, []);

  const {
    interceptActive,
    detectedFallacies,
    metrics,
    analyzeInput,
    triggerIntercept,
    resolveIntercept,
    setCurrentInput,
  } = useTrainingSession({ nodeId: 'NODE_001', onFrameCreated: handleFrameCreated });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setCurrentInput(text);

    if (text.trim()) {
      const result = analyzeInput(text);
      if (result.inverion_triggered || result.bypass_triggered) {
        triggerIntercept();
      }
    }
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
            onChange={handleInputChange}
            placeholder="Enter your statement for analysis..."
            disabled={interceptActive}
          />
          <div className="fallacy-spectrograph">
            <span className="spectrograph-label">FALLACY SPECTROGRAPH</span>
            {detectedFallacies.length === 0 ? (
              <div className="no-fallacies">No fallacies detected</div>
            ) : (
              <div className="fallacy-list">
                {detectedFallacies.map((fallacy, index) => (
                  <div
                    key={index}
                    className="fallacy-item"
                    style={{ borderLeftColor: getStateColor(fallacy) }}
                  >
                    <span className="fallacy-id">{fallacy.fallacyId}</span>
                    <span className="fallacy-score">({fallacy.confidenceScore.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            ) : (
              <div className="veracity-passed">
                <span className="check-icon">✓</span>
                <span>Radical Veracity Passed</span>
              </div>
            )}
          </div>
          <div className="metrics-panel">
            <div className="metric-row">
              <span className="metric-label">Intercepts:</span>
              <span className="metric-value">{metrics.totalIntercepts}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Streak:</span>
              <span className="metric-value">{metrics.currentStreak} / {metrics.maxStreak}</span>
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
        <div className="state-indicator">
          Current State: {getStateLabel(InverionState.SUBJECTIVE_NOISE)}
        </div>
        <div className="threshold-note">
          Threshold: {FALLACY_CRITICAL_THRESHOLD}
        </div>
      </footer>
    </div>
  );
}