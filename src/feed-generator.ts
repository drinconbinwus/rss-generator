import type {
  FeedConfig,
  GeneratedItem,
  ExtractedMedia,
  ContentSourceFormat,
} from './types';

// Fast random data generation without external dependencies
const LOREM_WORDS =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  );

const TITLES = [
  'Breaking: Major Discovery in Science Field',
  'Technology Giants Report Record Earnings',
  'New Study Reveals Surprising Health Benefits',
  'Global Markets React to Economic Policy Changes',
  'Innovative Startup Disrupts Traditional Industry',
  'Climate Summit Reaches Historic Agreement',
  'Sports Championship Ends in Dramatic Fashion',
  'Cultural Event Draws Record Attendance',
  'Political Leaders Announce New Partnership',
  'Scientific Breakthrough Opens New Possibilities',
];

const CATEGORIES = [
  'Technology',
  'Science',
  'Health',
  'Business',
  'Politics',
  'Sports',
  'Entertainment',
  'World',
  'Local',
  'Opinion',
];

const IMAGES = [
  'https://picsum.photos/800/600',
  'https://picsum.photos/640/480',
  'https://picsum.photos/1200/630',
  'https://source.unsplash.com/random/800x600',
  'https://source.unsplash.com/random/640x480',
];

const VIDEOS = [
  'https://example.com/videos/sample1.mp4',
  'https://example.com/videos/sample2.mp4',
];

export class FeedGenerator {
  private state = {
    items: [] as GeneratedItem[],
    lastUpdate: 0,
    updateCount: 0,
  };

  private updateTimer?: Timer;

  constructor(
    private config: FeedConfig,
    private onConfigChange: (cb: (config: FeedConfig) => void) => () => void,
  ) {
    this.regenerate();
    onConfigChange((newConfig) => {
      this.config = newConfig;
      this.regenerate();
      this.setupAutoUpdate();
    });
    this.setupAutoUpdate();
  }

  private setupAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    if (this.config.updateIntervalMs > 0) {
      this.updateTimer = setInterval(() => {
        this.regenerate();
      }, this.config.updateIntervalMs);
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private pickRandom<T>(arr: T[]): T {
    if (arr.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = Math.floor(Math.random() * arr.length);
    return arr[index]!;
  }

  /** Fisher–Yates shuffle (unbiased); mutates a copy of arr. */
  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }

  private pickRandomN<T>(arr: T[], min: number, max: number): T[] {
    const count = this.randomInt(min, Math.min(max, arr.length));
    const copy = [...arr];
    this.shuffleInPlace(copy);
    return copy.slice(0, count);
  }

  /** Short alphanumeric token for title/link uniqueness across regenerations. */
  private randomTitleSalt(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private generateLorem(minWords: number, maxWords: number): string {
    const count = this.randomInt(minWords, maxWords);
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(this.pickRandom(LOREM_WORDS));
    }
    // Capitalize first letter
    if (words.length > 0) {
      const firstWord = words[0];
      if (firstWord && firstWord.length > 0) {
        words[0] = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
      }
    }
    return words.join(' ') + '.';
  }

  private shouldIncludeField(
    field:
      | 'title'
      | 'summary'
      | 'content'
      | 'link'
      | 'imageUrl'
      | 'author'
      | 'publishedAt'
      | 'guid'
      | 'lastModifiedAt'
      | 'categories',
  ): boolean {
    const presenceKey = `${field}Presence` as keyof FeedConfig['fieldBehavior'];
    const presence = this.config.fieldBehavior[presenceKey] as number;
    return Math.random() < presence;
  }

  private generateItemId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateMedia(
    options: FeedConfig['contentOptions'],
  ): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    if (options.includeImages) {
      const imageCount = this.randomInt(
        options.imageCount.min,
        options.imageCount.max,
      );
      for (let i = 0; i < imageCount; i++) {
        const base = this.pickRandom(IMAGES);
        const url = `${base}?random=${this.generateItemId()}`;
        media.push({
          originalUrl: url,
          originalType: 'image',
          originalMimeType: 'image/jpeg',
          isEmbedded: i > 0,
        });
      }
    }

    if (options.includeVideos && Math.random() > 0.7) {
      media.push({
        originalUrl: this.pickRandom(VIDEOS),
        originalType: 'video',
        originalMimeType: 'video/mp4',
        isEmbedded: true,
      });
    }

    return media;
  }

  private generateContent(
    options: FeedConfig['contentOptions'],
    media: ExtractedMedia[],
  ): string {
    const paragraphs = this.randomInt(3, 7);
    const content: string[] = [];

    for (let i = 0; i < paragraphs; i++) {
      const length = this.randomInt(
        options.contentLength.min / paragraphs,
        options.contentLength.max / paragraphs,
      );
      const wordCount = Math.floor(length / 6); // Approximate words
      content.push(`<p>${this.generateLorem(wordCount, wordCount * 2)}</p>`);
    }

    // Insert images into content
    if (options.htmlInContent && media.length > 0) {
      const images = media.filter((m) => m.originalType === 'image');
      for (let i = 0; i < Math.min(2, images.length); i++) {
        const image = images[i];
        if (image) {
          const insertAt = this.randomInt(0, content.length);
          content.splice(
            insertAt,
            0,
            `<img src="${image.originalUrl}" alt="Image ${i + 1}" />`,
          );
        }
      }
    }

    return content.join('\n');
  }

  private generateItem(source?: string): GeneratedItem {
    const { contentOptions, fieldBehavior } = this.config;

    // Check for forced empty fields
    const forceEmpty = new Set(fieldBehavior.forceEmptyFields);
    const forceInvalid = new Set(fieldBehavior.forceInvalidValues);

    const now = Date.now();
    const dateRange = contentOptions.dateRangeDays * 24 * 60 * 60 * 1000;

    let publishedAt: Date;
    let lastModifiedAt: Date;

    if (contentOptions.useCurrentDate) {
      const t = new Date();
      publishedAt = t;
      lastModifiedAt = t;
    } else if (contentOptions.useRealisticDates) {
      publishedAt = new Date(now - Math.random() * dateRange);
      lastModifiedAt =
        Math.random() > 0.5
          ? new Date(publishedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
          : publishedAt;
    } else {
      publishedAt = new Date(now - Math.random() * dateRange);
      lastModifiedAt = publishedAt;
    }

    const media = this.generateMedia(contentOptions);
    const guid = this.generateItemId();

    const item: GeneratedItem = {
      title: '',
      summary: '',
      content: '',
      link: '',
      imageUrl: '',
      author: '',
      publishedAt,
      guid,
      lastModifiedAt,
      categories: [],
      extractedMedia: media,
    };

    // Apply field presence logic
    if (!forceEmpty.has('title') && this.shouldIncludeField('title')) {
      const baseTitle = this.pickRandom(TITLES);
      const subtitle = this.generateLorem(3, 6).slice(0, -1);
      const salt = this.randomTitleSalt();
      item.title = `${source && source !== 'default' ? `[${source}] ` : ''}${baseTitle} - ${subtitle} · ${salt}`;
      if (forceInvalid.has('title')) {
        item.title = ''; // Force empty
      }
    }

    if (!forceEmpty.has('summary') && this.shouldIncludeField('summary')) {
      item.summary = this.generateLorem(
        Math.floor(contentOptions.summaryLength.min / 6),
        Math.floor(contentOptions.summaryLength.max / 6),
      );
    }

    if (!forceEmpty.has('content') && this.shouldIncludeField('content')) {
      item.content = this.generateContent(contentOptions, media);
    }

    if (!forceEmpty.has('link') && this.shouldIncludeField('link')) {
      item.link = `${this.config.link}/article/${guid}`;
      if (forceInvalid.has('link')) {
        item.link = 'not-a-valid-url';
      }
    }

    if (!forceEmpty.has('imageUrl') && this.shouldIncludeField('imageUrl')) {
      const images = media.filter((m) => m.originalType === 'image');
      if (images.length > 0 && images[0]) {
        item.imageUrl = images[0].originalUrl;
      }
      if (forceInvalid.has('imageUrl')) {
        item.imageUrl = 'not-a-valid-image-url';
      }
    }

    if (!forceEmpty.has('author') && this.shouldIncludeField('author')) {
      item.author = this.pickRandom(contentOptions.authorPatterns);
    }

    if (
      !forceEmpty.has('categories') &&
      this.shouldIncludeField('categories')
    ) {
      item.categories = this.pickRandomN(
        CATEGORIES,
        contentOptions.categoryCount.min,
        contentOptions.categoryCount.max,
      );
    }

    // Handle dates
    if (forceEmpty.has('publishedAt')) {
      item.publishedAt = new Date('invalid');
    }
    if (forceEmpty.has('lastModifiedAt')) {
      item.lastModifiedAt = new Date('invalid');
    }

    return item;
  }

  regenerate(): void {
    const items = Array.from({ length: this.config.itemCount }, () =>
      this.generateItem(),
    );
    this.shuffleInPlace(items);
    this.state.items = items;
    this.state.lastUpdate = Date.now();
    this.state.updateCount++;
    console.log(
      `[Generator] Regenerated ${this.state.items.length} items (update #${this.state.updateCount})`,
    );
  }

  getItems(source?: string): GeneratedItem[] {
    if (!source || source === 'default') {
      return this.state.items;
    }

    // Generate items specifically for this source
    return this.generateItemsForSource(source);
  }

  private generateItemsForSource(source: string): GeneratedItem[] {
    const items = Array.from({ length: this.config.itemCount }, () =>
      this.generateItem(source),
    );
    this.shuffleInPlace(items);
    return items;
  }

  getState() {
    return {
      ...this.state,
      itemCount: this.state.items.length,
    };
  }
}
