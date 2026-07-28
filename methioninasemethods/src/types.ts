export type LogEntry = {
  id: string;
  name: string;
  amount: number;
  isEstimate: boolean;
  date: string;
};

export type LayoutMode = 'met-track' | 'search-focused' | 'quick-add' | 'compact' | 'search-first' | 'dashboard' | 'tabbed' | 'dense';

export type AppSettings = {
  medCheckCount: number;
  dailyLimit: number;
};
