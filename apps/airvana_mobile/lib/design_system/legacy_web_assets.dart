String legacyWebAvatarAsset(String seed) {
  var hash = 2166136261;
  for (final codeUnit in seed.codeUnits) {
    hash = ((hash ^ codeUnit) * 16777619) & 0xffffffff;
  }
  final index = hash % 36 + 1;
  return 'assets/legacy/avatars/avatar_${index.toString().padLeft(2, '0')}.png';
}
