import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { Message } from '../types';

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hi! I'm Synth, your AI automotive assistant. I can help you with diagnostics, repair procedures, and technical questions. What are you working on today?",
    timestamp: new Date(Date.now() - 60000),
  },
];

const suggestedQuestions = [
  'How do I diagnose a P0300 misfire code?',
  'What causes a car to shake at idle?',
  'How to check transmission fluid level?',
];

// Moved outside component to avoid declaration order issues
function getSimulatedResponse(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes('p0300') || lower.includes('misfire')) {
    return `A P0300 code indicates a random/multiple cylinder misfire. Here's how to diagnose it:

**Common Causes:**
1. Spark plugs or ignition coils worn/failing
2. Fuel injector problems
3. Vacuum leaks
4. Low fuel pressure

**Diagnostic Steps:**
1. Check for other codes - specific cylinder misfires help isolate the problem
2. Inspect spark plugs for wear or damage
3. Test ignition coils with a multimeter
4. Check for vacuum leaks

Would you like me to go deeper on any of these steps?`;
  }

  if (lower.includes('shake') || lower.includes('vibrat')) {
    return `A car shaking at idle can have several causes:

**Most Common Causes:**
1. Engine misfires - Check plugs/coils
2. Vacuum leaks - Listen for hissing sounds
3. Dirty throttle body - Carbon buildup
4. Worn motor mounts - Allow vibration transfer

**Quick Test:**
Put the car in neutral while idling - if shaking reduces, it may be transmission related.

What year/make/model are you working on?`;
  }

  return `That's a great question! To give you the most accurate guidance, could you provide a few more details?

1. What year, make, and model?
2. Any diagnostic trouble codes (DTCs)?
3. When did this issue start?

With more context, I can provide specific diagnostic steps and repair procedures.`;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messageIdRef = useRef(100);

  const generateId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current.toString();
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = text || inputText.trim();
    if (!content) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: getSimulatedResponse(content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  }, [inputText, generateId]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.synthIcon}>
              <Ionicons name="flash" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Synth Chat</Text>
              <Text style={styles.headerSubtitle}>AI Automotive Assistant</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.newChatBtn}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionBtn}
                  onPress={() => handleSend(question)}
                >
                  <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.suggestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantIcon}>
                  <Ionicons name="flash" size={16} color={colors.white} />
                </View>
              )}
              <View
                style={[
                  styles.messageContent,
                  message.role === 'user' ? styles.userContent : styles.assistantContent,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' && styles.userText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantIcon}>
                <Ionicons name="flash" size={16} color={colors.white} />
              </View>
              <View style={[styles.messageContent, styles.assistantContent]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, styles.typingDotMiddle]} />
                  <View style={[styles.typingDot, styles.typingDotLast]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.micBtn}>
            <Ionicons name="mic-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask Synth anything..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? colors.white : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  synthIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  newChatBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  suggestions: {
    marginBottom: spacing.lg,
  },
  suggestionsTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  assistantIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  assistantContent: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  userText: {
    color: colors.white,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    padding: spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  typingDotMiddle: {
    opacity: 0.6,
  },
  typingDotLast: {
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surface,
  },
});
