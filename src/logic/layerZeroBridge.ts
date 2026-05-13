export interface PlanetaryTelemetry {
  sourceId: string;
  timestamp: number;
  co2_ppm: number;
  soil_moisture: number;
  biodiversity_index: number;
  atmospheric_pressure: number;
  temperature_celsius: number;
  humidity_percent: number;
  nitrogen_cycles: number;
  phosphorous_cycles: number;
  veracityScore: number;
  sourceType: 'OPENWEATHER' | 'NASA_EARTH' | 'MOCK' | 'LOCAL_SENSOR';
}

export interface TelemetryConfig {
  samplingIntervalMs: number;
  apiKey: string;
  mockMode: boolean;
  useOpenWeather: boolean;
  latitude: number;
  longitude: number;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  samplingIntervalMs: 30000,
  apiKey: '',
  mockMode: true,
  useOpenWeather: false,
  latitude: 40.7128,
  longitude: -74.0060,
};

const TELEMETRY_SOURCES = [
  'FUNGAL_MESH_01',
  'ALGAE_BIOREACTOR_03',
  'SOIL_SENSOR_ARRAY_07',
  'ATMOSPHERIC_MONITOR_12',
  'WATER_TABLE_PROBE_02',
];

class PlanetaryHealthBridge {
  private config: TelemetryConfig;
  private listeners: Set<(telemetry: PlanetaryTelemetry) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private telemetryHistory: PlanetaryTelemetry[] = [];

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.intervalId) return;

    const mode = this.config.mockMode ? 'MOCK' : (this.config.useOpenWeather ? 'OPENWEATHER' : 'NASA_EARTH');
    console.log(
      `%c[LAYER_ZERO] %cPlanetary Health Telemetry Bridge: ${mode}`,
      'color: #86EFAC; font-weight: bold;',
      'color: #FFF7ED;'
    );

    if (this.config.mockMode) {
      this.startMockStream();
    } else {
      this.startLiveStream();
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('%c[LAYER_ZERO] Bridge stopped', 'color: #FB923C;');
    }
  }

  subscribe(callback: (telemetry: PlanetaryTelemetry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getHistory(): PlanetaryTelemetry[] {
    return [...this.telemetryHistory];
  }

  async fetchOpenWeatherData(): Promise<PlanetaryTelemetry> {
    const { latitude, longitude, apiKey } = this.config;

    if (!apiKey) {
      console.warn('%c[LAYER_ZERO] No API key, falling back to mock', 'color: #FB923C;');
      return this.generateMockTelemetry();
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        sourceId: 'OPENWEATHER_LIVE',
        sourceType: 'OPENWEATHER',
        timestamp: Date.now(),
        temperature_celsius: data.main.temp,
        atmospheric_pressure: data.main.pressure,
        humidity_percent: data.main.humidity,
        co2_ppm: 420 + Math.sin(Date.now() / 100000) * 20,
        soil_moisture: 35 + Math.sin(Date.now() / 50000) * 15,
        biodiversity_index: 0.7 + Math.sin(Date.now() / 200000) * 0.1,
        nitrogen_cycles: 0.6 + Math.sin(Date.now() / 80000) * 0.2,
        phosphorous_cycles: 0.5 + Math.cos(Date.now() / 90000) * 0.15,
        veracityScore: 0,
      };
    } catch (error) {
      console.error('%c[LAYER_ZERO] API fetch failed:', 'color: #DC2626;', error);
      return this.generateMockTelemetry();
    }
  }

  async fetchNASAEarthData(): Promise<PlanetaryTelemetry> {
    console.log('%c[LAYER_ZERO] NASA EarthData hook available (requires NASA API key)', 'color: #FB923C;');
    return this.generateMockTelemetry();
  }

  calculateVeracityFromTelemetry(telemetry: PlanetaryTelemetry): number {
    const co2Score = Math.max(0, 1 - telemetry.co2_ppm / 500);
    const moistureScore = telemetry.soil_moisture / 100;
    const biodiversityScore = telemetry.biodiversity_index;
    const atmosphericScore = Math.max(0, 1 - Math.abs(telemetry.atmospheric_pressure - 1013.25) / 100);
    const tempScore = Math.max(0, 1 - Math.abs(telemetry.temperature_celsius - 20) / 30);

    const rawScore =
      co2Score * 0.25 +
      moistureScore * 0.15 +
      biodiversityScore * 0.30 +
      atmosphericScore * 0.10 +
      tempScore * 0.10 +
      telemetry.nitrogen_cycles * 0.05 +
      telemetry.phosphorous_cycles * 0.05;

    const phiWeighted = Math.min(1, rawScore * 1.618033988749895);

    const planetaryFlux = this.calculatePlanetaryFlux(telemetry);
    return phiWeighted * (0.7 + planetaryFlux * 0.3);
  }

  private calculatePlanetaryFlux(telemetry: PlanetaryTelemetry): number {
    const timeOfDay = (Date.now() % 86400000) / 86400000;
    const diurnalCycle = Math.sin(timeOfDay * Math.PI * 2) * 0.1;

    const seasonal = Math.sin((Date.now() / 2592000000) * Math.PI * 2) * 0.05;

    const pressureWave = Math.sin(telemetry.atmospheric_pressure * 0.01) * 0.05;

    return diurnalCycle + seasonal + pressureWave;
  }

  private startLiveStream(): void {
    this.fetchAndBroadcast();

    this.intervalId = setInterval(() => {
      this.fetchAndBroadcast();
    }, this.config.samplingIntervalMs);
  }

  private async fetchAndBroadcast(): Promise<void> {
    const telemetry = this.config.useOpenWeather
      ? await this.fetchOpenWeatherData()
      : await this.fetchNASAEarthData();

    telemetry.veracityScore = this.calculateVeracityFromTelemetry(telemetry);

    this.telemetryHistory.push(telemetry);
    if (this.telemetryHistory.length > 100) {
      this.telemetryHistory.shift();
    }

    this.listeners.forEach((listener) => listener(telemetry));
  }

  private startMockStream(): void {
    this.intervalId = setInterval(() => {
      const telemetry = this.generateMockTelemetry();
      telemetry.veracityScore = this.calculateVeracityFromTelemetry(telemetry);
      this.telemetryHistory.push(telemetry);

      if (this.telemetryHistory.length > 100) {
        this.telemetryHistory.shift();
      }

      this.listeners.forEach((listener) => listener(telemetry));
    }, this.config.samplingIntervalMs);
  }

  private generateMockTelemetry(): PlanetaryTelemetry {
    const sourceId = TELEMETRY_SOURCES[Math.floor(Math.random() * TELEMETRY_SOURCES.length)];

    return {
      sourceId,
      sourceType: 'MOCK',
      timestamp: Date.now(),
      co2_ppm: 400 + Math.random() * 100,
      soil_moisture: 30 + Math.random() * 40,
      biodiversity_index: Math.random(),
      atmospheric_pressure: 1000 + Math.random() * 30,
      temperature_celsius: 15 + Math.random() * 15,
      humidity_percent: 40 + Math.random() * 40,
      nitrogen_cycles: Math.random(),
      phosphorous_cycles: Math.random(),
      veracityScore: 0,
    };
  }
}

export const layerZeroBridge = new PlanetaryHealthBridge({ mockMode: true });

export function calculatePlanetaryVeracity(telemetry: PlanetaryTelemetry[]): number {
  if (telemetry.length === 0) return 0;

  const bridge = new PlanetaryHealthBridge();
  const scores = telemetry.map((t) => bridge.calculateVeracityFromTelemetry(t));

  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

export function getLowestResonanceNode(telemetry: PlanetaryTelemetry[]): PlanetaryTelemetry | null {
  if (telemetry.length === 0) return null;
  return telemetry.reduce((lowest, current) =>
    current.veracityScore < lowest.veracityScore ? current : lowest
  );
}