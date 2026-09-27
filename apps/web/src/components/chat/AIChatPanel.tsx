"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Check, X, Loader2, Sparkles, Zap,
  RotateCcw, AlertTriangle, TrendingDown, MapPin, Clock,
  ChevronDown, Lightbulb
} from 'lucide-react';
import type { ChatMessage } from '@yatrasarthi/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIChatPanelProps {
  tripId?: string;
  mode?: 'planning' | 'recovery' | 'general';
  tripName?: string;
  onClose?: () => void;
}

// ── Demo-ready pre-drafted prompts ───────────────────────────────────────────
// These are realistic prompts that demonstrate YatraSarthi's capabilities.

const DEMO_PROMPTS: Record<string, { icon: React.ReactNode; label: string; prompt: string }[]> = {
  general: [
    { icon: <MapPin size={12} />, label: 'Plan Goa trip', prompt: 'Plan a 4-day Goa trip for 5 friends from Nov 14 to Nov 17. We want beach stay, Dudhsagar Falls day trip, Old Goa sightseeing, and return flight from Dabolim.' },
    { icon: <Zap size={12} />, label: 'Flight delayed?', prompt: 'My IndiGo flight from Mumbai to Goa is delayed by 3 hours. What recovery options do I have and what is my DGCA compensation?' },
    { icon: <AlertTriangle size={12} />, label: 'Disruption impact', prompt: 'My Pune to Mumbai train got cancelled. Show me the full downstream impact on my Goa trip and suggest the fastest alternative.' },
    { icon: <Lightbulb size={12} />, label: 'Group split-cost', prompt: 'We are 5 friends sharing a ₹12,000 hotel and ₹8,000 cab. Calculate the per-person split and suggest how to track it.' },
  ],
  planning: [
    { icon: <MapPin size={12} />, label: 'Add Dudhsagar stop', prompt: 'Add a Dudhsagar Falls day-trip node between our Panjim hotel check-in and Old Goa sightseeing leg.' },
    { icon: <Clock size={12} />, label: 'Push checkout by 1 day', prompt: 'What if I extend my Goa hotel checkout from Nov 17 to Nov 18? Show me which downstream nodes break or go at-risk.' },
    { icon: <TrendingDown size={12} />, label: 'Simulate train delay', prompt: 'Simulate a 3-hour delay on the Mumbai-Pune train leg and show the full cascade impact on my itinerary.' },
    { icon: <Lightbulb size={12} />, label: 'Optimise sequence', prompt: 'Can you optimise the order of my trip nodes to minimise travel time between stops?' },
  ],
  recovery: [
    { icon: <Zap size={12} />, label: 'Fastest alternative', prompt: 'My IndiGo 6E-254 Mumbai-Goa flight is cancelled. Find the fastest alternative flight or route to reach Goa today.' },
    { icon: <Check size={12} />, label: 'Cheapest fix', prompt: 'What is the cheapest recovery plan for my cancelled Mumbai-Goa flight? Include DGCA compensation I can claim.' },
    { icon: <AlertTriangle size={12} />, label: 'Full impact chain', prompt: 'Show me the complete downstream cascade — which hotel check-ins, cab bookings, and activities are now broken because of my flight cancellation.' },
    { icon: <RotateCcw size={12} />, label: 'Preserve most bookings', prompt: 'I want to preserve as many existing bookings as possible. Which recovery plan keeps the most of my itinerary intact?' },
  ],
};

// ── Typing dots indicator ─────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: '#C5D82D',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onToolConfirm,
}: {
  msg: ChatMessage & { toolCalls?: any[] };
  onToolConfirm: (msgId: string, tcId: string, confirmed: boolean) => void;
}) {
  const isUser = msg.role === 'user';
  const isTool = msg.role === 'tool';

  if (isTool) {
    let parsed: any = null;
    try { parsed = JSON.parse(msg.content); } catch { parsed = msg.content; }
    return (
      <div className="flex items-start gap-2 px-1">
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: '#4E8752' }}>
          <Check size={10} color="#fff" />
        </div>
        <div className="text-xs px-3 py-2 rounded-xl flex-1" style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>
          <div className="font-bold mb-1">Tool executed</div>
          <pre className="overflow-x-auto whitespace-pre-wrap">{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Role label */}
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-1 ${isUser ? 'flex-row-reverse' : ''}`}
        style={{ color: '#5F665B' }}>
        <div className={`w-4 h-4 rounded-full flex items-center justify-center`}
          style={{ background: isUser ? '#DCE8D2' : '#172017' }}>
          {isUser ? <User size={9} color="#172017" /> : <Bot size={9} color="#C5D82D" />}
        </div>
        {isUser ? 'You' : 'YatraSarthi AI'}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[90%] px-4 py-3 text-sm leading-relaxed`}
        style={{
          background: isUser ? 'linear-gradient(135deg, #DCE8D2, #C8DDB8)' : '#ffffff',
          color: '#172017',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          border: isUser ? 'none' : '1px solid #E8E8E0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflowX: 'auto',
        }}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <div className="markdown-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 pl-4 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3 mt-2 rounded-xl border border-[#E8E8E0]">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="bg-[#F8F7F2] p-2.5 font-bold border-b border-[#E8E8E0]">{children}</th>,
                td: ({ children }) => <td className="p-2.5 border-b border-[#E8E8E0] last:border-0 align-top">{children}</td>,
                strong: ({ children }) => <strong className="font-bold text-[#172017]">{children}</strong>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Tool call cards */}
      {msg.toolCalls && msg.toolCalls.map((tc: any) => (
        <div key={tc.id} className="max-w-[92%] w-full">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #EFD090', background: '#FFFDE7' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#FDF6D8', borderBottom: '1px solid #EFD090' }}>
              <Sparkles size={13} color="#B06000" />
              <span className="text-xs font-bold" style={{ color: '#B06000' }}>Action: {tc.name}</span>
            </div>
            <div className="px-4 py-3">
              <pre className="text-[10px] leading-relaxed overflow-x-auto rounded-lg p-2"
                style={{ background: '#fff', border: '1px solid #E8E4D0', color: '#5F665B' }}>
                {JSON.stringify(tc.arguments, null, 2)}
              </pre>
            </div>
            {tc.confirmed === undefined ? (
              <div className="flex gap-2 px-4 pb-3">
                <button
                  onClick={() => onToolConfirm(msg.id, tc.id, true)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: '#172017', color: '#C5D82D' }}
                >
                  <Check size={12} /> Confirm & Apply
                </button>
                <button
                  onClick={() => onToolConfirm(msg.id, tc.id, false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: '#fff', color: '#5F665B', border: '1px solid #D5D9CC' }}
                >
                  <X size={12} /> Reject
                </button>
              </div>
            ) : (
              <div className="px-4 pb-3">
                <div className="text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1"
                  style={{
                    background: tc.confirmed ? '#E8F5E9' : '#FDECEA',
                    color: tc.confirmed ? '#2E7D32' : '#D93829',
                  }}>
                  {tc.confirmed ? <><Check size={11} /> Applied</> : <><X size={11} /> Rejected</>}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AIChatPanel({ tripId, mode = 'general', tripName, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<(ChatMessage & { toolCalls?: any[] })[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chips = DEMO_PROMPTS[mode] ?? DEMO_PROMPTS.general;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 80);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMsg: ChatMessage & { toolCalls?: any[] } = {
      id: Date.now().toString(),
      sessionId: `session-${tripId ?? 'general'}`,
      role: 'user',
      content,
      ts: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: tripId ?? null,
          mode,
          messages: [...messages, userMsg],
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      } else if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sessionId: userMsg.sessionId,
          role: 'assistant',
          content: `Sorry, I ran into an issue: ${data.error.message ?? 'Unknown error'}`,
          ts: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sessionId: userMsg.sessionId,
        role: 'assistant',
        content: 'Connection error. Please try again.',
        ts: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, tripId, mode]);

  const handleToolConfirm = async (messageId: string, toolCallId: string, confirmed: boolean) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.toolCalls) {
        return { ...m, toolCalls: m.toolCalls.map((tc: any) => tc.id === toolCallId ? { ...tc, confirmed } : tc) };
      }
      return m;
    }));

    if (!confirmed) return;

    const msg = messages.find(m => m.id === messageId);
    const toolCall = msg?.toolCalls?.find((tc: any) => tc.id === toolCallId);
    if (!toolCall) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/chat/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, toolCall }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sessionId: 'session-1',
        role: 'tool',
        content: JSON.stringify(data.result ?? data),
        ts: new Date().toISOString(),
      }]);
    } catch {
      /* silently skip */
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const modeColors = {
    planning: { accent: '#4A90D9', bg: '#EAF3FB', label: 'Trip Planner' },
    recovery: { accent: '#D93829', bg: '#FDECEA', label: 'Recovery Assistant' },
    general:  { accent: '#172017', bg: '#DCE8D2', label: 'AI Assistant' },
  };
  const mc = modeColors[mode];

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{ background: '#172017', borderBottom: '1px solid #2A3A2A' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#C5D82D' }}>
          <Sparkles size={18} color="#172017" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-white leading-tight">YatraSarthi AI</div>
          <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: '#C5D82D' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5D82D] animate-pulse inline-block" />
            {mc.label}{tripName ? ` · ${tripName}` : ''}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: '#8A9A8A' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
        style={{ background: '#F8F7F2' }}
      >
        {/* Empty state with pre-drafted demo prompts */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-4 pb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #172017, #2A3A2A)' }}>
              <Sparkles size={28} color="#C5D82D" />
            </div>
            <div className="text-center">
              <div className="font-bold text-base" style={{ color: '#172017' }}>How can I help?</div>
              <div className="text-xs mt-1 leading-relaxed" style={{ color: '#5F665B' }}>
                {mode === 'recovery'
                  ? 'Your trip hit a disruption. Ask me to find alternatives or apply a recovery plan.'
                  : mode === 'planning'
                  ? 'Ask me to build or modify your itinerary, add stops, or run what-if simulations.'
                  : 'Ask about planning, disruptions, or tap a suggestion below to get started.'}
              </div>
            </div>
            {/* Pre-drafted demo prompts as clickable cards */}
            <div className="flex flex-col gap-2 w-full">
              {chips.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.prompt)}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: '#fff', border: '1px solid #E0DDD4', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <span className="mt-0.5 flex-shrink-0" style={{ color: mc.accent }}>{chip.icon}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: '#172017' }}>{chip.label}</div>
                    <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5F665B' }}>
                      {chip.prompt.length > 90 ? chip.prompt.slice(0, 88) + '…' : chip.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onToolConfirm={handleToolConfirm} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#172017' }}>
              <Bot size={9} color="#C5D82D" />
            </div>
            <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E8E8E0', borderRadius: '18px 18px 18px 4px' }}>
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all"
          style={{ background: '#172017', color: '#C5D82D' }}>
          <ChevronDown size={16} />
        </button>
      )}

      {/* ── Input area ── */}
      <div className="flex-shrink-0 px-4 py-3" style={{ background: '#fff', borderTop: '1px solid #E8E4D0' }}>
        {/* Quick chips (compact row after first message) */}
        {messages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {chips.slice(0, 3).map(chip => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.prompt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80"
                style={{ background: '#F5F2E8', color: '#5F665B', border: '1px solid #D5D9CC' }}
              >
                {chip.icon}{chip.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'recovery' ? 'Ask about recovery options…' : 'Ask anything about your trip…'}
            disabled={isLoading}
            className="flex-1 resize-none px-4 py-2.5 text-sm rounded-2xl outline-none transition-all"
            style={{
              background: '#F5F2E8',
              border: '1.5px solid #D5D9CC',
              color: '#172017',
              minHeight: '42px',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{ background: '#172017', color: '#C5D82D' }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="text-[9px] text-center mt-2" style={{ color: '#9AA09A' }}>
          AI responses are suggestions. Always confirm before applying changes.
        </div>
      </div>
    </div>
  );
}
