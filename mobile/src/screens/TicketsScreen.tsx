import React, { useState } from 'react';
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

const tickets = [
  {
    id: '1',
    subject: 'AC compressor not engaging',
    description: 'Customer reports AC blows warm air...',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    subject: 'Transmission slip at highway speeds',
    description: 'Vehicle slips between 3rd and 4th gear...',
    status: 'in_progress',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    subject: 'Check engine light diagnosis',
    description: 'Multiple codes present, need guidance...',
    status: 'resolved',
    priority: 'medium',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
];

const statusColors = {
  open: colors.primary,
  in_progress: colors.warning,
  resolved: colors.success,
  closed: colors.textMuted,
};

const priorityColors = {
  low: colors.textMuted,
  medium: colors.primary,
  high: colors.warning,
  urgent: colors.error,
};

export default function TicketsScreen() {
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const filteredTickets = tickets.filter((ticket) =>
    filter === 'all' ? true : ticket.status === filter
  );

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Support Tickets</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {['all', 'open', 'in_progress', 'resolved'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
            onPress={() => setFilter(status as typeof filter)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tickets List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredTickets.map((ticket) => (
          <TouchableOpacity key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status as keyof typeof statusColors] + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[ticket.status as keyof typeof statusColors] }]} />
                <Text style={[styles.statusText, { color: statusColors[ticket.status as keyof typeof statusColors] }]}>
                  {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColors[ticket.priority as keyof typeof priorityColors] + '20' }]}>
                <Text style={[styles.priorityText, { color: priorityColors[ticket.priority as keyof typeof priorityColors] }]}>
                  {ticket.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <Text style={styles.ticketDescription} numberOfLines={2}>
              {ticket.description}
            </Text>
            <View style={styles.ticketFooter}>
              <Text style={styles.ticketTime}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} /> {formatTime(ticket.createdAt)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {filteredTickets.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        )}
      </ScrollView>
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filters: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTime: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
