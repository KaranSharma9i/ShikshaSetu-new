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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import {
  getStudentProfileByUserId,
  getHomeworkById,
  submitHomework,
} from '@/src/repositories/studentRepository';
import { HomeworkItem } from '@/src/types/homework';
import BottomNavBar from '../../components/student/BottomNavBar';

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

            {/* ── d) Question sheet attachment card ─── */}
            {homework.file_url && (
              <AttachmentCard fileUrl={homework.file_url} />
            )}

            {/* ── e) Deadline warning banner ─── */}
            <DeadlineBanner homework={homework} />

            {/* ── f) Submission card ─── */}
            <SubmissionCard
              homework={homework}
              fileSelected={fileSelected}
              submitting={submitting}
              onSelectFile={handleSelectFile}
              onClearFile={() => setFileSelected(null)}
              onSubmit={handleSubmit}
              onReviewFeedback={() => router.push(`/homework/score/${homework.id}` as any)}
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
  fileSelected,
  submitting,
  onSelectFile,
  onClearFile,
  onSubmit,
  onReviewFeedback,
}: {
  homework: HomeworkItem;
  fileSelected: string | null;
  submitting: boolean;
  onSelectFile: () => void;
  onClearFile: () => void;
  onSubmit: () => void;
  onReviewFeedback: () => void;
}) {
  const sub = homework.submission;

  const statusConfig = sub
    ? sub.status === 'scored'
      ? { label: 'SCORED', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }
      : { label: 'SUBMITTED', bg: '#ECFDF5', text: '#15803D', border: '#BBF7D0' }
    : { label: 'NOT SUBMITTED', bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' };

  return (
    <View
      style={{
        marginTop: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E4E2E1',
        shadowColor: '#0D1B2A',
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
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#0D1B2A' }}>
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
            fileSelected={fileSelected}
            submitting={submitting}
            onSelectFile={onSelectFile}
            onClearFile={onClearFile}
            onSubmit={onSubmit}
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
  fileSelected,
  submitting,
  onSelectFile,
  onClearFile,
  onSubmit,
}: {
  fileSelected: string | null;
  submitting: boolean;
  onSelectFile: () => void;
  onClearFile: () => void;
  onSubmit: () => void;
}) {
  return (
    <View>
      {/* Upload / drop area */}
      {fileSelected ? (
        <View
          style={{
            backgroundColor: '#F6F3F2',
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
            borderWidth: 1,
            borderColor: '#E4E2E1',
          }}
        >
          <Ionicons name="document-attach-outline" size={20} color="#0D1B2A" />
          <Text
            style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0D1B2A', flex: 1, marginLeft: 10 }}
            numberOfLines={1}
          >
            {fileSelected}
          </Text>
          <TouchableOpacity onPress={onClearFile} style={{ padding: 4 }} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onSelectFile}
          activeOpacity={0.8}
          style={{
            borderWidth: 2,
            borderColor: '#C4C6CC',
            borderStyle: 'dashed',
            borderRadius: 14,
            paddingVertical: 32,
            paddingHorizontal: 20,
            alignItems: 'center',
            marginBottom: 14,
            backgroundColor: '#FBFAFB',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#F0EDED',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name="cloud-upload-outline" size={26} color="#74777D" />
          </View>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#0D1B2A', marginBottom: 4 }}>
            Tap to upload or drag & drop
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#74777D', textAlign: 'center' }}>
            Supported files: PDF, JPG, PNG (Max 10MB)
          </Text>
        </TouchableOpacity>
      )}

      {/* Submit button */}
      <TouchableOpacity
        onPress={fileSelected ? onSubmit : onSelectFile}
        disabled={submitting}
        activeOpacity={0.85}
        style={{
          backgroundColor: submitting ? '#44474C' : '#0D1B2A',
          borderRadius: 12,
          paddingVertical: 16,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="send-outline" size={16} color="#FFFFFF" />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
              Submit Assignment →
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
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
