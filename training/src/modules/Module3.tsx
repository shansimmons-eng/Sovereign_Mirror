import { useState } from 'react';

const API_BASE = (): string =>
  typeof window !== 'undefined' && window.kylosTraining?.apiBase
    ? window.kylosTraining.apiBase
    : (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__kylosApiBase as string) || '';

type Depth = 'surface' | 'developing' | 'deep';
type Phase = 'socratic' | 'sequence' | 'done';

interface SocraticQuestion { id: string; text: string; hint: string | null; }
interface SocraticResult { depth: Depth; reflection: string; }
interface SequenceResult { score: number; label: string; canonical: string[]; canonicalLabels: Record<string, string>; explanation: string; }

const QUESTIONS: SocraticQuestion[] = [
  {
    id: 'q1',
    text: 'When two resource systems are in competition — say, energy and water — what principle guides which to address first?',
    hint: 'Think about dependencies: does solving one unlock the other?',
  },
  {
    id: 'q2',
    text: 'What is a second-order consequence? Describe one from any system you can think of.',
    hint: 'A consequence of a consequence — trace at least two steps.',
  },
  {
    id: 'q3',
    text: 'What distinguishes a regenerative approach to ecological systems from a merely sustainable one?',
    hint: null,
  },
];

const INTERVENTIONS = [
  { id: 'geothermal',   label: 'Deep Geothermal Gyrotrons',      sub: 'Baseload power from Earth\'s heat' },
  { id: 'fermentation', label: 'Precision Fermentation',          sub: 'Decouple protein from agriculture' },
  { id: 'solar',        label: 'Space-Based Solar Power',         sub: 'Orbital arrays for large-scale energy' },
  { id: 'atmospheric',  label: 'Atmospheric Water Harvesting',    sub: 'Moisture capture arrays' },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F47B3F', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const SCORE_COLOR = (label: string) => label === 'exact' ? '#3FF4D5' : label === 'partial' ? '#F47B3F' : '#F43F5E';
const SCORE_LABEL = (label: string) => label === 'exact' ? 'EXACT MATCH' : label === 'partial' ? 'PARTIAL MATCH' : 'INVERTED';

export default function Module3() {
  const [phase, setPhase] = useState<Phase>('socratic');
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocraticResult | null>(null);
  const [qResults, setQResults] = useState<(SocraticResult | null)[]>(Array(QUESTIONS.length).fill(null));
  const [sequence, setSequence] = useState<string[]>([]);
  const [seqResult, setSeqResult] = useState<SequenceResult | null>(null);
  const [seqLoading, setSeqLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUESTIONS[qIndex];
  const isLastQ = qIndex === QUESTIONS.length - 1;

  async function handleSocraticSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar3/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, response: input.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as SocraticResult;
      setResult(data);
      setQResults(prev => { const n = [...prev]; n[qIndex] = data; return n; });
    } catch {
      setError('Evaluation unavailable — try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNextQ() {
    if (isLastQ) {
      setPhase('sequence');
    } else {
      setQIndex(i => i + 1);
      setInput('');
      setResult(null);
      setError(null);
    }
  }

  function toggleSequence(id: string) {
    setSequence(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  async function handleSequenceSubmit() {
    if (sequence.length !== 4 || seqLoading) return;
    setSeqLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar3/sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as SequenceResult;
      setSeqResult(data);
    } catch {
      setError('Submission failed — try again.');
    } finally {
      setSeqLoading(false);
    }
  }

  if (phase === 'socratic') {
    return (
      <div style={{ fontFamily: 'monospace', color: '#C2C9CC', background: '#0a0a0f', minHeight: '60vh', padding: '2rem' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
            PILLAR 3 — ENVIRONMENTAL STEWARDSHIP · PHASE I
          </div>
          <div style={{ color: '#9BA3A8', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            Systems Reasoning · Second-Order Consequences · Regenerative Design
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '2rem' }}>
          {QUESTIONS.map((_, i) => {
            const r = qResults[i];
            const isActive = i === qIndex;
            const color = r ? DEPTH_COLOR[r.depth] : isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)';
            return <div key={i} style={{ flex: 1, height: '3px', background: color, borderRadius: '2px', transition: 'background 0.3s' }} />;
          })}
          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }} title="Sequencing exercise" />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
            QUESTION {qIndex + 1} OF {QUESTIONS.length}
          </div>
          <div style={{ fontSize: '1.05rem', color: '#EDEFF0', lineHeight: 1.65, marginBottom: '0.75rem' }}>
            {question.text}
          </div>
          {question.hint && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>{question.hint}</div>
          )}
        </div>

        {!result ? (
          <>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Write your response..."
              disabled={loading}
              rows={5}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#C2C9CC', fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.75rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={handleSocraticSubmit} disabled={!input.trim() || loading}
              style={{ marginTop: '0.75rem', padding: '0.5rem 1.5rem', background: input.trim() && !loading ? '#3FF4D5' : 'rgba(255,255,255,0.05)', color: input.trim() && !loading ? '#0a0a0f' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.1em', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed' }}>
              {loading ? 'EVALUATING...' : 'SUBMIT'}
            </button>
            {error && <div style={{ marginTop: '0.5rem', color: '#F43F5E', fontSize: '0.75rem' }}>{error}</div>}
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: DEPTH_COLOR[result.depth] }} />
              <span style={{ color: DEPTH_COLOR[result.depth], fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 'bold' }}>{DEPTH_LABEL[result.depth]}</span>
              <div style={{ flex: 1, height: '1px', background: `${DEPTH_COLOR[result.depth]}33` }} />
            </div>
            <div style={{ padding: '1rem 1.25rem', background: `${DEPTH_COLOR[result.depth]}08`, border: `1px solid ${DEPTH_COLOR[result.depth]}22`, borderRadius: '4px', fontSize: '0.9rem', lineHeight: 1.7, color: '#C2C9CC', marginBottom: '1.25rem' }}>
              {result.reflection}
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>YOUR RESPONSE</div>
              <div style={{ color: '#7B8285', fontSize: '0.85rem', lineHeight: 1.6 }}>{input}</div>
            </div>
            <button onClick={handleNextQ}
              style={{ padding: '0.5rem 1.5rem', background: 'transparent', color: '#3FF4D5', border: '1px solid #3FF4D5', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
              {isLastQ ? 'PROCEED TO SEQUENCING →' : 'NEXT QUESTION →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'sequence') {
    return (
      <div style={{ fontFamily: 'monospace', color: '#C2C9CC', background: '#0a0a0f', minHeight: '60vh', padding: '2rem' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
            PILLAR 3 — ENVIRONMENTAL STEWARDSHIP · PHASE II
          </div>
          <div style={{ color: '#9BA3A8', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            WEFE Nexus · Intervention Sequencing
          </div>
        </div>

        {!seqResult ? (
          <>
            {/* Scenario */}
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', marginBottom: '2rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>SCENARIO — WEFE NEXUS CRISIS</div>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ color: '#F43F5E', fontSize: '1rem', fontWeight: 'bold' }}>−42%</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Water Table</span>
                </div>
                <div>
                  <span style={{ color: '#F47B3F', fontSize: '1rem', fontWeight: 'bold' }}>+18%</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Energy Cost</span>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                Four interventions are available. Sequence them from first to last based on cascade dependency — which must precede which to make the others viable?
              </div>
            </div>

            {/* Sequence slots */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>YOUR SEQUENCE — click interventions in order</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
                {[0,1,2,3].map(i => {
                  const id = sequence[i];
                  const iv = INTERVENTIONS.find(x => x.id === id);
                  return (
                    <div key={i} style={{ flex: 1, padding: '0.6rem', background: id ? 'rgba(63,244,213,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${id ? 'rgba(63,244,213,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '4px', minHeight: '56px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', marginBottom: '0.3rem' }}>{i + 1}</div>
                      {iv && <div style={{ color: '#3FF4D5', fontSize: '0.7rem', lineHeight: 1.4 }}>{iv.label}</div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {INTERVENTIONS.map(iv => {
                  const pos = sequence.indexOf(iv.id);
                  const selected = pos >= 0;
                  return (
                    <button key={iv.id} onClick={() => toggleSequence(iv.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: selected ? 'rgba(63,244,213,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selected ? 'rgba(63,244,213,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: selected ? '#3FF4D5' : 'rgba(255,255,255,0.08)', color: selected ? '#0a0a0f' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0 }}>
                        {selected ? pos + 1 : ''}
                      </div>
                      <div>
                        <div style={{ color: selected ? '#3FF4D5' : '#9BA3A8', fontSize: '0.85rem' }}>{iv.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: '2px' }}>{iv.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={handleSequenceSubmit} disabled={sequence.length !== 4 || seqLoading}
                style={{ padding: '0.5rem 1.5rem', background: sequence.length === 4 && !seqLoading ? '#3FF4D5' : 'rgba(255,255,255,0.05)', color: sequence.length === 4 && !seqLoading ? '#0a0a0f' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.1em', cursor: sequence.length === 4 && !seqLoading ? 'pointer' : 'not-allowed' }}>
                {seqLoading ? 'SUBMITTING...' : 'SUBMIT SEQUENCE'}
              </button>
              {sequence.length > 0 && (
                <button onClick={() => setSequence([])}
                  style={{ padding: '0.5rem 0.75rem', background: 'transparent', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer' }}>
                  RESET
                </button>
              )}
            </div>
            {error && <div style={{ marginTop: '0.5rem', color: '#F43F5E', fontSize: '0.75rem' }}>{error}</div>}
          </>
        ) : (
          <SequenceResultPanel result={seqResult} userSequence={sequence} onRetake={() => { setSequence([]); setSeqResult(null); }} onFinish={() => setPhase('done')} />
        )}
      </div>
    );
  }

  return <Summary qResults={qResults} seqResult={seqResult} onRestart={() => {
    setPhase('socratic'); setQIndex(0); setInput(''); setResult(null); setError(null);
    setQResults(Array(QUESTIONS.length).fill(null)); setSequence([]); setSeqResult(null);
  }} />;
}

function SequenceResultPanel({ result, userSequence, onRetake, onFinish }: { result: SequenceResult; userSequence: string[]; onRetake: () => void; onFinish: () => void }) {
  const color = SCORE_COLOR(result.label);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
        <span style={{ color, fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 'bold' }}>{SCORE_LABEL(result.label)} — {result.score}/4</span>
        <div style={{ flex: 1, height: '1px', background: `${color}33` }} />
      </div>

      {/* Sequence comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {['YOUR SEQUENCE', 'CANONICAL SEQUENCE'].map((label, col) => {
          const ids = col === 0 ? userSequence : result.canonical;
          return (
            <div key={label}>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>{label}</div>
              {ids.map((id, i) => {
                const match = id === result.canonical[i];
                return (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', width: '12px' }}>{i + 1}</span>
                    <span style={{ color: col === 0 ? (match ? '#3FF4D5' : '#F43F5E') : '#9BA3A8', fontSize: '0.8rem' }}>{result.canonicalLabels[id]}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Cascade explanation */}
      <div style={{ padding: '1rem 1.25rem', background: 'rgba(63,244,213,0.04)', border: '1px solid rgba(63,244,213,0.15)', borderRadius: '4px', marginBottom: '1.5rem' }}>
        <div style={{ color: '#3FF4D5', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>CASCADE LOGIC</div>
        {result.explanation.split('\n\n').map((para, i) => (
          <p key={i} style={{ color: '#C2C9CC', fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 0.75rem' }}>{para}</p>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onFinish}
          style={{ padding: '0.5rem 1.5rem', background: 'transparent', color: '#3FF4D5', border: '1px solid #3FF4D5', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
          COMPLETE MODULE
        </button>
        <button onClick={onRetake}
          style={{ padding: '0.5rem 0.75rem', background: 'transparent', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer' }}>
          RETAKE SEQUENCE
        </button>
      </div>
    </div>
  );
}

function Summary({ qResults, seqResult, onRestart }: { qResults: (SocraticResult | null)[]; seqResult: SequenceResult | null; onRestart: () => void }) {
  return (
    <div style={{ fontFamily: 'monospace', color: '#C2C9CC', background: '#0a0a0f', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>PILLAR 3 — COMPLETE</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {QUESTIONS.map((q, i) => {
          const r = qResults[i];
          return (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r ? DEPTH_COLOR[r.depth] : 'rgba(255,255,255,0.1)', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: '#7B8285', marginBottom: '0.2rem' }}>{q.text}</div>
                {r && <div style={{ fontSize: '0.7rem', color: DEPTH_COLOR[r.depth], letterSpacing: '0.1em' }}>{DEPTH_LABEL[r.depth]}</div>}
              </div>
            </div>
          );
        })}
        {seqResult && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SCORE_COLOR(seqResult.label), marginTop: '4px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#7B8285', marginBottom: '0.2rem' }}>WEFE Intervention Sequence</div>
              <div style={{ fontSize: '0.7rem', color: SCORE_COLOR(seqResult.label), letterSpacing: '0.1em' }}>{SCORE_LABEL(seqResult.label)} — {seqResult.score}/4</div>
            </div>
          </div>
        )}
      </div>
      <button onClick={onRestart}
        style={{ padding: '0.5rem 1.5rem', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
        RETAKE
      </button>
    </div>
  );
}
