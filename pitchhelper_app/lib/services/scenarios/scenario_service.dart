import 'package:flutter/material.dart';
import '../../models/conversation/conversation_model.dart';
import '../../models/user/user_model.dart';

class ScenarioService extends ChangeNotifier {
  static final ScenarioService _instance = ScenarioService._internal();
  factory ScenarioService() => _instance;
  ScenarioService._internal();

  final Map<String, List<PracticeScenario>> _scenarios = {};
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  // Initialize scenarios
  Future<void> initialize() async {
    await _loadScenarios();
    _isInitialized = true;
    debugPrint('ScenarioService initialized with ${_scenarios.length} scenario types');
  }

  // Get scenarios by type
  List<PracticeScenario> getScenarios(String scenarioType) {
    return _scenarios[scenarioType] ?? [];
  }

  // Get scenario by ID
  PracticeScenario? getScenarioById(String id) {
    for (final scenarios in _scenarios.values) {
      for (final scenario in scenarios) {
        if (scenario.id == id) return scenario;
      }
    }
    return null;
  }

  // Get recommended scenarios for user
  List<PracticeScenario> getRecommendedScenarios(UserModel user) {
    final recommended = <PracticeScenario>[];
    final userLevel = _getUserSkillLevel(user);
    final userIndustry = user.industry;

    // Get scenarios matching user's industry and skill level
    for (final scenarios in _scenarios.values) {
      for (final scenario in scenarios) {
        if (scenario.industries.contains(userIndustry) || scenario.industries.contains('General')) {
          if (scenario.difficulty.index <= userLevel.index + 1) {
            recommended.add(scenario);
          }
        }
      }
    }

    // Sort by relevance and difficulty
    recommended.sort((a, b) {
      final aRelevance = _calculateRelevance(a, user);
      final bRelevance = _calculateRelevance(b, user);
      return bRelevance.compareTo(aRelevance);
    });

    return recommended.take(6).toList();
  }

  // Get scenarios by industry
  List<PracticeScenario> getScenariosByIndustry(String industry) {
    final scenarios = <PracticeScenario>[];
    for (final scenarioList in _scenarios.values) {
      scenarios.addAll(scenarioList.where(
        (s) => s.industries.contains(industry) || s.industries.contains('General')
      ));
    }
    return scenarios;
  }

  // Get scenarios by difficulty
  List<PracticeScenario> getScenariosByDifficulty(DifficultyLevel difficulty) {
    final scenarios = <PracticeScenario>[];
    for (final scenarioList in _scenarios.values) {
      scenarios.addAll(scenarioList.where((s) => s.difficulty == difficulty));
    }
    return scenarios;
  }

  // Create custom scenario
  PracticeScenario createCustomScenario({
    required String title,
    required String description,
    required String scenarioType,
    required List<String> industries,
    required DifficultyLevel difficulty,
    required ClientPersona clientPersona,
    List<String>? objectives,
    List<String>? tips,
    Map<String, dynamic>? metadata,
  }) {
    return PracticeScenario(
      id: _generateId(),
      title: title,
      description: description,
      scenarioType: scenarioType,
      industries: industries,
      difficulty: difficulty,
      estimatedDuration: 15, // Default 15 minutes
      objectives: objectives ?? [],
      clientPersona: clientPersona,
      tips: tips ?? [],
      metadata: metadata ?? {},
    );
  }

  // Load predefined scenarios
  Future<void> _loadScenarios() async {
    _scenarios.clear();

    // Cold Call Scenarios
    _scenarios['Cold Call'] = [
      PracticeScenario(
        id: 'cold_tech_cio',
        title: 'Cold Call to Tech CIO',
        description: 'You\'re calling the CIO of a mid-size tech company about your cloud security solution.',
        scenarioType: 'Cold Call',
        industries: ['Technology'],
        difficulty: DifficultyLevel.intermediate,
        estimatedDuration: 12,
        objectives: [
          'Break through the gatekeeper mindset',
          'Generate interest in 30 seconds',
          'Secure a discovery meeting',
        ],
        clientPersona: ClientPersona(
          name: 'David Kim',
          personality: PersonalityType.analytical,
          industry: 'Technology',
          company: 'InnovateTech Solutions',
          role: 'Chief Information Officer',
          decisionMaker: DecisionMakerType.primary,
          communicationStyle: CommunicationStyle.direct,
          painPoints: [
            'Recent security breaches in the industry',
            'Compliance requirements becoming stricter',
            'Managing multiple security vendors',
          ],
          motivations: [
            'Protecting company data',
            'Simplifying security stack',
            'Demonstrating ROI to board',
          ],
          objections: [
            'Already have security solutions',
            'Budget is allocated for the year',
            'Need to see proven results',
          ],
          background: 'Former security engineer, very technical, values data-driven decisions',
        ),
        tips: [
          'Lead with a relevant industry statistic',
          'Reference similar companies you\'ve helped',
          'Focus on specific security challenges',
        ],
        metadata: {},
      ),

      PracticeScenario(
        id: 'cold_healthcare_admin',
        title: 'Cold Call to Hospital Administrator',
        description: 'Reaching out to a hospital administrator about your patient management system.',
        scenarioType: 'Cold Call',
        industries: ['Healthcare'],
        difficulty: DifficultyLevel.advanced,
        estimatedDuration: 15,
        objectives: [
          'Navigate healthcare complexity',
          'Address HIPAA concerns immediately',
          'Focus on patient outcomes',
        ],
        clientPersona: ClientPersona(
          name: 'Dr. Maria Santos',
          personality: PersonalityType.relationshipBuilder,
          industry: 'Healthcare',
          company: 'Regional Medical Center',
          role: 'Chief Administrative Officer',
          decisionMaker: DecisionMakerType.influencer,
          communicationStyle: CommunicationStyle.collaborative,
          painPoints: [
            'Patient wait times',
            'Staff efficiency',
            'Regulatory compliance',
          ],
          motivations: [
            'Improving patient care',
            'Reducing operational costs',
            'Staff satisfaction',
          ],
          objections: [
            'HIPAA compliance concerns',
            'Staff training requirements',
            'Integration with existing systems',
          ],
          background: 'Practicing physician turned administrator, patient-care focused',
        ),
        tips: [
          'Start with patient impact',
          'Address compliance immediately',
          'Use healthcare-specific language',
        ],
        metadata: {},
      ),
    ];

    // Discovery Call Scenarios
    _scenarios['Discovery Call'] = [
      PracticeScenario(
        id: 'discovery_saas_growth',
        title: 'SaaS Company Growth Challenges',
        description: 'Discovery call with a growing SaaS company looking to scale their operations.',
        scenarioType: 'Discovery Call',
        industries: ['Technology'],
        difficulty: DifficultyLevel.beginner,
        estimatedDuration: 20,
        objectives: [
          'Uncover specific growth challenges',
          'Understand current tech stack',
          'Identify budget and timeline',
        ],
        clientPersona: ClientPersona(
          name: 'Jennifer Chang',
          personality: PersonalityType.innovator,
          industry: 'Technology',
          company: 'GrowthTech Inc',
          role: 'VP of Operations',
          decisionMaker: DecisionMakerType.primary,
          communicationStyle: CommunicationStyle.direct,
          painPoints: [
            'Scaling customer support',
            'Data fragmentation across tools',
            'Manual processes slowing growth',
          ],
          motivations: [
            'Rapid scaling',
            'Operational efficiency',
            'Competitive advantage',
          ],
          objections: [
            'Implementation timeline concerns',
            'Integration complexity',
            'Team training overhead',
          ],
          background: 'Former startup founder, values innovation and speed',
        ),
        tips: [
          'Ask about their growth trajectory',
          'Focus on scaling challenges',
          'Understand their current workflow',
        ],
        metadata: {},
      ),
    ];

    // Product Demo Scenarios
    _scenarios['Product Demo'] = [
      PracticeScenario(
        id: 'demo_crm_sales_team',
        title: 'CRM Demo to Sales Team',
        description: 'Demonstrating your CRM platform to a sales team and their manager.',
        scenarioType: 'Product Demo',
        industries: ['General'],
        difficulty: DifficultyLevel.intermediate,
        estimatedDuration: 25,
        objectives: [
          'Show specific features that solve their problems',
          'Get the team excited about using it',
          'Address ease-of-use concerns',
        ],
        clientPersona: ClientPersona(
          name: 'Michael Rodriguez',
          personality: PersonalityType.analytical,
          industry: 'General',
          company: 'Velocity Sales Corp',
          role: 'Sales Manager',
          decisionMaker: DecisionMakerType.primary,
          communicationStyle: CommunicationStyle.analytical,
          painPoints: [
            'Sales team struggling with current CRM',
            'Poor data quality and reporting',
            'Time wasted on admin tasks',
          ],
          motivations: [
            'Increasing team productivity',
            'Better sales forecasting',
            'Improving win rates',
          ],
          objections: [
            'Team adoption challenges',
            'Data migration concerns',
            'Training time requirements',
          ],
          background: 'Results-driven sales leader, former top performer',
        ),
        tips: [
          'Use their actual data in the demo',
          'Show mobile capabilities',
          'Focus on time-saving features',
        ],
        metadata: {},
      ),
    ];

    // Objection Handling Scenarios
    _scenarios['Objection Handling'] = [
      PracticeScenario(
        id: 'objection_price_sensitive',
        title: 'Price-Sensitive Manufacturing Client',
        description: 'Handling price objections from a cost-conscious manufacturing executive.',
        scenarioType: 'Objection Handling',
        industries: ['Manufacturing'],
        difficulty: DifficultyLevel.advanced,
        estimatedDuration: 18,
        objectives: [
          'Shift focus from price to value',
          'Quantify ROI convincingly',
          'Handle multiple price objections',
        ],
        clientPersona: ClientPersona(
          name: 'Robert Thompson',
          personality: PersonalityType.budgetHawk,
          industry: 'Manufacturing',
          company: 'Precision Manufacturing Co',
          role: 'Chief Financial Officer',
          decisionMaker: DecisionMakerType.primary,
          communicationStyle: CommunicationStyle.analytical,
          painPoints: [
            'Rising operational costs',
            'Thin profit margins',
            'Economic uncertainty',
          ],
          motivations: [
            'Cost reduction',
            'Measurable ROI',
            'Risk mitigation',
          ],
          objections: [
            'Too expensive compared to alternatives',
            'Unclear return on investment',
            'Budget constraints this year',
          ],
          background: 'Conservative financial executive, risk-averse, data-driven',
        ),
        tips: [
          'Use specific ROI calculations',
          'Compare total cost of ownership',
          'Offer flexible payment terms',
        ],
        metadata: {},
      ),
    ];

    // Closing Call Scenarios
    _scenarios['Closing Call'] = [
      PracticeScenario(
        id: 'closing_enterprise_deal',
        title: 'Enterprise Software Closing',
        description: 'Final call to close a large enterprise software deal with multiple stakeholders.',
        scenarioType: 'Closing Call',
        industries: ['Technology'],
        difficulty: DifficultyLevel.expert,
        estimatedDuration: 30,
        objectives: [
          'Address final concerns',
          'Create urgency without pressure',
          'Secure commitment and next steps',
        ],
        clientPersona: ClientPersona(
          name: 'Sarah Williams',
          personality: PersonalityType.analytical,
          industry: 'Technology',
          company: 'Enterprise Solutions Ltd',
          role: 'Chief Technology Officer',
          decisionMaker: DecisionMakerType.primary,
          communicationStyle: CommunicationStyle.collaborative,
          painPoints: [
            'Need board approval for large investments',
            'Multiple vendor evaluation fatigue',
            'Implementation timeline pressure',
          ],
          motivations: [
            'Making the right long-term decision',
            'Ensuring team buy-in',
            'Minimizing implementation risk',
          ],
          objections: [
            'Need more time to evaluate',
            'Concerns about vendor stability',
            'Implementation complexity',
          ],
          background: 'Experienced enterprise buyer, thorough evaluation process',
        ),
        tips: [
          'Summarize all previously agreed points',
          'Address implementation concerns',
          'Offer pilot program if needed',
        ],
        metadata: {},
      ),
    ];

    // Follow-up Call Scenarios
    _scenarios['Follow-up Call'] = [
      PracticeScenario(
        id: 'followup_gone_quiet',
        title: 'Re-engaging Silent Prospect',
        description: 'Following up with a previously engaged prospect who has gone quiet.',
        scenarioType: 'Follow-up Call',
        industries: ['General'],
        difficulty: DifficultyLevel.intermediate,
        estimatedDuration: 12,
        objectives: [
          'Re-engage without being pushy',
          'Understand what changed',
          'Determine if opportunity is still viable',
        ],
        clientPersona: ClientPersona(
          name: 'Lisa Park',
          personality: PersonalityType.timePressed,
          industry: 'General',
          company: 'Busy Executive Corp',
          role: 'Operations Director',
          decisionMaker: DecisionMakerType.influencer,
          communicationStyle: CommunicationStyle.direct,
          painPoints: [
            'Overwhelmed with priorities',
            'Multiple vendor conversations',
            'Conflicting internal opinions',
          ],
          motivations: [
            'Solving immediate problems',
            'Moving projects forward',
            'Making quick decisions',
          ],
          objections: [
            'Too busy to focus on this',
            'Other priorities took precedence',
            'Need more internal alignment',
          ],
          background: 'Extremely busy executive, values concise communication',
        ),
        tips: [
          'Be brief and direct',
          'Provide immediate value',
          'Suggest specific next steps',
        ],
        metadata: {},
      ),
    ];

    notifyListeners();
  }

  // Calculate user skill level
  DifficultyLevel _getUserSkillLevel(UserModel user) {
    final avgScore = user.averageScore;
    if (avgScore >= 85) return DifficultyLevel.expert;
    if (avgScore >= 75) return DifficultyLevel.advanced;
    if (avgScore >= 65) return DifficultyLevel.intermediate;
    return DifficultyLevel.beginner;
  }

  // Calculate scenario relevance for user
  double _calculateRelevance(PracticeScenario scenario, UserModel user) {
    double relevance = 0.0;

    // Industry match
    if (scenario.industries.contains(user.industry)) {
      relevance += 30.0;
    } else if (scenario.industries.contains('General')) {
      relevance += 15.0;
    }

    // Difficulty appropriateness
    final userLevel = _getUserSkillLevel(user);
    final levelDiff = (scenario.difficulty.index - userLevel.index).abs();
    relevance += (4 - levelDiff) * 10.0; // Closer levels get higher relevance

    // Experience level consideration
    if (user.experienceCategory == 'Beginner' && scenario.difficulty == DifficultyLevel.beginner) {
      relevance += 20.0;
    } else if (user.experienceCategory == 'Expert' && scenario.difficulty == DifficultyLevel.expert) {
      relevance += 20.0;
    }

    return relevance;
  }

  String _generateId() => 'scenario_${DateTime.now().millisecondsSinceEpoch}';
}

class PracticeScenario {
  final String id;
  final String title;
  final String description;
  final String scenarioType;
  final List<String> industries;
  final DifficultyLevel difficulty;
  final int estimatedDuration; // minutes
  final List<String> objectives;
  final ClientPersona clientPersona;
  final List<String> tips;
  final Map<String, dynamic> metadata;

  PracticeScenario({
    required this.id,
    required this.title,
    required this.description,
    required this.scenarioType,
    required this.industries,
    required this.difficulty,
    required this.estimatedDuration,
    required this.objectives,
    required this.clientPersona,
    required this.tips,
    required this.metadata,
  });

  String get difficultyText {
    switch (difficulty) {
      case DifficultyLevel.beginner:
        return 'Beginner';
      case DifficultyLevel.intermediate:
        return 'Intermediate';
      case DifficultyLevel.advanced:
        return 'Advanced';
      case DifficultyLevel.expert:
        return 'Expert';
    }
  }

  Color get difficultyColor {
    switch (difficulty) {
      case DifficultyLevel.beginner:
        return Colors.green;
      case DifficultyLevel.intermediate:
        return Colors.blue;
      case DifficultyLevel.advanced:
        return Colors.orange;
      case DifficultyLevel.expert:
        return Colors.red;
    }
  }
}

enum DifficultyLevel {
  beginner,
  intermediate,
  advanced,
  expert,
}