import { useState } from 'react';

const API_BASE = (): string =>
  typeof window !== 'undefined' && window.kylosTraining?.apiBase
    ? window.kylosTraining.apiBase
    : (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__kylosApiBase as string) || '';

type Depth = 'surface' | 'developing' | 'deep';

interface Question {
  id: string;
  text: string;
  hint: string | null;
}

interface Result {
  depth: Depth;
  reflection: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'How do you figure out if you are right in an argument?',
    hint: 'Take your time. There may be more to this question than first appears.',
  },
  {
    id: 'q2',
    text: 'What is the distinction between jealousy and envy?',
    hint: 'Consider the structure of each emotion — how many people does each one require?',
  },
  {
    id: 'q3',
    text: 'Is the Golden Rule the best framework for navigating ethical dilemmas? If not, what would be better?',
    hint: null,
  },
  {
    id: 'q4',
    text: 'Is it acceptable to be silent when someone is telling you something that is important to them?',
    hint: null,
  },
];

const DEPTH_COLOR: Record<Depth, string> = {
  surface:    '#F43F5E',
  developing: '#F47B3F',
  deep:       '#3FF4D5',
};

const DEPTH_LABEL: Record<Depth, string> = {
  surface:    'SURFACE',
  developing: 'DEVELOPING',
  deep:       'DEEP',
};

export default function Module2() {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<(Result | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done, setDone] = useState(false);

  const question = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar2/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, response: input.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as Result;
      setResult(data);
      setResults(prev => {
        const next = [...prev];
        next[index] = data;
        return next;
      });
    } catch {
      setError('Evaluation unavailable — try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (isLast) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setInput('');
      setResult(null);
      setError(null);
    }
  }

  if (done) {
    return <Summary results={results} onRestart={() => {
      setIndex(0);
      setInput('');
      setResult(null);
      setError(null);
      setResults(Array(QUESTIONS.length).fill(null));
      setDone(false);
    }} />;
  }

  return (
    <div style={{ fontFamily: 'monospace', color: '#C2C9CC', background: '#0a0a0f', minHeight: '60vh', padding: '2rem' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
          PILLAR 2 — RELATIONAL INTEGRITY
        </div>
        <div style={{ color: '#9BA3A8', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          Conflict Resolution · Empathy · Covenant-Based Coordination
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '2rem' }}>
        {QUESTIONS.map((_, i) => {
          const r = results[i];
          const isActive = i === index;
          const color = r ? DEPTH_COLOR[r.depth] : isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)';
          return (
            <div key={i} style={{ flex: 1, height: '3px', background: color, transition: 'background 0.3s', borderRadius: '2px' }} />
          );
        })}
      </div>

      {/* Question */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
          QUESTION {index + 1} OF {QUESTIONS.length}
        </div>
        <div style={{ fontSize: '1.1rem', color: '#EDEFF0', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {question.text}
        </div>
        {question.hint && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
            {question.hint}
          </div>
        )}
      </div>

      {/* Input */}
      {!result && (
        <>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Write your response..."
            disabled={loading}
            rows={5}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: '#C2C9CC',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              padding: '0.75rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1.5rem',
              background: input.trim() && !loading ? '#3FF4D5' : 'rgba(255,255,255,0.05)',
              color: input.trim() && !loading ? '#0a0a0f' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'EVALUATING...' : 'SUBMIT'}
          </button>
          {error && (
            <div style={{ marginTop: '0.5rem', color: '#F43F5E', fontSize: '0.75rem' }}>{error}</div>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <div style={{ marginTop: '0.5rem' }}>
          {/* Depth indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: DEPTH_COLOR[result.depth] }} />
            <span style={{ color: DEPTH_COLOR[result.depth], fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 'bold' }}>
              {DEPTH_LABEL[result.depth]}
            </span>
            <div style={{ flex: 1, height: '1px', background: `${DEPTH_COLOR[result.depth]}33` }} />
          </div>

          {/* Reflection */}
          <div style={{
            padding: '1rem 1.25rem',
            background: `${DEPTH_COLOR[result.depth]}08`,
            border: `1px solid ${DEPTH_COLOR[result.depth]}22`,
            borderRadius: '4px',
            fontSize: '0.9rem',
            lineHeight: 1.7,
            color: '#C2C9CC',
            marginBottom: '1.5rem',
          }}>
            {result.reflection}
          </div>

          {/* Response echo */}
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>YOUR RESPONSE</div>
            <div style={{ color: '#7B8285', fontSize: '0.85rem', lineHeight: 1.6 }}>{input}</div>
          </div>

          <button
            onClick={handleNext}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'transparent',
              color: '#3FF4D5',
              border: '1px solid #3FF4D5',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            {isLast ? 'COMPLETE MODULE' : 'NEXT QUESTION →'}
          </button>
        </div>
      )}
    </div>
  );
}

function Summary({ results, onRestart }: { results: (Result | null)[]; onRestart: () => void }) {
  const scored = results.filter(Boolean) as Result[];
  const depthRank: Record<Depth, number> = { surface: 0, developing: 1, deep: 2 };
  const avgRank = scored.length
    ? scored.reduce((s, r) => s + depthRank[r.depth], 0) / scored.length
    : 0;
  const overallDepth: Depth = avgRank >= 1.6 ? 'deep' : avgRank >= 0.7 ? 'developing' : 'surface';

  return (
    <div style={{ fontFamily: 'monospace', color: '#C2C9CC', background: '#0a0a0f', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
          PILLAR 2 — COMPLETE
        </div>
        <div style={{ color: DEPTH_COLOR[overallDepth], fontSize: '1.1rem', letterSpacing: '0.1em' }}>
          OVERALL: {DEPTH_LABEL[overallDepth]}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {QUESTIONS.map((q, i) => {
          const r = results[i];
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
      </div>

      <button
        onClick={onRestart}
        style={{
          padding: '0.5rem 1.5rem',
          background: 'transparent',
          color: 'rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        RETAKE
      </button>
    </div>
  );
}
