export type FormState = {
  searchLocation: 'folder' | 'file' | 'both';
  searchString: string;
  matchType: 'exact' | 'contains' | 'regex';
  includedExtensions: string[];
  excludedExtensions: string[];
  maxDaysAgo: number | null;
  maxFileSize: number | null;
  minFileSize: number | null;
  ignoredDirectories: string[];
  excludedFolders: string[];
  caseSensitivity: 'sensitive' | 'insensitive' | 'smart';
  searchOptions: {
    hidden: boolean;
    binary: boolean;
    followSymlinks: boolean;
    multiline: boolean;
    wordMatch: boolean;
    invertMatch: boolean;
  };
  context: {
    before: number;
    after: number;
    lines: number;
  };
};
