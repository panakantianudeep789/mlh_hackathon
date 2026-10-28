import React, { useState, useRef, useEffect } from "react";
import {
  BotMessageSquare,
  Send,
  User,
  Sparkles,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ChatMessage, SourceEvidence, PageId } from "../types";
import { api } from "../services/api";

interface AIAssistantPageProps {
  repositoryId: string | null;
  selectedFile?: string | null;
  selectedLines?: number[];
  onOpenFileInExplorer: (file: string, lines?: number[]) => void;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  repositoryId,
  selectedFile,
  selectedLines,
  onOpenFileInExplorer,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am RepoPilot AI. Ask me anything about the active repository. I ground my answers in source code evidence and will cite specific file paths and line numbers.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !repositoryId || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const response = await api.sendChat({
        message: text,
        repository_id: repositoryId,
        conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
        selected_file: selectedFile || undefined,
        selected_lines: selectedLines || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        evidence: response.evidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err.message || "Failed to reach AI assistant."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    "Where is the average function implemented and what are its inputs?",
    "Why does average([]) fail with ZeroDivisionError?",
    "How is user configuration parsed and validated?",
    "What test suites are included in this project?",
  ];

  if (!repositoryId) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-mono">
        Please load or select a repository to chat with the AI assistant.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#090d16] max-w-5xl mx-auto w-full border-x border-[#1e293b]">
      {/* Chat Header Bar */}
      <div className="p-3.5 bg-[#0a0e17] border-b border-[#1e293b] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <BotMessageSquare className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Evidence-Grounded AI Assistant
            </h2>
            <p className="text-[11px] text-slate-400">
              Answers bounded strictly by active repository files
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: "Conversation history cleared. Ready for your next repository question.",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ])
          }
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#111827] transition text-xs flex items-center space-x-1"
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <BotMessageSquare className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-3xl ${isUser ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-xs"
                      : "bg-[#111827] border border-[#1e293b] text-slate-200 rounded-tl-xs shadow-md"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Evidence Citations Drawer */}
                {!isUser && msg.evidence && msg.evidence.length > 0 && (
                  <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl overflow-hidden text-xs">
                    <button
                      onClick={() => toggleEvidence(msg.id)}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0f172a] hover:bg-[#162238] transition text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-semibold text-[11px]">
                          Cited Source Evidence ({msg.evidence.length} snippets)
                        </span>
                      </div>
                      {expandedEvidence[msg.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {expandedEvidence[msg.id] && (
                      <div className="p-3 space-y-2.5 divide-y divide-[#1e293b]">
                        {msg.evidence.map((ev, idx) => (
                          <div key={idx} className="pt-2 first:pt-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => onOpenFileInExplorer(ev.file_path, [ev.start_line, ev.end_line])}
                                className="flex items-center space-x-1.5 text-blue-400 hover:underline font-mono text-[11px]"
                              >
                                <FileCode className="w-3 h-3" />
                                <span>{ev.file_path}:L{ev.start_line}-{ev.end_line}</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-sans">{ev.relevance_reason}</span>
                            </div>
                            <pre className="p-2 rounded bg-black/40 font-mono text-[11px] text-slate-300 overflow-x-auto">
                              {ev.snippet}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 px-1">{msg.timestamp}</div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center space-x-2 text-xs text-blue-400 animate-pulse pl-10 font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-ping"></span>
            <span>Grounding response in repository source code...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 border-t border-[#1e293b] bg-[#0c121e] flex flex-wrap gap-1.5 shrink-0">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#111827] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] transition truncate max-w-xs cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3.5 bg-[#0a0e17] border-t border-[#1e293b] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about functions, call paths, or failure conditions..."
            disabled={isSending}
            className="flex-1 bg-[#111827] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500/50"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shrink-0 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
