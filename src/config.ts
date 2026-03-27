import type { FeedConfig } from './types';
import { watch } from 'fs';

const DEFAULT_CONFIG: FeedConfig = {
  title: 'Test RSS Feed Generator',
  description: 'A highly customizable RSS feed for testing ingestors',
  link: 'http://localhost:3000',
  language: 'en-us',

  itemCount: 20,
  updateIntervalMs: 60000, // 1 minute

  contentOptions: {
    titleLength: { min: 20, max: 70 },
    contentLength: { min: 500, max: 3000 },
    summaryLength: { min: 100, max: 200 },
    includeImages: true,
    imageCount: { min: 1, max: 3 },
    includeVideos: true,
    includeCategories: true,
    categoryCount: { min: 1, max: 5 },
    authorPatterns: [
      'John Smith',
      'Jane Doe',
      'Alex Johnson',
      'Sarah Williams',
      'Michael Brown',
    ],
    useCurrentDate: false,
    useRealisticDates: true,
    dateRangeDays: 30,
    includeEmbeds: true,
    htmlInContent: true,
  },

  fieldBehavior: {
    titlePresence: 1.0,
    summaryPresence: 0.9,
    contentPresence: 1.0,
    linkPresence: 1.0,
    imageUrlPresence: 0.8,
    authorPresence: 0.95,
    publishedAtPresence: 1.0,
    guidPresence: 1.0,
    lastModifiedAtPresence: 0.7,
    categoriesPresence: 0.8,
    forceEmptyFields: [],
    forceInvalidValues: [],
  },

  format: 'RSS',

  endpoints: [
    { path: '/feed', format: 'RSS', enabled: true },
    { path: '/feed/rss091', format: 'RSS_091', enabled: true },
    { path: '/feed/rss092', format: 'RSS_092', enabled: true },
    { path: '/feed/atom', format: 'ATOM', enabled: true },
    { path: '/feed/json', format: 'JSON', enabled: true },
    { path: '/feed/xml', format: 'XML', enabled: true },
    { path: '/feed/newsml', format: 'NEWSML', enabled: true },
    { path: '/feed/newsml-g2', format: 'NEWSML_G2', enabled: true },
    { path: '/feed/nitf', format: 'NITF', enabled: true },
  ],
};

export class ConfigManager {
  private config: FeedConfig;
  private configPath: string;
  private listeners: Set<(config: FeedConfig) => void> = new Set();

  constructor(configPath = './config.json') {
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG }; // Initialize with defaults
    this.load()
      .then((config) => {
        this.config = config;
      })
      .catch((error) => {
        console.warn('Failed to load initial config, using defaults:', error);
      });
    this.watchConfig();
  }

  private async load(): Promise<FeedConfig> {
    try {
      const file = Bun.file(this.configPath);
      if (await file.exists()) {
        const content = (await file.json()) as FeedConfig;
        return this.mergeWithDefaults(content);
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private mergeWithDefaults(partial: Partial<FeedConfig>): FeedConfig {
    return {
      ...DEFAULT_CONFIG,
      ...partial,
      contentOptions: {
        ...DEFAULT_CONFIG.contentOptions,
        ...partial.contentOptions,
      },
      fieldBehavior: {
        ...DEFAULT_CONFIG.fieldBehavior,
        ...partial.fieldBehavior,
      },
      endpoints: partial.endpoints ?? DEFAULT_CONFIG.endpoints,
    };
  }

  private watchConfig(): void {
    const watcher = watch(this.configPath, async (event) => {
      if (event === 'change') {
        console.log('[Config] File changed, reloading...');
        try {
          this.config = await this.load();
          this.notifyListeners();
        } catch (error) {
          console.warn('Failed to reload config:', error);
        }
      }
    });

    // Cleanup on exit
    process.on('SIGINT', () => watcher.close());
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.config);
    }
  }

  getConfig(): FeedConfig {
    return this.config;
  }

  updateConfig(updates: Partial<FeedConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
    this.save();
    this.notifyListeners();
  }

  updateContentOptions(updates: Partial<FeedConfig['contentOptions']>): void {
    this.config.contentOptions = {
      ...this.config.contentOptions,
      ...updates,
    };
    this.save();
    this.notifyListeners();
  }

  updateFieldBehavior(updates: Partial<FeedConfig['fieldBehavior']>): void {
    this.config.fieldBehavior = {
      ...this.config.fieldBehavior,
      ...updates,
    };
    this.save();
    this.notifyListeners();
  }

  onConfigChange(callback: (config: FeedConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private save(): void {
    Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    this.notifyListeners();
  }
}

export const configManager = new ConfigManager();
