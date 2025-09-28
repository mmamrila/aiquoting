// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'scoring_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class DetailedScoreAdapter extends TypeAdapter<DetailedScore> {
  @override
  final int typeId = 5;

  @override
  DetailedScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return DetailedScore(
      id: fields[0] as String,
      userId: fields[1] as String,
      conversationId: fields[2] as String,
      timestamp: fields[3] as DateTime,
      overallScore: fields[4] as double,
      vocalDelivery: fields[5] as VocalDeliveryScore,
      conversationSkills: fields[6] as ConversationSkillsScore,
      contentMastery: fields[7] as ContentMasteryScore,
      emotionalIntelligence: fields[8] as EmotionalIntelligenceScore,
      feedbackPoints: (fields[9] as List?)?.cast<FeedbackPoint>(),
      metadata: (fields[10] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, DetailedScore obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.conversationId)
      ..writeByte(3)
      ..write(obj.timestamp)
      ..writeByte(4)
      ..write(obj.overallScore)
      ..writeByte(5)
      ..write(obj.vocalDelivery)
      ..writeByte(6)
      ..write(obj.conversationSkills)
      ..writeByte(7)
      ..write(obj.contentMastery)
      ..writeByte(8)
      ..write(obj.emotionalIntelligence)
      ..writeByte(9)
      ..write(obj.feedbackPoints)
      ..writeByte(10)
      ..write(obj.metadata);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DetailedScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class VocalDeliveryScoreAdapter extends TypeAdapter<VocalDeliveryScore> {
  @override
  final int typeId = 6;

  @override
  VocalDeliveryScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return VocalDeliveryScore(
      confidence: fields[0] as double,
      pace: fields[1] as double,
      energy: fields[2] as double,
      clarity: fields[3] as double,
    );
  }

  @override
  void write(BinaryWriter writer, VocalDeliveryScore obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.confidence)
      ..writeByte(1)
      ..write(obj.pace)
      ..writeByte(2)
      ..write(obj.energy)
      ..writeByte(3)
      ..write(obj.clarity);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is VocalDeliveryScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ConversationSkillsScoreAdapter
    extends TypeAdapter<ConversationSkillsScore> {
  @override
  final int typeId = 7;

  @override
  ConversationSkillsScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ConversationSkillsScore(
      rapportBuilding: fields[0] as double,
      activeListening: fields[1] as double,
      questionQuality: fields[2] as double,
      objectionHandling: fields[3] as double,
      closingTechnique: fields[4] as double,
    );
  }

  @override
  void write(BinaryWriter writer, ConversationSkillsScore obj) {
    writer
      ..writeByte(5)
      ..writeByte(0)
      ..write(obj.rapportBuilding)
      ..writeByte(1)
      ..write(obj.activeListening)
      ..writeByte(2)
      ..write(obj.questionQuality)
      ..writeByte(3)
      ..write(obj.objectionHandling)
      ..writeByte(4)
      ..write(obj.closingTechnique);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationSkillsScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ContentMasteryScoreAdapter extends TypeAdapter<ContentMasteryScore> {
  @override
  final int typeId = 8;

  @override
  ContentMasteryScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ContentMasteryScore(
      valueArticulation: fields[0] as double,
      storyUsage: fields[1] as double,
      industryKnowledge: fields[2] as double,
      solutionFit: fields[3] as double,
    );
  }

  @override
  void write(BinaryWriter writer, ContentMasteryScore obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.valueArticulation)
      ..writeByte(1)
      ..write(obj.storyUsage)
      ..writeByte(2)
      ..write(obj.industryKnowledge)
      ..writeByte(3)
      ..write(obj.solutionFit);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContentMasteryScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class EmotionalIntelligenceScoreAdapter
    extends TypeAdapter<EmotionalIntelligenceScore> {
  @override
  final int typeId = 9;

  @override
  EmotionalIntelligenceScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return EmotionalIntelligenceScore(
      clientReading: fields[0] as double,
      adaptation: fields[1] as double,
      pressureHandling: fields[2] as double,
      authenticity: fields[3] as double,
    );
  }

  @override
  void write(BinaryWriter writer, EmotionalIntelligenceScore obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.clientReading)
      ..writeByte(1)
      ..write(obj.adaptation)
      ..writeByte(2)
      ..write(obj.pressureHandling)
      ..writeByte(3)
      ..write(obj.authenticity);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmotionalIntelligenceScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class FeedbackPointAdapter extends TypeAdapter<FeedbackPoint> {
  @override
  final int typeId = 16;

  @override
  FeedbackPoint read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return FeedbackPoint(
      id: fields[0] as String,
      type: fields[1] as FeedbackType,
      skill: fields[2] as String,
      message: fields[3] as String,
      suggestion: fields[4] as String,
      timestamp: fields[5] as double,
      severity: fields[6] as FeedbackSeverity,
    );
  }

  @override
  void write(BinaryWriter writer, FeedbackPoint obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.type)
      ..writeByte(2)
      ..write(obj.skill)
      ..writeByte(3)
      ..write(obj.message)
      ..writeByte(4)
      ..write(obj.suggestion)
      ..writeByte(5)
      ..write(obj.timestamp)
      ..writeByte(6)
      ..write(obj.severity);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FeedbackPointAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ProgressMetricsAdapter extends TypeAdapter<ProgressMetrics> {
  @override
  final int typeId = 17;

  @override
  ProgressMetrics read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ProgressMetrics(
      userId: fields[0] as String,
      lastUpdated: fields[1] as DateTime,
      skillTrends: (fields[2] as Map?)?.map((dynamic k, dynamic v) =>
          MapEntry(k as String, (v as List).cast<double>())),
      overallScoreTrend: (fields[3] as List?)?.cast<double>(),
      scenarioStats: (fields[4] as Map?)?.cast<String, int>(),
      industryPerformance: (fields[5] as Map?)?.cast<String, double>(),
      totalSessions: fields[6] as int,
      totalPracticeTime: fields[7] as Duration,
      averageSessionLength: fields[8] as double,
      currentStreak: fields[9] as int,
      longestStreak: fields[10] as int,
    );
  }

  @override
  void write(BinaryWriter writer, ProgressMetrics obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.lastUpdated)
      ..writeByte(2)
      ..write(obj.skillTrends)
      ..writeByte(3)
      ..write(obj.overallScoreTrend)
      ..writeByte(4)
      ..write(obj.scenarioStats)
      ..writeByte(5)
      ..write(obj.industryPerformance)
      ..writeByte(6)
      ..write(obj.totalSessions)
      ..writeByte(7)
      ..write(obj.totalPracticeTime)
      ..writeByte(8)
      ..write(obj.averageSessionLength)
      ..writeByte(9)
      ..write(obj.currentStreak)
      ..writeByte(10)
      ..write(obj.longestStreak);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProgressMetricsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ScoreGradeAdapter extends TypeAdapter<ScoreGrade> {
  @override
  final int typeId = 18;

  @override
  ScoreGrade read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return ScoreGrade.excellent;
      case 1:
        return ScoreGrade.good;
      case 2:
        return ScoreGrade.satisfactory;
      case 3:
        return ScoreGrade.needsImprovement;
      case 4:
        return ScoreGrade.poor;
      default:
        return ScoreGrade.excellent;
    }
  }

  @override
  void write(BinaryWriter writer, ScoreGrade obj) {
    switch (obj) {
      case ScoreGrade.excellent:
        writer.writeByte(0);
        break;
      case ScoreGrade.good:
        writer.writeByte(1);
        break;
      case ScoreGrade.satisfactory:
        writer.writeByte(2);
        break;
      case ScoreGrade.needsImprovement:
        writer.writeByte(3);
        break;
      case ScoreGrade.poor:
        writer.writeByte(4);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ScoreGradeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class FeedbackTypeAdapter extends TypeAdapter<FeedbackType> {
  @override
  final int typeId = 19;

  @override
  FeedbackType read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return FeedbackType.strength;
      case 1:
        return FeedbackType.improvement;
      case 2:
        return FeedbackType.suggestion;
      case 3:
        return FeedbackType.warning;
      default:
        return FeedbackType.strength;
    }
  }

  @override
  void write(BinaryWriter writer, FeedbackType obj) {
    switch (obj) {
      case FeedbackType.strength:
        writer.writeByte(0);
        break;
      case FeedbackType.improvement:
        writer.writeByte(1);
        break;
      case FeedbackType.suggestion:
        writer.writeByte(2);
        break;
      case FeedbackType.warning:
        writer.writeByte(3);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FeedbackTypeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class FeedbackSeverityAdapter extends TypeAdapter<FeedbackSeverity> {
  @override
  final int typeId = 20;

  @override
  FeedbackSeverity read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return FeedbackSeverity.low;
      case 1:
        return FeedbackSeverity.medium;
      case 2:
        return FeedbackSeverity.high;
      case 3:
        return FeedbackSeverity.critical;
      default:
        return FeedbackSeverity.low;
    }
  }

  @override
  void write(BinaryWriter writer, FeedbackSeverity obj) {
    switch (obj) {
      case FeedbackSeverity.low:
        writer.writeByte(0);
        break;
      case FeedbackSeverity.medium:
        writer.writeByte(1);
        break;
      case FeedbackSeverity.high:
        writer.writeByte(2);
        break;
      case FeedbackSeverity.critical:
        writer.writeByte(3);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FeedbackSeverityAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
