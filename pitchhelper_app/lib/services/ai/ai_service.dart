import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../models/conversation/conversation_model.dart';
import '../../models/user/user_model.dart';
import '../../constants/app_constants.dart';

class AIService extends ChangeNotifier {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;
  AIService._internal();

  final Dio _dio = Dio();
  String? _openAIApiKey;
  bool _isInitialized = false;
  ConversationModel? _currentConversation;
  int _consecutiveFailures = 0;
  static const int _maxConsecutiveFailures = 3;

  // Configuration
  static const String _baseUrl = 'https://api.openai.com/v1';
  static const String _model = 'gpt-4';
  static const int _maxTokens = 1000;
  static const double _temperature = 0.8;
  static const double _topP = 0.9;

  // Getters
  bool get isInitialized => _isInitialized;
  ConversationModel? get currentConversation => _currentConversation;

  // Initialize AI service
  Future<bool> initialize({String? apiKey}) async {
    try {
      // For development, you can set a default API key here
      // In production, this should come from secure storage or environment variables
      _openAIApiKey = apiKey ?? 'your-openai-api-key-here';

      _dio.options.baseUrl = _baseUrl;
      _dio.options.headers = {
        'Authorization': 'Bearer $_openAIApiKey',
        'Content-Type': 'application/json',
      };

      _isInitialized = true;
      debugPrint('AIService initialized successfully');
      return true;
    } catch (e) {
      debugPrint('Failed to initialize AIService: $e');
      return false;
    }
  }

  // Start a new conversation
  Future<ConversationModel> startConversation({
    required String userId,
    required String scenarioType,
    required String industry,
    required UserModel user,
    ClientPersona? customPersona,
  }) async {
    if (!_isInitialized) {
      throw Exception('AIService not initialized');
    }

    // Generate or use provided client persona
    final clientPersona = customPersona ?? _generateClientPersona(industry, scenarioType);

    // Reset failure counter for new conversation
    _consecutiveFailures = 0;

    // Create new conversation
    _currentConversation = ConversationModel(
      id: _generateId(),
      userId: userId,
      sessionId: _generateSessionId(),
      scenarioType: scenarioType,
      industry: industry,
      clientPersona: clientPersona,
      startTime: DateTime.now(),
    );

    // Add initial AI greeting
    final greeting = await _generateGreeting(clientPersona, scenarioType, user);
    _currentConversation!.addMessage(ConversationMessage(
      id: _generateId(),
      sender: MessageSender.ai,
      content: greeting,
      timestamp: DateTime.now(),
    ));

    notifyListeners();
    return _currentConversation!;
  }

  // Process user input and generate AI response
  Future<ConversationMessage> processUserInput(String userInput) async {
    if (_currentConversation == null) {
      throw Exception('No active conversation');
    }

    // Add user message to conversation
    final userMessage = ConversationMessage(
      id: _generateId(),
      sender: MessageSender.user,
      content: userInput,
      timestamp: DateTime.now(),
    );
    _currentConversation!.addMessage(userMessage);

    // Analyze user input
    final analysis = await _analyzeUserInput(userInput, _currentConversation!);
    userMessage.analysis.addAll(analysis);

    // Generate AI response
    final aiResponse = await _generateAIResponse(_currentConversation!);
    final aiMessage = ConversationMessage(
      id: _generateId(),
      sender: MessageSender.ai,
      content: aiResponse,
      timestamp: DateTime.now(),
    );
    _currentConversation!.addMessage(aiMessage);

    notifyListeners();
    return aiMessage;
  }

  // Generate AI response based on conversation context
  Future<String> _generateAIResponse(ConversationModel conversation) async {
    try {
      final systemPrompt = _buildSystemPrompt(conversation.clientPersona, conversation.industry);
      final conversationHistory = _buildConversationHistory(conversation.messages);

      final response = await _dio.post('/chat/completions', data: {
        'model': _model,
        'messages': [
          {'role': 'system', 'content': systemPrompt},
          ...conversationHistory,
        ],
        'max_tokens': _maxTokens,
        'temperature': _temperature,
        'top_p': _topP,
        'frequency_penalty': 0.3,
        'presence_penalty': 0.3,
      });

      final aiResponse = response.data['choices'][0]['message']['content'] as String;
      _consecutiveFailures = 0; // Reset failure counter on success
      return aiResponse.trim();
    } catch (e) {
      debugPrint('Error generating AI response: $e');
      _consecutiveFailures++;

      if (_consecutiveFailures >= _maxConsecutiveFailures) {
        debugPrint('AIService: Too many consecutive failures ($_consecutiveFailures), throwing exception');
        throw Exception('AI service unavailable after $_maxConsecutiveFailures consecutive failures. Please check your API configuration.');
      }

      // Fallback response for first few failures
      debugPrint('AIService: Using fallback response (failure $_consecutiveFailures/$_maxConsecutiveFailures)');
      return _generateFallbackResponse(conversation.clientPersona);
    }
  }

  // Build system prompt for AI persona
  String _buildSystemPrompt(ClientPersona persona, String industry) {
    return '''
You are ${persona.name}, a ${persona.role} at ${persona.company} in the ${industry} industry.

PERSONALITY PROFILE:
- Personality Type: ${persona.personality.name}
- Communication Style: ${persona.communicationStyle.name}
- Decision Maker Type: ${persona.decisionMaker.name}

BACKGROUND:
${persona.background}

PAIN POINTS:
${persona.painPoints.join('\n- ')}

MOTIVATIONS:
${persona.motivations.join('\n- ')}

COMMON OBJECTIONS YOU RAISE:
${persona.objections.join('\n- ')}

BEHAVIORAL GUIDELINES:
1. Stay in character at all times
2. Respond naturally as a busy professional would
3. Show appropriate skepticism and ask probing questions
4. Bring up relevant objections naturally during conversation
5. Be influenced by the salesperson's approach - reward good technique
6. Make decisions based on your personality type and motivations
7. Keep responses conversational and realistic (2-4 sentences typically)
8. Show emotional reactions to the salesperson's approach
9. Gradually warm up if the salesperson builds rapport effectively
10. Be more resistant if they're too pushy or don't listen

Remember: You're not trying to help the salesperson - you're a real client with real concerns and limited time.
''';
  }

  // Build conversation history for API
  List<Map<String, String>> _buildConversationHistory(List<ConversationMessage> messages) {
    return messages.where((m) => m.sender != MessageSender.system).map((message) {
      return {
        'role': message.sender == MessageSender.user ? 'user' : 'assistant',
        'content': message.content,
      };
    }).toList();
  }

  // Analyze user input for scoring and feedback
  Future<Map<String, dynamic>> _analyzeUserInput(String input, ConversationModel conversation) async {
    // This is a simplified analysis - in production, this would be much more sophisticated
    final analysis = <String, dynamic>{};

    // Analyze confidence level
    analysis['confidence'] = _analyzeConfidence(input);

    // Analyze question quality
    analysis['questionQuality'] = _analyzeQuestions(input);

    // Analyze listening skills
    analysis['activeListening'] = _analyzeListening(input, conversation);

    // Analyze rapport building
    analysis['rapportBuilding'] = _analyzeRapport(input);

    // Analyze value articulation
    analysis['valueArticulation'] = _analyzeValue(input);

    // Word count and pace
    analysis['wordCount'] = input.split(' ').length;
    analysis['talkTime'] = input.split(' ').length * 0.5; // Rough estimate

    return analysis;
  }

  // Individual analysis methods
  double _analyzeConfidence(String input) {
    final confident = ['definitely', 'absolutely', 'certainly', 'confident', 'guarantee'];
    final uncertain = ['maybe', 'perhaps', 'possibly', 'might', 'unsure', 'think', 'guess'];

    final confidentCount = confident.where((word) => input.toLowerCase().contains(word)).length;
    final uncertainCount = uncertain.where((word) => input.toLowerCase().contains(word)).length;

    return ((confidentCount - uncertainCount) / input.split(' ').length * 100).clamp(0.0, 100.0);
  }

  double _analyzeQuestions(String input) {
    final questions = input.split('?').length - 1;
    final openEnded = ['how', 'what', 'why', 'when', 'where', 'tell me about'].where(
      (phrase) => input.toLowerCase().contains(phrase)
    ).length;

    return ((questions * 10 + openEnded * 15) / input.split(' ').length * 100).clamp(0.0, 100.0);
  }

  double _analyzeListening(String input, ConversationModel conversation) {
    if (conversation.messages.isEmpty) return 50.0;

    final lastAIMessage = conversation.messages.reversed
        .firstWhere((m) => m.sender == MessageSender.ai, orElse: () => ConversationMessage(
          id: '',
          sender: MessageSender.ai,
          content: '',
          timestamp: DateTime.now(),
        )).content.toLowerCase();

    final references = ['you mentioned', 'you said', 'as you stated', 'building on what you said'];
    final referenceCount = references.where((ref) => input.toLowerCase().contains(ref)).length;

    return (referenceCount * 25.0).clamp(0.0, 100.0);
  }

  double _analyzeRapport(String input) {
    final rapportWords = ['understand', 'appreciate', 'great point', 'exactly', 'absolutely', 'I hear you'];
    final rapportCount = rapportWords.where((word) => input.toLowerCase().contains(word)).length;

    return (rapportCount * 20.0).clamp(0.0, 100.0);
  }

  double _analyzeValue(String input) {
    final valueWords = ['save', 'increase', 'improve', 'reduce', 'benefit', 'ROI', 'return', 'efficiency'];
    final valueCount = valueWords.where((word) => input.toLowerCase().contains(word)).length;

    return (valueCount * 15.0).clamp(0.0, 100.0);
  }

  // Generate initial greeting
  Future<String> _generateGreeting(ClientPersona persona, String scenarioType, UserModel user) async {
    final greetings = {
      'Cold Call': [
        "Hello, this is ${persona.name} from ${persona.company}. I'm quite busy today, so you'll need to make this quick.",
        "${persona.name} speaking. I wasn't expecting a call - what's this regarding?",
        "Hi, I'm ${persona.name}. I have a meeting in a few minutes, so what can I do for you?",
      ],
      'Discovery Call': [
        "Hi, thanks for setting up this call. I'm ${persona.name}, ${persona.role} at ${persona.company}. I understand you wanted to discuss our ${persona.painPoints.isNotEmpty ? persona.painPoints.first.toLowerCase() : 'business needs'}?",
        "Hello, I'm ${persona.name}. I'm interested to hear what you have to say, but I should mention we're quite happy with our current ${_getRandomSolution(persona.industry)}.",
      ],
      'Product Demo': [
        "Hi there, I'm ${persona.name}. I've seen a lot of demos lately, so I'm hoping this will be different. What makes your solution special?",
        "Good morning, I'm ${persona.name} from ${persona.company}. I have about 30 minutes for this demo. Let's see what you've got.",
      ],
      'Objection Handling': [
        "Look, I'll be direct with you. I like what I've seen so far, but I'm concerned about ${persona.objections.isNotEmpty ? persona.objections.first.toLowerCase() : 'the cost'}. How do you address that?",
        "I appreciate the presentation, but honestly, I'm not convinced this is worth the investment. Can you change my mind?",
      ],
      'Closing Call': [
        "So we've talked through everything, and while I see the value, I'm still not sure about moving forward. What would you do in my position?",
        "This all sounds good in theory, but I need to be practical here. What's the real bottom line for us?",
      ],
    };

    final scenarioGreetings = greetings[scenarioType] ?? greetings['Discovery Call']!;
    return scenarioGreetings[Random().nextInt(scenarioGreetings.length)];
  }

  // Generate client persona
  ClientPersona _generateClientPersona(String industry, String scenarioType) {
    final personas = _getIndustryPersonas(industry);
    final basePersona = personas[Random().nextInt(personas.length)];

    return ClientPersona(
      name: basePersona['name'],
      personality: PersonalityType.values[Random().nextInt(PersonalityType.values.length)],
      industry: industry,
      company: basePersona['company'],
      role: basePersona['role'],
      decisionMaker: DecisionMakerType.values[Random().nextInt(DecisionMakerType.values.length)],
      communicationStyle: CommunicationStyle.values[Random().nextInt(CommunicationStyle.values.length)],
      painPoints: List<String>.from(basePersona['painPoints']),
      motivations: List<String>.from(basePersona['motivations']),
      objections: List<String>.from(basePersona['objections']),
      background: basePersona['background'],
    );
  }

  // Get industry-specific personas
  List<Map<String, dynamic>> _getIndustryPersonas(String industry) {
    switch (industry) {
      case 'Technology':
        return [
          {
            'name': 'Sarah Chen',
            'company': 'TechCorp Solutions',
            'role': 'VP of Engineering',
            'painPoints': ['Legacy system maintenance', 'Scaling challenges', 'Security concerns'],
            'motivations': ['Innovation', 'Efficiency', 'Team productivity'],
            'objections': ['Integration complexity', 'Learning curve', 'Budget constraints'],
            'background': 'Former startup CTO, values practical solutions over flashy features',
          },
          {
            'name': 'Marcus Rodriguez',
            'company': 'Digital Innovations Inc',
            'role': 'IT Director',
            'painPoints': ['Vendor management', 'System downtime', 'Data silos'],
            'motivations': ['Reliability', 'Cost reduction', 'Automation'],
            'objections': ['Vendor lock-in', 'Implementation timeline', 'ROI uncertainty'],
            'background': '15 years in enterprise IT, prefers proven technologies',
          },
        ];
      case 'Healthcare':
        return [
          {
            'name': 'Dr. Jennifer Walsh',
            'company': 'Metropolitan Medical Center',
            'role': 'Chief Medical Officer',
            'painPoints': ['Patient flow efficiency', 'Documentation burden', 'Compliance requirements'],
            'motivations': ['Patient outcomes', 'Staff efficiency', 'Regulatory compliance'],
            'objections': ['HIPAA concerns', 'Staff training time', 'Workflow disruption'],
            'background': 'Practicing physician with 20+ years experience, patient-first mindset',
          },
        ];
      default:
        return [
          {
            'name': 'Michael Thompson',
            'company': 'Progressive Enterprises',
            'role': 'Operations Manager',
            'painPoints': ['Process inefficiencies', 'Cost management', 'Quality control'],
            'motivations': ['Operational excellence', 'Cost savings', 'Growth'],
            'objections': ['Implementation costs', 'Change management', 'Proven results'],
            'background': 'Results-driven professional focused on bottom-line impact',
          },
        ];
    }
  }

  // Get random solution for industry
  String _getRandomSolution(String industry) {
    final solutions = {
      'Technology': ['development platform', 'monitoring solution', 'security system'],
      'Healthcare': ['EHR system', 'patient management platform', 'compliance solution'],
      'Finance': ['trading platform', 'risk management system', 'analytics tool'],
    };
    final industrySolutions = solutions[industry] ?? ['current solution'];
    return industrySolutions[Random().nextInt(industrySolutions.length)];
  }

  // Generate fallback response
  String _generateFallbackResponse(ClientPersona persona) {
    final fallbacks = [
      "I see. Tell me more about that.",
      "That's interesting. How would that work for our specific situation?",
      "I'm not sure I follow. Can you elaborate?",
      "We've heard similar claims before. What makes this different?",
      "I appreciate that, but I'm more concerned about the practical implementation.",
    ];
    return fallbacks[Random().nextInt(fallbacks.length)];
  }

  // End conversation and generate final score
  Future<ConversationScore> endConversation() async {
    if (_currentConversation == null) {
      throw Exception('No active conversation to end');
    }

    _currentConversation!.updateStatus(ConversationStatus.completed);

    // Generate comprehensive score
    final score = await _generateConversationScore(_currentConversation!);
    _currentConversation!.finalScore = score;

    final completedConversation = _currentConversation!;
    _currentConversation = null;

    notifyListeners();
    return score;
  }

  // Generate comprehensive conversation score
  Future<ConversationScore> _generateConversationScore(ConversationModel conversation) async {
    final userMessages = conversation.messages.where((m) => m.sender == MessageSender.user);

    if (userMessages.isEmpty) {
      return ConversationScore(
        overallScore: 0.0,
        feedback: 'No user input to analyze.',
        strengths: [],
        improvements: ['Engage more actively in the conversation'],
      );
    }

    // Calculate individual skill scores
    final skillScores = <String, double>{};
    var totalConfidence = 0.0;
    var totalQuestionQuality = 0.0;
    var totalListening = 0.0;
    var totalRapport = 0.0;
    var totalValue = 0.0;

    for (final message in userMessages) {
      totalConfidence += message.analysis['confidence'] ?? 0.0;
      totalQuestionQuality += message.analysis['questionQuality'] ?? 0.0;
      totalListening += message.analysis['activeListening'] ?? 0.0;
      totalRapport += message.analysis['rapportBuilding'] ?? 0.0;
      totalValue += message.analysis['valueArticulation'] ?? 0.0;
    }

    final messageCount = userMessages.length.toDouble();
    skillScores['confidence'] = totalConfidence / messageCount;
    skillScores['question_quality'] = totalQuestionQuality / messageCount;
    skillScores['active_listening'] = totalListening / messageCount;
    skillScores['rapport_building'] = totalRapport / messageCount;
    skillScores['value_articulation'] = totalValue / messageCount;

    // Calculate overall score
    final overallScore = skillScores.values.reduce((a, b) => a + b) / skillScores.length;

    // Generate strengths and improvements
    final strengths = <String>[];
    final improvements = <String>[];

    skillScores.forEach((skill, score) {
      if (score >= 70.0) {
        strengths.add(_getStrengthMessage(skill, score));
      } else if (score < 50.0) {
        improvements.add(_getImprovementMessage(skill, score));
      }
    });

    // Generate personalized feedback
    final feedback = _generatePersonalizedFeedback(overallScore, skillScores, conversation);

    return ConversationScore(
      overallScore: overallScore,
      skillScores: skillScores,
      strengths: strengths,
      improvements: improvements,
      feedback: feedback,
      detailedAnalysis: {
        'messageCount': messageCount,
        'averageResponseTime': conversation.averageResponseTime,
        'conversationDuration': conversation.duration.inMinutes,
        'clientPersona': conversation.clientPersona.toMap(),
      },
    );
  }

  String _getStrengthMessage(String skill, double score) {
    switch (skill) {
      case 'confidence':
        return 'Strong confident communication style';
      case 'question_quality':
        return 'Excellent use of open-ended questions';
      case 'active_listening':
        return 'Great listening skills and building on client responses';
      case 'rapport_building':
        return 'Effective rapport building and empathy';
      case 'value_articulation':
        return 'Clear articulation of value and benefits';
      default:
        return 'Strong performance in $skill';
    }
  }

  String _getImprovementMessage(String skill, double score) {
    switch (skill) {
      case 'confidence':
        return 'Use more confident language and avoid uncertain phrases';
      case 'question_quality':
        return 'Ask more open-ended discovery questions';
      case 'active_listening':
        return 'Reference what the client says and build on their responses';
      case 'rapport_building':
        return 'Show more empathy and understanding of client concerns';
      case 'value_articulation':
        return 'Focus more on specific benefits and value propositions';
      default:
        return 'Focus on improving $skill';
    }
  }

  String _generatePersonalizedFeedback(double overallScore, Map<String, double> skillScores, ConversationModel conversation) {
    if (overallScore >= 85) {
      return "Excellent performance! You demonstrated strong sales skills across all areas. Your approach was professional, confident, and client-focused.";
    } else if (overallScore >= 70) {
      return "Good performance with room for improvement. Focus on your weaker areas while maintaining your strengths.";
    } else if (overallScore >= 55) {
      return "Adequate performance, but significant improvement needed. Practice the fundamentals and work on building more natural conversations.";
    } else {
      return "Needs improvement. Focus on basic sales conversation skills, active listening, and building rapport with prospects.";
    }
  }

  // Utility methods
  String _generateId() => DateTime.now().millisecondsSinceEpoch.toString();
  String _generateSessionId() => 'session_${DateTime.now().millisecondsSinceEpoch}';

  @override
  void dispose() {
    _currentConversation = null;
    super.dispose();
  }
}