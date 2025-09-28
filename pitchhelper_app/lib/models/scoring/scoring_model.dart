import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:hive/hive.dart';

part 'scoring_model.g.dart';

@HiveType(typeId: 5)
class DetailedScore extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String userId;

  @HiveField(2)
  String conversationId;

  @HiveField(3)
  DateTime timestamp;

  @HiveField(4)
  double overallScore;

  @HiveField(5)
  VocalDeliveryScore vocalDelivery;

  @HiveField(6)
  ConversationSkillsScore conversationSkills;

  @HiveField(7)
  ContentMasteryScore contentMastery;

  @HiveField(8)
  EmotionalIntelligenceScore emotionalIntelligence;

  @HiveField(9)
  List<FeedbackPoint> feedbackPoints;

  @HiveField(10)
  Map<String, dynamic> metadata;

  DetailedScore({
    required this.id,
    required this.userId,
    required this.conversationId,
    required this.timestamp,
    required this.overallScore,
    required this.vocalDelivery,
    required this.conversationSkills,
    required this.contentMastery,
    required this.emotionalIntelligence,
    List<FeedbackPoint>? feedbackPoints,
    Map<String, dynamic>? metadata,
  })  : feedbackPoints = feedbackPoints ?? [],
        metadata = metadata ?? {};

  factory DetailedScore.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    return DetailedScore(
      id: doc.id,
      userId: data['userId'] ?? '',
      conversationId: data['conversationId'] ?? '',
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      overallScore: (data['overallScore'] ?? 0.0).toDouble(),
      vocalDelivery: VocalDeliveryScore.fromMap(data['vocalDelivery'] ?? {}),
      conversationSkills: ConversationSkillsScore.fromMap(data['conversationSkills'] ?? {}),
      contentMastery: ContentMasteryScore.fromMap(data['contentMastery'] ?? {}),
      emotionalIntelligence: EmotionalIntelligenceScore.fromMap(data['emotionalIntelligence'] ?? {}),
      feedbackPoints: (data['feedbackPoints'] as List<dynamic>?)
              ?.map((f) => FeedbackPoint.fromMap(f))
              .toList() ??
          [],
      metadata: Map<String, dynamic>.from(data['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'conversationId': conversationId,
      'timestamp': Timestamp.fromDate(timestamp),
      'overallScore': overallScore,
      'vocalDelivery': vocalDelivery.toMap(),
      'conversationSkills': conversationSkills.toMap(),
      'contentMastery': contentMastery.toMap(),
      'emotionalIntelligence': emotionalIntelligence.toMap(),
      'feedbackPoints': feedbackPoints.map((f) => f.toMap()).toList(),
      'metadata': metadata,
    };
  }

  double get categoryAverage {
    return (vocalDelivery.average +
            conversationSkills.average +
            contentMastery.average +
            emotionalIntelligence.average) / 4;
  }

  ScoreGrade get grade {
    if (overallScore >= 90) return ScoreGrade.excellent;
    if (overallScore >= 80) return ScoreGrade.good;
    if (overallScore >= 70) return ScoreGrade.satisfactory;
    if (overallScore >= 60) return ScoreGrade.needsImprovement;
    return ScoreGrade.poor;
  }

  List<String> get topStrengths {
    final scores = <String, double>{
      'Confidence': vocalDelivery.confidence,
      'Pace': vocalDelivery.pace,
      'Energy': vocalDelivery.energy,
      'Clarity': vocalDelivery.clarity,
      'Rapport Building': conversationSkills.rapportBuilding,
      'Active Listening': conversationSkills.activeListening,
      'Question Quality': conversationSkills.questionQuality,
      'Objection Handling': conversationSkills.objectionHandling,
      'Closing Technique': conversationSkills.closingTechnique,
      'Value Articulation': contentMastery.valueArticulation,
      'Story Usage': contentMastery.storyUsage,
      'Industry Knowledge': contentMastery.industryKnowledge,
      'Solution Fit': contentMastery.solutionFit,
      'Client Reading': emotionalIntelligence.clientReading,
      'Adaptation': emotionalIntelligence.adaptation,
      'Pressure Handling': emotionalIntelligence.pressureHandling,
      'Authenticity': emotionalIntelligence.authenticity,
    };

    final sortedScores = scores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sortedScores.take(3).map((e) => e.key).toList();
  }

  List<String> get improvementAreas {
    final scores = <String, double>{
      'Confidence': vocalDelivery.confidence,
      'Pace': vocalDelivery.pace,
      'Energy': vocalDelivery.energy,
      'Clarity': vocalDelivery.clarity,
      'Rapport Building': conversationSkills.rapportBuilding,
      'Active Listening': conversationSkills.activeListening,
      'Question Quality': conversationSkills.questionQuality,
      'Objection Handling': conversationSkills.objectionHandling,
      'Closing Technique': conversationSkills.closingTechnique,
      'Value Articulation': contentMastery.valueArticulation,
      'Story Usage': contentMastery.storyUsage,
      'Industry Knowledge': contentMastery.industryKnowledge,
      'Solution Fit': contentMastery.solutionFit,
      'Client Reading': emotionalIntelligence.clientReading,
      'Adaptation': emotionalIntelligence.adaptation,
      'Pressure Handling': emotionalIntelligence.pressureHandling,
      'Authenticity': emotionalIntelligence.authenticity,
    };

    final lowScores = scores.entries
        .where((e) => e.value < 70.0)
        .toList()
      ..sort((a, b) => a.value.compareTo(b.value));

    return lowScores.take(3).map((e) => e.key).toList();
  }
}

@HiveType(typeId: 6)
class VocalDeliveryScore extends HiveObject {
  @HiveField(0)
  double confidence;

  @HiveField(1)
  double pace;

  @HiveField(2)
  double energy;

  @HiveField(3)
  double clarity;

  VocalDeliveryScore({
    required this.confidence,
    required this.pace,
    required this.energy,
    required this.clarity,
  });

  factory VocalDeliveryScore.fromMap(Map<String, dynamic> map) {
    return VocalDeliveryScore(
      confidence: (map['confidence'] ?? 0.0).toDouble(),
      pace: (map['pace'] ?? 0.0).toDouble(),
      energy: (map['energy'] ?? 0.0).toDouble(),
      clarity: (map['clarity'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'confidence': confidence,
      'pace': pace,
      'energy': energy,
      'clarity': clarity,
    };
  }

  double get average => (confidence + pace + energy + clarity) / 4;
}

@HiveType(typeId: 7)
class ConversationSkillsScore extends HiveObject {
  @HiveField(0)
  double rapportBuilding;

  @HiveField(1)
  double activeListening;

  @HiveField(2)
  double questionQuality;

  @HiveField(3)
  double objectionHandling;

  @HiveField(4)
  double closingTechnique;

  ConversationSkillsScore({
    required this.rapportBuilding,
    required this.activeListening,
    required this.questionQuality,
    required this.objectionHandling,
    required this.closingTechnique,
  });

  factory ConversationSkillsScore.fromMap(Map<String, dynamic> map) {
    return ConversationSkillsScore(
      rapportBuilding: (map['rapportBuilding'] ?? 0.0).toDouble(),
      activeListening: (map['activeListening'] ?? 0.0).toDouble(),
      questionQuality: (map['questionQuality'] ?? 0.0).toDouble(),
      objectionHandling: (map['objectionHandling'] ?? 0.0).toDouble(),
      closingTechnique: (map['closingTechnique'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'rapportBuilding': rapportBuilding,
      'activeListening': activeListening,
      'questionQuality': questionQuality,
      'objectionHandling': objectionHandling,
      'closingTechnique': closingTechnique,
    };
  }

  double get average => (rapportBuilding + activeListening + questionQuality + objectionHandling + closingTechnique) / 5;
}

@HiveType(typeId: 8)
class ContentMasteryScore extends HiveObject {
  @HiveField(0)
  double valueArticulation;

  @HiveField(1)
  double storyUsage;

  @HiveField(2)
  double industryKnowledge;

  @HiveField(3)
  double solutionFit;

  ContentMasteryScore({
    required this.valueArticulation,
    required this.storyUsage,
    required this.industryKnowledge,
    required this.solutionFit,
  });

  factory ContentMasteryScore.fromMap(Map<String, dynamic> map) {
    return ContentMasteryScore(
      valueArticulation: (map['valueArticulation'] ?? 0.0).toDouble(),
      storyUsage: (map['storyUsage'] ?? 0.0).toDouble(),
      industryKnowledge: (map['industryKnowledge'] ?? 0.0).toDouble(),
      solutionFit: (map['solutionFit'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'valueArticulation': valueArticulation,
      'storyUsage': storyUsage,
      'industryKnowledge': industryKnowledge,
      'solutionFit': solutionFit,
    };
  }

  double get average => (valueArticulation + storyUsage + industryKnowledge + solutionFit) / 4;
}

@HiveType(typeId: 9)
class EmotionalIntelligenceScore extends HiveObject {
  @HiveField(0)
  double clientReading;

  @HiveField(1)
  double adaptation;

  @HiveField(2)
  double pressureHandling;

  @HiveField(3)
  double authenticity;

  EmotionalIntelligenceScore({
    required this.clientReading,
    required this.adaptation,
    required this.pressureHandling,
    required this.authenticity,
  });

  factory EmotionalIntelligenceScore.fromMap(Map<String, dynamic> map) {
    return EmotionalIntelligenceScore(
      clientReading: (map['clientReading'] ?? 0.0).toDouble(),
      adaptation: (map['adaptation'] ?? 0.0).toDouble(),
      pressureHandling: (map['pressureHandling'] ?? 0.0).toDouble(),
      authenticity: (map['authenticity'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'clientReading': clientReading,
      'adaptation': adaptation,
      'pressureHandling': pressureHandling,
      'authenticity': authenticity,
    };
  }

  double get average => (clientReading + adaptation + pressureHandling + authenticity) / 4;
}

@HiveType(typeId: 16)
class FeedbackPoint extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  FeedbackType type;

  @HiveField(2)
  String skill;

  @HiveField(3)
  String message;

  @HiveField(4)
  String suggestion;

  @HiveField(5)
  double timestamp;

  @HiveField(6)
  FeedbackSeverity severity;

  FeedbackPoint({
    required this.id,
    required this.type,
    required this.skill,
    required this.message,
    required this.suggestion,
    required this.timestamp,
    required this.severity,
  });

  factory FeedbackPoint.fromMap(Map<String, dynamic> map) {
    return FeedbackPoint(
      id: map['id'] ?? '',
      type: FeedbackType.values.firstWhere(
        (t) => t.name == map['type'],
        orElse: () => FeedbackType.improvement,
      ),
      skill: map['skill'] ?? '',
      message: map['message'] ?? '',
      suggestion: map['suggestion'] ?? '',
      timestamp: (map['timestamp'] ?? 0.0).toDouble(),
      severity: FeedbackSeverity.values.firstWhere(
        (s) => s.name == map['severity'],
        orElse: () => FeedbackSeverity.medium,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type.name,
      'skill': skill,
      'message': message,
      'suggestion': suggestion,
      'timestamp': timestamp,
      'severity': severity.name,
    };
  }
}

@HiveType(typeId: 17)
class ProgressMetrics extends HiveObject {
  @HiveField(0)
  String userId;

  @HiveField(1)
  DateTime lastUpdated;

  @HiveField(2)
  Map<String, List<double>> skillTrends;

  @HiveField(3)
  List<double> overallScoreTrend;

  @HiveField(4)
  Map<String, int> scenarioStats;

  @HiveField(5)
  Map<String, double> industryPerformance;

  @HiveField(6)
  int totalSessions;

  @HiveField(7)
  Duration totalPracticeTime;

  @HiveField(8)
  double averageSessionLength;

  @HiveField(9)
  int currentStreak;

  @HiveField(10)
  int longestStreak;

  ProgressMetrics({
    required this.userId,
    required this.lastUpdated,
    Map<String, List<double>>? skillTrends,
    List<double>? overallScoreTrend,
    Map<String, int>? scenarioStats,
    Map<String, double>? industryPerformance,
    this.totalSessions = 0,
    this.totalPracticeTime = Duration.zero,
    this.averageSessionLength = 0.0,
    this.currentStreak = 0,
    this.longestStreak = 0,
  })  : skillTrends = skillTrends ?? {},
        overallScoreTrend = overallScoreTrend ?? [],
        scenarioStats = scenarioStats ?? {},
        industryPerformance = industryPerformance ?? {};

  void addScore(DetailedScore score) {
    // Update overall score trend
    overallScoreTrend.add(score.overallScore);
    if (overallScoreTrend.length > 30) {
      overallScoreTrend.removeAt(0);
    }

    // Update skill trends
    final skills = {
      'confidence': score.vocalDelivery.confidence,
      'pace': score.vocalDelivery.pace,
      'energy': score.vocalDelivery.energy,
      'clarity': score.vocalDelivery.clarity,
      'rapportBuilding': score.conversationSkills.rapportBuilding,
      'activeListening': score.conversationSkills.activeListening,
      'questionQuality': score.conversationSkills.questionQuality,
      'objectionHandling': score.conversationSkills.objectionHandling,
      'closingTechnique': score.conversationSkills.closingTechnique,
      'valueArticulation': score.contentMastery.valueArticulation,
      'storyUsage': score.contentMastery.storyUsage,
      'industryKnowledge': score.contentMastery.industryKnowledge,
      'solutionFit': score.contentMastery.solutionFit,
      'clientReading': score.emotionalIntelligence.clientReading,
      'adaptation': score.emotionalIntelligence.adaptation,
      'pressureHandling': score.emotionalIntelligence.pressureHandling,
      'authenticity': score.emotionalIntelligence.authenticity,
    };

    skills.forEach((skill, value) {
      skillTrends[skill] ??= [];
      skillTrends[skill]!.add(value);
      if (skillTrends[skill]!.length > 30) {
        skillTrends[skill]!.removeAt(0);
      }
    });

    // Update session stats
    totalSessions++;
    lastUpdated = DateTime.now();
  }

  double getSkillImprovement(String skill) {
    final trend = skillTrends[skill];
    if (trend == null || trend.length < 5) return 0.0;

    final recent = trend.skip(trend.length - 5).reduce((a, b) => a + b) / 5;
    final older = trend.take(5).reduce((a, b) => a + b) / 5;

    return recent - older;
  }

  Map<String, double> get currentSkillLevels {
    final levels = <String, double>{};
    skillTrends.forEach((skill, trend) {
      if (trend.isNotEmpty) {
        levels[skill] = trend.last;
      }
    });
    return levels;
  }
}

@HiveType(typeId: 18)
enum ScoreGrade {
  @HiveField(0)
  excellent,
  @HiveField(1)
  good,
  @HiveField(2)
  satisfactory,
  @HiveField(3)
  needsImprovement,
  @HiveField(4)
  poor,
}

@HiveType(typeId: 19)
enum FeedbackType {
  @HiveField(0)
  strength,
  @HiveField(1)
  improvement,
  @HiveField(2)
  suggestion,
  @HiveField(3)
  warning,
}

@HiveType(typeId: 20)
enum FeedbackSeverity {
  @HiveField(0)
  low,
  @HiveField(1)
  medium,
  @HiveField(2)
  high,
  @HiveField(3)
  critical,
}