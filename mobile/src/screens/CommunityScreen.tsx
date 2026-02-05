import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const posts = [
  {
    id: '1',
    author: 'Mike Johnson',
    avatar: 'MJ',
    title: 'Best approach for diagnosing intermittent misfires?',
    preview: 'I have a 2017 Chevy Cruze that has random misfires but only when cold...',
    category: 'Engine',
    likes: 12,
    replies: 8,
    time: '3h ago',
  },
  {
    id: '2',
    author: 'Sarah Williams',
    avatar: 'SW',
    title: 'CVT transmission shudder - common causes',
    preview: 'Working on a Nissan Altima with CVT shudder during acceleration...',
    category: 'Transmission',
    likes: 24,
    replies: 15,
    time: '8h ago',
  },
  {
    id: '3',
    author: 'Carlos Rodriguez',
    avatar: 'CR',
    title: 'Parasitic draw testing tips',
    preview: "What's your go-to method for finding parasitic draws?",
    category: 'Electrical',
    likes: 31,
    replies: 22,
    time: '1d ago',
  },
];

const categories = ['All', 'Engine', 'Transmission', 'Electrical', 'Brakes', 'HVAC'];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'forum' | 'messages'>('forum');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = posts.filter(
    (post) => selectedCategory === 'All' || post.category === selectedCategory
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forum' && styles.tabActive]}
          onPress={() => setActiveTab('forum')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={20}
            color={activeTab === 'forum' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'forum' && styles.tabTextActive]}>
            Forum
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={activeTab === 'messages' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'forum' ? (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search discussions..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categories}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryBtn,
                  selectedCategory === category && styles.categoryBtnActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Posts */}
          <ScrollView style={styles.posts} showsVerticalScrollIndicator={false}>
            {filteredPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{post.avatar}</Text>
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={styles.authorName}>{post.author}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{post.category}</Text>
                  </View>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postPreview} numberOfLines={2}>
                  {post.preview}
                </Text>
                <View style={styles.postFooter}>
                  <View style={styles.postStat}>
                    <Ionicons name="heart-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.postStatText}>{post.likes}</Text>
                  </View>
                  <View style={styles.postStat}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.postStatText}>{post.replies}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.messages} showsVerticalScrollIndicator={false}>
          {[
            { name: 'Alex Turner', message: 'Thanks for the help!', unread: 2, time: '30m' },
            { name: 'David Park', message: 'Did you get that part number?', unread: 0, time: '2h' },
            { name: 'Lisa Martinez', message: 'Let me know if you need more info', unread: 0, time: '5h' },
          ].map((conv, index) => (
            <TouchableOpacity key={index} style={styles.messageItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {conv.name.split(' ').map((n) => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageName}>{conv.name}</Text>
                  <Text style={styles.messageTime}>{conv.time}</Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                  {conv.message}
                </Text>
              </View>
              {conv.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{conv.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  categories: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  categoryBtnActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.white,
  },
  posts: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  postMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  postTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  categoryBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  postTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postPreview: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postStatText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  messages: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  messagePreview: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
});
