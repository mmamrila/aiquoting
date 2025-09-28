import 'dart:math';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/user/user_model.dart';
import '../../models/conversation/conversation_model.dart';
import '../../models/scoring/scoring_model.dart';

class GamificationService extends ChangeNotifier {
  static final GamificationService _instance = GamificationService._internal();
  factory GamificationService() => _instance;
  GamificationService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Achievement tracking
  final Map<String, Achievement> _achievements = {};
  final List<LeaderboardEntry> _globalLeaderboard = [];
  final Map<String, List<LeaderboardEntry>> _categoryLeaderboards = {};

  // Getters
  Map<String, Achievement> get achievements => _achievements;
  List<LeaderboardEntry> get globalLeaderboard => _globalLeaderboard;
  Map<String, List<LeaderboardEntry>> get categoryLeaderboards => _categoryLeaderboards;

  // Initialize gamification system
  Future<void> initialize() async {
    await _loadAchievements();
    await _loadLeaderboards();
    debugPrint('GamificationService initialized with ${_achievements.length} achievements');
  }

  // Process user action for achievements and points
  Future<List<Achievement>> processUserAction({
    required String userId,
    required UserModel user,
    ConversationModel? conversation,
    DetailedScore? score,
    String? actionType,
    Map<String, dynamic>? metadata,
  }) async {
    final newAchievements = <Achievement>[];

    // Check all achievements for unlocking
    for (final achievement in _achievements.values) {
      if (user.achievements.contains(achievement.id)) continue;

      if (await _checkAchievementCriteria(achievement, user, conversation, score, actionType, metadata)) {
        newAchievements.add(achievement);
        await _unlockAchievement(userId, achievement);
      }
    }

    // Update leaderboards if score provided
    if (score != null) {
      await _updateLeaderboards(user, score);
    }

    return newAchievements;
  }

  // Check if achievement criteria is met
  Future<bool> _checkAchievementCriteria(
    Achievement achievement,
    UserModel user,
    ConversationModel? conversation,
    DetailedScore? score,
    String? actionType,
    Map<String, dynamic>? metadata,
  ) async {
    switch (achievement.type) {
      case AchievementType.firstSession:
        return user.totalSessions >= 1;

      case AchievementType.sessionsCompleted:
        return user.totalSessions >= achievement.targetValue;

      case AchievementType.perfectScore:
        return score?.overallScore == 100.0;

      case AchievementType.highScore:
        return score != null && score.overallScore >= achievement.targetValue;

      case AchievementType.streak:
        return user.currentStreak >= achievement.targetValue;

      case AchievementType.skillMastery:
        if (score == null) return false;
        final skillName = achievement.metadata['skill'] as String?;
        if (skillName == null) return false;
        return _getSkillScore(score, skillName) >= achievement.targetValue;

      case AchievementType.industryExpert:
        final targetIndustry = achievement.metadata['industry'] as String?;
        if (targetIndustry == null || user.industry != targetIndustry) return false;
        return user.totalSessions >= achievement.targetValue;

      case AchievementType.scenarioMaster:
        final scenarioType = achievement.metadata['scenarioType'] as String?;
        if (scenarioType == null || conversation?.scenarioType != scenarioType) return false;
        return score != null && score.overallScore >= achievement.targetValue;

      case AchievementType.earlyBird:
        return actionType == 'morning_practice' && DateTime.now().hour < 8;

      case AchievementType.nightOwl:
        return actionType == 'evening_practice' && DateTime.now().hour >= 20;

      case AchievementType.weekendWarrior:
        final now = DateTime.now();
        return actionType == 'practice_session' && (now.weekday == DateTime.saturday || now.weekday == DateTime.sunday);

      case AchievementType.social:
        return actionType == 'share_achievement' || actionType == 'pitch_shared';

      case AchievementType.improvement:
        if (score == null) return false;
        final previousScore = metadata?['previousScore'] as double?;
        if (previousScore == null) return false;
        return score.overallScore - previousScore >= achievement.targetValue;

      case AchievementType.consistency:
        return user.totalSessions >= 30 && user.currentStreak >= 7;

      case AchievementType.mentor:
        return actionType == 'help_peer' || actionType == 'mentor_session';

      case AchievementType.special:
        return _checkSpecialAchievement(achievement, user, conversation, score, actionType, metadata);
    }
  }

  bool _checkSpecialAchievement(
    Achievement achievement,
    UserModel user,
    ConversationModel? conversation,
    DetailedScore? score,
    String? actionType,
    Map<String, dynamic>? metadata,
  ) {
    switch (achievement.id) {
      case 'objection_crusher':
        return score != null && score.conversationSkills.objectionHandling >= 90.0;
      case 'rapport_master':
        return score != null && score.conversationSkills.rapportBuilding >= 95.0;
      case 'closer_extraordinaire':
        return score != null && score.conversationSkills.closingTechnique >= 95.0;
      case 'voice_of_confidence':
        return score != null && score.vocalDelivery.confidence >= 95.0;
      case 'speed_demon':
        return conversation != null && conversation.averageResponseTime <= 3.0;
      case 'marathon_session':
        return conversation != null && conversation.duration.inMinutes >= 45;
      default:
        return false;
    }
  }

  double _getSkillScore(DetailedScore score, String skillName) {
    switch (skillName) {
      case 'confidence':
        return score.vocalDelivery.confidence;
      case 'pace':
        return score.vocalDelivery.pace;
      case 'energy':
        return score.vocalDelivery.energy;
      case 'clarity':
        return score.vocalDelivery.clarity;
      case 'rapport_building':
        return score.conversationSkills.rapportBuilding;
      case 'active_listening':
        return score.conversationSkills.activeListening;
      case 'question_quality':
        return score.conversationSkills.questionQuality;
      case 'objection_handling':
        return score.conversationSkills.objectionHandling;
      case 'closing_technique':
        return score.conversationSkills.closingTechnique;
      case 'value_articulation':
        return score.contentMastery.valueArticulation;
      case 'story_usage':
        return score.contentMastery.storyUsage;
      case 'industry_knowledge':
        return score.contentMastery.industryKnowledge;
      case 'solution_fit':
        return score.contentMastery.solutionFit;
      case 'client_reading':
        return score.emotionalIntelligence.clientReading;
      case 'adaptation':
        return score.emotionalIntelligence.adaptation;
      case 'pressure_handling':
        return score.emotionalIntelligence.pressureHandling;
      case 'authenticity':
        return score.emotionalIntelligence.authenticity;
      default:
        return 0.0;
    }
  }

  // Unlock achievement for user
  Future<void> _unlockAchievement(String userId, Achievement achievement) async {
    try {
      await _firestore.collection('user_achievements').add({
        'userId': userId,
        'achievementId': achievement.id,
        'unlockedAt': Timestamp.now(),
        'points': achievement.points,
      });

      // Update user's achievements list
      await _firestore.collection('users').doc(userId).update({
        'achievements': FieldValue.arrayUnion([achievement.id]),
      });

      debugPrint('Achievement unlocked: ${achievement.title} for user $userId');
    } catch (e) {
      debugPrint('Failed to unlock achievement: $e');
    }
  }

  // Update leaderboards
  Future<void> _updateLeaderboards(UserModel user, DetailedScore score) async {
    try {
      final entry = LeaderboardEntry(
        userId: user.uid,
        userName: user.fullName,
        score: score.overallScore,
        industry: user.industry,
        experienceLevel: user.experienceCategory,
        avatarUrl: user.profileImageUrl,
        timestamp: DateTime.now(),
      );

      // Update global leaderboard
      await _firestore.collection('leaderboard_global').doc(user.uid).set(
        entry.toMap(),
        SetOptions(merge: true),
      );

      // Update industry leaderboard
      await _firestore.collection('leaderboard_${user.industry.toLowerCase()}').doc(user.uid).set(
        entry.toMap(),
        SetOptions(merge: true),
      );

      // Update experience level leaderboard
      await _firestore.collection('leaderboard_${user.experienceCategory.toLowerCase()}').doc(user.uid).set(
        entry.toMap(),
        SetOptions(merge: true),
      );
    } catch (e) {
      debugPrint('Failed to update leaderboards: $e');
    }
  }

  // Load achievements
  Future<void> _loadAchievements() async {
    _achievements.clear();

    // First Session
    _achievements['first_session'] = Achievement(
      id: 'first_session',
      title: 'Welcome to PitchHelper!',
      description: 'Complete your first practice session',
      type: AchievementType.firstSession,
      rarity: AchievementRarity.common,
      icon: Icons.play_circle_filled,
      points: 50,
      targetValue: 1,
    );

    // Session Milestones
    _achievements['sessions_10'] = Achievement(
      id: 'sessions_10',
      title: 'Getting Started',
      description: 'Complete 10 practice sessions',
      type: AchievementType.sessionsCompleted,
      rarity: AchievementRarity.common,
      icon: Icons.speed,
      points: 100,
      targetValue: 10,
    );

    _achievements['sessions_50'] = Achievement(
      id: 'sessions_50',
      title: 'Dedicated Learner',
      description: 'Complete 50 practice sessions',
      type: AchievementType.sessionsCompleted,
      rarity: AchievementRarity.uncommon,
      icon: Icons.school,
      points: 250,
      targetValue: 50,
    );

    _achievements['sessions_100'] = Achievement(
      id: 'sessions_100',
      title: 'Sales Warrior',
      description: 'Complete 100 practice sessions',
      type: AchievementType.sessionsCompleted,
      rarity: AchievementRarity.rare,
      icon: Icons.military_tech,
      points: 500,
      targetValue: 100,
    );

    // Perfect Scores
    _achievements['perfect_score'] = Achievement(
      id: 'perfect_score',
      title: 'Flawless Victory',
      description: 'Achieve a perfect score of 100%',
      type: AchievementType.perfectScore,
      rarity: AchievementRarity.legendary,
      icon: Icons.stars,
      points: 1000,
      targetValue: 100,
    );

    // High Score Achievements
    _achievements['excellent_score'] = Achievement(
      id: 'excellent_score',
      title: 'Excellence Achieved',
      description: 'Score 90% or higher in a session',
      type: AchievementType.highScore,
      rarity: AchievementRarity.rare,
      icon: Icons.star,
      points: 200,
      targetValue: 90,
    );

    // Streak Achievements
    _achievements['streak_7'] = Achievement(
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Practice for 7 consecutive days',
      type: AchievementType.streak,
      rarity: AchievementRarity.uncommon,
      icon: Icons.local_fire_department,
      points: 150,
      targetValue: 7,
    );

    _achievements['streak_30'] = Achievement(
      id: 'streak_30',
      title: 'Monthly Master',
      description: 'Practice for 30 consecutive days',
      type: AchievementType.streak,
      rarity: AchievementRarity.epic,
      icon: Icons.whatshot,
      points: 750,
      targetValue: 30,
    );

    // Skill Mastery
    _achievements['confidence_master'] = Achievement(
      id: 'confidence_master',
      title: 'Voice of Authority',
      description: 'Achieve 95% confidence score',
      type: AchievementType.skillMastery,
      rarity: AchievementRarity.rare,
      icon: Icons.record_voice_over,
      points: 300,
      targetValue: 95,
      metadata: {'skill': 'confidence'},
    );

    _achievements['objection_master'] = Achievement(
      id: 'objection_master',
      title: 'Objection Crusher',
      description: 'Master objection handling with 90% score',
      type: AchievementType.skillMastery,
      rarity: AchievementRarity.rare,
      icon: Icons.shield,
      points: 300,
      targetValue: 90,
      metadata: {'skill': 'objection_handling'},
    );

    // Time-based Achievements
    _achievements['early_bird'] = Achievement(
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Practice before 8 AM',
      type: AchievementType.earlyBird,
      rarity: AchievementRarity.uncommon,
      icon: Icons.wb_sunny,
      points: 100,
      targetValue: 1,
    );

    _achievements['night_owl'] = Achievement(
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Practice after 8 PM',
      type: AchievementType.nightOwl,
      rarity: AchievementRarity.uncommon,
      icon: Icons.nightlight_round,
      points: 100,
      targetValue: 1,
    );

    // Special Achievements
    _achievements['comeback_kid'] = Achievement(
      id: 'comeback_kid',
      title: 'Comeback Kid',
      description: 'Improve your score by 30 points in one session',
      type: AchievementType.improvement,
      rarity: AchievementRarity.epic,
      icon: Icons.trending_up,
      points: 400,
      targetValue: 30,
    );

    // Industry Achievements
    for (final industry in ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail']) {
      _achievements['industry_${industry.toLowerCase()}'] = Achievement(
        id: 'industry_${industry.toLowerCase()}',
        title: '$industry Expert',
        description: 'Complete 25 sessions in $industry',
        type: AchievementType.industryExpert,
        rarity: AchievementRarity.rare,
        icon: Icons.business,
        points: 300,
        targetValue: 25,
        metadata: {'industry': industry},
      );
    }
  }

  // Load leaderboards
  Future<void> _loadLeaderboards() async {
    try {
      // Load global leaderboard
      final globalQuery = await _firestore
          .collection('leaderboard_global')
          .orderBy('score', descending: true)
          .limit(100)
          .get();

      _globalLeaderboard.clear();
      for (final doc in globalQuery.docs) {
        _globalLeaderboard.add(LeaderboardEntry.fromMap(doc.data()));
      }

      // Load category leaderboards
      final categories = ['technology', 'healthcare', 'finance', 'beginner', 'expert'];
      for (final category in categories) {
        final categoryQuery = await _firestore
            .collection('leaderboard_$category')
            .orderBy('score', descending: true)
            .limit(50)
            .get();

        _categoryLeaderboards[category] = [];
        for (final doc in categoryQuery.docs) {
          _categoryLeaderboards[category]!.add(LeaderboardEntry.fromMap(doc.data()));
        }
      }

      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load leaderboards: $e');
    }
  }

  // Get user rank in leaderboard
  Future<int> getUserRank(String userId, {String? category}) async {
    try {
      final collection = category != null ? 'leaderboard_$category' : 'leaderboard_global';
      final userDoc = await _firestore.collection(collection).doc(userId).get();

      if (!userDoc.exists) return -1;

      final userScore = userDoc.data()!['score'] as double;
      final higherScoresQuery = await _firestore
          .collection(collection)
          .where('score', isGreaterThan: userScore)
          .get();

      return higherScoresQuery.docs.length + 1;
    } catch (e) {
      debugPrint('Failed to get user rank: $e');
      return -1;
    }
  }

  // Get achievement progress
  double getAchievementProgress(Achievement achievement, UserModel user) {
    switch (achievement.type) {
      case AchievementType.sessionsCompleted:
        return (user.totalSessions / achievement.targetValue).clamp(0.0, 1.0);
      case AchievementType.streak:
        return (user.currentStreak / achievement.targetValue).clamp(0.0, 1.0);
      default:
        return user.achievements.contains(achievement.id) ? 1.0 : 0.0;
    }
  }

  // Calculate total user points
  int calculateUserPoints(UserModel user) {
    int totalPoints = 0;
    for (final achievementId in user.achievements) {
      final achievement = _achievements[achievementId];
      if (achievement != null) {
        totalPoints += achievement.points;
      }
    }
    return totalPoints;
  }

  // Get user badges
  List<Achievement> getUserBadges(UserModel user) {
    return user.achievements
        .map((id) => _achievements[id])
        .where((achievement) => achievement != null)
        .cast<Achievement>()
        .toList();
  }
}

class Achievement {
  final String id;
  final String title;
  final String description;
  final AchievementType type;
  final AchievementRarity rarity;
  final IconData icon;
  final int points;
  final double targetValue;
  final Map<String, dynamic> metadata;

  Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.rarity,
    required this.icon,
    required this.points,
    required this.targetValue,
    this.metadata = const {},
  });

  Color get rarityColor {
    switch (rarity) {
      case AchievementRarity.common:
        return Colors.grey;
      case AchievementRarity.uncommon:
        return Colors.green;
      case AchievementRarity.rare:
        return Colors.blue;
      case AchievementRarity.epic:
        return Colors.purple;
      case AchievementRarity.legendary:
        return Colors.orange;
    }
  }

  String get rarityText {
    switch (rarity) {
      case AchievementRarity.common:
        return 'Common';
      case AchievementRarity.uncommon:
        return 'Uncommon';
      case AchievementRarity.rare:
        return 'Rare';
      case AchievementRarity.epic:
        return 'Epic';
      case AchievementRarity.legendary:
        return 'Legendary';
    }
  }
}

class LeaderboardEntry {
  final String userId;
  final String userName;
  final double score;
  final String industry;
  final String experienceLevel;
  final String? avatarUrl;
  final DateTime timestamp;

  LeaderboardEntry({
    required this.userId,
    required this.userName,
    required this.score,
    required this.industry,
    required this.experienceLevel,
    this.avatarUrl,
    required this.timestamp,
  });

  factory LeaderboardEntry.fromMap(Map<String, dynamic> map) {
    return LeaderboardEntry(
      userId: map['userId'] ?? '',
      userName: map['userName'] ?? '',
      score: (map['score'] ?? 0.0).toDouble(),
      industry: map['industry'] ?? '',
      experienceLevel: map['experienceLevel'] ?? '',
      avatarUrl: map['avatarUrl'],
      timestamp: (map['timestamp'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'score': score,
      'industry': industry,
      'experienceLevel': experienceLevel,
      'avatarUrl': avatarUrl,
      'timestamp': Timestamp.fromDate(timestamp),
    };
  }
}

enum AchievementType {
  firstSession,
  sessionsCompleted,
  perfectScore,
  highScore,
  streak,
  skillMastery,
  industryExpert,
  scenarioMaster,
  earlyBird,
  nightOwl,
  weekendWarrior,
  social,
  improvement,
  consistency,
  mentor,
  special,
}

enum AchievementRarity {
  common,
  uncommon,
  rare,
  epic,
  legendary,
}