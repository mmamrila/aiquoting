import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../services/voice/voice_service.dart';
import '../../../services/ai/ai_service.dart';
import '../../../services/scenarios/scenario_service.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../models/conversation/conversation_model.dart';
import '../../../models/scoring/scoring_model.dart';
import '../../../constants/app_constants.dart';

class PracticeSessionScreen extends StatefulWidget {
  final PracticeScenario scenario;

  const PracticeSessionScreen({
    super.key,
    required this.scenario,
  });

  @override
  State<PracticeSessionScreen> createState() => _PracticeSessionScreenState();
}

class _PracticeSessionScreenState extends State<PracticeSessionScreen>
    with TickerProviderStateMixin {
  final VoiceService _voiceService = VoiceService();
  final AIService _aiService = AIService();

  ConversationModel? _currentConversation;
  SessionState _sessionState = SessionState.setup;
  String _currentTranscription = '';
  bool _isProcessing = false;
  Duration _sessionDuration = Duration.zero;
  late AnimationController _pulseController;
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();
    _initializeServices();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    );
    _waveController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _waveController.dispose();
    super.dispose();
  }

  Future<void> _initializeServices() async {
    await _voiceService.initialize();
    await _aiService.initialize();

    // Add voice service listener
    _voiceService.addListener(_onVoiceStateChanged);
  }

  void _onVoiceStateChanged() {
    setState(() {
      _currentTranscription = _voiceService.lastTranscription;
    });

    // Process user input when listening stops
    if (_voiceService.state == VoiceState.idle &&
        _currentTranscription.isNotEmpty &&
        _sessionState == SessionState.active) {
      _processUserInput(_currentTranscription);
    }
  }

  Future<void> _startSession() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;

    if (user == null) return;

    try {
      setState(() {
        _sessionState = SessionState.starting;
        _isProcessing = true;
      });

      // Start conversation with AI
      _currentConversation = await _aiService.startConversation(
        userId: user.uid,
        scenarioType: widget.scenario.scenarioType,
        industry: user.industry,
        user: user,
        customPersona: widget.scenario.clientPersona,
      );

      // Play AI's opening message
      if (_currentConversation!.messages.isNotEmpty) {
        final openingMessage = _currentConversation!.messages.first.content;
        await _voiceService.speak(openingMessage, useCarOptimization: true);
      }

      setState(() {
        _sessionState = SessionState.active;
        _isProcessing = false;
      });

      // Start session timer
      _startSessionTimer();
    } catch (e) {
      setState(() {
        _sessionState = SessionState.error;
        _isProcessing = false;
      });
      _showError('Failed to start session: $e');
    }
  }

  void _startSessionTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (_sessionState == SessionState.active) {
        setState(() {
          _sessionDuration = _sessionDuration + const Duration(seconds: 1);
        });
        _startSessionTimer();
      }
    });
  }

  Future<void> _startListening() async {
    if (_sessionState != SessionState.active) return;

    setState(() {
      _isProcessing = false;
    });

    _pulseController.repeat();
    _waveController.repeat();

    final success = await _voiceService.startListening(
      timeout: const Duration(seconds: 30),
      useCarMode: true,
    );

    if (!success) {
      _showError('Failed to start listening');
      _pulseController.stop();
      _waveController.stop();
    }
  }

  Future<void> _stopListening() async {
    await _voiceService.stopListening();
    _pulseController.stop();
    _waveController.stop();
  }

  Future<void> _processUserInput(String input) async {
    if (input.trim().isEmpty || _currentConversation == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      // Process input through AI service
      final aiResponse = await _aiService.processUserInput(input.trim());

      // Speak AI response
      await _voiceService.speak(aiResponse.content, useCarOptimization: true);

      setState(() {
        _currentTranscription = '';
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _isProcessing = false;
      });

      // If the AI service has failed too many times, end the session
      if (e.toString().contains('consecutive failures')) {
        _showError('AI service is unavailable. Ending practice session.');
        Future.delayed(const Duration(seconds: 2), () {
          _endSession();
        });
      } else {
        _showError('Failed to process input: $e');
      }
    }
  }

  Future<void> _endSession() async {
    if (_currentConversation == null) return;

    setState(() {
      _sessionState = SessionState.ending;
      _isProcessing = true;
    });

    try {
      // Stop any ongoing voice operations
      await _voiceService.stopListening();
      await _voiceService.stopSpeaking();

      // Generate final score
      final score = await _aiService.endConversation();

      setState(() {
        _sessionState = SessionState.completed;
        _isProcessing = false;
      });

      // Navigate to results screen
      _showResults(score);
    } catch (e) {
      setState(() {
        _sessionState = SessionState.error;
        _isProcessing = false;
      });
      _showError('Failed to end session: $e');
    }
  }

  void _showResults(ConversationScore score) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => SessionResultsScreen(
          scenario: widget.scenario,
          conversation: _currentConversation!,
          score: score,
          duration: _sessionDuration,
        ),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.scenario.title),
        backgroundColor: widget.scenario.difficultyColor,
        actions: [
          if (_sessionState == SessionState.active)
            IconButton(
              icon: const Icon(Icons.stop),
              onPressed: _endSession,
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Session Header
            _buildSessionHeader(),

            // Main Content Area
            Expanded(
              child: _buildMainContent(),
            ),

            // Control Panel
            _buildControlPanel(),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withOpacity(0.1),
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
          ),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Client: ${widget.scenario.clientPersona.name}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${widget.scenario.clientPersona.role} at ${widget.scenario.clientPersona.company}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              Chip(
                label: Text(widget.scenario.difficultyText),
                backgroundColor: widget.scenario.difficultyColor.withOpacity(0.2),
                labelStyle: TextStyle(color: widget.scenario.difficultyColor),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_sessionState == SessionState.active) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Duration: ${_formatDuration(_sessionDuration)}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  'Messages: ${_currentConversation?.messageCount ?? 0}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_sessionState) {
      case SessionState.setup:
        return _buildSetupView();
      case SessionState.starting:
        return _buildLoadingView('Starting session...');
      case SessionState.active:
        return _buildActiveSessionView();
      case SessionState.ending:
        return _buildLoadingView('Analyzing performance...');
      case SessionState.completed:
        return _buildCompletedView();
      case SessionState.error:
        return _buildErrorView();
    }
  }

  Widget _buildSetupView() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(
            Icons.person,
            size: 80,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(height: 24),
          Text(
            'Scenario Overview',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          Text(
            widget.scenario.description,
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Objectives:',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  ...widget.scenario.objectives.map(
                    (objective) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• '),
                          Expanded(child: Text(objective)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (widget.scenario.tips.isNotEmpty) ...[
            ExpansionTile(
              title: const Text('Tips for Success'),
              children: widget.scenario.tips.map(
                (tip) => ListTile(
                  leading: const Icon(Icons.lightbulb_outline),
                  title: Text(tip),
                ),
              ).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActiveSessionView() {
    return Column(
      children: [
        // Conversation Messages
        Expanded(
          child: _buildConversationList(),
        ),

        // Voice Input Area
        _buildVoiceInputArea(),
      ],
    );
  }

  Widget _buildConversationList() {
    if (_currentConversation?.messages.isEmpty ?? true) {
      return const Center(
        child: Text('Conversation will appear here...'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _currentConversation!.messages.length,
      itemBuilder: (context, index) {
        final message = _currentConversation!.messages[index];
        return _buildMessageBubble(message);
      },
    );
  }

  Widget _buildMessageBubble(ConversationMessage message) {
    final isUser = message.sender == MessageSender.user;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? Theme.of(context).primaryColor
              : Colors.grey[300],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message.content,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildVoiceInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Column(
        children: [
          if (_currentTranscription.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Text(
                _currentTranscription,
                style: const TextStyle(fontStyle: FontStyle.italic),
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (_isProcessing) ...[
            const CircularProgressIndicator(),
            const SizedBox(height: 8),
            const Text('Processing...'),
          ] else ...[
            _buildVoiceButton(),
          ],
        ],
      ),
    );
  }

  Widget _buildVoiceButton() {
    final isListening = _voiceService.isListening;

    return GestureDetector(
      onTap: isListening ? _stopListening : _startListening,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          return Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isListening ? Colors.red : Theme.of(context).primaryColor,
              boxShadow: isListening
                  ? [
                      BoxShadow(
                        color: Colors.red.withOpacity(0.3 * _pulseController.value),
                        blurRadius: 20 * _pulseController.value,
                        spreadRadius: 10 * _pulseController.value,
                      ),
                    ]
                  : null,
            ),
            child: Icon(
              isListening ? Icons.stop : Icons.mic,
              color: Colors.white,
              size: 32,
            ),
          );
        },
      ),
    );
  }

  Widget _buildControlPanel() {
    if (_sessionState != SessionState.setup) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(24),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _isProcessing ? null : _startSession,
          child: _isProcessing
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Start Practice Session'),
        ),
      ),
    );
  }

  Widget _buildLoadingView(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(message),
        ],
      ),
    );
  }

  Widget _buildCompletedView() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.check_circle,
            size: 80,
            color: Colors.green,
          ),
          SizedBox(height: 16),
          Text('Session Completed!'),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error,
            size: 80,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          const Text('Something went wrong'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return '$twoDigitMinutes:$twoDigitSeconds';
  }
}

enum SessionState {
  setup,
  starting,
  active,
  ending,
  completed,
  error,
}

// Placeholder for SessionResultsScreen
class SessionResultsScreen extends StatelessWidget {
  final PracticeScenario scenario;
  final ConversationModel conversation;
  final ConversationScore score;
  final Duration duration;

  const SessionResultsScreen({
    super.key,
    required this.scenario,
    required this.conversation,
    required this.score,
    required this.duration,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Session Results'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Overall Score: ${score.overallScore.toStringAsFixed(1)}%',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            Text(score.feedback),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}