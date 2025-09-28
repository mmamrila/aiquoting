// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class UserModelAdapter extends TypeAdapter<UserModel> {
  @override
  final int typeId = 0;

  @override
  UserModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserModel(
      uid: fields[0] as String,
      email: fields[1] as String,
      firstName: fields[2] as String,
      lastName: fields[3] as String,
      profileImageUrl: fields[4] as String?,
      industry: fields[5] as String,
      experienceLevel: fields[6] as String,
      company: fields[7] as String?,
      jobTitle: fields[8] as String?,
      createdAt: fields[9] as DateTime,
      updatedAt: fields[10] as DateTime,
      isActive: fields[11] as bool,
      isPremium: fields[12] as bool,
      totalSessions: fields[13] as int,
      averageScore: fields[14] as double,
      bestScore: fields[15] as double,
      currentStreak: fields[16] as int,
      longestStreak: fields[17] as int,
      achievements: (fields[18] as List?)?.cast<String>(),
      preferences: (fields[19] as Map?)?.cast<String, dynamic>(),
      skillScores: (fields[20] as Map?)?.cast<String, double>(),
    );
  }

  @override
  void write(BinaryWriter writer, UserModel obj) {
    writer
      ..writeByte(21)
      ..writeByte(0)
      ..write(obj.uid)
      ..writeByte(1)
      ..write(obj.email)
      ..writeByte(2)
      ..write(obj.firstName)
      ..writeByte(3)
      ..write(obj.lastName)
      ..writeByte(4)
      ..write(obj.profileImageUrl)
      ..writeByte(5)
      ..write(obj.industry)
      ..writeByte(6)
      ..write(obj.experienceLevel)
      ..writeByte(7)
      ..write(obj.company)
      ..writeByte(8)
      ..write(obj.jobTitle)
      ..writeByte(9)
      ..write(obj.createdAt)
      ..writeByte(10)
      ..write(obj.updatedAt)
      ..writeByte(11)
      ..write(obj.isActive)
      ..writeByte(12)
      ..write(obj.isPremium)
      ..writeByte(13)
      ..write(obj.totalSessions)
      ..writeByte(14)
      ..write(obj.averageScore)
      ..writeByte(15)
      ..write(obj.bestScore)
      ..writeByte(16)
      ..write(obj.currentStreak)
      ..writeByte(17)
      ..write(obj.longestStreak)
      ..writeByte(18)
      ..write(obj.achievements)
      ..writeByte(19)
      ..write(obj.preferences)
      ..writeByte(20)
      ..write(obj.skillScores);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
