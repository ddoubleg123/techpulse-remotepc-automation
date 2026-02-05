import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const stats = [
  { label: 'Chat Sessions', value: '24', icon: 'chatbubbles' as const, color: colors.primary },
  { label: 'Open Tickets', value: '3', icon: 'ticket' as const, color: colors.warning },
  { label: 'Reports', value: '12', icon: 'document-text' as const, color: colors.success },
  { label: 'Community Posts', value: '8', icon: 'people' as const, color: '#8b5cf6' },
];

const recentActivity = [
  { type: 'chat', title: 'P0300 Misfire Diagnosis', time: '2 hours ago' },
  { type: 'ticket', title: 'Ticket #1234 resolved', time: '5 hours ago' },
  { type: 'report', title: 'Uploaded: Honda_Accord_Scan.pdf', time: '1 day ago' },
];

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>Demo User</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubbles" size={20} color={colors.white} />
            <Text style={styles.actionText}>New Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={[styles.actionText, styles.actionTextSecondary]}>Create Ticket</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
            <Text style={[styles.actionText, styles.actionTextSecondary]}>Upload Report</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentActivity.map((activity, index) => (
            <TouchableOpacity key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons
                  name={
                    activity.type === 'chat'
                      ? 'chatbubbles-outline'
                      : activity.type === 'ticket'
                      ? 'ticket-outline'
                      : 'document-outline'
                  }
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Banner */}
        <View style={styles.trialBanner}>
          <View style={styles.trialContent}>
            <Ionicons name="time-outline" size={24} color={colors.warning} />
            <View style={styles.trialText}>
              <Text style={styles.trialTitle}>Free Trial - 23 days left</Text>
              <Text style={styles.trialSubtitle}>Add payment method to continue</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.trialBtn}>
            <Text style={styles.trialBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  actionTextSecondary: {
    color: colors.primary,
  },
  activityList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  activityTime: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  trialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trialText: {
    flex: 1,
  },
  trialTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  trialSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  trialBtn: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  trialBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
});
