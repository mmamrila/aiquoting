import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../../../data/providers/auth_provider.dart' as app_auth;
import '../../../models/user/user_model.dart';
import 'login_screen.dart';
import '../home/home_screen.dart';

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    // DEBUG MODE: Skip authentication in debug builds for easy testing
    if (kDebugMode) {
      return Consumer<app_auth.AuthProvider>(
        builder: (context, authProvider, child) {
          // Create a demo user if none exists
          if (authProvider.currentUser == null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _createDemoUser(authProvider);
            });
            return const Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Loading Demo User...'),
                  ],
                ),
              ),
            );
          }
          return const HomeScreen();
        },
      );
    }

    // PRODUCTION MODE: Use Firebase authentication
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        // Show loading spinner while checking auth state
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Show error if something went wrong
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Something went wrong!',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please restart the app and try again.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          );
        }

        // Check if user is signed in
        final user = snapshot.data;
        final authProvider = Provider.of<app_auth.AuthProvider>(context, listen: false);

        if (user != null && authProvider.currentUser != null) {
          // User is signed in and profile is loaded
          return const HomeScreen();
        } else {
          // User is not signed in
          return const LoginScreen();
        }
      },
    );
  }

  void _createDemoUser(app_auth.AuthProvider authProvider) {
    final demoUser = UserModel(
      uid: 'demo_user_123',
      email: 'demo@pitchhelper.com',
      firstName: 'Demo',
      lastName: 'User',
      profileImageUrl: null,
      industry: 'Technology',
      experienceLevel: 'Intermediate (2-5 years)',
      company: 'Demo Corp',
      jobTitle: 'Sales Manager',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      isActive: true,
      isPremium: false,
      totalSessions: 15,
      averageScore: 78.5,
      bestScore: 89.2,
      currentStreak: 3,
      longestStreak: 7,
      achievements: [
        'First Session',
        'Week Warrior',
        'Score Master',
        'Conversation Expert',
      ],
    );

    authProvider.setCurrentUser(demoUser);
  }
}