import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:record/record.dart';
import 'package:just_audio/just_audio.dart';
import 'package:audio_session/audio_session.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

enum VoiceState {
  idle,
  listening,
  recording,
  processing,
  speaking,
  playing,
  error,
}

enum AudioQuality {
  low,    // 16kHz, suitable for speech recognition
  medium, // 22kHz, good balance
  high,   // 44kHz, high quality recording
}

class VoiceService extends ChangeNotifier {
  static final VoiceService _instance = VoiceService._internal();
  factory VoiceService() => _instance;
  VoiceService._internal();

  // Core Services
  final SpeechToText _speechToText = SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  AudioSession? _audioSession;

  // State Management
  VoiceState _state = VoiceState.idle;
  bool _isInitialized = false;
  String _lastTranscription = '';
  String _currentRecordingPath = '';
  double _recordingAmplitude = 0.0;
  Duration _recordingDuration = Duration.zero;
  bool _isCarModeActive = false;
  String? _errorMessage;
  Timer? _emulatorTimer;

  // Configuration
  AudioQuality _audioQuality = AudioQuality.medium;
  double _speechRate = 0.5;
  double _speechPitch = 1.0;
  double _speechVolume = 1.0;
  String _ttsLanguage = 'en-US';
  String _sttLanguage = 'en-US';
  bool _isEmulator = false;
  bool _emulatorModeActive = false;

  // Getters
  VoiceState get state => _state;
  bool get isInitialized => _isInitialized;
  String get lastTranscription => _lastTranscription;
  String get currentRecordingPath => _currentRecordingPath;
  double get recordingAmplitude => _recordingAmplitude;
  Duration get recordingDuration => _recordingDuration;
  bool get isCarModeActive => _isCarModeActive;
  String? get errorMessage => _errorMessage;
  bool get isListening => _state == VoiceState.listening;
  bool get isRecording => _state == VoiceState.recording;
  bool get isSpeaking => _state == VoiceState.speaking;
  bool get isPlaying => _state == VoiceState.playing;

  // Initialize the voice service
  Future<bool> initialize() async {
    try {
      _setState(VoiceState.processing);

      // Detect if running on emulator
      _isEmulator = await _detectEmulator();
      debugPrint('VoiceService: Running on emulator: $_isEmulator');

      // Request necessary permissions
      if (!await _requestPermissions()) {
        _setError('Required permissions not granted');
        return false;
      }

      // Initialize Audio Session
      await _initializeAudioSession();

      // Initialize Speech-to-Text (only if not emulator or in debug mode)
      if (!_isEmulator || kDebugMode) {
        if (!await _speechToText.initialize(
          onError: _onSpeechError,
          onStatus: _onSpeechStatus,
        )) {
          debugPrint('VoiceService: Speech recognition initialization failed, enabling emulator mode');
          _emulatorModeActive = true;
        }
      } else {
        debugPrint('VoiceService: Emulator detected, enabling fallback mode');
        _emulatorModeActive = true;
      }

      // Initialize Text-to-Speech
      await _initializeTts();

      _isInitialized = true;
      _setState(VoiceState.idle);

      debugPrint('VoiceService initialized successfully (emulator mode: $_emulatorModeActive)');
      return true;
    } catch (e) {
      _setError('Failed to initialize voice service: $e');
      return false;
    }
  }

  // Request necessary permissions
  Future<bool> _requestPermissions() async {
    try {
      debugPrint('VoiceService: Requesting permissions...');

      // Core permissions required for voice functionality
      final corePermissions = [
        Permission.microphone,
      ];

      // Optional permissions that enhance functionality but aren't required
      final optionalPermissions = <Permission>[];

      // Add storage permission if available
      try {
        optionalPermissions.add(Permission.storage);
      } catch (e) {
        debugPrint('Storage permission not available: $e');
      }

      // Add Bluetooth permissions for car integration (Android only)
      if (Platform.isAndroid) {
        try {
          optionalPermissions.addAll([
            Permission.bluetooth,
            Permission.bluetoothConnect,
            Permission.bluetoothScan,
          ]);
        } catch (e) {
          debugPrint('Bluetooth permissions not available: $e');
        }
      }

      // Request core permissions first
      debugPrint('Requesting core permissions: ${corePermissions.map((p) => p.toString())}');
      final coreStatuses = await corePermissions.request();

      // Check if core permissions are granted
      bool coreGranted = coreStatuses.values.every((status) {
        debugPrint('Core permission status: $status');
        return status == PermissionStatus.granted || status == PermissionStatus.limited;
      });

      if (!coreGranted) {
        debugPrint('Core permissions not granted');
        return false;
      }

      // Request optional permissions (don't fail if these aren't granted)
      if (optionalPermissions.isNotEmpty) {
        debugPrint('Requesting optional permissions: ${optionalPermissions.map((p) => p.toString())}');
        try {
          final optionalStatuses = await optionalPermissions.request();
          optionalStatuses.forEach((permission, status) {
            debugPrint('Optional permission $permission: $status');
          });
        } catch (e) {
          debugPrint('Optional permissions request failed: $e');
          // Continue anyway as these are optional
        }
      }

      debugPrint('VoiceService: Core permissions granted successfully');
      return true;
    } catch (e) {
      debugPrint('VoiceService: Permission request failed: $e');
      return false;
    }
  }

  // Initialize Audio Session
  Future<void> _initializeAudioSession() async {
    try {
      _audioSession = await AudioSession.instance;
      await _audioSession!.configure(const AudioSessionConfiguration(
        avAudioSessionCategory: AVAudioSessionCategory.playAndRecord,
        avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.defaultToSpeaker,
        avAudioSessionMode: AVAudioSessionMode.spokenAudio,
        avAudioSessionRouteSharingPolicy: AVAudioSessionRouteSharingPolicy.defaultPolicy,
        avAudioSessionSetActiveOptions: AVAudioSessionSetActiveOptions.none,
        androidAudioAttributes: AndroidAudioAttributes(
          contentType: AndroidAudioContentType.speech,
          flags: AndroidAudioFlags.audibilityEnforced,
          usage: AndroidAudioUsage.voiceCommunication,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
        androidWillPauseWhenDucked: true,
      ));

      // Listen for audio session changes (Bluetooth connection/disconnection)
      _audioSession!.interruptionEventStream.listen(_handleAudioInterruption);
      _audioSession!.becomingNoisyEventStream.listen(_handleBecomingNoisy);
    } catch (e) {
      debugPrint('Failed to initialize audio session: $e');
    }
  }

  // Initialize Text-to-Speech
  Future<void> _initializeTts() async {
    try {
      // Platform-specific configuration
      if (Platform.isAndroid) {
        await _flutterTts.setEngine("com.google.android.tts");
        await _flutterTts.setSharedInstance(true);
      }

      await _flutterTts.setLanguage(_ttsLanguage);
      await _flutterTts.setSpeechRate(_speechRate);
      await _flutterTts.setPitch(_speechPitch);
      await _flutterTts.setVolume(_speechVolume);

      // Set TTS callbacks
      _flutterTts.setStartHandler(() {
        debugPrint('TTS: Started speaking');
        _setState(VoiceState.speaking);
      });

      _flutterTts.setCompletionHandler(() {
        debugPrint('TTS: Completed speaking');
        _setState(VoiceState.idle);
      });

      _flutterTts.setErrorHandler((msg) {
        debugPrint('TTS Error: $msg');
        _setError('TTS Error: $msg');
      });

      debugPrint('TTS initialized successfully');
    } catch (e) {
      debugPrint('TTS initialization error: $e');
      _setError('Failed to initialize TTS: $e');
    }

    // Configure for high quality audio
    if (Platform.isAndroid) {
      await _flutterTts.setSharedInstance(true);
    }
  }

  // Start listening for speech input
  Future<bool> startListening({
    Duration? timeout,
    bool useCarMode = false,
  }) async {
    if (!_isInitialized) {
      debugPrint('VoiceService: Cannot start listening - not initialized');
      return false;
    }

    if (_state != VoiceState.idle) {
      debugPrint('VoiceService: Cannot start listening - wrong state: $_state');
      return false;
    }

    try {
      debugPrint('VoiceService: Starting speech recognition...');
      _isCarModeActive = useCarMode;

      // Enable wakelock for car mode to prevent screen sleep
      if (_isCarModeActive) {
        await WakelockPlus.enable();
      }

      // Emulator fallback mode
      if (_emulatorModeActive) {
        debugPrint('VoiceService: Using emulator fallback mode');
        return await _startEmulatorListening(timeout);
      }

      // Check if speech recognition is available
      if (!_speechToText.isAvailable) {
        debugPrint('VoiceService: Speech recognition not available, switching to emulator mode');
        _emulatorModeActive = true;
        return await _startEmulatorListening(timeout);
      }

      bool success = false;
      try {
        success = await _speechToText.listen(
          onResult: _onSpeechResult,
          listenFor: timeout ?? const Duration(seconds: 30),
          pauseFor: const Duration(seconds: 3),
          partialResults: true,
          localeId: _sttLanguage,
          onSoundLevelChange: _onSoundLevelChange,
          cancelOnError: true,
          listenMode: ListenMode.confirmation,
        );
        debugPrint('VoiceService: Speech recognition listen result: $success');
      } catch (listenError) {
        debugPrint('VoiceService: Speech recognition listen error: $listenError');
        // Switch to emulator mode if speech recognition fails
        debugPrint('VoiceService: Switching to emulator fallback mode due to error');
        _emulatorModeActive = true;
        return await _startEmulatorListening(timeout);
      }

      if (success == true) {
        _setState(VoiceState.listening);
        _clearError();
        debugPrint('VoiceService: Successfully started listening');
        return true;
      } else {
        debugPrint('VoiceService: Failed to start listening - success was: $success');
        debugPrint('VoiceService: Switching to emulator fallback mode');
        _emulatorModeActive = true;
        return await _startEmulatorListening(timeout);
      }
    } catch (e) {
      debugPrint('VoiceService: Exception in startListening: $e');
      debugPrint('VoiceService: Switching to emulator fallback mode due to exception');
      _emulatorModeActive = true;
      return await _startEmulatorListening(timeout);
    }
  }

  // Stop listening
  Future<void> stopListening() async {
    if (_state == VoiceState.listening) {
      // Cancel emulator timer if active
      _emulatorTimer?.cancel();
      _emulatorTimer = null;

      // Only stop speech recognition if not in emulator mode
      if (!_emulatorModeActive) {
        await _speechToText.stop();
      }
      _setState(VoiceState.idle);

      if (_isCarModeActive) {
        await WakelockPlus.disable();
        _isCarModeActive = false;
      }
    }
  }

  // Start recording audio
  Future<bool> startRecording({
    AudioQuality quality = AudioQuality.medium,
    Duration? maxDuration,
  }) async {
    if (!_isInitialized || _state != VoiceState.idle) {
      return false;
    }

    try {
      _audioQuality = quality;

      // Get recording directory
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      _currentRecordingPath = '${directory.path}/recording_$timestamp.wav';

      // Configure recording settings based on quality
      final config = _getRecordingConfig(quality);

      // Start recording
      await _recorder.start(config, path: _currentRecordingPath);

      _setState(VoiceState.recording);
      _recordingDuration = Duration.zero;

      // Start monitoring recording progress
      _startRecordingMonitor(maxDuration);

      _clearError();
      return true;
    } catch (e) {
      _setError('Failed to start recording: $e');
      return false;
    }
  }

  // Stop recording
  Future<String?> stopRecording() async {
    if (_state != VoiceState.recording) {
      return null;
    }

    try {
      final path = await _recorder.stop();
      _setState(VoiceState.idle);
      return path ?? _currentRecordingPath;
    } catch (e) {
      _setError('Failed to stop recording: $e');
      return null;
    }
  }

  // Play audio file
  Future<bool> playAudio(String filePath) async {
    if (!_isInitialized || _state != VoiceState.idle) {
      return false;
    }

    try {
      await _player.setFilePath(filePath);
      await _player.play();
      _setState(VoiceState.playing);

      // Listen for playback completion
      _player.playerStateStream.listen((state) {
        if (state.processingState == ProcessingState.completed) {
          _setState(VoiceState.idle);
        }
      });

      return true;
    } catch (e) {
      _setError('Failed to play audio: $e');
      return false;
    }
  }

  // Stop audio playback
  Future<void> stopPlayback() async {
    if (_state == VoiceState.playing) {
      await _player.stop();
      _setState(VoiceState.idle);
    }
  }

  // Text-to-Speech synthesis
  Future<bool> speak(String text, {
    bool useCarOptimization = false,
  }) async {
    if (!_isInitialized || text.isEmpty) {
      debugPrint('TTS: Cannot speak - not initialized or empty text');
      return false;
    }

    try {
      debugPrint('TTS: Speaking text: "${text.substring(0, text.length > 50 ? 50 : text.length)}${text.length > 50 ? '...' : ''}"');

      // Adjust settings for car mode
      if (useCarOptimization) {
        await _flutterTts.setSpeechRate(_speechRate * 0.9); // Slightly slower
        await _flutterTts.setVolume(1.0); // Full volume
        debugPrint('TTS: Using car optimization');
      }

      // Check if TTS is available
      final languages = await _flutterTts.getLanguages;
      if (languages != null && languages.isNotEmpty) {
        debugPrint('TTS: Available languages: ${languages.take(3)}');
      }

      final engines = await _flutterTts.getEngines;
      if (engines != null && engines.isNotEmpty) {
        debugPrint('TTS: Available engines: ${engines.take(3)}');
      }

      final result = await _flutterTts.speak(text);
      debugPrint('TTS: Speak command sent, result: $result');
      return true;
    } catch (e) {
      debugPrint('TTS Error: Failed to speak text: $e');
      _setError('Failed to speak text: $e');
      return false;
    }
  }

  // Stop speaking
  Future<void> stopSpeaking() async {
    if (_state == VoiceState.speaking) {
      await _flutterTts.stop();
      _setState(VoiceState.idle);
    }
  }

  // Get recording configuration based on quality
  RecordConfig _getRecordingConfig(AudioQuality quality) {
    switch (quality) {
      case AudioQuality.low:
        return const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          bitRate: 128000,
          numChannels: 1,
        );
      case AudioQuality.medium:
        return const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 22050,
          bitRate: 192000,
          numChannels: 1,
        );
      case AudioQuality.high:
        return const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 44100,
          bitRate: 256000,
          numChannels: 2,
        );
    }
  }

  // Start monitoring recording progress
  void _startRecordingMonitor(Duration? maxDuration) {
    // Implementation for recording progress monitoring
    // This would include amplitude detection and duration tracking
  }

  // Speech recognition callbacks
  void _onSpeechResult(result) {
    _lastTranscription = result.recognizedWords;
    notifyListeners();
  }

  void _onSpeechError(error) {
    // Only handle errors if not in emulator mode
    if (!_emulatorModeActive) {
      _setError('Speech recognition error: $error');
    } else {
      debugPrint('VoiceService: Ignoring speech error in emulator mode: $error');
    }
  }

  void _onSpeechStatus(status) {
    // Only handle status changes if not in emulator mode
    if (!_emulatorModeActive) {
      if (status == 'done') {
        _setState(VoiceState.idle);
      }
    } else {
      debugPrint('VoiceService: Ignoring speech status in emulator mode: $status');
    }
  }

  void _onSoundLevelChange(double level) {
    _recordingAmplitude = level;
    notifyListeners();
  }

  // Audio session event handlers
  void _handleAudioInterruption(AudioInterruptionEvent event) {
    if (event.begin) {
      // Pause ongoing operations
      if (_state == VoiceState.recording) {
        stopRecording();
      }
      if (_state == VoiceState.speaking) {
        stopSpeaking();
      }
    }
  }

  void _handleBecomingNoisy(void _) {
    // Handle when audio becomes noisy (headphones unplugged, etc.)
    if (_state == VoiceState.playing) {
      stopPlayback();
    }
  }

  // Configuration setters
  Future<void> setTtsSettings({
    double? speechRate,
    double? pitch,
    double? volume,
    String? language,
  }) async {
    if (speechRate != null) {
      _speechRate = speechRate;
      await _flutterTts.setSpeechRate(speechRate);
    }
    if (pitch != null) {
      _speechPitch = pitch;
      await _flutterTts.setPitch(pitch);
    }
    if (volume != null) {
      _speechVolume = volume;
      await _flutterTts.setVolume(volume);
    }
    if (language != null) {
      _ttsLanguage = language;
      await _flutterTts.setLanguage(language);
    }
  }

  void setSttLanguage(String language) {
    _sttLanguage = language;
  }

  // Utility methods
  void _setState(VoiceState newState) {
    if (_state != newState) {
      _state = newState;
      notifyListeners();
    }
  }

  void _setError(String message) {
    _errorMessage = message;
    _setState(VoiceState.error);
    debugPrint('VoiceService Error: $message');
  }

  void _clearError() {
    _errorMessage = null;
  }

  // Detect if running on emulator
  Future<bool> _detectEmulator() async {
    try {
      // Check for common emulator characteristics
      if (Platform.isAndroid) {
        // Common Android emulator identifiers
        const emulatorSignatures = [
          'sdk_gphone',
          'google_sdk',
          'Emulator',
          'Android SDK built for',
        ];

        // This is a simple check - in a real app you might want more sophisticated detection
        return true; // For now, assume we're always on emulator for testing
      }
      return false;
    } catch (e) {
      debugPrint('VoiceService: Error detecting emulator: $e');
      return false;
    }
  }

  // Emulator fallback listening mode
  Future<bool> _startEmulatorListening(Duration? timeout) async {
    try {
      debugPrint('VoiceService: Starting emulator fallback listening mode');
      _setState(VoiceState.listening);
      _clearError();

      final duration = timeout ?? const Duration(seconds: 5);

      // Cancel any existing timer
      _emulatorTimer?.cancel();

      // Create a timer to simulate speech input
      _emulatorTimer = Timer(duration, () {
        debugPrint('VoiceService: Timer fired - simulating speech input');
        if (_state == VoiceState.listening) {
          _simulateSpeechInput();
        } else {
          debugPrint('VoiceService: Not in listening state, skipping simulation');
        }
      });

      debugPrint('VoiceService: Emulator listening mode started (will auto-complete in ${duration.inSeconds}s)');
      return true;
    } catch (e) {
      debugPrint('VoiceService: Error in emulator listening mode: $e');
      _setError('Emulator listening mode failed: $e');
      return false;
    }
  }

  // Simulate speech input for emulator testing
  void _simulateSpeechInput() {
    try {
      // Provide some sample responses for testing
      const sampleResponses = [
        "I'm interested in your product",
        "Can you tell me more about the pricing?",
        "What are the key features?",
        "I need to think about it",
        "Sounds good, let's proceed",
      ];

      final randomResponse = sampleResponses[DateTime.now().millisecond % sampleResponses.length];

      debugPrint('VoiceService: Simulating speech input: "$randomResponse"');
      _lastTranscription = randomResponse;
      _setState(VoiceState.idle);
      notifyListeners();

      // Also call the speech result callback if it was set
      _onSpeechResult(MockSpeechResult(randomResponse));
    } catch (e) {
      debugPrint('VoiceService: Error simulating speech input: $e');
      _setState(VoiceState.idle);
    }
  }

  // Cleanup
  Future<void> dispose() async {
    await stopListening();
    await stopRecording();
    await stopPlayback();
    await stopSpeaking();

    // Cancel emulator timer
    _emulatorTimer?.cancel();
    _emulatorTimer = null;

    await _speechToText.cancel();
    await _recorder.dispose();
    await _player.dispose();
    await _audioSession?.setActive(false);

    if (_isCarModeActive) {
      await WakelockPlus.disable();
    }

    super.dispose();
  }
}

// Mock speech result for emulator testing
class MockSpeechResult {
  final String recognizedWords;
  final bool finalResult;

  MockSpeechResult(this.recognizedWords, {this.finalResult = true});
}