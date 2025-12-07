import { z } from 'zod';

/**
 * Environment variable schema with validation
 * Ensures all required env vars are present at runtime
 */
const envSchema = z.object({
  // Groq AI
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Fonnte WhatsApp
  FONNTE_TOKEN: z.string().min(1, 'FONNTE_TOKEN is required'),
  FONNTE_DEVICE_ID: z.string().optional(),
  
  // Google AI
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, 'GOOGLE_GENERATIVE_AI_API_KEY is required'),
  
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Admin
  ADMIN_SECRET_KEY: z.string().min(1).default('change-this-to-random-string'),
});

/**
 * Validated environment variables
 * Access via: env.GROQ_API_KEY etc.
 */
function getEnv() {
  // Only validate on server-side
  if (typeof window !== 'undefined') {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    } as z.infer<typeof envSchema>;
  }
  
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
}

export const env = getEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;
