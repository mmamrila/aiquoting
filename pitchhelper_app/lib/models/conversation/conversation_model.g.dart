// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ConversationModelAdapter extends TypeAdapter<ConversationModel> {
  @override
  final int typeId = 1;

  @override
  ConversationModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ConversationModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      sessionId: fields[2] as String,
      scenarioType: fields[3] as String,
      industry: fields[4] as String,
      clientPersona: fields[5] as ClientPersona,
      messages: (fields[6] as List?)?.cast<ConversationMessage>(),
      status: fields[7] as ConversationStatus,
      startTime: fields[8] as DateTime,
      endTime: fields[9] as DateTime?,
      duration: fields[10] as Duration,
      finalScore: fields[11] as ConversationScore?,
      metadata: (fields[12] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, ConversationModel obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.sessionId)
      ..writeByte(3)
      ..write(obj.scenarioType)
      ..writeByte(4)
      ..write(obj.industry)
      ..writeByte(5)
      ..write(obj.clientPersona)
      ..writeByte(6)
      ..write(obj.messages)
      ..writeByte(7)
      ..write(obj.status)
      ..writeByte(8)
      ..write(obj.startTime)
      ..writeByte(9)
      ..write(obj.endTime)
      ..writeByte(10)
      ..write(obj.duration)
      ..writeByte(11)
      ..write(obj.finalScore)
      ..writeByte(12)
      ..write(obj.metadata);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ConversationMessageAdapter extends TypeAdapter<ConversationMessage> {
  @override
  final int typeId = 2;

  @override
  ConversationMessage read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ConversationMessage(
      id: fields[0] as String,
      sender: fields[1] as MessageSender,
      content: fields[2] as String,
      timestamp: fields[3] as DateTime,
      type: fields[4] as MessageType,
      analysis: (fields[5] as Map?)?.cast<String, dynamic>(),
      audioPath: fields[6] as String?,
      audioDuration: fields[7] as Duration?,
    );
  }

  @override
  void write(BinaryWriter writer, ConversationMessage obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.sender)
      ..writeByte(2)
      ..write(obj.content)
      ..writeByte(3)
      ..write(obj.timestamp)
      ..writeByte(4)
      ..write(obj.type)
      ..writeByte(5)
      ..write(obj.analysis)
      ..writeByte(6)
      ..write(obj.audioPath)
      ..writeByte(7)
      ..write(obj.audioDuration);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationMessageAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ClientPersonaAdapter extends TypeAdapter<ClientPersona> {
  @override
  final int typeId = 3;

  @override
  ClientPersona read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ClientPersona(
      name: fields[0] as String,
      personality: fields[1] as PersonalityType,
      industry: fields[2] as String,
      company: fields[3] as String,
      role: fields[4] as String,
      decisionMaker: fields[5] as DecisionMakerType,
      communicationStyle: fields[6] as CommunicationStyle,
      painPoints: (fields[7] as List?)?.cast<String>(),
      motivations: (fields[8] as List?)?.cast<String>(),
      objections: (fields[9] as List?)?.cast<String>(),
      background: fields[10] as String,
      preferences: (fields[11] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, ClientPersona obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.name)
      ..writeByte(1)
      ..write(obj.personality)
      ..writeByte(2)
      ..write(obj.industry)
      ..writeByte(3)
      ..write(obj.company)
      ..writeByte(4)
      ..write(obj.role)
      ..writeByte(5)
      ..write(obj.decisionMaker)
      ..writeByte(6)
      ..write(obj.communicationStyle)
      ..writeByte(7)
      ..write(obj.painPoints)
      ..writeByte(8)
      ..write(obj.motivations)
      ..writeByte(9)
      ..write(obj.objections)
      ..writeByte(10)
      ..write(obj.background)
      ..writeByte(11)
      ..write(obj.preferences);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClientPersonaAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ConversationScoreAdapter extends TypeAdapter<ConversationScore> {
  @override
  final int typeId = 4;

  @override
  ConversationScore read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ConversationScore(
      overallScore: fields[0] as double,
      skillScores: (fields[1] as Map?)?.cast<String, double>(),
      strengths: (fields[2] as List?)?.cast<String>(),
      improvements: (fields[3] as List?)?.cast<String>(),
      feedback: fields[4] as String,
      detailedAnalysis: (fields[5] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, ConversationScore obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.overallScore)
      ..writeByte(1)
      ..write(obj.skillScores)
      ..writeByte(2)
      ..write(obj.strengths)
      ..writeByte(3)
      ..write(obj.improvements)
      ..writeByte(4)
      ..write(obj.feedback)
      ..writeByte(5)
      ..write(obj.detailedAnalysis);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationScoreAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ConversationStatusAdapter extends TypeAdapter<ConversationStatus> {
  @override
  final int typeId = 10;

  @override
  ConversationStatus read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return ConversationStatus.active;
      case 1:
        return ConversationStatus.paused;
      case 2:
        return ConversationStatus.completed;
      case 3:
        return ConversationStatus.cancelled;
      default:
        return ConversationStatus.active;
    }
  }

  @override
  void write(BinaryWriter writer, ConversationStatus obj) {
    switch (obj) {
      case ConversationStatus.active:
        writer.writeByte(0);
        break;
      case ConversationStatus.paused:
        writer.writeByte(1);
        break;
      case ConversationStatus.completed:
        writer.writeByte(2);
        break;
      case ConversationStatus.cancelled:
        writer.writeByte(3);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationStatusAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class MessageSenderAdapter extends TypeAdapter<MessageSender> {
  @override
  final int typeId = 11;

  @override
  MessageSender read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return MessageSender.user;
      case 1:
        return MessageSender.ai;
      case 2:
        return MessageSender.system;
      default:
        return MessageSender.user;
    }
  }

  @override
  void write(BinaryWriter writer, MessageSender obj) {
    switch (obj) {
      case MessageSender.user:
        writer.writeByte(0);
        break;
      case MessageSender.ai:
        writer.writeByte(1);
        break;
      case MessageSender.system:
        writer.writeByte(2);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MessageSenderAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class MessageTypeAdapter extends TypeAdapter<MessageType> {
  @override
  final int typeId = 12;

  @override
  MessageType read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return MessageType.text;
      case 1:
        return MessageType.audio;
      case 2:
        return MessageType.system;
      default:
        return MessageType.text;
    }
  }

  @override
  void write(BinaryWriter writer, MessageType obj) {
    switch (obj) {
      case MessageType.text:
        writer.writeByte(0);
        break;
      case MessageType.audio:
        writer.writeByte(1);
        break;
      case MessageType.system:
        writer.writeByte(2);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MessageTypeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PersonalityTypeAdapter extends TypeAdapter<PersonalityType> {
  @override
  final int typeId = 13;

  @override
  PersonalityType read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return PersonalityType.analytical;
      case 1:
        return PersonalityType.relationshipBuilder;
      case 2:
        return PersonalityType.budgetHawk;
      case 3:
        return PersonalityType.innovator;
      case 4:
        return PersonalityType.skeptical;
      case 5:
        return PersonalityType.timePressed;
      default:
        return PersonalityType.analytical;
    }
  }

  @override
  void write(BinaryWriter writer, PersonalityType obj) {
    switch (obj) {
      case PersonalityType.analytical:
        writer.writeByte(0);
        break;
      case PersonalityType.relationshipBuilder:
        writer.writeByte(1);
        break;
      case PersonalityType.budgetHawk:
        writer.writeByte(2);
        break;
      case PersonalityType.innovator:
        writer.writeByte(3);
        break;
      case PersonalityType.skeptical:
        writer.writeByte(4);
        break;
      case PersonalityType.timePressed:
        writer.writeByte(5);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PersonalityTypeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class DecisionMakerTypeAdapter extends TypeAdapter<DecisionMakerType> {
  @override
  final int typeId = 14;

  @override
  DecisionMakerType read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return DecisionMakerType.primary;
      case 1:
        return DecisionMakerType.influencer;
      case 2:
        return DecisionMakerType.gatekeeper;
      case 3:
        return DecisionMakerType.user;
      default:
        return DecisionMakerType.primary;
    }
  }

  @override
  void write(BinaryWriter writer, DecisionMakerType obj) {
    switch (obj) {
      case DecisionMakerType.primary:
        writer.writeByte(0);
        break;
      case DecisionMakerType.influencer:
        writer.writeByte(1);
        break;
      case DecisionMakerType.gatekeeper:
        writer.writeByte(2);
        break;
      case DecisionMakerType.user:
        writer.writeByte(3);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DecisionMakerTypeAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class CommunicationStyleAdapter extends TypeAdapter<CommunicationStyle> {
  @override
  final int typeId = 15;

  @override
  CommunicationStyle read(BinaryReader reader) {
    switch (reader.readByte()) {
      case 0:
        return CommunicationStyle.direct;
      case 1:
        return CommunicationStyle.collaborative;
      case 2:
        return CommunicationStyle.analytical;
      case 3:
        return CommunicationStyle.relationship;
      case 4:
        return CommunicationStyle.competitive;
      default:
        return CommunicationStyle.direct;
    }
  }

  @override
  void write(BinaryWriter writer, CommunicationStyle obj) {
    switch (obj) {
      case CommunicationStyle.direct:
        writer.writeByte(0);
        break;
      case CommunicationStyle.collaborative:
        writer.writeByte(1);
        break;
      case CommunicationStyle.analytical:
        writer.writeByte(2);
        break;
      case CommunicationStyle.relationship:
        writer.writeByte(3);
        break;
      case CommunicationStyle.competitive:
        writer.writeByte(4);
        break;
    }
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommunicationStyleAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
