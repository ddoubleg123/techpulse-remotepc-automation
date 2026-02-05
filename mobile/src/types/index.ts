export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  referralCode: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  replies: number;
  views: number;
  createdAt: Date;
}

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Signup: undefined;
  Main: undefined;
  Chat: undefined;
  TicketDetail: { ticketId: string };
  PostDetail: { postId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Tickets: undefined;
  Community: undefined;
  Profile: undefined;
};
