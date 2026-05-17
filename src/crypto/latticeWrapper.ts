import { ModularArithmetic } from './modularArithmetic';

export class LatticeParameters {
  readonly n: number;
  readonly k: number;
  readonly q: number;
  readonly modulus: bigint;

  constructor(n: number = 256, k: number = 4, q: number = 3329) {
    this.n = n;
    this.k = k;
    this.q = q;
    this.modulus = BigInt(q);
  }

  createPolynomial(): number[] {
    return new Array(this.n).fill(0).map(() => 
      Math.floor(Math.random() * this.q)
    );
  }

  createErrorPolynomial(): number[] {
    const poly: number[] = [];
    for (let i = 0; i < this.n; i++) {
      const r = Math.random();
      if (r < 0.25) poly.push(-1);
      else if (r < 0.50) poly.push(0);
      else if (r < 0.75) poly.push(1);
      else poly.push(0);
    }
    return poly;
  }

  multiplyPolynomials(a: number[], b: number[]): number[] {
    const result = new Array(this.n).fill(0);
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        const idx = (i + j) % this.n;
        result[idx] = ModularArithmetic.add(
          result[idx],
          ModularArithmetic.multiply(a[i], b[j], this.q),
          this.q
        );
      }
    }
    return result;
  }

  addPolynomials(a: number[], b: number[]): number[] {
    return a.map((val, i) => ModularArithmetic.add(val, b[i], this.q));
  }

  negatePolynomial(a: number[]): number[] {
    return a.map(val => ModularArithmetic.multiply(-1, val, this.q));
  }

  toString(): string {
    return `LatticeParameters(n=${this.n}, k=${this.k}, q=${this.q})`;
  }
}

export class LatticeKeyGenerator {
  private params: LatticeParameters;

  constructor(n: number = 256, k: number = 4, q: number = 3329) {
    this.params = new LatticeParameters(n, k, q);
  }

  generateKeyPair(): { publicKey: number[][], secretKey: number[][] } {
    const publicKey: number[][] = [];
    const secretKey: number[][] = [];

    for (let i = 0; i < this.params.k; i++) {
      const pkRow: number[] = [];
      const skRow: number[] = [];
      for (let j = 0; j < this.params.k; j++) {
        pkRow.push(Math.floor(Math.random() * this.params.q));
        skRow.push(Math.floor(Math.random() * this.params.q));
      }
      publicKey.push(pkRow);
      secretKey.push(skRow);
    }

    return { publicKey, secretKey };
  }

  getParameters(): LatticeParameters {
    return this.params;
  }
}