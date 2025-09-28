import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:hive/hive.dart';

part 'conversation_model.g.dart';

@HiveType(typeId: 1)
class ConversationModel extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String userId;

  @HiveField(2)
  String sessionId;

  @HiveField(3)
  String scenarioType;

  @HiveField(4)
  String industry;

  @HiveField(5)
  ClientPersona clientPersona;

  @HiveField(6)
  List<ConversationMessage> messages;

  @HiveField(7)
  ConversationStatus status;

  @HiveField(8)
  DateTime startTime;

  @HiveField(9)
  DateTime? endTime;

  @HiveField(10)
  Duration duration;

  @HiveField(11)
  ConversationScore? finalScore;

  @HiveField(12)
  Map<String, dynamic> metadata;

  ConversationModel({
    required this.id,
    required this.userId,
    required this.sessionId,
    required this.scenarioType,
    required this.industry,
    required this.clientPersona,
    List<ConversationMessage>? messages,
    this.status = ConversationStatus.active,
    required this.startTime,
    this.endTime,
    this.duration = Duration.zero,
    this.finalScore,
    Map<String, dynamic>? metadata,
  })  : messages = messages ?? [],
        metadata = metadata ?? {};

  factory ConversationModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    return ConversationModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      sessionId: data['sessionId'] ?? '',
      scenarioType: data['scenarioType'] ?? '',
      industry: data['industry'] ?? '',
      clientPersona: ClientPersona.fromMap(data['clientPersona'] ?? {}),
      messages: (data['messages'] as List<dynamic>?)
              ?.map((m) => ConversationMessage.fromMap(m))
              .toList() ??
          [],
      status: ConversationStatus.values.firstWhere(
        (s) => s.name == data['status'],
        orElse: () => ConversationStatus.active,
      ),
      startTime: (data['startTime'] as Timestamp).toDate(),
      endTime: data['endTime'] != null
          ? (data['endTime'] as Timestamp).toDate()
          : null,
      duration: Duration(seconds: data['durationSeconds'] ?? 0),
      finalScore: data['finalScore'] != null
          ? ConversationScore.fromMap(data['finalScore'])
          : null,
      metadata: Map<String, dynamic>.from(data['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'sessionId': sessionId,
      'scenarioType': scenarioType,
      'industry': industry,
      'clientPersona': clientPersona.toMap(),
      'messages': messages.map((m) => m.toMap()).toList(),
      'status': status.name,
      'startTime': Timestamp.fromDate(startTime),
      'endTime': endTime != null ? Timestamp.fromDate(endTime!) : null,
      'durationSeconds': duration.inSeconds,
      'finalScore': finalScore?.toMap(),
      'metadata': metadata,
    };
  }

  void addMessage(ConversationMessage message) {
    messages.add(message);
    metadata['lastActivity'] = DateTime.now().toIso8601String();
  }

  void updateStatus(ConversationStatus newStatus) {
    status = newStatus;
    if (newStatus == ConversationStatus.completed) {
      endTime = DateTime.now();
      duration = endTime!.difference(startTime);
    }
  }

  double get averageResponseTime {
    if (messages.length < 2) return 0.0;

    var totalTime = 0.0;
    var count = 0;

    for (int i = 1; i < messages.length; i++) {
      if (messages[i].sender == MessageSender.user &&
          messages[i-1].sender == MessageSender.ai) {
        totalTime += messages[i].timestamp.difference(messages[i-1].timestamp).inSeconds;
        count++;
      }
    }

    return count > 0 ? totalTime / count : 0.0;
  }

  int get messageCount => messages.length;
  int get userMessageCount => messages.where((m) => m.sender == MessageSender.user).length;
  int get aiMessageCount => messages.where((m) => m.sender == MessageSender.ai).length;
}

@HiveType(typeId: 2)
class ConversationMessage extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  MessageSender sender;

  @HiveField(2)
  String content;

  @HiveField(3)
  DateTime timestamp;

  @HiveField(4)
  MessageType type;

  @HiveField(5)
  Map<String, dynamic> analysis;

  @HiveField(6)
  String? audioPath;

  @HiveField(7)
  Duration? audioDuration;

  ConversationMessage({
    required this.id,
    required this.sender,
    required this.content,
    required this.timestamp,
    this.type = MessageType.text,
    Map<String, dynamic>? analysis,
    this.audioPath,
    this.audioDuration,
  }) : analysis = analysis ?? {};

  factory ConversationMessage.fromMap(Map<String, dynamic> map) {
    return ConversationMessage(
      id: map['id'] ?? '',
      sender: MessageSender.values.firstWhere(
        (s) => s.name == map['sender'],
        orElse: () => MessageSender.user,
      ),
      content: map['content'] ?? '',
      timestamp: DateTime.parse(map['timestamp']),
      type: MessageType.values.firstWhere(
        (t) => t.name == map['type'],
        orElse: () => MessageType.text,
      ),
      analysis: Map<String, dynamic>.from(map['analysis'] ?? {}),
      audioPath: map['audioPath'],
      audioDuration: map['audioDurationMs'] != null
          ? Duration(milliseconds: map['audioDurationMs'])
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'sender': sender.name,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'type': type.name,
      'analysis': analysis,
      'audioPath': audioPath,
      'audioDurationMs': audioDuration?.inMilliseconds,
    };
  }
}

@HiveType(typeId: 3)
class ClientPersona extends HiveObject {
  @HiveField(0)
  String name;

  @HiveField(1)
  PersonalityType personality;

  @HiveField(2)
  String industry;

  @HiveField(3)
  String company;

  @HiveField(4)
  String role;

  @HiveField(5)
  DecisionMakerType decisionMaker;

  @HiveField(6)
  CommunicationStyle communicationStyle;

  @HiveField(7)
  List<String> painPoints;

  @HiveField(8)
  List<String> motivations;

  @HiveField(9)
  List<String> objections;

  @HiveField(10)
  String background;

  @HiveField(11)
  Map<String, dynamic> preferences;

  ClientPersona({
    required this.name,
    required this.personality,
    required this.industry,
    required this.company,
    required this.role,
    required this.decisionMaker,
    required this.communicationStyle,
    List<String>? painPoints,
    List<String>? motivations,
    List<String>? objections,
    required this.background,
    Map<String, dynamic>? preferences,
  })  : painPoints = painPoints ?? [],
        motivations = motivations ?? [],
        objections = objections ?? [],
        preferences = preferences ?? {};

  factory ClientPersona.fromMap(Map<String, dynamic> map) {
    return ClientPersona(
      name: map['name'] ?? '',
      personality: PersonalityType.values.firstWhere(
        (p) => p.name == map['personality'],
        orElse: () => PersonalityType.analytical,
      ),
      industry: map['industry'] ?? '',
      company: map['company'] ?? '',
      role: map['role'] ?? '',
      decisionMaker: DecisionMakerType.values.firstWhere(
        (d) => d.name == map['decisionMaker'],
        orElse: () => DecisionMakerType.primary,
      ),
      communicationStyle: CommunicationStyle.values.firstWhere(
        (c) => c.name == map['communicationStyle'],
        orElse: () => CommunicationStyle.direct,
      ),
      painPoints: List<String>.from(map['painPoints'] ?? []),
      motivations: List<String>.from(map['motivations'] ?? []),
      objections: List<String>.from(map['objections'] ?? []),
      background: map['background'] ?? '',
      preferences: Map<String, dynamic>.from(map['preferences'] ?? {}),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'personality': personality.name,
      'industry': industry,
      'company': company,
      'role': role,
      'decisionMaker': decisionMaker.name,
      'communicationStyle': communicationStyle.name,
      'painPoints': painPoints,
      'motivations': motivations,
      'objections': objections,
      'background': background,
      'preferences': preferences,
    };
  }
}

@HiveType(typeId: 4)
class ConversationScore extends HiveObject {
  @HiveField(0)
  double overallScore;

  @HiveField(1)
  Map<String, double> skillScores;

  @HiveField(2)
  List<String> strengths;

  @HiveField(3)
  List<String> improvements;

  @HiveField(4)
  String feedback;

  @HiveField(5)
  Map<String, dynamic> detailedAnalysis;

  ConversationScore({
    required this.overallScore,
    Map<String, double>? skillScores,
    List<String>? strengths,
    List<String>? improvements,
    required this.feedback,
    Map<String, dynamic>? detailedAnalysis,
  })  : skillScores = skillScores ?? {},
        strengths = strengths ?? [],
        improvements = improvements ?? [],
        detailedAnalysis = detailedAnalysis ?? {};

  factory ConversationScore.fromMap(Map<String, dynamic> map) {
    return ConversationScore(
      overallScore: (map['overallScore'] ?? 0.0).toDouble(),
      skillScores: Map<String, double>.from(map['skillScores'] ?? {}),
      strengths: List<String>.from(map['strengths'] ?? []),
      improvements: List<String>.from(map['improvements'] ?? []),
      feedback: map['feedback'] ?? '',
      detailedAnalysis: Map<String, dynamic>.from(map['detailedAnalysis'] ?? {}),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'overallScore': overallScore,
      'skillScores': skillScores,
      'strengths': strengths,
      'improvements': improvements,
      'feedback': feedback,
      'detailedAnalysis': detailedAnalysis,
    };
  }
}

@HiveType(typeId: 10)
enum ConversationStatus {
  @HiveField(0)
  active,
  @HiveField(1)
  paused,
  @HiveField(2)
  completed,
  @HiveField(3)
  cancelled,
}

@HiveType(typeId: 11)
enum MessageSender {
  @HiveField(0)
  user,
  @HiveField(1)
  ai,
  @HiveField(2)
  system,
}

@HiveType(typeId: 12)
enum MessageType {
  @HiveField(0)
  text,
  @HiveField(1)
  audio,
  @HiveField(2)
  system,
}

@HiveType(typeId: 13)
enum PersonalityType {
  @HiveField(0)
  analytical,
  @HiveField(1)
  relationshipBuilder,
  @HiveField(2)
  budgetHawk,
  @HiveField(3)
  innovator,
  @HiveField(4)
  skeptical,
  @HiveField(5)
  timePressed,
}

@HiveType(typeId: 14)
enum DecisionMakerType {
  @HiveField(0)
  primary,
  @HiveField(1)
  influencer,
  @HiveField(2)
  gatekeeper,
  @HiveField(3)
  user,
}

@HiveType(typeId: 15)
enum CommunicationStyle {
  @HiveField(0)
  direct,
  @HiveField(1)
  collaborative,
  @HiveField(2)
  analytical,
  @HiveField(3)
  relationship,
  @HiveField(4)
  competitive,
}