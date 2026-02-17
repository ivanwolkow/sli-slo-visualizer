import { create } from 'zustand';
import type {
  LatencyBucket,
  SimulationConfig,
  SimulationSnapshot,
  SpeedMultiplier,
  SliMetricConfig
} from '../domain/types';
import { validateLatencyBuckets, validateSliMetrics } from '../domain/validation';
import { SimulationEngine } from '../simulation/engine';

const DEFAULT_TICK_MS = 100;

type SimulationStatus = 'idle' | 'running' | 'paused';

interface SimulationStore {
  config: SimulationConfig;
  status: SimulationStatus;
  validationErrors: string[];
  snapshot: SimulationSnapshot;
  setRps: (rps: number) => void;
  setSpeedMultiplier: (speed: SpeedMultiplier) => void;
  addBucket: () => void;
  updateBucket: (id: string, patch: Partial<LatencyBucket>) => void;
  removeBucket: (id: string) => void;
  addMetric: () => void;
  updateMetric: (id: string, patch: Partial<SliMetricConfig>) => void;
  removeMetric: (id: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const createId = (): string => {
  const hasCrypto = typeof globalThis !== 'undefined' && 'crypto' in globalThis;
  if (hasCrypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const defaultBuckets = (): LatencyBucket[] => [
  { id: createId(), percentage: 70, latencyMs: 500 },
  { id: createId(), percentage: 20, latencyMs: 900 },
  { id: createId(), percentage: 10, latencyMs: 1100 }
];

const defaultMetrics = (): SliMetricConfig[] => [
  {
    id: createId(),
    name: 'SLI <= 1000ms / 30s',
    thresholdMs: 1000,
    windowSec: 30,
    sloTargetPct: 99
  },
  {
    id: createId(),
    name: 'SLI <= 500ms / 60s',
    thresholdMs: 500,
    windowSec: 60,
    sloTargetPct: 99
  },
  {
    id: createId(),
    name: 'SLI <= 1200ms / 300s',
    thresholdMs: 1200,
    windowSec: 300,
    sloTargetPct: 99
  }
];

const createDefaultConfig = (): SimulationConfig => ({
  rps: 100,
  speedMultiplier: 1,
  tickMs: DEFAULT_TICK_MS,
  buckets: defaultBuckets(),
  metrics: defaultMetrics()
});

const collectValidationErrors = (config: SimulationConfig): string[] => {
  const bucketValidation = validateLatencyBuckets(config.buckets);
  const metricValidation = validateSliMetrics(config.metrics);
  return [...bucketValidation.errors, ...metricValidation.errors];
};

let engine: SimulationEngine | null = null;

const ensureEngine = (
  config: SimulationConfig,
  setState: (partial: Partial<SimulationStore>) => void
): SimulationEngine => {
  if (engine === null) {
    engine = new SimulationEngine(config, (snapshot) => {
      setState({ snapshot });
    });
  }

  return engine;
};

const initialConfig = createDefaultConfig();
const initialValidationErrors = collectValidationErrors(initialConfig);
const initialSnapshot = new SimulationEngine(initialConfig).getSnapshot();

export const useSimulationStore = create<SimulationStore>((set, get) => {
  const applyConfig = (nextConfig: SimulationConfig): void => {
    const currentEngine = ensureEngine(nextConfig, (partial) => set(partial));
    currentEngine.updateConfig(nextConfig);

    const validationErrors = collectValidationErrors(nextConfig);

    set({
      config: nextConfig,
      validationErrors,
      snapshot: currentEngine.getSnapshot()
    });
  };

  return {
    config: initialConfig,
    status: 'idle',
    validationErrors: initialValidationErrors,
    snapshot: initialSnapshot,

    setRps: (rps) => {
      const nextConfig: SimulationConfig = {
        ...get().config,
        rps: clamp(Math.round(rps), 1, 1000)
      };

      applyConfig(nextConfig);
    },

    setSpeedMultiplier: (speed) => {
      const nextConfig: SimulationConfig = {
        ...get().config,
        speedMultiplier: speed
      };

      applyConfig(nextConfig);
    },

    addBucket: () => {
      const nextConfig: SimulationConfig = {
        ...get().config,
        buckets: [
          ...get().config.buckets,
          {
            id: createId(),
            percentage: 0,
            latencyMs: 1000
          }
        ]
      };

      applyConfig(nextConfig);
    },

    updateBucket: (id, patch) => {
      const nextBuckets = get().config.buckets.map((bucket) =>
        bucket.id === id ? { ...bucket, ...patch } : bucket
      );

      const nextConfig: SimulationConfig = {
        ...get().config,
        buckets: nextBuckets
      };

      applyConfig(nextConfig);
    },

    removeBucket: (id) => {
      if (get().config.buckets.length <= 1) {
        return;
      }

      const nextBuckets = get().config.buckets.filter((bucket) => bucket.id !== id);
      const nextConfig: SimulationConfig = {
        ...get().config,
        buckets: nextBuckets
      };

      applyConfig(nextConfig);
    },

    addMetric: () => {
      const nextMetric: SliMetricConfig = {
        id: createId(),
        name: `SLI <= 1000ms / 60s`,
        thresholdMs: 1000,
        windowSec: 60,
        sloTargetPct: 99
      };

      const nextConfig: SimulationConfig = {
        ...get().config,
        metrics: [...get().config.metrics, nextMetric]
      };

      applyConfig(nextConfig);
    },

    updateMetric: (id, patch) => {
      const nextMetrics = get().config.metrics.map((metric) =>
        metric.id === id ? { ...metric, ...patch } : metric
      );

      const nextConfig: SimulationConfig = {
        ...get().config,
        metrics: nextMetrics
      };

      applyConfig(nextConfig);
    },

    removeMetric: (id) => {
      if (get().config.metrics.length <= 1) {
        return;
      }

      const nextMetrics = get().config.metrics.filter((metric) => metric.id !== id);
      const nextConfig: SimulationConfig = {
        ...get().config,
        metrics: nextMetrics
      };

      applyConfig(nextConfig);
    },

    start: () => {
      const state = get();
      const validationErrors = collectValidationErrors(state.config);
      if (validationErrors.length > 0) {
        set({ validationErrors });
        return;
      }

      const currentEngine = ensureEngine(state.config, (partial) => set(partial));
      currentEngine.updateConfig(state.config);
      currentEngine.start();

      set({
        status: 'running',
        validationErrors: [],
        snapshot: currentEngine.getSnapshot()
      });
    },

    pause: () => {
      const currentEngine = ensureEngine(get().config, (partial) => set(partial));
      currentEngine.pause();

      set({
        status: 'paused',
        snapshot: currentEngine.getSnapshot()
      });
    },

    reset: () => {
      const currentEngine = ensureEngine(get().config, (partial) => set(partial));
      currentEngine.reset();

      set({
        status: 'idle',
        snapshot: currentEngine.getSnapshot()
      });
    }
  };
});
