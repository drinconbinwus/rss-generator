export type ContentSourceFormat =
  | 'RSS'
  | 'RSS_091'
  | 'RSS_092'
  | 'ATOM'
  | 'JSON'
  | 'XML'
  | 'NEWSML'
  | 'NEWSML_G2'
  | 'NITF';

export interface FeedConfig {
  // Feed metadata
  title: string;
  description: string;
  link: string;
  language: string;

  // Item generation
  itemCount: number;
  updateIntervalMs: number;
  /** When true, any config change triggers a full item regeneration. When false, only POST /api/regenerate (and first config bootstrap) replaces items. */
  regenerateOnConfigChange: boolean;

  // Content generation
  contentOptions: ContentOptions;

  // Field behavior
  fieldBehavior: FieldBehavior;

  // Active format
  format: ContentSourceFormat;

  // Endpoints
  endpoints: EndpointConfig[];
}

export interface ContentOptions {
  titleLength: { min: number; max: number };
  contentLength: { min: number; max: number };
  summaryLength: { min: number; max: number };
  includeImages: boolean;
  imageCount: { min: number; max: number };
  includeVideos: boolean;
  includeCategories: boolean;
  categoryCount: { min: number; max: number };
  authorPatterns: string[];
  /** When true, publishedAt and lastModifiedAt are set to the time of generation. */
  useCurrentDate: boolean;
  useRealisticDates: boolean;
  dateRangeDays: number;
  includeEmbeds: boolean;
  htmlInContent: boolean;
}

export interface FieldBehavior {
  // Probability of field being present (0-1)
  titlePresence: number;
  summaryPresence: number;
  contentPresence: number;
  linkPresence: number;
  imageUrlPresence: number;
  authorPresence: number;
  publishedAtPresence: number;
  guidPresence: number;
  lastModifiedAtPresence: number;
  categoriesPresence: number;

  // Force specific values for testing
  forceEmptyFields: string[];
  forceInvalidValues: string[];
}

export interface EndpointConfig {
  path: string;
  format: ContentSourceFormat;
  enabled: boolean;
}

export interface GeneratedItem {
  title: string;
  summary: string;
  content: string;
  link: string;
  imageUrl: string;
  author: string;
  publishedAt: Date;
  guid: string;
  lastModifiedAt: Date;
  categories: string[];
  extractedMedia: ExtractedMedia[];
}

/** PATCH body for an item; `guid` must not be used to change identity (rejected by API). */
export type ItemPatch = Partial<
  Omit<GeneratedItem, 'guid' | 'publishedAt' | 'lastModifiedAt'>
> & {
  publishedAt?: string | Date;
  lastModifiedAt?: string | Date;
};

export interface ExtractedMedia {
  originalUrl: string;
  originalType: 'image' | 'video' | 'audio';
  originalMimeType: string;
  isEmbedded: boolean;
}

export interface GeneratorState {
  items: GeneratedItem[];
  lastUpdate: number;
  updateCount: number;
}
