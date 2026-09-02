import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:flutter/material.dart';

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: AppStateView(
        icon: Icons.layers_outlined,
        title: title,
        message: message,
      ),
    );
  }
}
