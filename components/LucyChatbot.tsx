"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, Mic, MicOff, Play, RotateCcw, Send, Sparkles, Trash2, Volume2, VolumeX, X } from "lucide-react";

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type LucyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};

const welcomeMessage: LucyMessage = {
  id: "lucy-welcome",
  role: "assistant",
  content: "Hey, this is Lucy! I’m Vibe With Tribe’s AI assistant, not a person. English or తెలుగు, either is welcome. What’s on your mind?",
};

export function LucyChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<LucyMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const voiceEnabledRef = useRef(true);
  const busy = useRef(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/lucy", { method: "GET", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ configured: boolean }> : { configured: false })
      .then((status) => { if (active) setIsConfigured(status.configured); })
      .catch(() => { if (active) setIsConfigured(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    const activeRecognition = recognitionRef.current;
    recognitionRef.current = null;
    activeRecognition?.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => window.clearTimeout(timer);
    }
    if (!isVisible) return;
    const timer = window.setTimeout(() => setIsVisible(false), 190);
    return () => window.clearTimeout(timer);
  }, [isOpen, isVisible]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isVisible) messagesEnd.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
  }, [messages, isStreaming, isVisible]);

  const speakText = (text: string) => {
    if (!voiceEnabledRef.current || !text.trim()) return;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setVoiceNotice("Spoken replies are not supported in this browser.");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      const language = /[\u0C00-\u0C7F]/.test(text) ? "te-IN" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      utterance.lang = language;
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)) && /female|samantha|ava|aria|jenny|zira/i.test(voice.name))
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)))
        ?? null;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => { setIsSpeaking(false); setVoiceNotice("Lucy’s voice could not play. Check your device sound settings."); };
      setVoiceNotice("");
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setVoiceNotice("Lucy’s voice could not start on this device.");
    }
  };

  const toggleVoice = () => {
    const nextEnabled = !voiceEnabled;
    voiceEnabledRef.current = nextEnabled;
    setVoiceEnabled(nextEnabled);
    if (!nextEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const openChat = () => {
    if (messages.length === 0) setMessages([welcomeMessage]);
    setIsOpen(true);
    speakText("Hey, this is Lucy!");
  };

  const closeChat = () => {
    const activeRecognition = recognitionRef.current;
    recognitionRef.current = null;
    activeRecognition?.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setIsOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const streamReply = async (text: string, includeUserMessage = true) => {
    if (busy.current) return;
    busy.current = true;
    setIsStreaming(true);

    const previousMessages = includeUserMessage
      ? [...messages, { id: crypto.randomUUID(), role: "user" as const, content: text }]
      : messages.filter((message) => !message.isError);
    const assistantId = crypto.randomUUID();
    setMessages([...previousMessages, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const history = previousMessages
        .filter((message) => !message.isError)
        .slice(-11)
        .map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/lucy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Lucy couldn't reply right now. Please try again.");
      }
      if (!response.body) throw new Error("The AI service returned an empty response. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        receivedText += chunk;
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + chunk } : message));
      }
      const lastChunk = decoder.decode();
      if (lastChunk) {
        receivedText += lastChunk;
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + lastChunk } : message));
      }
      if (!receivedText.trim()) throw new Error("Lucy received an empty reply. Please try again.");
      speakText(receivedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lucy couldn't reply right now. Please try again.";
      setMessages((current) => current.map((item) => item.id === assistantId
        ? { ...item, content: item.content ? `${item.content}\n\n${message}` : message, isError: true }
        : item));
    } finally {
      busy.current = false;
      setIsStreaming(false);
    }
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy.current) return;
    setInput("");
    void streamReply(text);
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) void streamReply(lastUserMessage.content, false);
  };

  const toggleListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice("Voice input is not supported in this browser. You can still type to Lucy.");
      return;
    }
    const consent = window.confirm("Start voice input? Your microphone is used only while this session is active. Your browser may process audio with its speech-recognition provider; Lucy's app server receives text only.");
    if (!consent) {
      setVoiceNotice("Voice input cancelled. You can keep typing to Lucy.");
      return;
    }

    const recognition = new Recognition();
    let finalTranscript = "";
    let recognitionFailed = false;
    recognition.lang = /[\u0C00-\u0C7F]/.test(input) || navigator.language.toLowerCase().startsWith("te") ? "te-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      finalTranscript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? "";
        transcript += `${text} `;
        if (result?.isFinal) finalTranscript += `${text} `;
      }
      setInput(transcript.trim());
    };
    recognition.onerror = (event) => {
      recognitionFailed = true;
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceNotice(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission was denied. Allow microphone access in your browser settings to use voice input."
        : event.error === "no-speech"
          ? "I didn’t hear anything. Tap the microphone and try again."
          : "Voice recognition stopped. You can try again or type your message.");
    };
    recognition.onend = () => {
      const shouldSubmit = recognitionRef.current === recognition;
      recognitionRef.current = null;
      setIsListening(false);
      const text = finalTranscript.trim();
      if (shouldSubmit && !recognitionFailed && text && !busy.current) {
        setInput("");
        void streamReply(text);
      }
    };

    try {
      recognitionRef.current = recognition;
      setVoiceNotice("Listening now. The browser may process audio with its speech-recognition provider; Lucy receives text only.");
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceNotice("The microphone could not start. Check browser permission and try again.");
    }
  };

  const clearChat = () => {
    if (busy.current) return;
    setMessages([welcomeMessage]);
    setInput("");
  };

  return (
    <div className="lucy-root">
      {isVisible && (
        <section className={`lucy-panel ${isOpen ? "lucy-panel-open" : "lucy-panel-closing"}`} aria-label="Chat with Lucy" aria-hidden={!isOpen}>
          <header className="lucy-header">
            <img className="lucy-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=112&h=112&q=85" alt="Lucy AI avatar" />
            <div className="lucy-heading-copy">
              <strong>Lucy</strong>
              <span className="lucy-status"><i className={isListening ? "lucy-status-dot lucy-status-listening" : isSpeaking || isConfigured ? "lucy-status-dot lucy-status-ready" : "lucy-status-dot"} />{isListening ? "Listening..." : isSpeaking ? "Speaking..." : isConfigured === null ? "Checking..." : isConfigured ? "Online · AI assistant" : "Setup needed"}</span>
            </div>
            <span className="lucy-ai-mark" title="AI assistant"><Sparkles size={15} /></span>
            <button className="lucy-header-button" type="button" onClick={toggleVoice} aria-label={voiceEnabled ? "Mute Lucy's voice" : "Unmute Lucy's voice"} title={voiceEnabled ? "Mute voice replies" : "Enable voice replies"}>{voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
            <button className="lucy-header-button" type="button" onClick={clearChat} disabled={isStreaming} aria-label="Clear conversation" title="Clear conversation"><Trash2 size={16} /></button>
            <button className="lucy-header-button" type="button" onClick={closeChat} aria-label="Close Lucy chat" title="Close chat"><X size={18} /></button>
          </header>

          <div className="lucy-disclosure">AI assistant · replies may need verification</div>

          <div className="lucy-messages" role="log" aria-label="Lucy conversation" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div className={`lucy-message-row ${message.role === "user" ? "lucy-message-user" : "lucy-message-assistant"}`} key={message.id}>
                {message.role === "assistant" && <span className="lucy-message-mark" aria-hidden="true"><Sparkles size={13} /></span>}
                <div className={`lucy-bubble ${message.role === "user" ? "lucy-bubble-user" : "lucy-bubble-assistant"} ${message.isError ? "lucy-bubble-error" : ""}`}>
                  {message.content || (isStreaming && message.id === messages[messages.length - 1]?.id ? <span className="lucy-typing" aria-label="Lucy is typing"><i /><i /><i /></span> : null)}
                  {message.role === "assistant" && message.content && !message.isError && voiceEnabled && <button className="lucy-replay" type="button" onClick={() => speakText(message.content)} aria-label="Replay Lucy's voice response" title="Replay voice response"><Play size={12} /></button>}
                  {message.isError && <button className="lucy-retry" type="button" onClick={retryLastMessage} disabled={isStreaming}><RotateCcw size={13} /> Try again</button>}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {messages.length === 1 && messages[0]?.id === welcomeMessage.id && (
            <div className="lucy-suggestions" aria-label="Lucy suggestions">
              {[
                ["Caption help", "Help me write a warm, fun caption for a photo."],
                ["Story idea", "Suggest a simple, creative story idea for today."],
                ["Post idea", "Give me a positive post idea for my Vibe With Tribe friends."],
              ].map(([label, prompt]) => <button type="button" key={label} onClick={() => { void streamReply(prompt); }} disabled={isStreaming}>{label}</button>)}
            </div>
          )}

          {!isConfigured && (
            <div className="lucy-setup-note" role="status">{isConfigured === null ? "Checking AI availability..." : "AI replies need OPENAI_API_KEY on the server."}</div>
          )}
          {voiceNotice && <div className="lucy-voice-note" role="status">{voiceNotice}</div>}

          <form className="lucy-composer" onSubmit={sendMessage}>
            <label className="lucy-sr-only" htmlFor="lucy-message-input">Message Lucy</label>
            <input ref={inputRef} id="lucy-message-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder="Message Lucy..." autoComplete="off" disabled={isStreaming || isListening} />
            <button className={`lucy-mic-button ${isListening ? "lucy-mic-active" : ""}`} type="button" onClick={toggleListening} aria-label={isListening ? "Stop listening" : "Start voice input"} title={isListening ? "Stop listening" : "Start voice input"} disabled={isStreaming}>{isListening ? <MicOff size={16} /> : <Mic size={16} />}</button>
            <button type="submit" aria-label="Send message" title="Send message" disabled={!input.trim() || isStreaming || isListening}>
              {isStreaming ? <LoaderCircle className="lucy-spinner" size={17} /> : <Send size={17} />}
            </button>
          </form>
          <div className="lucy-footer">Lucy is AI, not a human · Mic starts only after confirmation</div>
        </section>
      )}

      {!isOpen ? (
        <button ref={launcherRef} className="lucy-launcher" type="button" onClick={openChat} aria-label="Chat with Lucy, AI assistant">
          <span className="lucy-launcher-halo" />
          <MessageCircle size={23} strokeWidth={2} />
          <span className="lucy-launcher-label">Ask Lucy</span>
        </button>
      ) : (
        <button ref={launcherRef} className="lucy-launcher lucy-launcher-active" type="button" onClick={closeChat} aria-label="Close Lucy chat">
          <X size={21} />
        </button>
      )}
    </div>
  );
}