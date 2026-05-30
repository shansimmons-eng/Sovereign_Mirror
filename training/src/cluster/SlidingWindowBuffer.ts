import { SlidingWindowChunk } from '../types';

export class SlidingWindowBuffer {
  private windowSize: number;
  private overlap: number;
  private stepSize: number;
  private buffer: string[] = [];
  private chunks: SlidingWindowChunk[] = [];
  private tokenCount = 0;
  private bypassLockoutUntil: number | null = null;

  constructor(windowSize = 512, overlap = 0.5) {
    this.windowSize = windowSize;
    this.overlap = overlap;
    this.stepSize = Math.floor(windowSize * (1 - overlap));
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  private estimateTokens(text: string): number {
    return this.tokenize(text).length;
  }

  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
  }

  ingest(text: string): SlidingWindowChunk[] {
    this.buffer.push(text);
    this.tokenCount += this.estimateTokens(text);

    const readyChunks: SlidingWindowChunk[] = [];

    while (this.tokenCount >= this.windowSize) {
      const chunkText = this.extractWindow();
      if (!chunkText) break;

      const chunk: SlidingWindowChunk = {
        text: chunkText,
        startToken: this.tokenCount - this.estimateTokens(chunkText),
        endToken: this.tokenCount,
        timestamp: Date.now(),
        contentHash: this.hashContent(chunkText),
        fallacyCount: 0,
      };

      this.chunks.push(chunk);
      readyChunks.push(chunk);
    }

    return readyChunks;
  }

  private extractWindow(): string {
    const tokens: string[] = [];
    let totalTokens = 0;

    while (tokens.length < this.windowSize && this.buffer.length > 0) {
      const nextText = this.buffer.shift() || '';
      const nextTokens = this.tokenize(nextText);
      tokens.push(...nextTokens);
      totalTokens += nextTokens.length;
    }

    if (totalTokens > this.windowSize) {
      const excess = totalTokens - this.windowSize;
      tokens.splice(0, excess);
    }

    this.tokenCount = Math.max(0, this.tokenCount - totalTokens);

    const result = tokens.slice(-this.windowSize).join(' ');
    return result.trim();
  }

  flush(): SlidingWindowChunk | null {
    if (this.buffer.length === 0) return null;

    const remaining = this.buffer.join(' ');
    this.buffer = [];

    const chunk: SlidingWindowChunk = {
      text: remaining,
      startToken: 0,
      endToken: this.estimateTokens(remaining),
      timestamp: Date.now(),
      contentHash: this.hashContent(remaining),
      fallacyCount: 0,
    };

    this.chunks.push(chunk);
    return chunk;
  }

  checkBypass(decayRate: number, threshold = 0.5): boolean {
    if (this.bypassLockoutUntil && Date.now() < this.bypassLockoutUntil) {
      return true;
    }

    if (decayRate > threshold) {
      this.bypassLockoutUntil = Date.now() + 3000;
      return true;
    }

    return false;
  }

  getChunks(): SlidingWindowChunk[] {
    return [...this.chunks];
  }

  getBufferText(): string {
    return this.buffer.join(' ');
  }

  reset(): void {
    this.buffer = [];
    this.chunks = [];
    this.tokenCount = 0;
    this.bypassLockoutUntil = null;
  }
}