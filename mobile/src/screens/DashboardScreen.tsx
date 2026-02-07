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

// Recent vehicles with make/model/year for easy identification
const recentVehicles = [
  { id: '1', make: 'Honda', model: 'Accord', year: '2019', lastDiagnosis: 'P0300 Misfire', time: '2 hours ago' },
  { id: '2', make: 'Toyota', model: 'Camry', year: '2021', lastDiagnosis: 'P0420 Catalyst', time: '5 hours ago' },
  { id: '3', make: 'Ford', model: 'F-150', year: '2020', lastDiagnosis: 'P0171 System Lean', time: '1 day ago' },
];

// Open tickets for escalated human support
const openTickets = [
  { id: '1234', vehicle: '2019 Honda Accord', status: 'Waiting for response', time: '3 hours ago' },
  { id: '1235', vehicle: '2021 Toyota Camry', status: 'In progress', time: '1 day ago' },
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

        {/* Primary Action - New Vehicle */}
        <TouchableOpacity style={styles.newVehicleBtn}>
          <View style={styles.newVehicleIcon}>
            <Ionicons name="car-sport" size={32} color={colors.white} />
          </View>
          <View style={styles.newVehicleContent}>
            <Text style={styles.newVehicleTitle}>New Vehicle</Text>
            <Text style={styles.newVehicleSubtitle}>Start a new diagnostic session</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.white} />
        </TouchableOpacity>

        {/* Secondary Action - Chat With Synth */}
        <TouchableOpacity style={styles.chatSynthBtn}>
          <Ionicons name="chatbubbles" size={22} color={colors.primary} />
          <Text style={styles.chatSynthText}>Chat With Synth</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Recent Activity - Vehicles */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentVehicles.map((vehicle) => (
            <TouchableOpacity key={vehicle.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="car-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.vehicleTitle}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehicleSubtitle}>{vehicle.lastDiagnosis}</Text>
                <Text style={styles.activityTime}>{vehicle.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Open Tickets */}
        <Text style={styles.sectionTitle}>Open Tickets</Text>
        {openTickets.length > 0 ? (
          <View style={styles.ticketsList}>
            {openTickets.map((ticket) => (
              <TouchableOpacity key={ticket.id} style={styles.ticketItem}>
                <View style={styles.ticketIcon}>
                  <Ionicons name="ticket-outline" size={18} color={colors.warning} />
                </View>
                <View style={styles.ticketContent}>
                  <Text style={styles.ticketTitle}>Ticket #{ticket.id}</Text>
                  <Text style={styles.ticketVehicle}>{ticket.vehicle}</Text>
                  <View style={styles.ticketStatusRow}>
                    <View style={styles.ticketStatusBadge}>
                      <Text style={styles.ticketStatusText}>{ticket.status}</Text>
                    </View>
                    <Text style={styles.ticketTime}>{ticket.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTickets}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
            <Text style={styles.emptyTicketsText}>No open tickets</Text>
          </View>
        )}

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
  // New Vehicle Button - Primary CTA
  newVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newVehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  newVehicleContent: {
    flex: 1,
  },
  newVehicleTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.white,
  },
  newVehicleSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Chat With Synth Button - Secondary CTA
  chatSynthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chatSynthText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  // Recent Activity List
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
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  vehicleSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Open Tickets Section
  ticketsList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  ticketIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ticketContent: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  ticketVehicle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  ticketStatusBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ticketStatusText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '500',
  },
  ticketTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptyTickets: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTicketsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Trial Banner
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
