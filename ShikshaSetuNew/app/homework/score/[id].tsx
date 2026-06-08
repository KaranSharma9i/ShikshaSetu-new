import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../../components/student/Header';
import BottomNavBar from '../../../components/student/BottomNavBar';
import { Colors } from '../../../constants/theme';
import { useAuth } from '../../../src/hooks/useAuth';

// Helper: getScoreColor(score: number)
// Returns the appropriate theme color string:
// - score < 4 → danger color (Colors.red)
// - score <= 7 → warning color (Colors.gold)
// - score > 7 → success color (Colors.green)
const getScoreColor = (score: number) => {
  if (score < 4) return Colors.red;
  if (score <= 7) return Colors.gold;
  return Colors.green;
};

// Date Formatter Helper
const formatScoredAt = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const dStr = date.toLocaleDateString('en-IN', dateOptions);
    const tStr = date.toLocaleTimeString('en-US', timeOptions);
    return `${dStr}, ${tStr}`;
  } catch (e) {
    return dateStr;
  }
};

// Breakdown card local sub-component
interface BreakdownCardProps {
  label: string;
  value: number;
  icon: string;
}

function BreakdownCard({ label, value, icon }: BreakdownCardProps) {
  const { theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';

  const getScoreColorLocal = (score: number) => {
    if (score < 4) return Colors.red;
    if (score <= 7) return secondaryColor;
    return Colors.green;
  };

  const barColor = getScoreColorLocal(value);
  return (
    <View style={[styles.breakdownCard, { borderColor: theme?.colors?.lightGray ?? '#E4E2E1' }]}>
      <View style={styles.breakdownCardRow}>
        <View style={styles.breakdownIconLabel}>
          <Ionicons name={icon as any} size={20} color={barColor} />
          <Text style={[styles.breakdownLabel, { color: primaryColor }]}>{label}</Text>
        </View>
        <Text style={[styles.breakdownScore, { color: primaryColor }]}>{value}/10</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(value / 10) * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// Locked card local sub-component
interface LockedCardProps {
  text: string;
  subtext: string;
}

function LockedCard({ text, subtext }: LockedCardProps) {
  const { theme } = useAuth();
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';
  const secondaryLightColor = theme?.colors?.secondaryLight ?? '#FFF3CD';
  
  return (
    <View style={[styles.lockedCard, { backgroundColor: secondaryLightColor, borderColor: secondaryColor }]}>
      <View style={styles.lockIconContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={secondaryColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.lockedText, { color: theme?.colors?.secondary ?? '#856404' }]}>{text}</Text>
        <Text style={[styles.lockedSubtext, { color: theme?.colors?.secondary ?? '#856404' }]}>{subtext}</Text>
      </View>
    </View>
  );
}

export default function HomeworkScoreScreen() {
  const router = useRouter();
  const { theme } = useAuth();
  
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';
  const creamColor = theme?.colors?.cream ?? '#F7F3EB';
  const secondaryLightColor = theme?.colors?.secondaryLight ?? '#FFF3CD';

  // Helper: getScoreColor(score: number) using dynamic secondaryColor
  const getScoreColor = (score: number) => {
    if (score < 4) return Colors.red;
    if (score <= 7) return secondaryColor;
    return Colors.green;
  };

  // Data Parsing Block
  const params = useLocalSearchParams();
  const ai_score = parseFloat(params.ai_score as string) || 0;
  const plan_tier = params.plan_tier as 'STANDARD' | 'PRO';
  const scored_at = params.scored_at as string;
  const homework_title = params.homework_title as string;
  const remaining_today = parseInt(params.remaining_today as string) || 0;

  let ai_feedback: {
    completeness: number;
    concept_clarity: number;
    presentation: number;
    insights?: string[];
    wrong_answers?: Array<{ question_number: number; description: string }>;
    partial_answers?: Array<{ question_number: number; description: string }>;
  } | null = null;

  let parseError = false;
  try {
    ai_feedback = JSON.parse(params.ai_feedback as string);
  } catch {
    parseError = true;
  }

  const ringColor = getScoreColor(ai_score);

  return (
    <View style={[styles.container, { backgroundColor: creamColor }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <Header
          title="AI Score Result"
          showBack={true}
          onBack={() => router.back()}
        />

        {parseError ? (
          /* Error state */
          <View style={styles.contentPadding}>
            <View style={[styles.errorCard, { shadowColor: primaryColor }]}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.red} />
              <Text style={[styles.errorTitle, { color: primaryColor }]}>Result Unavailable</Text>
              <Text style={styles.errorSub}>Could not load your score details.</Text>
              <TouchableOpacity
                onPress={() => router.push('/homework')}
                style={[styles.errorButton, { backgroundColor: primaryColor }]}
                activeOpacity={0.8}
              >
                <Text style={styles.errorButtonText}>Back to Homework</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contentPadding}>
            {/* 2. Overall Score Section */}
            <View style={styles.overallScoreContainer}>
              <View style={[styles.circleOuter, { borderColor: ringColor }]}>
                <Text style={[styles.circleText, { color: primaryColor }]}>{ai_score}</Text>
              </View>
              <Text style={styles.mutedTextBelowCircle}>/10</Text>
              <Text style={[styles.homeworkTitle, { color: primaryColor }]}>{homework_title}</Text>
              {scored_at ? (
                <Text style={styles.scoredAtText}>Scored: {formatScoredAt(scored_at)}</Text>
              ) : null}
            </View>

            {/* 3. Breakdown Cards Section */}
            <Text style={styles.sectionLabel}>BREAKDOWN</Text>
            <View style={styles.breakdownList}>
              <BreakdownCard
                label="Completeness"
                value={ai_feedback?.completeness ?? 0}
                icon="checkmark-circle-outline"
              />
              <BreakdownCard
                label="Concept Clarity"
                value={ai_feedback?.concept_clarity ?? 0}
                icon="bulb-outline"
              />
              <BreakdownCard
                label="Presentation"
                value={ai_feedback?.presentation ?? 0}
                icon="star-outline"
              />
            </View>

            {/* 4. Insights Section (Plan-gated) */}
            <Text style={styles.sectionLabel}>💡 KEY INSIGHTS</Text>
            {plan_tier === 'PRO' && ai_feedback?.insights && ai_feedback.insights.length > 0 ? (
              ai_feedback.insights.slice(0, 2).map((insight, idx) => (
                <View key={`insight-${idx}`} style={[styles.insightCard, { borderLeftColor: primaryColor }]}>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))
            ) : plan_tier === 'STANDARD' ? (
              <LockedCard
                text="Upgrade to Pro for personalized insights"
                subtext="Get 2 actionable tips specific to this submission"
              />
            ) : (
              <Text style={styles.emptyStateText}>No insights available for this score.</Text>
            )}

            {/* 5. Answer Analysis Section (Plan-gated) */}
            <Text style={styles.sectionLabel}>📋 ANSWER ANALYSIS</Text>
            {plan_tier === 'PRO' ? (
              <View>
                {/* Sub-section A: Needs Attention */}
                <Text style={[styles.subSectionTitle, { color: primaryColor }]}>❌ Needs Attention</Text>
                {(!ai_feedback?.wrong_answers || ai_feedback.wrong_answers.length === 0) ? (
                  <Text style={[styles.emptyStateText, { color: Colors.green }]}>
                    ✅ No completely wrong answers. Great work!
                  </Text>
                ) : (
                  ai_feedback.wrong_answers.map((item, idx) => (
                    <View key={`wrong-${idx}`} style={[styles.questionCard, { backgroundColor: Colors.badgeRedBg, borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.questionHeader, { color: Colors.red }]}>Q{item.question_number}</Text>
                      <Text style={styles.questionDesc}>{item.description}</Text>
                    </View>
                  ))
                )}

                {/* Sub-section B: Partially Correct */}
                <Text style={[styles.subSectionTitle, { color: primaryColor }]}>⚠️ Partially Correct</Text>
                {(!ai_feedback?.partial_answers || ai_feedback.partial_answers.length === 0) ? (
                  <Text style={styles.emptyStateText}>
                    All correct or fully wrong — no partial answers.
                  </Text>
                ) : (
                  ai_feedback.partial_answers.map((item, idx) => (
                    <View key={`partial-${idx}`} style={[styles.questionCard, { backgroundColor: secondaryLightColor, borderColor: secondaryColor }]}>
                      <Text style={[styles.questionHeader, { color: theme?.colors?.secondary ?? '#856404' }]}>Q{item.question_number}</Text>
                      <Text style={styles.questionDesc}>{item.description}</Text>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <LockedCard
                text="Upgrade to Pro to see which answers need attention"
                subtext="Identify wrong and partial answers question by question"
              />
            )}

            {/* 6. Bottom Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => router.push('/homework')}
                style={[styles.outlineButton, { borderColor: primaryColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.outlineButtonText, { color: primaryColor }]}>← Homework</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Submit Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBackground || '#F7F3EB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPadding: {
    padding: 16,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
    borderWidth: 1,
    borderColor: Colors.border || '#E4E2E1',
    shadowColor: Colors.navyBlue || '#0D1B2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  errorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.navyBlue || '#0D1B2A',
    marginTop: 12,
    marginBottom: 6,
  },
  errorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: Colors.navyBlue || '#0D1B2A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  overallScoreContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  circleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  circleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: Colors.navyBlue || '#0D1B2A',
  },
  mutedTextBelowCircle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#74777D',
    marginTop: 6,
    textAlign: 'center',
  },
  homeworkTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.navyBlue || '#0D1B2A',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  scoredAtText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#74777D',
    textAlign: 'center',
    marginTop: 6,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#74777D',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
  },
  breakdownList: {
    flexDirection: 'column',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#E4E2E1',
  },
  breakdownCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.navyBlue || '#0D1B2A',
  },
  breakdownScore: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.navyBlue || '#0D1B2A',
  },
  progressContainer: {
    backgroundColor: '#E5E7EB',
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.navyBlue || '#0D1B2A',
    borderWidth: 1,
    borderColor: Colors.border || '#E4E2E1',
  },
  insightText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#44474C',
    lineHeight: 20,
  },
  lockedCard: {
    backgroundColor: Colors.badgeGoldBg || '#FFF3CD',
    borderColor: Colors.borderGold || '#D4AF37',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  lockIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.textGold || '#856404',
  },
  lockedSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textGold || '#856404',
    marginTop: 2,
  },
  subSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.navyBlue || '#0D1B2A',
    marginTop: 8,
    marginBottom: 8,
  },
  questionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  questionHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    marginBottom: 4,
  },
  questionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  emptyStateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#74777D',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    marginBottom: 20,
  },
  outlineButton: {
    flex: 1,
    borderColor: Colors.navyBlue || '#0D1B2A',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.navyBlue || '#0D1B2A',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.navyBlue || '#0D1B2A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
