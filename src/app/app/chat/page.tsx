'use client';

import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { ChatMessage, ChatInput } from '@/components/chat';
import { Button, Card } from '@/components/ui';
import { Plus, History, Zap, Wrench, Car, Settings } from 'lucide-react';
import type { Message } from '@/types';

const suggestedQuestions = [
  { icon: Wrench, text: 'How do I diagnose a P0300 random misfire code?' },
  { icon: Car, text: 'What causes a car to shake at idle?' },
  { icon: Settings, text: 'How to check transmission fluid level?' },
];

const demoMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hi! I'm Synth, your AI automotive assistant. I can help you with diagnostics, repair procedures, and technical questions. What are you working on today?",
    timestamp: new Date(Date.now() - 60000),
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: getSimulatedResponse(content),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleNewChat = () => {
    setMessages([demoMessages[0]]);
  };

  return (
    <AppLayout title="Synth Chat" subtitle="AI-powered automotive assistant">
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-64 space-y-4">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          <Card className="flex-1 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Chats
              </h3>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto">
              {['P0300 Misfire diagnosis', 'Brake pad replacement', 'AC not cooling'].map(
                (chat, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 truncate"
                  >
                    {chat}
                  </button>
                )
              )}
            </div>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 1 && (
              <div className="mt-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">How can I help you today?</h2>
                  <p className="text-gray-500 mt-1">
                    Ask me anything about automotive diagnostics and repairs
                  </p>
                </div>

                <div className="grid gap-3 max-w-lg mx-auto">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(q.text)}
                      className="flex items-center gap-3 p-4 text-left bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <q.icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </Card>
      </div>
    </AppLayout>
  );
}

function getSimulatedResponse(question: string): string {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('p0300') || lowerQuestion.includes('misfire')) {
    return `A P0300 code indicates a random/multiple cylinder misfire. Here's how to diagnose it:

**Common Causes:**
1. Spark plugs or ignition coils worn/failing
2. Fuel injector problems
3. Vacuum leaks
4. Low fuel pressure
5. EGR valve issues

**Diagnostic Steps:**
1. Check for other codes - specific cylinder misfires (P0301-P0308) help isolate the problem
2. Inspect spark plugs for wear, fouling, or damage
3. Test ignition coils with a multimeter or swap with known good coil
4. Check for vacuum leaks using carb cleaner or smoke test
5. Test fuel pressure at the rail

Would you like me to go deeper on any of these steps?`;
  }

  if (lowerQuestion.includes('shake') || lowerQuestion.includes('vibrat')) {
    return `A car shaking at idle can have several causes. Let me help you narrow it down:

**Most Common Causes:**
1. **Engine misfires** - Check for misfire codes and inspect plugs/coils
2. **Vacuum leaks** - Listen for hissing sounds, check all vacuum lines
3. **Dirty throttle body** - Carbon buildup affects idle quality
4. **Worn motor mounts** - Allow engine vibration to transfer to chassis
5. **Fuel system issues** - Clogged injectors or fuel filter

**Quick Test:**
Put the car in neutral while idling - if shaking reduces, it may be transmission or drivetrain related.

What year/make/model are you working on?`;
  }

  if (lowerQuestion.includes('transmission') || lowerQuestion.includes('fluid')) {
    return `Here's how to check transmission fluid properly:

**For Most Automatic Transmissions:**
1. Park on level ground, engine running, in Park
2. Locate the transmission dipstick (usually near firewall)
3. Pull, wipe clean, reinsert fully, then pull again
4. Check level between MIN and MAX marks
5. Also check fluid condition - should be red/pink, not brown or burnt smelling

**Note:** Some modern vehicles have sealed transmissions with no dipstick. These require:
- Checking via fill plug with car level on lift
- Fluid at specific temperature (usually ~104°F)

What vehicle are you working on? I can give you specific instructions.`;
  }

  return `That's a great question! To give you the most accurate guidance, could you provide a few more details?

1. What year, make, and model are you working on?
2. Are there any diagnostic trouble codes (DTCs)?
3. When did this issue start?

With more context, I can provide specific diagnostic steps and repair procedures.`;
}
