import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import Header from "@/components/teacher/Header";
import { Colors, Spacing, Radius, Shadow, FontSize, ButtonTokens } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type QuestionType = 'MCQ' | 'VERY_SHORT' | 'SHORT' | 'LONG' | 'CASE_STUDY' | 'ASSERTION_REASON';

interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options: string[] | null;
  question_number: number;
}

interface GeneratedContent {
  questions: GeneratedQuestion[];
  metadata: {
    subject: string;
    grade: string;
    title: string;
    topic: string;
    total_questions: number;
    generated_at: string;
  };
}

export default function HomeworkPreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    homework_id: string;
    generated_content: string;
    pdf_url: string;
    grade: string;
    subject: string;
    title: string;
    due_date: string;
  }>();

  const {
    homework_id,
    generated_content,
    grade,
    subject,
    title,
    due_date,
  } = params;

  // State management inside the component
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Parse generated_content on mount
  useEffect(() => {
    if (generated_content) {
      try {
        const parsed = JSON.parse(generated_content) as GeneratedContent;
        if (parsed && Array.isArray(parsed.questions)) {
          setQuestions(parsed.questions);
        }
        if (parsed && parsed.metadata) {
          setMetadata(parsed.metadata);
        }
      } catch (err) {
        console.error("Failed to parse generated_content:", err);
        Alert.alert("Error", "Failed to parse homework content.");
      }
    }
  }, [generated_content]);

  // Clean option prefix labels when displaying in text inputs
  const cleanOption = (opt: string, idx: number): string => {
    const prefix = `${String.fromCharCode(65 + idx)}.`;
    if (opt.toUpperCase().startsWith(prefix)) {
      return opt.substring(prefix.length).trim();
    }
    const prefixNoDot = `${String.fromCharCode(65 + idx)} `;
    if (opt.toUpperCase().startsWith(prefixNoDot)) {
      return opt.substring(prefixNoDot.length).trim();
    }
    return opt;
  };

  // Re-prepend option prefix labels when saving edits
  const formatOptionWithPrefix = (opt: string, idx: number): string => {
    const prefix = `${String.fromCharCode(65 + idx)}. `;
    if (opt.toUpperCase().startsWith(prefix.trim().toUpperCase())) {
      return opt;
    }
    return prefix + opt;
  };

  const startEditing = (index: number) => {
    if (editingIndex !== null) return;
    setEditingIndex(index);
    setEditText(questions[index].question);
    setEditOptions(
      questions[index].options
        ? questions[index].options!.map((opt, idx) => cleanOption(opt, idx))
        : []
    );
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleDone = () => {
    if (editingIndex === null) return;
    const updatedQuestions = [...questions];
    const formattedOptions =
      updatedQuestions[editingIndex].type === 'MCQ'
        ? editOptions.map((opt, idx) => formatOptionWithPrefix(opt, idx))
        : null;

    updatedQuestions[editingIndex] = {
      ...updatedQuestions[editingIndex],
      question: editText,
      options: formattedOptions,
    };
    setQuestions(updatedQuestions);
    setEditingIndex(null);
  };

  const handleRegenerate = () => {
    Alert.alert(
      "Discard Edits",
      "This will discard all edits. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => router.back() }
      ]
    );
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      // Step 1 - Build the updated payload
      let updatedMetadata = {
        subject: subject || '',
        grade: grade || '',
        title: title || '',
        topic: '',
        total_questions: questions.length,
        generated_at: new Date().toISOString(),
      };

      if (metadata) {
        updatedMetadata = {
          ...metadata,
          total_questions: questions.length,
        };
      }

      const updatedGeneratedContent = {
        questions: questions,
        metadata: updatedMetadata,
      };

      // Step 2 - Call Supabase directly to update the homework row
      const { error } = await supabase
        .from('homework')
        .update({
          generated_content: updatedGeneratedContent,
          generation_status: 'published',
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', homework_id);

      // Step 3 - On success: navigate to published.tsx
      if (!error) {
        router.push({
          pathname: "/(teacher)/teacher-homework/published" as any,
          params: {
            subject: subject || '',
            grade: grade || '',
            chapter: title || '',
            questionCount: questions.length.toString(),
            studentCount: "42",
            dueDate: due_date || '',
          },
        });
      } else {
        // Step 4 - On error
        console.error("Publish error:", error);
        Alert.alert("Publish Failed", error.message);
      }
    } catch (err: any) {
      console.error("Publish exception:", err);
      Alert.alert("Publish Failed", err.message || "An unexpected error occurred.");
    } finally {
      setIsPublishing(false);
    }
  };

  const sectionConfig: { type: QuestionType; title: string }[] = [
    { type: 'MCQ', title: 'Section A — Multiple Choice Questions' },
    { type: 'VERY_SHORT', title: 'Section B — Very Short Answer' },
    { type: 'SHORT', title: 'Section C — Short Answer' },
    { type: 'LONG', title: 'Section D — Long Answer' },
    { type: 'CASE_STUDY', title: 'Section E — Case Study Based' },
    { type: 'ASSERTION_REASON', title: 'Section F — Assertion-Reason' },
  ];

  const renderQuestionsList = () => {
    return sectionConfig.map((sect) => {
      // Find all questions of this type, keeping their original index
      const sectionQuestions = questions
        .map((q, idx) => ({ ...q, originalIndex: idx }))
        .filter((q) => q.type === sect.type);

      if (sectionQuestions.length === 0) return null;

      return (
        <View key={sect.type} style={styles.sectionContainer}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderContent}>
              {sect.title}
            </Text>
          </View>

          {/* Section Questions */}
          {sectionQuestions.map((q) => {
            const isEditing = editingIndex === q.originalIndex;
            const showOpacity = editingIndex !== null && !isEditing;

            return (
              <TouchableOpacity
                key={q.originalIndex}
                activeOpacity={0.9}
                onPress={() => startEditing(q.originalIndex)}
                disabled={isEditing}
                style={[
                  styles.questionCard,
                  isEditing ? styles.questionCardEditing : styles.questionCardDefault,
                  showOpacity && { opacity: 0.6 },
                ]}
              >
                {isEditing ? (
                  // Editing Mode View
                  <View style={styles.editForm}>
                    <View style={styles.editCardHeader}>
                      <View style={styles.questionNumberBadge}>
                        <Text style={styles.questionNumberText}>{q.question_number}</Text>
                      </View>
                      <Text style={styles.questionTypeLabel}>{sect.type}</Text>
                    </View>

                    <TextInput
                      style={styles.editQuestionInput}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      placeholder="Enter question text..."
                    />

                    {q.type === 'MCQ' && editOptions.map((opt, optIdx) => (
                      <View key={optIdx} style={styles.editOptionRow}>
                        <Text style={styles.optionPrefix}>{String.fromCharCode(65 + optIdx)}.</Text>
                        <TextInput
                          style={styles.editOptionInput}
                          value={opt}
                          onChangeText={(text) => {
                            const newOpts = [...editOptions];
                            newOpts[optIdx] = text;
                            setEditOptions(newOpts);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        />
                      </View>
                    ))}

                    <View style={styles.editFormActions}>
                      <TouchableOpacity
                        onPress={handleCancel}
                        style={[styles.editButton, styles.cancelButton]}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDone}
                        style={[styles.editButton, styles.doneButton]}
                      >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // Read Only View
                  <View>
                    <View style={styles.cardHeader}>
                      <View style={styles.questionNumberBadge}>
                        <Text style={styles.questionNumberText}>{q.question_number}</Text>
                      </View>
                      <Text style={styles.questionTypeLabel}>{q.type}</Text>
                    </View>
                    <Text style={styles.questionText}>{q.question}</Text>
                    {q.type === 'MCQ' && q.options && (
                      <View style={styles.optionsList}>
                        {q.options.map((opt, optIdx) => (
                          <View key={optIdx} style={styles.optionRow}>
                            <Text style={styles.optionText}>{opt}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Preview Assignment" showBack={true} onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + (Platform.OS === 'ios' ? insets.bottom : 0) }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Assignment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summarySubtitle}>
              {grade} — {subject}
            </Text>
            <View style={styles.aiBadge}>
              <Feather name="cpu" size={10} color={Colors.textGold} style={styles.aiIcon} />
              <Text style={styles.aiBadgeText}>AI Generated</Text>
            </View>
          </View>
          <Text style={styles.summaryTitle}>{title}</Text>
          <View style={styles.summaryBottomRow}>
            <View style={styles.metricItem}>
              <Feather name="calendar" size={14} color="#6B7280" style={styles.metricIcon} />
              <Text style={styles.metricText}>Due: {due_date}</Text>
            </View>
            <View style={styles.metricItem}>
              <Feather name="file-text" size={14} color="#6B7280" style={styles.metricIcon} />
              <Text style={styles.metricText}>
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Mode Banner */}
        {bannerVisible && (
          <View style={styles.bannerContainer}>
            <Feather name="edit-2" size={16} color={Colors.textGold} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>Tap any question to edit it before publishing.</Text>
            <TouchableOpacity onPress={() => setBannerVisible(false)} style={styles.bannerCloseButton}>
              <Feather name="x" size={16} color={Colors.textGold} />
            </TouchableOpacity>
          </View>
        )}

        {/* Questions List */}
        {renderQuestionsList()}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, Spacing.sm) : Spacing.sm }
        ]}
      >
        <TouchableOpacity
          onPress={handleRegenerate}
          style={styles.regenerateButton}
          activeOpacity={0.7}
        >
          <Text style={styles.regenerateButtonText}>Regenerate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePublish}
          style={styles.publishButton}
          disabled={isPublishing}
          activeOpacity={0.8}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={ButtonTokens.gold.textColor} />
          ) : (
            <Text style={styles.publishButtonText}>Publish Assignment</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBackground,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summarySubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: FontSize.sm,
    color: '#6B7280',
  },
  aiBadge: {
    backgroundColor: Colors.badgeGoldBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    marginRight: 4,
  },
  aiBadgeText: {
    fontFamily: 'OpenSans-Bold',
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textGold,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: FontSize.lg,
    color: Colors.navyBlue,
    marginBottom: Spacing.sm,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.lg,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 6,
  },
  metricText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSize.xs,
    color: '#6B7280',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.badgeGoldBg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.base,
  },
  bannerIcon: {
    marginRight: Spacing.sm,
  },
  bannerText: {
    fontFamily: 'Inter-Medium',
    fontSize: FontSize.xs,
    color: Colors.textGold,
    flex: 1,
  },
  bannerCloseButton: {
    padding: Spacing.xs,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.badgeNavyBg,
    borderRadius: Radius.sm,
    marginBottom: Spacing.base,
  },
  sectionHeaderContent: {
    fontFamily: 'Poppins-Bold',
    fontSize: FontSize.base,
    color: Colors.navyBlue,
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  questionCardDefault: {
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  questionCardEditing: {
    borderWidth: 2,
    borderColor: Colors.borderGold,
    ...Shadow.gold,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  questionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  questionNumberText: {
    fontFamily: 'Poppins-Bold',
    fontSize: FontSize.sm,
    color: Colors.navyBlue,
  },
  questionTypeLabel: {
    fontFamily: 'OpenSans-Bold',
    fontSize: FontSize.xs,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontFamily: 'Inter-Medium',
    fontSize: FontSize.base,
    color: Colors.navyBlue,
    lineHeight: 22,
  },
  optionsList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  optionRow: {
    backgroundColor: '#FFFBEA',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#FFF3CD',
    marginTop: Spacing.xs,
  },
  optionText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSize.sm,
    color: Colors.navyBlue,
  },
  editForm: {
    width: '100%',
  },
  editQuestionInput: {
    fontFamily: 'Inter-Medium',
    fontSize: FontSize.base,
    color: Colors.navyBlue,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    backgroundColor: '#F9F9FB',
    textAlignVertical: 'top',
    minHeight: 60,
    marginBottom: Spacing.sm,
  },
  editOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionPrefix: {
    fontFamily: 'Poppins-Bold',
    fontSize: FontSize.sm,
    color: Colors.navyBlue,
    width: 20,
  },
  editOptionInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: FontSize.sm,
    color: Colors.navyBlue,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: '#F9F9FB',
  },
  editFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  cancelButton: {
    borderWidth: ButtonTokens.secondary.borderWidth,
    borderColor: ButtonTokens.secondary.borderColor,
    backgroundColor: ButtonTokens.secondary.backgroundColor,
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: FontSize.xs,
    color: ButtonTokens.secondary.textColor,
  },
  doneButton: {
    backgroundColor: ButtonTokens.gold.backgroundColor,
  },
  doneButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: FontSize.xs,
    color: ButtonTokens.gold.textColor,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  regenerateButton: {
    width: '40%',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: ButtonTokens.secondary.borderWidth,
    borderColor: ButtonTokens.secondary.borderColor,
    backgroundColor: ButtonTokens.secondary.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: FontSize.sm,
    color: ButtonTokens.secondary.textColor,
  },
  publishButton: {
    width: '55%',
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: ButtonTokens.gold.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: FontSize.sm,
    color: ButtonTokens.gold.textColor,
  },
});
