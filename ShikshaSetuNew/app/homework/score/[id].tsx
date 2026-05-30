import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import {
  getStudentProfileByUserId,
  getHomeworkScore,
} from '../../../src/repositories/studentRepository';
import BottomNavBar from '../../../components/student/BottomNavBar';
import CircularProgress from '../../../components/student/CircularProgress';

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

function ScoreSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f8', padding: 20 }}>
      {/* Hero card skeleton */}
      <SkeletonBox width="100%" height={260} borderRadius={16} style={{ marginBottom: 16 }} />
      {/* Dimension cards skeletons */}
      <SkeletonBox width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={80} borderRadius={16} style={{ marginBottom: 16 }} />
      {/* Strengths card skeleton */}
      <SkeletonBox width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
    </View>
  );
}

function ScoreHeader({ onBack }: { onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
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
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 17,
          color: '#0D1B2A',
          textAlign: 'center',
        }}
      >
        Homework Score
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

function NotGradedState({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#fbf9f8' }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          borderWidth: 1,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Ionicons name="hourglass-outline" size={36} color="#D4AF37" />
      </View>
      <Text
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 18,
          color: '#0D1B2A',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Score not available yet
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 20,
        }}
      >
        Your teacher hasn't graded this yet
      </Text>
      <TouchableOpacity
        onPress={onBack}
        style={{
          backgroundColor: '#0D1B2A',
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
          Back to Homework
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#fbf9f8' }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          borderWidth: 1,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
      </View>
      <Text
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 18,
          color: '#0D1B2A',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Could not load score
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 20,
        }}
      >
        Check your internet connection and try again.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            borderColor: '#0D1B2A',
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 10,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#0D1B2A' }}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: '#0D1B2A',
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 10,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeworkScoreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // homework_id
  const { userId, isSignedIn, isLoaded } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);

  const fetchScoreData = async () => {
    if (!userId || !id) return;
    setLoading(true);
    setError(false);
    try {
      const studentProfile = await getStudentProfileByUserId(userId);
      if (!studentProfile) {
        setError(true);
        setLoading(false);
        return;
      }

      const res = await getHomeworkScore(id as string, studentProfile.id);
      if (!res) {
        setError(true);
      } else {
        setScoreData(res);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && userId && id) {
      fetchScoreData();
    }
  }, [isLoaded, isSignedIn, userId, id]);

  const dimensions = scoreData?.submission?.feedback?.dimensions || [];
  const animatedValues = useRef<Animated.Value[]>([]);

  // Track if values are initialized
  if (dimensions.length > 0 && animatedValues.current.length !== dimensions.length) {
    animatedValues.current = dimensions.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    if (dimensions.length > 0 && animatedValues.current.length === dimensions.length) {
      animatedValues.current.forEach((val: Animated.Value) => val.setValue(0));
      Animated.stagger(
        150,
        animatedValues.current.map((val: Animated.Value, i: number) =>
          Animated.timing(val, {
            toValue: dimensions[i].score / dimensions[i].max,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          })
        )
      ).start();
    }
  }, [dimensions]);

  if (!isLoaded || !isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f8' }}>
      {Platform.OS === 'android' && <View style={{ height: statusBarHeight }} />}
      
      {/* Custom Header */}
      <ScoreHeader onBack={handleBack} />

      {/* Main Content Area */}
      {loading ? (
        <ScoreSkeleton />
      ) : error ? (
        <ErrorState onRetry={fetchScoreData} onBack={handleBack} />
      ) : !scoreData?.submission || scoreData.submission.status !== 'scored' ? (
        <NotGradedState onBack={handleBack} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const { homework, submission } = scoreData;
            const feedback = submission.feedback;

            // Score details resolution
            let percentage = 0;
            let overallScoreText = '';
            let isAiEvaluation = false;

            if (feedback) {
              percentage = (feedback.overall_score / 10) * 100;
              overallScoreText = `${feedback.overall_score}/10`;
              isAiEvaluation = true;
            } else if (submission.marks_obtained !== null && homework.total_marks) {
              percentage = (submission.marks_obtained / homework.total_marks) * 100;
              overallScoreText = `${submission.marks_obtained}/${homework.total_marks}`;
            }

            const strengths = feedback?.strengths || [];
            const improvements = feedback?.improvements || [];

            return (
              <View style={{ gap: 16 }}>
                
                {/* a) Score Hero Card */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#0D1B2A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 1,
                  }}
                >
                  {/* Badge Row */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                    
                    {/* Subject badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#EFF6FF',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#1D4ED8', marginRight: 4, fontWeight: 'bold' }}>Σ</Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {homework.subject_name}
                      </Text>
                    </View>

                    {/* Difficulty Badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFBEB',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <Ionicons name="bar-chart-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {homework.difficulty}
                      </Text>
                    </View>

                  </View>

                  {/* Circular progress ring */}
                  <CircularProgress
                    percentage={percentage}
                    size={160}
                    strokeWidth={12}
                    color="#D4AF37"
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#0D1B2A', textAlign: 'center' }}>
                        {overallScoreText}
                      </Text>
                      {isAiEvaluation && (
                        <>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#74777D', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            AI
                          </Text>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#74777D', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            Evaluation
                          </Text>
                        </>
                      )}
                      {!isAiEvaluation && (
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#74777D', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          Evaluation
                        </Text>
                      )}
                    </View>
                  </CircularProgress>

                  {/* Grade label pill */}
                  {feedback?.grade_label && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderColor: '#D4AF37',
                        borderWidth: 1,
                        backgroundColor: '#FFFBEB',
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        marginTop: 20,
                      }}
                    >
                      <Text style={{ fontSize: 12, marginRight: 6 }}>⭐</Text>
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {feedback.grade_label}
                      </Text>
                    </View>
                  )}
                </View>

                {/* b) Score Dimensions Cards */}
                {feedback ? (
                  <View style={{ gap: 2 }}>
                    {dimensions.map((dim: any, i: number) => {
                      const animatedWidth = animatedValues.current[i]
                        ? animatedValues.current[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%';

                      return (
                        <View
                          key={dim.key}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 4,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            shadowColor: '#0D1B2A',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.04,
                            shadowRadius: 8,
                            elevation: 1,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: '#74777D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {dim.key}
                            </Text>
                            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0D1B2A' }}>
                              {dim.score}/{dim.max}
                            </Text>
                          </View>

                          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#0D1B2A', marginBottom: 12 }}>
                            {dim.label}
                          </Text>

                          <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                            <Animated.View style={{ height: '100%', backgroundColor: '#0D1B2A', borderRadius: 999, width: animatedWidth }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' }}>
                      Detailed feedback not available
                    </Text>
                  </View>
                )}

                {/* c) Key Strengths Card */}
                {strengths.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      shadowColor: '#0D1B2A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 1,
                      overflow: 'hidden',
                      flexDirection: 'row',
                    }}
                  >
                    <View style={{ width: 4, backgroundColor: '#16A34A' }} />
                    <View style={{ flex: 1, padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <View style={{ backgroundColor: '#ECFDF5', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                        </View>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#0D1B2A' }}>
                          Key Strengths
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>
                        {strengths.map((str: string, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" style={{ marginTop: 2 }} />
                            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#44474C', flex: 1, lineHeight: 20 }}>
                              {str}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* d) Areas to Improve Card */}
                {improvements.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      shadowColor: '#0D1B2A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 1,
                      overflow: 'hidden',
                      flexDirection: 'row',
                    }}
                  >
                    <View style={{ width: 4, backgroundColor: '#D4AF37' }} />
                    <View style={{ flex: 1, padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <View style={{ backgroundColor: '#FFFBEB', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="alert-circle" size={16} color="#D4AF37" />
                        </View>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#0D1B2A' }}>
                          Areas to Improve
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>
                        {improvements.map((imp: string, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Ionicons name="trending-up" size={16} color="#D4AF37" style={{ marginTop: 2 }} />
                            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#44474C', flex: 1, lineHeight: 20 }}>
                              {imp}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* e) Bottom Action Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
                  <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' }}>
                      ← Back to Homework
                    </Text>
                  </TouchableOpacity>

                  {!!submission?.file_url && (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await Linking.openURL(submission.file_url);
                        } catch {
                          Alert.alert('Error', 'Unable to open submission file.');
                        }
                      }}
                      style={{
                        borderColor: '#0D1B2A',
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: 'transparent',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#0D1B2A' }}>
                        View My Submission
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* Bottom Nav Bar */}
      <BottomNavBar />
    </View>
  );
}
