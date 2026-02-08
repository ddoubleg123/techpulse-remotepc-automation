'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Button, Badge, Avatar } from '@/components/ui';
import {
  Plus,
  Search,
  MessageSquare,
  ThumbsUp,
  Eye,
  TrendingUp,
  Users,
  Send,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

const categories = [
  'All Topics',
  'Engine',
  'Transmission',
  'Electrical',
  'Brakes',
  'Suspension',
  'HVAC',
  'Diagnostics',
];

const posts = [
  {
    id: '1',
    author: { name: 'Mike Johnson', avatar: null },
    title: 'Best approach for diagnosing intermittent misfires?',
    content: 'I have a 2017 Chevy Cruze that has random misfires but only when the engine is cold. No codes stored. What would you check first?',
    category: 'Engine',
    likes: 12,
    replies: 8,
    views: 156,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '2',
    author: { name: 'Sarah Williams', avatar: null },
    title: 'CVT transmission shudder - common causes',
    content: 'Working on a Nissan Altima with CVT shudder during acceleration. Customer says it started around 80k miles. Any experience with these?',
    category: 'Transmission',
    likes: 24,
    replies: 15,
    views: 342,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: '3',
    author: { name: 'Carlos Rodriguez', avatar: null },
    title: 'Parasitic draw testing tips',
    content: 'What\'s your go-to method for finding parasitic draws? I\'ve got a truck that kills the battery overnight but my amp clamp shows less than 50mA.',
    category: 'Electrical',
    likes: 31,
    replies: 22,
    views: 489,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    author: { name: 'Jennifer Chen', avatar: null },
    title: 'ABS module replacement - coding required?',
    content: 'Replacing ABS module on a 2019 BMW X3. Will I need to code the new module or will it self-learn? Don\'t have ISTA access.',
    category: 'Brakes',
    likes: 8,
    replies: 6,
    views: 98,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const conversations = [
  {
    id: '1',
    user: { name: 'Alex Turner', avatar: null },
    lastMessage: 'Thanks for the help with that P0171 diagnosis!',
    unread: 2,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: '2',
    user: { name: 'David Park', avatar: null },
    lastMessage: 'Did you get that part number I sent?',
    unread: 0,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '3',
    user: { name: 'Lisa Martinez', avatar: null },
    lastMessage: 'Let me know if you need any other info',
    unread: 0,
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'forum' | 'messages'>('forum');
  const [selectedCategory, setSelectedCategory] = useState('All Topics');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'All Topics' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout title="Community" subtitle="Connect with fellow mechanics">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('forum')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'forum'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Forum
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'messages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Direct Messages
            {conversations.some((c) => c.unread > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>

        {activeTab === 'forum' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>

              <Card>
                <CardHeader>
                  <h3 className="font-medium text-gray-900">Categories</h3>
                </CardHeader>
                <CardContent className="p-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-medium text-gray-900">Community Stats</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">1,234</p>
                      <p className="text-xs text-gray-500">Members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">5,678</p>
                      <p className="text-xs text-gray-500">Posts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">89</p>
                      <p className="text-xs text-gray-500">Online now</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Posts */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Card>
                <CardContent className="p-0 divide-y divide-gray-100">
                  {filteredPosts.map((post) => (
                    <a
                      key={post.id}
                      href={`/app/community/post/${post.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-4">
                        <Avatar name={post.author.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default">{post.category}</Badge>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(post.createdAt)}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">{post.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {post.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {post.replies}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {post.views}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>{post.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="font-medium text-gray-900">Conversations</h3>
                <Button size="sm" variant="ghost">
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left"
                  >
                    <Avatar name={conv.user.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{conv.user.name}</p>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(conv.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Message Area */}
            <Card className="lg:col-span-2 flex flex-col h-[600px]">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar name="Alex Turner" size="md" />
                  <div>
                    <p className="font-medium text-gray-900">Alex Turner</p>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-3">
                  <Avatar name="Alex Turner" size="sm" />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[70%]">
                    <p className="text-sm">Hey, thanks for the help earlier!</p>
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <Avatar name="You" size="sm" />
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[70%]">
                    <p className="text-sm">No problem! Did that fix work for you?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Avatar name="Alex Turner" size="sm" />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[70%]">
                    <p className="text-sm">Thanks for the help with that P0171 diagnosis!</p>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
