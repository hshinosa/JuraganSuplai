'use client';

/**
 * Agent Log Console Component
 * Real-time display of AI agent thinking and actions
 */

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Activity, Loader2, CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { AgentLog } from '@/types/database';

interface AgentLogEntry {
  id: string;
  timestamp: Date;
  type: 'thought' | 'action' | 'observation' | 'result';
  content: string;
  status?: 'pending' | 'success' | 'error';
}

interface AgentLogConsoleProps {
  orderId?: string;
  className?: string;
  maxEntries?: number;
  maxHeight?: string;
}

export function AgentLogConsole({ 
  orderId, 
  className = '',
  maxEntries = 50,
  maxHeight = '400px'
}: AgentLogConsoleProps) {
  const [entries, setEntries] = useState<AgentLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load initial logs
  useEffect(() => {
    async function loadLogs() {
      const query = supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(maxEntries);
      
      if (orderId) {
        query.eq('order_id', orderId);
      }
      
      const { data } = await query;
      
      if (data) {
        const formattedEntries: AgentLogEntry[] = [];
        
        data.forEach((log: AgentLog) => {
          if (log.thought) {
            formattedEntries.push({
              id: `${log.id}-thought`,
              timestamp: new Date(log.created_at),
              type: 'thought',
              content: log.thought,
              status: 'success',
            });
          }
          if (log.action) {
            formattedEntries.push({
              id: `${log.id}-action`,
              timestamp: new Date(log.created_at),
              type: 'action',
              content: `${log.action}(${JSON.stringify(log.action_input || {}).substring(0, 50)}...)`,
              status: 'success',
            });
          }
          if (log.observation) {
            formattedEntries.push({
              id: `${log.id}-observation`,
              timestamp: new Date(log.created_at),
              type: 'observation',
              content: log.observation.substring(0, 200),
              status: 'success',
            });
          }
        });
        
        setEntries(formattedEntries);
      }
    }
    
    loadLogs();
  }, [orderId, supabase, maxEntries]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('agent-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_logs',
          ...(orderId ? { filter: `order_id=eq.${orderId}` } : {}),
        },
        (payload) => {
          const log = payload.new as AgentLog;
          const newEntries: AgentLogEntry[] = [];
          
          if (log.thought) {
            newEntries.push({
              id: `${log.id}-thought`,
              timestamp: new Date(log.created_at),
              type: 'thought',
              content: log.thought,
              status: 'success',
            });
          }
          if (log.action) {
            newEntries.push({
              id: `${log.id}-action`,
              timestamp: new Date(log.created_at),
              type: 'action',
              content: `${log.action}(...)`,
              status: 'pending',
            });
          }
          
          setEntries(prev => [...prev.slice(-maxEntries + newEntries.length), ...newEntries]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase, maxEntries]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getIcon = (type: AgentLogEntry['type'], status?: string) => {
    if (status === 'pending') {
      return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
    }
    if (status === 'error') {
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
    
    switch (type) {
      case 'thought':
        return <Server className="h-4 w-4 text-blue-400" />;
      case 'action':
        return <Activity className="h-4 w-4 text-purple-400" />;
      case 'observation':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <Terminal className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: AgentLogEntry['type']) => {
    switch (type) {
      case 'thought':
        return 'SYSTEM';
      case 'action':
        return 'PROCESS';
      case 'observation':
        return 'STATUS';
      default:
        return 'LOG';
    }
  };

  return (
    <div className={`bg-slate-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">System Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-400">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="h-[400px]" ref={scrollRef}>
        <div className="p-4 space-y-2 font-mono text-sm">
          {entries.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Menunggu aktivitas sistem...</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2"
                >
                  {getIcon(entry.type, entry.status)}
                  <span className={`text-xs font-bold ${
                    entry.type === 'thought' ? 'text-blue-400' :
                    entry.type === 'action' ? 'text-purple-400' :
                    'text-emerald-400'
                  }`}>
                    [{getTypeLabel(entry.type)}]
                  </span>
                  <span className="text-slate-300 flex-1 break-words">
                    {entry.content}
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {entry.timestamp.toLocaleTimeString('id-ID', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit' 
                    })}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default AgentLogConsole;
