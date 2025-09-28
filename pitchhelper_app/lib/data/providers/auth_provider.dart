import 'package:flutter/material.dart';
import '../../services/auth/auth_service.dart';
import '../../models/user/user_model.dart';

// Auth Provider for state management
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  String? get error => _error;
  UserModel? get currentUser => _authService.currentUser;
  bool get isSignedIn => _authService.isSignedIn;

  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void setError(String? error) {
    _error = error;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    try {
      setLoading(true);
      clearError();

      final user = await _authService.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (user != null) {
        notifyListeners();
        return true;
      } else {
        setError('Sign in failed. Please try again.');
        return false;
      }
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> register({
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
      setLoading(true);
      clearError();

      final user = await _authService.registerWithEmailAndPassword(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        industry: industry,
        experienceLevel: experienceLevel,
        company: company,
        jobTitle: jobTitle,
      );

      if (user != null) {
        notifyListeners();
        return true;
      } else {
        setError('Registration failed. Please try again.');
        return false;
      }
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<void> signOut() async {
    try {
      setLoading(true);
      await _authService.signOut();
      notifyListeners();
    } catch (e) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  Future<void> resetPassword(String email) async {
    try {
      setLoading(true);
      clearError();
      await _authService.resetPassword(email);
    } catch (e) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
    String? industry,
    String? experienceLevel,
    String? company,
    String? jobTitle,
    String? profileImageUrl,
    Map<String, dynamic>? preferences,
  }) async {
    try {
      setLoading(true);
      clearError();

      await _authService.updateUserProfile(
        firstName: firstName,
        lastName: lastName,
        industry: industry,
        experienceLevel: experienceLevel,
        company: company,
        jobTitle: jobTitle,
        profileImageUrl: profileImageUrl,
        preferences: preferences,
      );

      notifyListeners();
    } catch (e) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  // Debug mode helper to set demo user
  void setCurrentUser(UserModel user) {
    _authService.currentUser = user;
    notifyListeners();
  }
}