/**
 * Groq AI Agent Executor
 * ReAct Pattern: Reasoning + Acting loop
 */

import { SYSTEM_PROMPT } from './prompts';
import { createAdminClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

const MAX_ITERATIONS = 10;

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentResponse {
  thought: string;
  action: string;
  action_input: Record<string, unknown> | string;
}

export interface ExecutorResult {
  success: boolean;
  response: string;
  logs: AgentLog[];
}

export interface AgentLog {
  iteration: number;
  thought: string;
  action: string;
  action_input: unknown;
  observation?: string;
}

/**
 * Tool registry - maps tool names to their implementations
 */
type ToolImplementation = (input: Record<string, unknown>) => Promise<string>;

const toolRegistry: Record<string, ToolImplementation> = {};

export function registerTool(name: string, implementation: ToolImplementation) {
  toolRegistry[name] = implementation;
}

/**
 * Call Groq AI API
 * Using Groq's OpenAI-compatible chat completions endpoint
 */
async function callGroqAPI(messages: AgentMessage[]): Promise<AgentResponse> {
  const apiKey = process.env.GROQ_API_KEY!;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role, // Groq doesn't support tool role, use user
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Groq API returned empty response');
  }
  
  // Parse JSON response - handle markdown wrapping
  return parseAgentResponse(content);
}

/**
 * Parse agent response - handles JSON wrapped in markdown
 */
function parseAgentResponse(content: string): AgentResponse {
  try {
    // Try direct JSON parse first
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try finding JSON object in the content
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    
    // Fallback - treat as final answer
    return {
      thought: 'Could not parse response as JSON',
      action: 'final_answer',
      action_input: content,
    };
  }
}

/**
 * Execute a tool and return observation
 */
async function executeTool(
  action: string, 
  actionInput: Record<string, unknown>
): Promise<string> {
  const tool = toolRegistry[action];
  
  if (!tool) {
    return `Error: Tool "${action}" not found. Available tools: ${Object.keys(toolRegistry).join(', ')}`;
  }
  
  try {
    return await tool(actionInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Error executing ${action}: ${message}`;
  }
}

/**
 * Save agent log to database
 */
async function saveAgentLog(
  orderId: string | null,
  log: AgentLog
): Promise<void> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('agent_logs') as any).insert({
    order_id: orderId,
    iteration: log.iteration,
    thought: log.thought,
    action: log.action,
    action_input: log.action_input as Json,
    observation: log.observation,
  });
}

/**
 * Main Agent Executor
 * Implements ReAct loop: Think → Act → Observe → Repeat
 */
export async function executeAgent(
  userMessage: string,
  conversationHistory: AgentMessage[] = [],
  context?: { 
    orderId?: string;
    userId?: string;
    phone?: string;
  }
): Promise<ExecutorResult> {
  const messages: AgentMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];
  
  const logs: AgentLog[] = [];
  
  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`[Agent] Iteration ${iteration}/${MAX_ITERATIONS}`);
    
    // Call Groq API
    let response: AgentResponse;
    try {
      response = await callGroqAPI(messages);
    } catch (error) {
      console.error('[Agent] API call failed:', error);
      return {
        success: false,
        response: 'Maaf, sistem sedang bermasalah. Silakan coba lagi.',
        logs,
      };
    }
    
    console.log(`[Agent] Thought: ${response.thought}`);
    console.log(`[Agent] Action: ${response.action}`);
    
    const log: AgentLog = {
      iteration,
      thought: response.thought,
      action: response.action,
      action_input: response.action_input,
    };
    
    // Check if this is the final answer
    if (response.action === 'final_answer') {
      const finalResponse = typeof response.action_input === 'string'
        ? response.action_input
        : JSON.stringify(response.action_input);
      
      logs.push(log);
      await saveAgentLog(context?.orderId || null, log);
      
      return {
        success: true,
        response: finalResponse,
        logs,
      };
    }
    
    // Execute the tool
    const actionInput = typeof response.action_input === 'object'
      ? response.action_input as Record<string, unknown>
      : { input: response.action_input };
    
    const observation = await executeTool(response.action, actionInput);
    log.observation = observation;
    
    logs.push(log);
    await saveAgentLog(context?.orderId || null, log);
    
    console.log(`[Agent] Observation: ${observation.substring(0, 200)}...`);
    
    // Add assistant message and observation to history
    messages.push({
      role: 'assistant',
      content: JSON.stringify(response),
    });
    
    messages.push({
      role: 'tool',
      content: `Observation from ${response.action}: ${observation}`,
      tool_call_id: `${response.action}_${iteration}`,
    });
  }
  
  // Max iterations reached
  console.warn('[Agent] Max iterations reached');
  return {
    success: false,
    response: 'Maaf, saya perlu waktu lebih untuk memproses ini. Mohon coba lagi.',
    logs,
  };
}

/**
 * Mock Groq API for development/testing
 */
export async function executeAgentMock(
  userMessage: string,
  _conversationHistory: AgentMessage[] = [],
  _context?: { orderId?: string; userId?: string; phone?: string; }
): Promise<ExecutorResult> {
  console.log('[Agent Mock] Processing:', userMessage);
  
  // Simple pattern matching for demo
  const normalizedMessage = userMessage.toLowerCase();
  
  let response = 'Maaf, saya tidak mengerti. Bisa diulangi?';
  
  if (normalizedMessage.includes('bawang') || normalizedMessage.includes('cabe')) {
    response = 'Baik Pak/Bu, saya bantu carikan supplier. Mohon share lokasi Anda ya 📍';
  } else if (normalizedMessage.includes('sanggup')) {
    response = 'Terima kasih konfirmasinya! Pesanan akan diproses. Mohon tunggu pembayaran dari pembeli.';
  } else if (normalizedMessage.includes('tidak')) {
    response = 'Baik, terima kasih responnya. Kami akan mencari supplier lain.';
  } else if (normalizedMessage.includes('ambil')) {
    response = 'Siap! Job sudah Anda terima. Segera menuju lokasi pickup.';
  }
  
  return {
    success: true,
    response,
    logs: [{
      iteration: 1,
      thought: 'Mock response for development',
      action: 'final_answer',
      action_input: response,
    }],
  };
}

// Export the appropriate executor based on environment
export const runAgent = process.env.NODE_ENV === 'development' && !process.env.GROQ_API_KEY
  ? executeAgentMock
  : executeAgent;
