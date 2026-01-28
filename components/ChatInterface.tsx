import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, History, Bot } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isOpen,
  onToggle
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 md:right-10 w-[90vw] md:w-[400px] h-[600px] max-h-[70vh] flex flex-col z-40 animate-fade-in-up origin-bottom-right">

      {/* Main Container with Apple-style Glassmorphism */}
      <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden ring-1 ring-black/5">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100/50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <Sparkles size={16} className="text-indigo-600" />
            </div>
            <div>
                <h3 className="font-bold text-zinc-900 text-sm leading-tight">Planner AI</h3>
                <p className="text-[10px] font-medium text-zinc-500">Always active</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
              <Bot size={40} className="text-zinc-300 mb-4" strokeWidth={1.5} />
              <p className="text-sm text-zinc-500 font-medium mb-6">How can I help tweak your plan?</p>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={() => onSendMessage("Make lunches simpler")} className="text-xs bg-white border border-zinc-200 py-3 px-4 rounded-xl text-zinc-600 hover:bg-zinc-50 hover:scale-[1.02] transition-all text-left">
                    "Make lunches simpler"
                </button>
                <button onClick={() => onSendMessage("Swap Tue dinner for tacos")} className="text-xs bg-white border border-zinc-200 py-3 px-4 rounded-xl text-zinc-600 hover:bg-zinc-50 hover:scale-[1.02] transition-all text-left">
                    "Swap Tue dinner for tacos"
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-5 py-3 text-[14px] leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-white border border-zinc-100 text-zinc-800 rounded-2xl rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>

              {/* Context Label for Assistant Actions */}
              {msg.relatedAction && (
                <div className="mt-1.5 ml-2 flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                   <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{msg.relatedAction}</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-white border border-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-zinc-100">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-zinc-100/70 rounded-[24px] border border-zinc-200/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a request..."
              className="w-full bg-transparent border-none py-3.5 pl-5 pr-12 text-sm text-zinc-800 placeholder-zinc-400 focus:ring-0"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-0 transition-all shadow-md transform active:scale-90"
            >
              <Send size={16} fill="currentColor" strokeWidth={2.5} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ChatInterface;
