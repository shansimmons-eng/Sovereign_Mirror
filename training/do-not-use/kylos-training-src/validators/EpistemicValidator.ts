import {
  EpistemicFrame,
  FALLACY_CRITICAL_THRESHOLD,
  FALLACY_ID_REGEX,
  UUID_REGEX,
} from '../types';

export class EpistemicValidator {
  private static instance: EpistemicValidator | null = null;

  private constructor() {}

  static getInstance(): EpistemicValidator {
    if (!EpistemicValidator.instance) {
      EpistemicValidator.instance = new EpistemicValidator();
    }
    return EpistemicValidator.instance;
  }

  validateFrame(frame: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isObject(frame)) {
      return { valid: false, errors: ['Frame must be an object'] };
    }

    const frameObj = frame as Record<string, unknown>;

    if (!this.validateHeader(frameObj.header, errors)) {
      errors.push('Header validation failed');
    }

    if (!this.validatePayload(frameObj.payload, errors)) {
      errors.push('Payload validation failed');
    }

    if (!this.validateSettlement(frameObj.settlement, errors)) {
      errors.push('Settlement validation failed');
    }

    return { valid: errors.length === 0, errors };
  }

  private isObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private validateHeader(header: unknown, errors: string[]): boolean {
    if (!header || !this.isObject(header)) {
      errors.push('Header must be an object');
      return false;
    }

    const h = header as Record<string, unknown>;
    const requiredFields = ['frame_id', 'node_public_key', 'sequence_number', 'timestamp', 'node_signature'];
    let valid = true;

    for (const field of requiredFields) {
      if (!(field in h)) {
        errors.push(`Missing header field: ${field}`);
        valid = false;
      }
    }

    if (h.frame_id && typeof h.frame_id === 'string') {
      if (!UUID_REGEX.test(h.frame_id)) {
        errors.push('Header field "frame_id" must be a valid UUIDv4 string');
        valid = false;
      }
    }

    if (h.sequence_number !== undefined) {
      if (typeof h.sequence_number !== 'number' || h.sequence_number < 0 || !Number.isInteger(h.sequence_number)) {
        errors.push('Header field "sequence_number" must be a non-negative integer');
        valid = false;
      }
    }

    return valid;
  }

  private validatePayload(payload: unknown, errors: string[]): boolean {
    if (!payload || !this.isObject(payload)) {
      errors.push('Payload must be an object');
      return false;
    }

    const p = payload as Record<string, unknown>;
    const requiredFields = ['raw_input', 'inverion_divide', 'detected_fallacies', 'radical_veracity_passed'];
    let valid = true;

    for (const field of requiredFields) {
      if (!(field in p)) {
        errors.push(`Missing payload field: ${field}`);
        valid = false;
      }
    }

    if (p.raw_input && typeof p.raw_input === 'string' && p.raw_input.length > 8192) {
      errors.push('Payload field "raw_input" exceeds maxLength of 8192');
      valid = false;
    }

    if (p.inverion_divide !== undefined) {
      const inverionState = p.inverion_divide as number;
      if (![1, 2, 3].includes(inverionState)) {
        errors.push('Payload field "inverion_divide" must map to valid Enum states (1, 2, or 3)');
        valid = false;
      }
    }

    if (Array.isArray(p.detected_fallacies)) {
      for (const fallacy of p.detected_fallacies) {
        if (!this.validateFallacy(fallacy, errors)) {
          valid = false;
        }
      }
    }

    this.validateInvariant(p, errors);

    return valid;
  }

  private validateFallacy(fallacy: unknown, errors: string[]): boolean {
    if (!fallacy || !this.isObject(fallacy)) {
      errors.push('Fallacy must be an object');
      return false;
    }

    const f = fallacy as Record<string, unknown>;
    const requiredFields = ['fallacy_id', 'confidence_score', 'validation_proof'];
    let valid = true;

    for (const field of requiredFields) {
      if (!(field in f)) {
        errors.push(`Missing fallacy field: ${field}`);
        valid = false;
      }
    }

    if (f.fallacy_id && typeof f.fallacy_id === 'string') {
      if (!FALLACY_ID_REGEX.test(f.fallacy_id)) {
        errors.push(`Invalid fallacy identity structure: ${f.fallacy_id}`);
        valid = false;
      }
    }

    if (f.confidence_score !== undefined) {
      const score = f.confidence_score as number;
      if (typeof score !== 'number' || score < 0.0 || score > 1.0) {
        errors.push('Fallacy field "confidence_score" out of bounds [0.0, 1.0]');
        valid = false;
      }
    }

    return valid;
  }

  private validateInvariant(payload: Record<string, unknown>, errors: string[]): void {
    const fallacies = payload.detected_fallacies as Array<Record<string, unknown>> | undefined;
    const veracityPassed = payload.radical_veracity_passed as boolean | undefined;

    if (!Array.isArray(fallacies) || typeof veracityPassed !== 'boolean') {
      return;
    }

    for (const fallacy of fallacies) {
      const confidenceScore = fallacy.confidence_score as number;
      if (confidenceScore > FALLACY_CRITICAL_THRESHOLD && veracityPassed === true) {
        errors.push(
          `Inconsistency Exception: radical_veracity_passed marked true while ` +
          `fallacy ${fallacy.fallacy_id} confidence (${confidenceScore}) exceeds threshold (${FALLACY_CRITICAL_THRESHOLD}).`
        );
        return;
      }
    }
  }

  private validateSettlement(settlement: unknown, errors: string[]): boolean {
    if (!settlement || !this.isObject(settlement)) {
      errors.push('Settlement must be an object');
      return false;
    }

    const s = settlement as Record<string, unknown>;
    const requiredFields = ['replication_weight', 'peer_endorsements', 'is_globally_settled'];
    let valid = true;

    for (const field of requiredFields) {
      if (!(field in s)) {
        errors.push(`Missing settlement field: ${field}`);
        valid = false;
      }
    }

    if (typeof s.replication_weight === 'number' && s.replication_weight < 0) {
      errors.push('Settlement field "replication_weight" must be non-negative');
      valid = false;
    }

    if (Array.isArray(s.peer_endorsements)) {
      for (const endorsement of s.peer_endorsements) {
        if (typeof endorsement !== 'string') {
          errors.push('Settlement field "peer_endorsements" must contain only strings');
          valid = false;
          break;
        }
      }
    }

    return valid;
  }

  validateFrameFromJson(jsonStr: string): { valid: boolean; errors: string[]; frame?: EpistemicFrame } {
    try {
      const frame = JSON.parse(jsonStr) as unknown;
      const validation = this.validateFrame(frame);
      if (validation.valid) {
        return { valid: true, errors: [], frame: frame as EpistemicFrame };
      }
      return { valid: false, errors: validation.errors };
    } catch (e) {
      return { valid: false, errors: [`Malformed JSON structure: ${(e as Error).message}`] };
    }
  }
}

export const epistemicValidator = EpistemicValidator.getInstance();