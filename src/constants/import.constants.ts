/**
 * Import configuration constants for bulk operations
 * Optimized for 10,000+ question imports
 */

// File upload limits
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Parsing configuration
export const PARSE_CHUNK_SIZE = 500; // Process 500 rows at a time to yield to browser
export const PARSE_YIELD_DELAY_MS = 0; // Minimal delay between chunks

// Import batch configuration
export const IMPORT_BATCH_SIZE = 50; // Questions per batch (increased from 15)
export const CONCURRENT_BATCHES = 1; // Process batches sequentially for stability
export const BATCH_YIELD_DELAY_MS = 5; // Delay between batches to prevent UI freeze

// Tree preview configuration
export const QUESTIONS_PER_SPECIALITY_PAGE = 50; // Paginate questions within speciality nodes
export const TREE_EXPAND_LEVELS_DEFAULT = 2; // Default expansion depth

// Virtual table configuration
export const VIRTUAL_ROW_HEIGHT = 52;
export const VIRTUAL_OVERSCAN = 10;

// Progress update configuration
export const PROGRESS_UPDATE_INTERVAL = 10; // Update progress every N questions
