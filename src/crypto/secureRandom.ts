/**
 * Cryptographically secure random number generation.
 * Uses Web Crypto API (crypto.getRandomValues) instead of Math.random().
 * 
 * IMPORTANT: Math.random() is NOT cryptographically secure and should never
 * be used for cryptographic operations, key generation, or security-sensitive
 * random values.
 */

/**
 * Generate a cryptographically secure random integer in range [0, max).
 * Uses rejection sampling to avoid modulo bias.
 */
export function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  if (max > 0xFFFFFFFF) throw new Error('max exceeds 32-bit integer range');
  
  const array = new Uint32Array(1);
  
  // Rejection sampling to avoid modulo bias
  const limit = Math.floor(0xFFFFFFFF / max) * max;
  let value: number;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  
  return value % max;
}

/**
 * Generate a cryptographically secure random float in range [0, 1).
 */
export function secureRandomFloat(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0x100000000;
}

/**
 * Generate a cryptographically secure random hex string.
 * @param bytes Number of random bytes (output will be 2x this length in hex)
 */
export function secureRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure random alphanumeric string.
 * Uses base36 encoding (0-9, a-z).
 */
export function secureRandomAlphanumeric(length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[secureRandomInt(chars.length)];
  }
  return result;
}

/**
 * Generate a random integer in range [min, max] (inclusive).
 */
export function secureRandomRange(min: number, max: number): number {
  if (min > max) throw new Error('min must be <= max');
  return min + secureRandomInt(max - min + 1);
}

/**
 * Generate cryptographically secure random bytes.
 */
export function secureRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}
