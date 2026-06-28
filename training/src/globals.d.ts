interface Window {
  __kylosApiBase?: string;
  kylosTraining?: {
    pillarId?: string;
    userId?: number;
    nonce?: string;
    ajaxUrl?: string;
    apiBase?: string;
    badgesBase?: string;
    iconsBase?: string;
    logoUrl?: string;
    hubUrl?: string;
  };
  kylosOnPillarComplete?: (pillarId: string) => void;
}
