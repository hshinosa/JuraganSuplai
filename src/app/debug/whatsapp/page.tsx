'use client';

/**
 * Debug WhatsApp Page
 * Simulator for testing WhatsApp webhook and agent responses
 * For development/demo purposes only
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Phone,
  MapPin,
  Image,
  Loader2,
  Trash2,
  RefreshCw,
  Settings,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  type: 'text' | 'location' | 'image';
  metadata?: {
    lat?: number;
    lng?: number;
    imageUrl?: string;
  };
}

// Predefined test messages
const quickMessages = [
  { label: 'Supplier: SANGGUP', value: 'SANGGUP KIRIM' },
  { label: 'Supplier: TIDAK', value: 'TIDAK' },
  { label: 'Kurir: AMBIL', value: 'AMBIL' },
  { label: 'Kurir: BATAL', value: 'DARURAT BATAL' },
  { label: 'Onboarding: SUPPLIER', value: 'SUPPLIER' },
  { label: 'Onboarding: KURIR', value: 'KURIR' },
  { label: 'Cek Saldo', value: 'Cek saldo saya' },
  { label: 'Order Aktif', value: 'Ada order aktif?' },
];

// Simulated phone numbers for testing
const testPhones = [
  { label: 'Supplier Demo 1', value: '6281234567001', role: 'supplier' },
  { label: 'Supplier Demo 2', value: '6281234567002', role: 'supplier' },
  { label: 'Kurir Demo 1', value: '6281234567101', role: 'courier' },
  { label: 'Kurir Demo 2', value: '6281234567102', role: 'courier' },
  { label: 'New User', value: '6289999999999', role: 'new' },
];

export default function DebugWhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedPhone, setSelectedPhone] = useState(testPhones[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message to webhook
  const sendMessage = async (content: string, type: 'text' | 'location' | 'image' = 'text', metadata?: Message['metadata']) => {
    if (!content.trim() && type === 'text') return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: new Date(),
      type,
      metadata,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call webhook API
      const response = await fetch('/api/webhooks/fonnte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Fonnte webhook format
          sender: selectedPhone,
          message: content,
          type: type === 'location' ? 'location' : type === 'image' ? 'image' : 'text',
          ...(metadata?.lat && { latitude: metadata.lat }),
          ...(metadata?.lng && { longitude: metadata.lng }),
          ...(metadata?.imageUrl && { url: metadata.imageUrl }),
        }),
      });

      const data = await response.json();

      // Add bot response
      if (data.reply) {
        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          content: data.reply,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages((prev) => [...prev, botMessage]);
      } else if (data.message) {
        // Fallback to message field
        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          content: data.message,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Gagal mengirim pesan');
      
      // Add error message
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        sender: 'bot',
        content: '❌ Error: Gagal memproses pesan. Cek console untuk detail.',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send location
  const sendLocation = () => {
    // Jakarta coordinates with some randomness
    const lat = -6.2 + (Math.random() * 0.1 - 0.05);
    const lng = 106.8 + (Math.random() * 0.1 - 0.05);
    
    sendMessage(
      `📍 Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      'location',
      { lat, lng }
    );
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    toast.success('Pesan dibersihkan');
  };

  // Get phone info
  const getCurrentPhoneInfo = () => {
    return testPhones.find((p) => p.value === selectedPhone);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-emerald-600 text-white py-4 px-4 sticky top-0 z-10">
        <div className="container mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">WhatsApp Simulator</h1>
              <p className="text-sm text-emerald-100">Debug & Testing Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="text-white hover:bg-white/20"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="m-4 bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Nomor Test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedPhone} onValueChange={setSelectedPhone}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {testPhones.map((phone) => (
                        <SelectItem key={phone.value} value={phone.value}>
                          <div className="flex items-center gap-2">
                            <span>{phone.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {phone.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-2">
                    Phone: {selectedPhone}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Messages */}
        <div className="px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {quickMessages.map((msg) => (
              <Button
                key={msg.value}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(msg.value)}
                disabled={isLoading}
                className="whitespace-nowrap bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                {msg.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col h-[calc(100vh-250px)]">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">
                    Mulai kirim pesan untuk test webhook
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Pilih nomor test dan gunakan quick messages di atas
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-slate-700 text-slate-100 rounded-bl-none'
                        }`}
                      >
                        {/* Message Type Icon */}
                        {message.type === 'location' && (
                          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                            <MapPin className="w-3 h-3" />
                            <span>Location</span>
                          </div>
                        )}
                        {message.type === 'image' && (
                          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                            <Image className="w-3 h-3" />
                            <span>Image</span>
                          </div>
                        )}
                        
                        {/* Message Content */}
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        
                        {/* Timestamp */}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          message.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                        }`}>
                          <span>
                            {message.timestamp.toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {message.sender === 'user' && (
                            <CheckCheck className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-700 rounded-lg px-4 py-3 rounded-bl-none">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Sistem sedang memproses...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={sendLocation}
                disabled={isLoading}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                title="Kirim Lokasi"
              >
                <MapPin className="w-5 h-5" />
              </Button>
              
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(inputMessage);
                  }
                }}
                placeholder="Ketik pesan..."
                disabled={isLoading}
                className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              
              <Button
                onClick={() => sendMessage(inputMessage)}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            {/* Current Phone Info */}
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{getCurrentPhoneInfo()?.label}</span>
                <Badge variant="outline" className="text-xs ml-1">
                  {getCurrentPhoneInfo()?.role}
                </Badge>
              </div>
              <span>{selectedPhone}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
