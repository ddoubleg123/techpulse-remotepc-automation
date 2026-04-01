"use client";

import { useState } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "synth";
  timestamp: Date;
}

export default function DiagnosticChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Synth, your AI diagnostic assistant. I can help analyze DTCs, suggest repair procedures, and answer technical questions. How can I help you today?",
      sender: "synth",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      const synthMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm having trouble processing that request. Please try again.",
        sender: "synth", 
        timestamp: new Date()
      };

      setMessages(prev => [...prev, synthMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold text-white mb-6">Chat with Synth AI</h1>

      <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-white"
                }`}
              >
                <p>{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-white px-4 py-2 rounded-lg">
                Synth is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about DTCs, repair procedures, or diagnostics..."
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}