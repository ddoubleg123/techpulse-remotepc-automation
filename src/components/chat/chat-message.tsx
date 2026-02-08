'use client';

import { cn } from '@/lib/utils';
import { Zap, User, Volume2 } from 'lucide-react';
import type { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex gap-4', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isAssistant ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        )}
      >
        {isAssistant ? <Zap className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      <div className={cn('flex flex-col max-w-[70%]', !isAssistant && 'items-end')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isAssistant
              ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          {isAssistant && message.audioUrl && (
            <button className="text-gray-400 hover:text-blue-600">
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
