export class ModularArithmetic {
  static add(a: number, b: number, mod: number): number {
    const result = (a + b) % mod;
    return result < 0 ? result + mod : result;
  }

  static multiply(a: number, b: number, mod: number): number {
    return (a * b) % mod;
  }

  static inverse(a: number, mod: number): number {
    let t = 0;
    let newT = 1;
    let r = mod;
    let newR = a;

    while (newR !== 0) {
      const quotient = Math.floor(r / newR);
      const tempT = newT;
      newT = t - quotient * newT;
      t = tempT;
      const tempR = newR;
      newR = r - quotient * newR;
      r = tempR;
    }

    if (r > 1) return -1;
    if (t < 0) t = t + mod;
    return t;
  }

  static pow(base: number, exp: number, mod: number): number {
    if (mod === 1) return 0;
    let result = 1;
    base = base % mod;
    while (exp > 0) {
      if (exp % 2 === 1) {
        result = this.multiply(result, base, mod);
      }
      exp = Math.floor(exp / 2);
      base = this.multiply(base, base, mod);
    }
    return result;
  }

  static modExp(base: number, exp: number, mod: number): number {
    return this.pow(base, exp, mod);
  }

  static gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  static lcm(a: number, b: number): number {
    return Math.abs(a) * Math.abs(b) / this.gcd(a, b);
  }

  static isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  static generatePrime(bits: number = 256): number {
    const min = Math.pow(2, bits - 1);
    const max = Math.pow(2, bits) - 1;
    let candidate = min + Math.floor(Math.random() * (max - min));
    while (!this.isPrime(candidate)) {
      candidate++;
      if (candidate > max) candidate = min;
    }
    return candidate;
  }

  static modDiv(a: number, b: number, mod: number): number {
    const bInv = this.inverse(b, mod);
    if (bInv === -1) return -1;
    return this.multiply(a, bInv, mod);
  }

  static legendreSymbol(a: number, p: number): number {
    if (a === 0) return 0;
    a = a % p;
    const exp = (p - 1) / 2;
    const modExp = this.pow(a, exp, p);
    return modExp === p - 1 ? -1 : modExp;
  }

  static modularSqrt(a: number, p: number): number {
    if (this.legendreSymbol(a, p) !== 1) return -1;
    if (p % 4 === 3) {
      const exp = (p + 1) / 4;
      return this.pow(a, exp, p);
    }
    let q = p - 1;
    let s = 0;
    while (q % 2 === 0) {
      q /= 2;
      s++;
    }
    let z = 2;
    while (this.legendreSymbol(z, p) !== -1) {
      z++;
    }
    let c = this.pow(z, q, p);
    let x = this.pow(a, (q + 1) / 2, p);
    let t = this.pow(a, q, p);
    let m = s;

    while (t !== 1) {
      let i = 0;
      let t2i = this.pow(t, 2, p);
      while (t2i !== 1) {
        i++;
        t2i = this.pow(t2i, 2, p);
      }
      const exponent = Math.pow(2, m - i - 1);
      c = this.pow(c, exponent * 2, p);
      x = this.multiply(x, c, p);
      t = this.multiply(t, c, p);
      t = this.multiply(t, c, p);
      m = i;
    }
    return x;
  }
}