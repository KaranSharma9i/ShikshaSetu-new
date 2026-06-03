import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StatusBar,
  RefreshControl,
  Image,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/src/hooks/useAuth';
import {
  getStudentProfileByUserId,
  getHomeworkById,
  submitHomework,
  getSubscriptionStatus,
  submitHomeworkForEvaluation,
  SubscriptionStatus,
} from '@/src/repositories/studentRepository';
import { HomeworkItem } from '@/src/types/homework';
import BottomNavBar from '../../components/student/BottomNavBar';
import { Colors } from '@/constants/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(dueDateStr: string): boolean {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function daysUntilDue(dueDateStr: string): number {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getTimeRemaining(dueDateStr: string): string {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return 'Overdue';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  return `${days} days, ${hours} hours`;
}

function getFilenameFromUrl(url: string): string {
  const parts = url.split('/');
  const last = parts[parts.length - 1];
  return last.split('?')[0] || 'Question_Paper.pdf';
}

async function compressImageToBase64(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],  // resize longest edge to 800px
    { compress: 0.35, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error('Image processing failed');
  return manipulated.base64; // returns WITHOUT the data:image prefix
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ height, width = '100%', radius = 8, marginBottom = 12 }: {
  height: number;
  width?: string | number;
  radius?: number;
  marginBottom?: number;
}) {
  return (
    <View
      style={{
        height,
        width: width as any,
        borderRadius: radius,
        backgroundColor: '#E4E2E1',
        marginBottom,
        opacity: 0.7,
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f8', padding: 20 }}>
      <SkeletonBlock height={24} width="60%" marginBottom={20} />
      <SkeletonBlock height={40} marginBottom={8} />
      <SkeletonBlock height={32} width="80%" marginBottom={24} />
      <SkeletonBlock height={100} marginBottom={16} />
      <SkeletonBlock height={80} marginBottom={16} />
      <SkeletonBlock height={60} marginBottom={16} />
      <SkeletonBlock height={140} marginBottom={16} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId, isSignedIn, isLoaded } = useAuth();

  const [homework, setHomework] = useState<HomeworkItem | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileSelected, setFileSelected] = useState<string | null>(null);

  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSelectedImageUri(null);
      setSubmitError(null);
    }, [])
  );

  useEffect(() => {
    async function loadSubscription() {
      if (!studentId) return;
      try {
        const status = await getSubscriptionStatus(studentId);
        setSubscriptionStatus(status);
      } catch (err) {
        // On error assume FREE plan — safe default
        setSubscriptionStatus({ 
          plan_tier: 'FREE', tier_expires_at: null, is_active: false, 
          daily_limit: 0, used_today: 0, remaining_today: 0 
        });
      } finally {
        setSubscriptionLoading(false);
      }
    }
    loadSubscription();
  }, [studentId]);

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  const fetchData = useCallback(
    async (showSkeleton = true) => {
      if (!userId || !id) return;
      if (showSkeleton) setIsLoading(true);
      setHasError(false);
      try {
        const profile = await getStudentProfileByUserId(userId);
        if (!profile) throw new Error('Profile not found');
        setStudentId(profile.id);
        const hw = await getHomeworkById(id, profile.id);
        if (!hw) throw new Error('Homework not found');
        setHomework(hw);
      } catch (err) {
        console.error('Error loading homework detail:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [userId, id]
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/onboarding');
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, userId, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // ── Simulate file selection (Batch 3 will have real file picker) ──
  const handleSelectFile = () => {
    const sampleFiles = [
      'my_solution.pdf',
      'homework_answer.jpg',
      'assignment_scan.png',
    ];
    const picked = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    setFileSelected(picked);
  };

  // ── Image picker and submit handlers for AI evaluation ──
  async function handleCameraCapture() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setSubmitError(null);
    }
  }

  async function handleGalleryPick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library permission is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setSubmitError(null);
    }
  }

  async function handleSubmitForScoring() {
    if (!selectedImageUri || !studentId || !homework) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const base64Image = await compressImageToBase64(selectedImageUri);
      const result = await submitHomeworkForEvaluation({
        studentId,
        assignmentId: homework.id,
        base64Image,
      });
      // Navigate to score screen
      router.push({
        pathname: '/homework/score/[id]',
        params: {
          id: result.submission_id,
          ai_score: String(result.ai_score),
          ai_feedback: JSON.stringify(result.ai_feedback),
          plan_tier: result.plan_tier,
          scored_at: result.scored_at,
          homework_title: homework.title,
          remaining_today: String(result.remaining_today),
        },
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!homework || !studentId) return;
    setSubmitting(true);
    try {
      const result = await submitHomework(homework.id, studentId, null);
      if (result) {
        Alert.alert('✓ Submitted!', 'Your assignment has been submitted successfully.');
        setFileSelected(null);
        await fetchData(false);
      } else {
        Alert.alert('Error', 'Failed to submit. Please try again.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Auth guard ────────────────────────────────────────────────────
  if (!isLoaded || !isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (!isLoading && hasError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f8' }}>
        {Platform.OS === 'android' && <View style={{ height: statusBarHeight }} />}
        <DetailHeader onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          </View>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#0D1B2A', textAlign: 'center', marginBottom: 8 }}>
            Could not load homework
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => fetchData()}
            style={{ backgroundColor: '#0D1B2A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 }}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>Retry</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f8' }}>
      {Platform.OS === 'android' && <View style={{ height: statusBarHeight }} />}

      {/* ── Custom Header ─── */}
      <DetailHeader onBack={() => router.back()} />

      {/* ── Content ─── */}
      {isLoading || !homework ? (
        <LoadingSkeleton />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D1B2A" />}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

            {/* ── a) Subject + Difficulty badges ─── */}
            <BadgesRow hw={homework} />

            {/* ── b) Title ─── */}
            <Text
              style={{
                fontFamily: 'Poppins_700Bold',
                fontSize: 26,
                color: '#0D1B2A',
                lineHeight: 34,
                marginBottom: 16,
              }}
            >
              {homework.title}
            </Text>

            {/* ── c) Meta info rows ─── */}
            <MetaRow
              icon="calendar-outline"
              label={`Due: ${formatDate(homework.due_date)}`}
              labelColor={isOverdue(homework.due_date) && !homework.submission ? '#DC2626' : '#44474C'}
            />
            <MetaRow
              icon="person-outline"
              label={`Teacher: ${homework.teacher_name}`}
              labelColor="#44474C"
            />
            {homework.assign_date && (
              <MetaRow
                icon="create-outline"
                label={`Assigned: ${formatDate(homework.assign_date)}`}
                labelColor="#6B7280"
              />
            )}

            {/* Description */}
            {homework.description && (
              <View style={{ marginTop: 16, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#74777D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Instructions
                </Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E4E2E1' }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1B1C1C', lineHeight: 22 }}>
                    {homework.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Homework PDF Card */}
            {homework.pdf_url && (
              <View style={{ marginTop: 16, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#74777D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  HOMEWORK PAPER
                </Text>
                <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (homework.pdf_url) {
                        Linking.openURL(homework.pdf_url).catch(() => {
                          Alert.alert('Error', 'Unable to open PDF.');
                        });
                      }
                    }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: Colors.navyBlue,
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color={Colors.surface} />
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.surface }}>
                      View PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── d) Question sheet attachment card ─── */}
            {homework.file_url && (
              <AttachmentCard fileUrl={homework.file_url} />
            )}

            {/* ── e) Deadline warning banner ─── */}
            <DeadlineBanner homework={homework} />

            {/* ── f) Submission card ─── */}
            <SubmissionCard
              homework={homework}
              subscriptionStatus={subscriptionStatus}
              subscriptionLoading={subscriptionLoading}
              selectedImageUri={selectedImageUri}
              isSubmitting={isSubmitting}
              submitError={submitError}
              handleCameraCapture={handleCameraCapture}
              handleGalleryPick={handleGalleryPick}
              handleSubmitForScoring={handleSubmitForScoring}
              onReviewFeedback={() => {
                if (!homework || !homework.submission) return;
                router.push({
                  pathname: '/homework/score/[id]',
                  params: {
                    id: homework.submission.id,
                    ai_score: String(homework.submission.ai_score ?? 0),
                    ai_feedback: JSON.stringify(homework.submission.ai_feedback ?? {}),
                    plan_tier: subscriptionStatus?.plan_tier ?? 'STANDARD',
                    scored_at: homework.submission.submitted_at ?? new Date().toISOString(),
                    homework_title: homework.title,
                    remaining_today: String(subscriptionStatus?.remaining_today ?? 0),
                  },
                });
              }}
            />

          </View>
        </ScrollView>
      )}

      <BottomNavBar />
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E4E2E1',
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: '#F0EDED',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
      </TouchableOpacity>

      <Text
        style={{
          flex: 1,
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 17,
          color: '#0D1B2A',
          textAlign: 'center',
        }}
      >
        Homework Detail
      </Text>

      <TouchableOpacity
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: '#F0EDED',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Notifications', 'No new notifications.')}
      >
        <Ionicons name="notifications-outline" size={20} color="#0D1B2A" />
      </TouchableOpacity>
    </View>
  );
}

function BadgesRow({ hw }: { hw: HomeworkItem }) {
  const diffColor =
    hw.difficulty === 'Easy'
      ? { bg: '#ECFDF5', text: '#16A34A', border: '#BBF7D0' }
      : hw.difficulty === 'Medium'
      ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' }
      : { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      {/* Subject badge */}
      <View
        style={{
          backgroundColor: '#EFF6FF',
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderWidth: 1,
          borderColor: '#BFDBFE',
        }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#1D4ED8', fontWeight: '600' }}>
          {hw.subject_name}
        </Text>
      </View>

      {/* Difficulty badge */}
      <View
        style={{
          backgroundColor: diffColor.bg,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderWidth: 1,
          borderColor: diffColor.border,
        }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: diffColor.text, fontWeight: '600' }}>
          {hw.difficulty}
        </Text>
      </View>

      {/* Marks badge */}
      {hw.total_marks && (
        <View
          style={{
            backgroundColor: '#F5F3FF',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: '#DDD6FE',
          }}
        >
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>
            {hw.total_marks} Marks
          </Text>
        </View>
      )}
    </View>
  );
}

function MetaRow({ icon, label, labelColor }: { icon: any; label: string; labelColor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Ionicons name={icon} size={15} color="#74777D" />
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 13,
          color: labelColor,
          marginLeft: 8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AttachmentCard({ fileUrl }: { fileUrl: string }) {
  const filename = getFilenameFromUrl(fileUrl);

  const handleOpen = async () => {
    try {
      await Linking.openURL(fileUrl);
    } catch {
      Alert.alert('Error', 'Unable to open file.');
    }
  };

  return (
    <View style={{ marginTop: 20, marginBottom: 4 }}>
      <Text
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 11,
          color: '#74777D',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        Question Sheet
      </Text>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#E4E2E1',
          shadowColor: '#0D1B2A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 1,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#FEF2F2',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="document-text" size={22} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0D1B2A', fontWeight: '600' }} numberOfLines={1}>
            {filename}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#74777D', marginTop: 2 }}>
            PDF · Tap to open
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

function DeadlineBanner({ homework }: { homework: HomeworkItem }) {
  if (homework.submission) return null;

  const days = daysUntilDue(homework.due_date);
  if (days > 2 || days < 0) return null;

  const remaining = getTimeRemaining(homework.due_date);

  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#FECACA',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: '#FEE2E2',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        <Ionicons name="time" size={18} color="#DC2626" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#991B1B', marginBottom: 2 }}>
          Deadline Approaching!
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#DC2626' }}>
          Submission closes in {remaining}
        </Text>
      </View>
    </View>
  );
}

function SubmissionCard({
  homework,
  subscriptionStatus,
  subscriptionLoading,
  selectedImageUri,
  isSubmitting,
  submitError,
  handleCameraCapture,
  handleGalleryPick,
  handleSubmitForScoring,
  onReviewFeedback,
}: {
  homework: HomeworkItem;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionLoading: boolean;
  selectedImageUri: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  handleCameraCapture: () => void;
  handleGalleryPick: () => void;
  handleSubmitForScoring: () => void;
  onReviewFeedback: () => void;
}) {
  const sub = homework.submission;

  const statusConfig = sub
    ? sub.status === 'scored'
      ? { label: 'SCORED', bg: Colors.badgeGoldBg, text: Colors.textGold, border: Colors.borderGold }
      : { label: 'SUBMITTED', bg: '#ECFDF5', text: '#15803D', border: '#BBF7D0' }
    : { label: 'NOT SUBMITTED', bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' };

  return (
    <View
      style={{
        marginTop: 20,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.navyBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 2,
      }}
    >
      {/* Card header row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F0EDED',
        }}
      >
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.navyBlue }}>
          Your Submission
        </Text>
        <View
          style={{
            backgroundColor: statusConfig.bg,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: statusConfig.border,
          }}
        >
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: statusConfig.text }}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* ── Pending state ─── */}
        {!sub && (
          <PendingSubmissionBody
            subscriptionLoading={subscriptionLoading}
            subscriptionStatus={subscriptionStatus}
            selectedImageUri={selectedImageUri}
            isSubmitting={isSubmitting}
            submitError={submitError}
            handleCameraCapture={handleCameraCapture}
            handleGalleryPick={handleGalleryPick}
            handleSubmitForScoring={handleSubmitForScoring}
          />
        )}

        {/* ── Submitted state ─── */}
        {sub && sub.status === 'submitted' && (
          <SubmittedBody submission={sub} />
        )}

        {/* ── Scored state ─── */}
        {sub && sub.status === 'scored' && (
          <ScoredBody homework={homework} submission={sub} onReview={onReviewFeedback} />
        )}
      </View>
    </View>
  );
}

function PendingSubmissionBody({
  subscriptionLoading,
  subscriptionStatus,
  selectedImageUri,
  isSubmitting,
  submitError,
  handleCameraCapture,
  handleGalleryPick,
  handleSubmitForScoring,
}: {
  subscriptionLoading: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  selectedImageUri: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  handleCameraCapture: () => void;
  handleGalleryPick: () => void;
  handleSubmitForScoring: () => void;
}) {
  // Show loading while fetching subscription
  if (subscriptionLoading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={Colors.navyBlue} />
      </View>
    );
  }

  // Case 1: FREE plan or expired — show upgrade banner, no upload
  if (!subscriptionStatus?.is_active) {
    return (
      <View style={styles.upgradeBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="lock-closed" size={18} color={Colors.textGold} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.textGold }}>
            AI scoring requires Standard or Pro plan
          </Text>
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textGold }}>
          Contact your institution to upgrade
        </Text>
      </View>
    );
  }

  // Case 2: Daily limit reached — show limit banner, no upload
  if (subscriptionStatus.remaining_today <= 0) {
    return (
      <View style={styles.limitBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="alert-circle" size={18} color={Colors.textGold} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.textGold }}>
            Daily AI limit reached ({subscriptionStatus.used_today}/{subscriptionStatus.daily_limit})
          </Text>
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textGold }}>
          Try again tomorrow
        </Text>
      </View>
    );
  }

  // Case 3: Plan expiring within 7 days — show warning banner ABOVE upload UI
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = subscriptionStatus.tier_expires_at ? new Date(subscriptionStatus.tier_expires_at) : null;
  const showExpiryWarning = expiresAt && expiresAt < sevenDaysFromNow;
  const expiryDateStr = expiresAt ? expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // Case 4: Normal — show upload UI
  return (
    <>
      {showExpiryWarning && (
        <View style={styles.expiryWarning}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="warning-outline" size={16} color={Colors.textRed} style={{ marginRight: 6 }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textRed }}>
              Plan expires on {expiryDateStr}. Renew to keep AI scoring.
            </Text>
          </View>
        </View>
      )}

      {/* Remaining evaluations badge: "{remaining_today} of {daily_limit} evaluations left today" */}
      <View style={{
        backgroundColor: Colors.badgeNavyBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Ionicons name="flash" size={12} color={Colors.navyBlue} style={{ marginRight: 6 }} />
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: Colors.navyBlue }}>
          {subscriptionStatus.remaining_today} of {subscriptionStatus.daily_limit} evaluations left today
        </Text>
      </View>

      {/* Two buttons side by side */}
      <View style={styles.pickerRow}>
        <TouchableOpacity onPress={handleCameraCapture} style={styles.pickerButton} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="camera-outline" size={20} color={Colors.navyBlue} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.navyBlue }}>Camera</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGalleryPick} style={styles.pickerButton} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="image-outline" size={20} color={Colors.navyBlue} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.navyBlue }}>Gallery</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Image preview if selected */}
      {selectedImageUri && (
        <Image 
          source={{ uri: selectedImageUri }} 
          style={styles.imagePreview}  // width: 100%, height: 200, borderRadius: 8
          resizeMode="cover" 
        />
      )}

      {/* Submit button */}
      <TouchableOpacity 
        onPress={handleSubmitForScoring}
        disabled={!selectedImageUri || isSubmitting}
        style={[styles.submitButton, (!selectedImageUri || isSubmitting) && styles.submitButtonDisabled]}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={Colors.surface} size="small" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.surface }}>
              Analyzing...
            </Text>
          </View>
        ) : (
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.surface }}>
            Submit for AI Scoring →
          </Text>
        )}
      </TouchableOpacity>

      {/* Error message */}
      {submitError && <Text style={styles.errorText}>{submitError}</Text>}
    </>
  );
}

function SubmittedBody({ submission }: { submission: NonNullable<HomeworkItem['submission']> }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#ECFDF5',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
        </View>
        <View>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#0D1B2A' }}>
            Assignment submitted
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {new Date(submission.submitted_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#F6F3F2',
          borderRadius: 10,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Ionicons name="time-outline" size={16} color="#74777D" />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#44474C', marginLeft: 8 }}>
          Awaiting teacher review
        </Text>
      </View>

      {/* Disabled view submission button */}
      <View
        style={{
          backgroundColor: '#F0EDED',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#74777D' }}>
          View Submission
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
          File preview coming in next update
        </Text>
      </View>
    </View>
  );
}

function ScoredBody({
  homework,
  submission,
  onReview,
}: {
  homework: HomeworkItem;
  submission: NonNullable<HomeworkItem['submission']>;
  onReview: () => void;
}) {
  const pct =
    submission.marks_obtained !== null && homework.total_marks
      ? Math.round((submission.marks_obtained / homework.total_marks) * 100)
      : null;

  return (
    <View>
      {/* Score display */}
      <View
        style={{
          backgroundColor: '#FFFBEB',
          borderRadius: 14,
          padding: 18,
          alignItems: 'center',
          marginBottom: 14,
          borderWidth: 1,
          borderColor: '#FDE68A',
        }}
      >
        <Ionicons name="ribbon" size={28} color="#D4AF37" style={{ marginBottom: 8 }} />
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#0D1B2A' }}>
          {submission.marks_obtained !== null ? submission.marks_obtained : '—'}
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 20, color: '#74777D' }}>
            /{homework.total_marks}
          </Text>
        </Text>
        {pct !== null && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#B45309', marginTop: 4 }}>
            {pct}% score
          </Text>
        )}
      </View>

      {/* AI score if present */}
      {submission.ai_score !== null && (
        <View
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: 10,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            borderWidth: 1,
            borderColor: '#BFDBFE',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flash-outline" size={14} color="#2563EB" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#1D4ED8', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AI Evaluation
            </Text>
          </View>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#1D4ED8' }}>
            {submission.ai_score}%
          </Text>
        </View>
      )}

      {/* Review Feedback button */}
      <TouchableOpacity
        onPress={onReview}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#D4AF37',
          borderRadius: 12,
          paddingVertical: 16,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="document-text-outline" size={16} color="#0D1B2A" />
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#0D1B2A' }}>
          Review Feedback →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  upgradeBanner: {
    backgroundColor: Colors.badgeGoldBg,
    padding: 16,
    borderRadius: 12,
  },
  limitBanner: {
    backgroundColor: Colors.badgeGoldBg,
    padding: 16,
    borderRadius: 12,
  },
  expiryWarning: {
    backgroundColor: Colors.badgeGoldBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerButton: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    backgroundColor: Colors.badgeNavyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: Colors.navyBlue,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: Colors.red,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});

