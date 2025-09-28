import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:get/get.dart';

import 'firebase_options.dart';
import 'ui/themes/app_theme.dart';
import 'services/auth/auth_service.dart';
import 'services/voice/voice_service.dart';
import 'services/ai/ai_service.dart';
import 'services/scenarios/scenario_service.dart';
import 'services/gamification/gamification_service.dart';
import 'models/user/user_model.dart';
import 'models/conversation/conversation_model.dart';
import 'models/scoring/scoring_model.dart';
import 'data/providers/auth_provider.dart';
import 'data/providers/theme_provider.dart';
import 'ui/screens/auth/auth_wrapper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Register Hive adapters
  Hive.registerAdapter(UserModelAdapter());
  Hive.registerAdapter(ConversationModelAdapter());
  Hive.registerAdapter(ConversationMessageAdapter());
  Hive.registerAdapter(ClientPersonaAdapter());
  Hive.registerAdapter(ConversationScoreAdapter());
  Hive.registerAdapter(DetailedScoreAdapter());
  Hive.registerAdapter(VocalDeliveryScoreAdapter());
  Hive.registerAdapter(ConversationSkillsScoreAdapter());
  Hive.registerAdapter(ContentMasteryScoreAdapter());
  Hive.registerAdapter(EmotionalIntelligenceScoreAdapter());
  Hive.registerAdapter(FeedbackPointAdapter());
  Hive.registerAdapter(ProgressMetricsAdapter());

  // Register Hive enums
  Hive.registerAdapter(ConversationStatusAdapter());
  Hive.registerAdapter(MessageSenderAdapter());
  Hive.registerAdapter(MessageTypeAdapter());
  Hive.registerAdapter(PersonalityTypeAdapter());
  Hive.registerAdapter(DecisionMakerTypeAdapter());
  Hive.registerAdapter(CommunicationStyleAdapter());
  Hive.registerAdapter(ScoreGradeAdapter());
  Hive.registerAdapter(FeedbackTypeAdapter());
  Hive.registerAdapter(FeedbackSeverityAdapter());

  // Initialize all services
  await AuthService().initialize();
  await VoiceService().initialize();
  await AIService().initialize();
  await ScenarioService().initialize();
  await GamificationService().initialize();

  runApp(const PitchHelperApp());
}

class PitchHelperApp extends StatelessWidget {
  const PitchHelperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return GetMaterialApp(
            title: 'PitchHelper',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            home: const AuthWrapper(),
            // We'll add navigation routes here later
            getPages: [
              // GetPage(name: '/login', page: () => LoginScreen()),
              // GetPage(name: '/register', page: () => RegisterScreen()),
              // GetPage(name: '/home', page: () => HomeScreen()),
              // GetPage(name: '/practice', page: () => PracticeScreen()),
              // GetPage(name: '/profile', page: () => ProfileScreen()),
            ],
          );
        },
      ),
    );
  }
}
