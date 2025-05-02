declare namespace NodeJS {
  interface ProcessEnv {
    GROK_API_URL: string;
    GROK_API_KEY: string;
    DATABASE_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
} 