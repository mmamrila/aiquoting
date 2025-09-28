import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/user/user_model.dart';
import '../../constants/app_constants.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  UserModel? _currentUser;
  UserModel? get currentUser => _currentUser;

  // Debug mode setter for testing
  set currentUser(UserModel? user) => _currentUser = user;

  // Stream of auth state changes
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Check if user is signed in
  bool get isSignedIn => _auth.currentUser != null;

  // Get current Firebase user
  User? get firebaseUser => _auth.currentUser;

  // Initialize auth service
  Future<void> initialize() async {
    final user = _auth.currentUser;
    if (user != null) {
      await _loadUserProfile(user.uid);
    }
  }

  // Register new user with email and password
  Future<UserModel?> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String industry,
    required String experienceLevel,
    String? company,
    String? jobTitle,
  }) async {
    try {
      // Create Firebase user
      final UserCredential userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final User? user = userCredential.user;
      if (user != null) {
        // Create user profile in Firestore
        final UserModel userModel = UserModel(
          uid: user.uid,
          email: email,
          firstName: firstName,
          lastName: lastName,
          industry: industry,
          experienceLevel: experienceLevel,
          company: company,
          jobTitle: jobTitle,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        // Save to Firestore
        await _firestore
            .collection(AppConstants.usersCollection)
            .doc(user.uid)
            .set(userModel.toFirestore());

        // Update Firebase display name
        await user.updateDisplayName(userModel.fullName);

        _currentUser = userModel;
        await _saveUserToLocal(userModel);

        return userModel;
      }
    } catch (e) {
      print('Registration error: $e');
      rethrow;
    }
    return null;
  }

  // Sign in with email and password
  Future<UserModel?> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final User? user = userCredential.user;
      if (user != null) {
        await _loadUserProfile(user.uid);
        return _currentUser;
      }
    } catch (e) {
      print('Sign in error: $e');
      rethrow;
    }
    return null;
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      _currentUser = null;
      await _clearLocalUser();
    } catch (e) {
      print('Sign out error: $e');
      rethrow;
    }
  }

  // Reset password
  Future<void> resetPassword(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } catch (e) {
      print('Password reset error: $e');
      rethrow;
    }
  }

  // Update user profile
  Future<void> updateUserProfile({
    String? firstName,
    String? lastName,
    String? industry,
    String? experienceLevel,
    String? company,
    String? jobTitle,
    String? profileImageUrl,
    Map<String, dynamic>? preferences,
  }) async {
    if (_currentUser == null) return;

    try {
      final updatedUser = _currentUser!.copyWith(
        firstName: firstName,
        lastName: lastName,
        industry: industry,
        experienceLevel: experienceLevel,
        company: company,
        jobTitle: jobTitle,
        profileImageUrl: profileImageUrl,
        preferences: preferences,
        updatedAt: DateTime.now(),
      );

      // Update in Firestore
      await _firestore
          .collection(AppConstants.usersCollection)
          .doc(_currentUser!.uid)
          .update(updatedUser.toFirestore());

      // Update Firebase display name if name changed
      if (firstName != null || lastName != null) {
        await _auth.currentUser?.updateDisplayName(updatedUser.fullName);
      }

      _currentUser = updatedUser;
      await _saveUserToLocal(updatedUser);
    } catch (e) {
      print('Update profile error: $e');
      rethrow;
    }
  }

  // Update user statistics
  Future<void> updateUserStats({
    double? newScore,
    String? achievement,
    bool? practiceToday,
    String? skill,
    double? skillScore,
  }) async {
    if (_currentUser == null) return;

    try {
      UserModel updatedUser = _currentUser!;

      if (newScore != null) {
        updatedUser.updateScore(newScore);
      }

      if (achievement != null) {
        updatedUser.addAchievement(achievement);
      }

      if (practiceToday != null) {
        updatedUser.updateStreak(practiceToday);
      }

      if (skill != null && skillScore != null) {
        updatedUser.updateSkillScore(skill, skillScore);
      }

      // Update in Firestore
      await _firestore
          .collection(AppConstants.usersCollection)
          .doc(_currentUser!.uid)
          .update(updatedUser.toFirestore());

      _currentUser = updatedUser;
      await _saveUserToLocal(updatedUser);
    } catch (e) {
      print('Update user stats error: $e');
      rethrow;
    }
  }

  // Delete user account
  Future<void> deleteAccount() async {
    if (_currentUser == null) return;

    try {
      // Delete user data from Firestore
      await _firestore
          .collection(AppConstants.usersCollection)
          .doc(_currentUser!.uid)
          .delete();

      // Delete conversations
      final conversationsQuery = await _firestore
          .collection(AppConstants.conversationsCollection)
          .where('userId', isEqualTo: _currentUser!.uid)
          .get();

      for (var doc in conversationsQuery.docs) {
        await doc.reference.delete();
      }

      // Delete Firebase user
      await _auth.currentUser?.delete();

      _currentUser = null;
      await _clearLocalUser();
    } catch (e) {
      print('Delete account error: $e');
      rethrow;
    }
  }

  // Load user profile from Firestore
  Future<void> _loadUserProfile(String uid) async {
    try {
      final doc = await _firestore
          .collection(AppConstants.usersCollection)
          .doc(uid)
          .get();

      if (doc.exists) {
        _currentUser = UserModel.fromFirestore(doc);
        await _saveUserToLocal(_currentUser!);
      }
    } catch (e) {
      print('Load user profile error: $e');
    }
  }

  // Save user to local storage
  Future<void> _saveUserToLocal(UserModel user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_user_uid', user.uid);
      await prefs.setString('cached_user_email', user.email);
      await prefs.setString('cached_user_name', user.fullName);
    } catch (e) {
      print('Save user to local error: $e');
    }
  }

  // Clear local user data
  Future<void> _clearLocalUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('cached_user_uid');
      await prefs.remove('cached_user_email');
      await prefs.remove('cached_user_name');
    } catch (e) {
      print('Clear local user error: $e');
    }
  }

  // Get user preferences
  Map<String, dynamic> getUserPreferences() {
    return _currentUser?.preferences ?? {};
  }

  // Update specific preference
  Future<void> updatePreference(String key, dynamic value) async {
    if (_currentUser == null) return;

    try {
      final preferences = Map<String, dynamic>.from(_currentUser!.preferences);
      preferences[key] = value;

      await updateUserProfile(preferences: preferences);
    } catch (e) {
      print('Update preference error: $e');
      rethrow;
    }
  }

  // Get user skill scores
  Map<String, double> getUserSkillScores() {
    return _currentUser?.skillScores ?? {};
  }

  // Check if profile is complete
  bool isProfileComplete() {
    return _currentUser?.isCompleteProfile ?? false;
  }

  // Get user's experience category for personalized content
  String getExperienceCategory() {
    return _currentUser?.experienceCategory ?? 'Beginner';
  }

  // Get user achievements
  List<String> getUserAchievements() {
    return _currentUser?.achievements ?? [];
  }
}