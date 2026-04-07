import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, Globe, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MIC_LANGUAGES = [
  { code: "ms-MY", short: "ms", label: "BM", flag: "🇲🇾", fullLabel: "Bahasa Malaysia" },
  { code: "en-US", short: "en", label: "EN", flag: "🇬🇧", fullLabel: "English" },
  { code: "zh-CN", short: "zh", label: "中文", flag: "🇨🇳", fullLabel: "中文 Chinese" },
  { code: "ta-IN", short: "ta", label: "தமிழ்", flag: "🇮🇳", fullLabel: "Tamil" },
  { code: "hi-IN", short: "hi", label: "हिन्दी", flag: "🇮🇳", fullLabel: "Hindi" },
  { code: "ja-JP", short: "ja", label: "日本語", flag: "🇯🇵", fullLabel: "Japanese" },
  { code: "ko-KR", short: "ko", label: "한국어", flag: "🇰🇷", fullLabel: "Korean" },
  { code: "th-TH", short: "th", label: "ไทย", flag: "🇹🇭", fullLabel: "Thai" },
  { code: "ar-SA", short: "ar", label: "عربي", flag: "🇸🇦", fullLabel: "Arabic" },
  { code: "vi-VN", short: "vi", label: "Việt", flag: "🇻🇳", fullLabel: "Vietnamese" },
  { code: "id-ID", short: "id", label: "ID", flag: "🇮🇩", fullLabel: "Bahasa Indonesia" },
];

const CHAT_LANGUAGES = [
  { code: "auto", label: "Auto Detect", flag: "🌐" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "zh", label: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "ta", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "th", label: "ภาษาไทย (Thai)", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ja", label: "日本語 (Japanese)", flag: "🇯🇵" },
  { code: "ko", label: "한국어 (Korean)", flag: "🇰🇷" },
  { code: "ar", label: "العربية (Arabic)", flag: "🇸🇦" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("auto");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! 👋 I'm your AgroPivot assistant. Ask me about weather, crops, market prices, or farming tips!\n\nSalam! Saya pembantu AgroPivot anda. Tanya saya tentang cuaca, tanaman, harga pasaran, atau tip pertanian!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [micLangIdx, setMicLangIdx] = useState(0);
  const [showMicLangPicker, setShowMicLangPicker] = useState(false);
  const recognitionRef = useRef<any>(null);
  const latestTranscript = useRef("");
  const micLangRef = useRef<HTMLDivElement>(null);

  // TTS state
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangMenu(false);
      if (micLangRef.current && !micLangRef.current.contains(e.target as Node)) setShowMicLangPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = CHAT_LANGUAGES.find((l) => l.code === lang) || CHAT_LANGUAGES[0];
  const currentMicLang = MIC_LANGUAGES[micLangIdx];

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    const userMsg: Message = { role: "user", content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(`${CLOUD_URL}/functions/v1/chat-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ messages: newMessages, mode: "chat", language: lang }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Voice recording
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = MIC_LANGUAGES[micLangIdx].code;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      latestTranscript.current = "";
      setInput("");
    };

    recognition.onresult = (event: any) => {
      let t = "";
      for (let i = 0; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      setInput(t);
      latestTranscript.current = t;
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = latestTranscript.current.trim();
      if (finalText) {
        // Auto-send the voice transcript
        sendMessage(finalText);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [micLangIdx, messages, lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // TTS - speak a message
  const speakMessage = (text: string, idx: number) => {
    if (speakingMsgIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Use mic language for TTS, or fallback
    utterance.lang = currentMicLang.code;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingMsgIdx(null);
    utterance.onerror = () => setSpeakingMsgIdx(null);
    setSpeakingMsgIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AgroPivot AI</p>
                  <p className="text-[10px] text-muted-foreground">Chat & Voice Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Chat Language Selector */}
                <div ref={langRef} className="relative">
                  <button
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors text-xs"
                    title="Chat language"
                  >
                    <span className="text-sm">{currentLang.flag}</span>
                    <Globe className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {showLangMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[200px] max-h-[320px] overflow-y-auto z-50"
                      >
                        {CHAT_LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors ${
                              lang === l.code ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            <span className="text-sm">{l.flag}</span>
                            <span>{l.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => { setOpen(false); window.speechSynthesis.cancel(); setSpeakingMsgIdx(null); }} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%]">
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary/50 text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* Speaker icon for AI messages */}
                    {msg.role === "assistant" && i > 0 && (
                      <button
                        onClick={() => speakMessage(msg.content, i)}
                        className="mt-1 ml-1 p-1 rounded-md hover:bg-secondary/50 transition-colors"
                        title={speakingMsgIdx === i ? "Stop speaking" : "Read aloud"}
                      >
                        {speakingMsgIdx === i ? (
                          <VolumeX className="h-3 w-3 text-primary" />
                        ) : (
                          <Volume2 className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 px-3 py-2 rounded-2xl rounded-bl-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                {/* Mic language picker */}
                <div ref={micLangRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMicLangPicker(!showMicLangPicker)}
                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-secondary/50 transition-colors text-[10px] font-medium text-muted-foreground"
                    title="Mic language"
                  >
                    <span className="text-xs">{currentMicLang.flag}</span>
                  </button>
                  <AnimatePresence>
                    {showMicLangPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 bottom-full mb-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px] max-h-[260px] overflow-y-auto z-50"
                      >
                        {MIC_LANGUAGES.map((l, idx) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => { setMicLangIdx(idx); setShowMicLangPicker(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors ${
                              idx === micLangIdx ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            <span className="text-sm">{l.flag}</span>
                            <span>{l.fullLabel}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mic button */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={loading}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                    isListening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "hover:bg-secondary/50 text-muted-foreground"
                  }`}
                  title={isListening ? "Stop listening" : `Speak in ${currentMicLang.fullLabel}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? `Listening (${currentMicLang.label})...` : "Ask me anything..."}
                  className="flex-1 bg-secondary/30 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  disabled={loading || isListening}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim() || isListening} className="rounded-xl h-9 w-9 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
