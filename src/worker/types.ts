export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  ML_CLIENT_ID: string;
  ML_CLIENT_SECRET: string;
  ML_REDIRECT_URI: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: {
    userId?: number;
    companyId?: number;
  };
};
