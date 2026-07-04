interface CharacterCounterProps {
  text: string;
  max?: number;
}

export function CharacterCounter({ text, max }: CharacterCounterProps) {
  const count = text.length;
  const words = count === 0 ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="char-counter">
      <span className="char-counter__label">CHARS:</span>
      <span className="char-counter__value">{String(count).padStart(4, '0')}</span>
      {max != null && (
        <span className="char-counter__max">/ {max}</span>
      )}
      <span className="char-counter__divider">|</span>
      <span className="char-counter__label">WORDS:</span>
      <span className="char-counter__value">{String(words).padStart(4, '0')}</span>
    </div>
  );
}
