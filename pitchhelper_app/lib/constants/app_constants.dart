class AppConstants {
  // App Information
  static const String appName = 'PitchHelper';
  static const String appVersion = '1.0.0';
  static const String appDescription = 'AI-powered sales practice app for voice training on the go';

  // Firebase Collections
  static const String usersCollection = 'users';
  static const String conversationsCollection = 'conversations';
  static const String scoresCollection = 'scores';
  static const String leaderboardCollection = 'leaderboard';

  // Audio Settings
  static const int maxRecordingDuration = 300; // 5 minutes
  static const int minRecordingDuration = 5; // 5 seconds
  static const String audioFormat = 'wav';
  static const int sampleRate = 16000;

  // AI Configuration
  static const String openAIModel = 'gpt-4';
  static const int maxTokens = 1000;
  static const double temperature = 0.7;
  static const int maxConversationHistory = 20;

  // Voice Settings
  static const double speechRate = 0.5;
  static const double speechPitch = 1.0;
  static const double speechVolume = 1.0;

  // Scoring Thresholds
  static const double excellentScore = 85.0;
  static const double goodScore = 70.0;
  static const double averageScore = 55.0;
  static const double poorScore = 40.0;

  // Industry Types
  static const List<String> industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Real Estate',
    'Insurance',
    'Manufacturing',
    'Retail',
    'Education',
    'Consulting',
    'Other'
  ];

  // Experience Levels
  static const List<String> experienceLevels = [
    'Beginner (0-1 years)',
    'Intermediate (1-3 years)',
    'Advanced (3-5 years)',
    'Expert (5+ years)'
  ];

  // Conversation Types
  static const List<String> conversationTypes = [
    'Cold Call',
    'Discovery Call',
    'Product Demo',
    'Objection Handling',
    'Closing Call',
    'Follow-up Call'
  ];

  // Client Personas
  static const List<String> clientPersonas = [
    'Analytical Buyer',
    'Relationship Builder',
    'Budget-Conscious',
    'Innovation Seeker',
    'Time-Pressed Executive'
  ];
}