// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  role: 'mechanic' | 'admin' | 'support';
  createdAt: Date;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  status: 'trial' | 'active' | 'cancelled' | 'past_due';
  plan: 'monthly';
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
}

// Chat types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Ticket types
export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'support' | 'synth';
  content: string;
  createdAt: Date;
}

// Report types
export interface Report {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  description?: string;
}

// Community types
export interface ForumPost {
  id: string;
  authorId: string;
  author: User;
  title: string;
  content: string;
  category: string;
  likes: number;
  replies: ForumReply[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  likes: number;
  createdAt: Date;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: DirectMessage;
  updatedAt: Date;
}

// Feedback types
export interface Feedback {
  id: string;
  userId: string;
  targetType: 'ticket' | 'chat_session';
  targetId: string;
  rating: 'up' | 'down';
  comment?: string;
  createdAt: Date;
}

// Referral types
export interface Referral {
  id: string;
  referrerId: string;
  referredEmail: string;
  code: string;
  status: 'pending' | 'signed_up' | 'paid' | 'rewarded';
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'ticket_update' | 'message' | 'payment' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}
