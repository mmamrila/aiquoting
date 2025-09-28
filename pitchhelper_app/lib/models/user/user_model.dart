import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:hive/hive.dart';

part 'user_model.g.dart';

@HiveType(typeId: 0)
class UserModel extends HiveObject {
  @HiveField(0)
  String uid;

  @HiveField(1)
  String email;

  @HiveField(2)
  String firstName;

  @HiveField(3)
  String lastName;

  @HiveField(4)
  String? profileImageUrl;

  @HiveField(5)
  String industry;

  @HiveField(6)
  String experienceLevel;

  @HiveField(7)
  String? company;

  @HiveField(8)
  String? jobTitle;

  @HiveField(9)
  DateTime createdAt;

  @HiveField(10)
  DateTime updatedAt;

  @HiveField(11)
  bool isActive;

  @HiveField(12)
  bool isPremium;

  @HiveField(13)
  int totalSessions;

  @HiveField(14)
  double averageScore;

  @HiveField(15)
  double bestScore;

  @HiveField(16)
  int currentStreak;

  @HiveField(17)
  int longestStreak;

  @HiveField(18)
  List<String> achievements;

  @HiveField(19)
  Map<String, dynamic> preferences;

  @HiveField(20)
  Map<String, double> skillScores;

  UserModel({
    required this.uid,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.profileImageUrl,
    required this.industry,
    required this.experienceLevel,
    this.company,
    this.jobTitle,
    required this.createdAt,
    required this.updatedAt,
    this.isActive = true,
    this.isPremium = false,
    this.totalSessions = 0,
    this.averageScore = 0.0,
    this.bestScore = 0.0,
    this.currentStreak = 0,
    this.longestStreak = 0,
    List<String>? achievements,
    Map<String, dynamic>? preferences,
    Map<String, double>? skillScores,
  })  : achievements = achievements ?? [],
        preferences = preferences ?? _defaultPreferences(),
        skillScores = skillScores ?? _defaultSkillScores();

  // Factory constructor from Firestore
  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    return UserModel(
      uid: doc.id,
      email: data['email'] ?? '',
      firstName: data['firstName'] ?? '',
      lastName: data['lastName'] ?? '',
      profileImageUrl: data['profileImageUrl'],
      industry: data['industry'] ?? '',
      experienceLevel: data['experienceLevel'] ?? '',
      company: data['company'],
      jobTitle: data['jobTitle'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
      isActive: data['isActive'] ?? true,
      isPremium: data['isPremium'] ?? false,
      totalSessions: data['totalSessions'] ?? 0,
      averageScore: (data['averageScore'] ?? 0.0).toDouble(),
      bestScore: (data['bestScore'] ?? 0.0).toDouble(),
      currentStreak: data['currentStreak'] ?? 0,
      longestStreak: data['longestStreak'] ?? 0,
      achievements: List<String>.from(data['achievements'] ?? []),
      preferences: Map<String, dynamic>.from(data['preferences'] ?? _defaultPreferences()),
      skillScores: Map<String, double>.from(data['skillScores'] ?? _defaultSkillScores()),
    );
  }

  // Convert to Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'profileImageUrl': profileImageUrl,
      'industry': industry,
      'experienceLevel': experienceLevel,
      'company': company,
      'jobTitle': jobTitle,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isActive': isActive,
      'isPremium': isPremium,
      'totalSessions': totalSessions,
      'averageScore': averageScore,
      'bestScore': bestScore,
      'currentStreak': currentStreak,
      'longestStreak': longestStreak,
      'achievements': achievements,
      'preferences': preferences,
      'skillScores': skillScores,
    };
  }

  // Getters
  String get fullName => '$firstName $lastName';
  String get displayName => fullName.isNotEmpty ? fullName : email.split('@').first;

  bool get isCompleteProfile =>
    firstName.isNotEmpty &&
    lastName.isNotEmpty &&
    industry.isNotEmpty &&
    experienceLevel.isNotEmpty;

  String get experienceCategory {
    if (experienceLevel.contains('Beginner')) return 'Beginner';
    if (experienceLevel.contains('Intermediate')) return 'Intermediate';
    if (experienceLevel.contains('Advanced')) return 'Advanced';
    return 'Expert';
  }

  // Helper methods
  void updateScore(double newScore) {
    totalSessions++;
    averageScore = ((averageScore * (totalSessions - 1)) + newScore) / totalSessions;
    if (newScore > bestScore) {
      bestScore = newScore;
    }
    updatedAt = DateTime.now();
  }

  void addAchievement(String achievement) {
    if (!achievements.contains(achievement)) {
      achievements.add(achievement);
      updatedAt = DateTime.now();
    }
  }

  void updateStreak(bool practiceToday) {
    if (practiceToday) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    updatedAt = DateTime.now();
  }

  void updateSkillScore(String skill, double score) {
    skillScores[skill] = score;
    updatedAt = DateTime.now();
  }

  // Default preferences
  static Map<String, dynamic> _defaultPreferences() {
    return {
      'voiceEnabled': true,
      'speechRate': 0.5,
      'speechPitch': 1.0,
      'speechVolume': 1.0,
      'autoPlayResponses': true,
      'sessionReminders': true,
      'scoreNotifications': true,
      'leaderboardVisible': true,
      'shareAchievements': false,
      'darkMode': false,
      'bluetoothAutoConnect': true,
      'backgroundNoiseCancellation': true,
    };
  }

  // Default skill scores
  static Map<String, double> _defaultSkillScores() {
    return {
      'confidence': 0.0,
      'pace': 0.0,
      'energy': 0.0,
      'clarity': 0.0,
      'rapport_building': 0.0,
      'active_listening': 0.0,
      'question_quality': 0.0,
      'objection_handling': 0.0,
      'closing_technique': 0.0,
      'value_articulation': 0.0,
      'story_usage': 0.0,
      'industry_knowledge': 0.0,
      'solution_fit': 0.0,
      'client_reading': 0.0,
      'adaptation': 0.0,
      'pressure_handling': 0.0,
      'authenticity': 0.0,
    };
  }

  // Copy with method
  UserModel copyWith({
    String? uid,
    String? email,
    String? firstName,
    String? lastName,
    String? profileImageUrl,
    String? industry,
    String? experienceLevel,
    String? company,
    String? jobTitle,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isActive,
    bool? isPremium,
    int? totalSessions,
    double? averageScore,
    double? bestScore,
    int? currentStreak,
    int? longestStreak,
    List<String>? achievements,
    Map<String, dynamic>? preferences,
    Map<String, double>? skillScores,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      industry: industry ?? this.industry,
      experienceLevel: experienceLevel ?? this.experienceLevel,
      company: company ?? this.company,
      jobTitle: jobTitle ?? this.jobTitle,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isActive: isActive ?? this.isActive,
      isPremium: isPremium ?? this.isPremium,
      totalSessions: totalSessions ?? this.totalSessions,
      averageScore: averageScore ?? this.averageScore,
      bestScore: bestScore ?? this.bestScore,
      currentStreak: currentStreak ?? this.currentStreak,
      longestStreak: longestStreak ?? this.longestStreak,
      achievements: achievements ?? this.achievements,
      preferences: preferences ?? this.preferences,
      skillScores: skillScores ?? this.skillScores,
    );
  }
}