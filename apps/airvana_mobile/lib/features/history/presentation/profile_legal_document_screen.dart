import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

enum AirvanaLegalDocumentType { terms, privacy }

class ProfileLegalDocumentScreen extends StatelessWidget {
  const ProfileLegalDocumentScreen({required this.type, super.key});

  final AirvanaLegalDocumentType type;

  @override
  Widget build(BuildContext context) {
    final document = type == AirvanaLegalDocumentType.terms
        ? _termsDocument
        : _privacyDocument;
    final pageTitle = type == AirvanaLegalDocumentType.terms ? '服务协议' : '隐私政策';
    return Scaffold(
      key: ValueKey('profile-legal-${type.name}'),
      backgroundColor: AirvanaColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            _LegalHeader(title: pageTitle),
            Expanded(
              child: ListView(
                key: ValueKey('profile-legal-scroll-${type.name}'),
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
                children: [
                  _LegalHero(document: document),
                  const SizedBox(height: 12),
                  _LegalSurface(
                    child: Text(
                      document.preamble,
                      style: const TextStyle(
                        color: Color(0xFF636366),
                        fontSize: 11,
                        height: 1.85,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    key: const ValueKey('legal-draft-note'),
                    padding: const EdgeInsets.all(13),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8E8),
                      borderRadius: BorderRadius.circular(15),
                      border: Border.all(color: const Color(0x47E0971F)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          document.draftTitle,
                          style: const TextStyle(
                            color: Color(0xFF926014),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            document.draftNote,
                            style: const TextStyle(
                              color: Color(0xFF7B6036),
                              fontSize: 9,
                              height: 1.6,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _LegalSurface(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '目录',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 11),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final width = (constraints.maxWidth - 12) / 2;
                            return Wrap(
                              spacing: 12,
                              runSpacing: 7,
                              children: List.generate(
                                document.sections.length,
                                (index) => SizedBox(
                                  width: width,
                                  child: Text(
                                    '${(index + 1).toString().padLeft(2, '0')} ${document.sections[index].title}',
                                    style: const TextStyle(
                                      color: Color(0xFF636366),
                                      fontSize: 9,
                                      height: 1.4,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    key: ValueKey('legal-sections-${type.name}'),
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AirvanaColors.line),
                    ),
                    child: Column(
                      children: List.generate(document.sections.length, (
                        index,
                      ) {
                        final section = document.sections[index];
                        return Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 18,
                          ),
                          decoration: BoxDecoration(
                            border: index == document.sections.length - 1
                                ? null
                                : const Border(
                                    bottom: BorderSide(
                                      color: Color(0xFFF1F1F6),
                                    ),
                                  ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 27,
                                    height: 27,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF0F1),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Text(
                                      (index + 1).toString().padLeft(2, '0'),
                                      style: const TextStyle(
                                        color: AirvanaColors.accent,
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 9),
                                  Expanded(
                                    child: Text(
                                      section.title,
                                      style: const TextStyle(
                                        color: AirvanaColors.ink,
                                        fontSize: 14,
                                        height: 1.35,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                section.body,
                                style: const TextStyle(
                                  color: Color(0xFF636366),
                                  fontSize: 11,
                                  height: 1.85,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(15),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F7FA),
                      borderRadius: BorderRadius.circular(17),
                      border: Border.all(color: AirvanaColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          document.footerTitle,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          document.footerBody,
                          style: const TextStyle(
                            color: Color(0xFF636366),
                            fontSize: 9,
                            height: 1.65,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegalHeader extends StatelessWidget {
  const _LegalHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    height: 58,
    decoration: const BoxDecoration(
      color: AirvanaColors.canvas,
      border: Border(bottom: BorderSide(color: AirvanaColors.line)),
    ),
    child: Stack(
      alignment: Alignment.center,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
        ),
        Positioned(
          left: 8,
          top: 5,
          bottom: 5,
          child: SizedBox(
            width: 48,
            child: IconButton(
              key: const ValueKey('profile-legal-back'),
              tooltip: '返回设置',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.chevron_left_rounded, size: 32),
            ),
          ),
        ),
      ],
    ),
  );
}

class _LegalHero extends StatelessWidget {
  const _LegalHero({required this.document});

  final _LegalDocument document;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('profile-legal-hero'),
    padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: Colors.white.withValues(alpha: .1)),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF15161A), Color(0xFF28252E), Color(0xFF24151A)],
        stops: [0, .58, 1],
      ),
      boxShadow: const [
        BoxShadow(
          color: Color(0x29191216),
          blurRadius: 34,
          offset: Offset(0, 14),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          document.eyebrow,
          style: const TextStyle(
            color: Color(0xFFFF929C),
            fontSize: 8,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 9),
        Text(
          document.title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 23,
            height: 1.2,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          document.summary,
          style: TextStyle(
            color: Colors.white.withValues(alpha: .7),
            fontSize: 11,
            height: 1.75,
          ),
        ),
        const SizedBox(height: 16),
        Container(height: 1, color: Colors.white.withValues(alpha: .12)),
        const SizedBox(height: 13),
        Row(
          children: [
            Expanded(
              child: Text(
                '版本 ${document.version}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Text(
              '${document.dateLabel} ${document.effectiveDate}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: .58),
                fontSize: 9,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _LegalSurface extends StatelessWidget {
  const _LegalSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );
}

class _LegalDocument {
  const _LegalDocument({
    required this.title,
    required this.eyebrow,
    required this.summary,
    required this.version,
    required this.dateLabel,
    required this.effectiveDate,
    required this.preamble,
    required this.draftTitle,
    required this.draftNote,
    required this.footerTitle,
    required this.footerBody,
    required this.sections,
  });

  final String title;
  final String eyebrow;
  final String summary;
  final String version;
  final String dateLabel;
  final String effectiveDate;
  final String preamble;
  final String draftTitle;
  final String draftNote;
  final String footerTitle;
  final String footerBody;
  final List<_LegalSection> sections;
}

class _LegalSection {
  const _LegalSection(this.title, this.body);

  final String title;
  final String body;
}

const _termsDocument = _LegalDocument(
  title: 'Terms of Service / 服务协议',
  eyebrow: 'LEGAL · TERMS OF SERVICE',
  summary:
      'These Terms govern access to and use of the Airvana MVP, including Games, Campaign functions, Accounts, AIP, AIT, Campaign Conversion and USDT settlement functions.',
  version: '2026.08.11',
  dateLabel: 'Last Updated',
  effectiveDate: 'Aug 11th, 2026',
  preamble:
      '''Airvana is owned and operated by Cerdar Ai Limited and its affiliates (collectively, "Airvana," "we," "us," or "our"). These Terms of Service (the "Terms") govern access to and use of the Airvana minimum viable product (the "MVP"), including the website, hosted mini-games, Campaign pages, Account functions, Airvana Points, Airvana Tokens, Campaign Conversion functions, USDT settlement functions, and related services (collectively, the "Service").

The Service may be used by invited KOLs, registered users, Players who access a Game through a shared link, and other visitors. Additional terms may apply, including the Privacy Policy, Cookie and Tracking Notice, Platform Points, Token and Settlement Rules, KOL Marketing Services Agreement, Campaign Schedule, KOL Advertising and Social Media Guidelines, and Digital Asset Promotion Risk Disclosure. If a specific agreement conflicts with these Terms, the more specific agreement controls for its subject matter.

PLEASE READ THESE TERMS CAREFULLY. BY ACCESSING OR USING THE SERVICE, PLAYING A GAME, CREATING AN ACCOUNT, ACCEPTING A CAMPAIGN, REQUESTING A CAMPAIGN CONVERSION, OR USING ANY AIP, AIT, WALLET, OR USDT SETTLEMENT FUNCTION, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND THE DOCUMENTS INCORPORATED BY REFERENCE. IF YOU DO NOT AGREE, DO NOT USE THE SERVICE.''',
  draftTitle: '上线前仍需补充',
  draftNote:
      '原文中的 [AIRVANA DOMAIN] 与 [AIRVANA CONTACT EMAIL] 仍为占位符。正式上线前应补充并由适用法域的专业法律顾问复核。',
  footerTitle: 'Airvana Terms of Service',
  footerBody:
      'If a specific agreement conflicts with these Terms, the more specific agreement controls for its subject matter. Mandatory rights that cannot be waived remain unaffected.',
  sections: [
    _LegalSection(
      'Definitions',
      '''1.1 "Account" means an account created through a supported sign-in method to access Account, Campaign, AIP, AIT, or settlement functions.
1.2 "Airvana Points" or "AIP" means non-transferable internal platform points that may be earned through eligible Game or community activity. AIP has no cash, USDT, or market value and cannot be withdrawn or directly redeemed.
1.3 "Airvana Token" or "AIT" means a conditional Campaign reward unit recorded by Airvana. Subject to the applicable Campaign Rules, validation, funding, eligibility, and these Terms, available AIT may be settled in USDT. AIT is not legal tender, a bank deposit, equity, debt, or an ownership interest in Airvana.
1.4 "Campaign" means a promotional activity made available through Airvana and described in a Campaign page or Campaign Schedule.
1.5 "Campaign Action" means the action specified for a Campaign, which may include downloading an Exchange Partner application, registering an account, completing identity verification, making a first deposit, completing a transaction, or another approved action.
1.6 "Campaign Content" means a Game, Campaign page, link, text, post, caption, visual, or other material used in connection with a Campaign.
1.7 "Campaign Conversion" means the Campaign-specific process under which an eligible Player who has sufficient AIP and completes the required Campaign Action may use the stated amount of AIP to receive the stated amount of AIT.
1.8 "Campaign Schedule" means the Campaign-specific document or electronic terms accepted by a KOL that describe services, Campaign Actions, allocation, attribution, AIT calculation, settlement, and other variable Campaign terms.
1.9 "Exchange Partner" means a third-party digital asset trading platform, affiliate program, advertiser, or related network promoted through a Campaign. This defined term is descriptive only and does not by itself imply a legal partnership, endorsement, agency, joint venture, or sponsorship.
1.10 "Game" means a mini-game or interactive promotional experience hosted through the Service.
1.11 "KOL" means a creator or promoter invited by Airvana to participate in a Campaign under a KOL Marketing Services Agreement.
1.12 "MVP" means the minimum viable product version of the Service made available at the applicable time.
1.13 "Player" means a person who accesses or plays a Game, whether or not the person creates an Account.
1.14 "Player Allocation" means the portion of Campaign value that a KOL elects to allocate to eligible Players under the percentage or formula selected before Campaign launch and administered by Airvana on the KOL's behalf.
1.15 "Restricted Jurisdiction" means a country, territory, or location in which Airvana, a Campaign, an Exchange Partner, a sanctions requirement, or applicable law restricts access, participation, AIT settlement, or USDT delivery.
1.16 "Service" means the Airvana website, Games, Campaign functions, Account functions, AIP and AIT functions, Campaign Conversion functions, USDT settlement functions, and related services made available by Airvana.
1.17 "USDT" means the third-party digital asset commonly known as Tether USDt. USDT is not issued, guaranteed, or controlled by Airvana.
1.18 "Verified Campaign Result" means a Campaign Action, attributable commission, or other result validated under the applicable Campaign Schedule and the controlling Exchange Partner data.''',
    ),
    _LegalSection(
      'Eligibility, Accounts, and Access',
      '''2.1 The Service is intended only for persons who are at least eighteen (18) years old and legally able to enter into binding agreements. The Service is not offered in mainland China or any other Restricted Jurisdiction.
2.2 Certain Games may be played without an Account. Account, Campaign, point, and reward functions may require registration through a supported email, Google sign-in, or wallet-signature method. A wallet signature is used for authentication only. Airvana does not provide wallet custody, exchange, brokerage, trading, deposit, or payment services through the MVP.
2.3 KOL social accounts are reviewed through information submitted by the KOL or public account pages. In the MVP, Airvana does not obtain social-media account authorization, auto-post content, or manage a KOL social account on the KOL's behalf.
2.4 You must provide accurate information, protect Account access, and promptly notify Airvana of suspected unauthorized use. Accounts may not be sold, transferred, shared, or used to avoid restrictions.''',
    ),
    _LegalSection(
      'MVP Service and Feature Changes',
      '''3.1 Airvana is an MVP. Features, templates, Campaigns, point mechanics, reward mechanics, interfaces, and availability may be added, removed, limited, suspended, or changed as the product develops. Airvana does not promise that a feature or Campaign will remain available.
3.2 The MVP uses Airvana-provided templates, assets, and controlled configuration fields. Users may adjust only the text, parameters, and options made available by Airvana. The MVP does not permit users to upload images, video, audio, fonts, models, code, templates, or other external files, and does not offer open-ended or free-form creation.''',
    ),
    _LegalSection(
      'KOLs, Players, and Campaign Participation',
      '''4.1 Airvana may invite a KOL to a Campaign and may condition participation on acceptance of a KOL Marketing Services Agreement and Campaign Schedule. A Player may access a Game through a KOL link and may participate only under the applicable Campaign Rules.
4.2 Before a Campaign begins, the KOL may be required to select a Player Allocation percentage or formula. The KOL irrevocably instructs and authorizes Airvana to calculate and credit the corresponding Player AIT to eligible Players on the KOL's behalf and to deduct that amount from the KOL's Campaign allocation. Airvana administers the allocation process but does not guarantee that any Player or KOL will satisfy the applicable Campaign conditions.
4.3 A Player may earn AIP through eligible Game or community activity shown in the Service. AIP does not automatically become AIT. To receive AIT, the Player must have the required available AIP, complete the applicable Campaign Action, satisfy the Campaign and Exchange Partner requirements, and receive validation of the relevant result.
4.4 A KOL may receive AIT directly under the KOL Marketing Services Agreement and Campaign Schedule based on Verified Campaign Results. AIP and AIT are separately recorded even where held by the same Account.
4.5 An Exchange Partner independently controls its account approval, identity verification, deposit, trading, services, geographic availability, attribution, fraud decisions, and final Campaign data.''',
    ),
    _LegalSection(
      'Airvana Points, Airvana Tokens, and USDT Settlement',
      '''5.1 AIP is an internal, non-transferable participation point. AIP is not money, stored value, a blockchain token, a security, or a claim to cash or USDT. AIP cannot be purchased, sold, pledged, transferred between users, withdrawn, or directly redeemed.
5.2 A Campaign may permit a Player to use a specified amount of available AIP to receive AIT only after the Player completes and validates the required Campaign Action.
5.3 AIT is a conditional Campaign reward and settlement unit. AIT does not grant ownership, voting, profit-sharing, or other rights in Airvana or an Exchange Partner.
5.4 Estimated or pending AIT is provisional. Unless a Campaign Schedule expressly states otherwise, AIT becomes available only after the relevant result is validated and Airvana receives the corresponding Campaign funds.
5.5 Settlement may require a supported wallet or Exchange Partner account address, identity or residency information, sanctions or eligibility screening, and confirmation of applicable third-party terms.
5.6 Airvana may correct, freeze, reverse, or cancel records for duplicate events, fraud, prohibited activity, technical error, corrected partner data, clawback, legal requirements, or breach.''',
    ),
    _LegalSection(
      'Content Review, Sharing, and Advertising',
      '''6.1 Campaign Content is subject to Airvana review before or after publication. Airvana may reject, edit, suspend, remove, or disable content for compliance, partner, security, rights, or product reasons.
6.2 KOLs must use approved links and disclosures and avoid false, misleading, unsubstantiated, or unauthorized claims. No user may promise profit, describe digital assets or Campaign results as risk-free, or provide personalized investment advice.
6.3 Airvana may provide a device share menu or copyable link. Users choose where and how to share. Third-party social platforms apply their own terms.''',
    ),
    _LegalSection(
      'Intellectual Property',
      '''Airvana and its licensors retain all rights in the Service, templates, code, engines, frameworks, mechanics, layouts, designs, databases, AIP and AIT systems, Campaign pages, branding, documentation and improvements. KOLs retain rights in their pre-existing name, likeness, social account and independently created content, subject to applicable agreements. Third-party marks remain the property of their owners.''',
    ),
    _LegalSection(
      'Prohibited Conduct',
      '''You may not evade location, identity, age, Campaign, sanctions, wallet or settlement restrictions; create false accounts or manipulate identity; use bots, click farms, false events or prohibited self-referral; tamper with points, tokens, attribution or security controls; reverse engineer or attack the Service; publish unlawful or harmful content; collect passwords, private keys, seed phrases or identity documents outside an approved process; or use the Service for fraud, money laundering, sanctions evasion, unlawful promotion or other illegal activity.''',
    ),
    _LegalSection(
      'Third-Party Services and Digital Asset Risks',
      '''Campaign links may lead to an Exchange Partner or other third-party service. Airvana does not operate or control third-party accounts, identity verification, custody, deposits, withdrawals, trading, prices, token issuance, networks, customer support or security. Digital assets may be volatile, unavailable, restricted, depegged, delayed, frozen or lost. Airvana does not provide investment, legal, tax or financial advice and does not guarantee any Campaign or settlement result.''',
    ),
    _LegalSection(
      'Suspension and Termination',
      '''Airvana may suspend or terminate access, freeze or reverse AIP or AIT, reject or suspend a Campaign Conversion, hold or cancel a settlement request, disable links, remove Campaign Content or end a Campaign where reasonably necessary for suspected fraud, abuse, sanctions or location risk, legal or partner requirements, security, rights protection, inaccurate information, breach, partner non-payment or MVP changes.''',
    ),
    _LegalSection(
      'Disclaimers',
      '''TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE, GAMES, CAMPAIGNS, AIP, AIT, CAMPAIGN CONVERSION FUNCTIONS, LINKS, DATA, WALLET FUNCTIONS, AND USDT SETTLEMENT FUNCTIONS ARE PROVIDED "AS IS" AND "AS AVAILABLE." AIRVANA DISCLAIMS EXPRESS, IMPLIED, AND STATUTORY WARRANTIES AND DOES NOT GUARANTEE VALIDATION, FUNDING, AVAILABILITY, VALUE, TIMING OR REVERSIBILITY.''',
    ),
    _LegalSection(
      'Limitation of Liability',
      '''TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIRVANA AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND CONTRACTORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, REPUTATION, DIGITAL ASSETS, OR BUSINESS OPPORTUNITY. MANDATORY RIGHTS THAT CANNOT BE WAIVED REMAIN UNAFFECTED.''',
    ),
    _LegalSection(
      'Indemnification',
      '''To the maximum extent permitted by law, you will defend, indemnify, and hold harmless Airvana and its affiliates, officers, employees, and contractors from third-party claims, losses, liabilities, damages, and reasonable costs arising from your breach, unlawful conduct, Campaign Content, infringement, fraud, misuse of the Service, or violation of third-party rules.''',
    ),
    _LegalSection(
      'Governing Law and Disputes',
      '''These Terms are governed by the laws of the State of Delaware, except for mandatory law that cannot be waived. Before filing a claim, the parties will attempt in good faith to resolve it by written notice to [AIRVANA CONTACT EMAIL]. If unresolved within thirty days, the courts located in Delaware will have jurisdiction unless applicable law requires another forum.''',
    ),
    _LegalSection(
      'Changes and General Terms',
      '''Airvana may update these Terms to reflect MVP, legal, security, or operational changes. Material changes will be communicated by a reasonable method. Continued use after the effective date constitutes acceptance where permitted by law. If any provision is unenforceable, the remainder will continue.''',
    ),
    _LegalSection('Contact', '''Cerdar Ai Limited.
Start Chambers, Wickham’s Cay II, P. O. Box 2221, Road Town, Tortola, British Virgin Islands
Website: [AIRVANA DOMAIN]
Support, privacy, legal, and compliance requests: [AIRVANA CONTACT EMAIL]'''),
  ],
);

const _privacyDocument = _LegalDocument(
  title: 'Privacy Policy / 隐私政策',
  eyebrow: 'LEGAL · PRIVACY POLICY',
  summary:
      'This Privacy Policy explains how Cerdar Ai Limited ("Airvana," "we," "us," or "our") collects, uses, shares, and protects personal information in connection with the Airvana MVP website, Games, Campaigns, Accounts, Airvana Points, Airvana Tokens, Campaign Conversion functions, USDT settlement functions, and related services.',
  version: '2026.08.11',
  dateLabel: 'Last Updated',
  effectiveDate: 'Aug 11th, 2026',
  preamble:
      'This Privacy Policy explains how Cerdar Ai Limited ("Airvana," "we," "us," or "our") collects, uses, shares, and protects personal information in connection with the Airvana MVP website, Games, Campaigns, Accounts, Airvana Points, Airvana Tokens, Campaign Conversion functions, USDT settlement functions, and related services (the "Service").',
  draftTitle: '上线前仍需补充',
  draftNote: '原文中的 [AIRVANA CONTACT EMAIL] 仍为占位符。正式上线前应补充并由适用法域的专业法律顾问复核。',
  footerTitle: 'Airvana Privacy Policy',
  footerBody:
      'It should be read with the Terms of Service and Cookie and Tracking Notice.',
  sections: [
    _LegalSection(
      'Scope',
      'This Policy applies to KOLs, registered users, Players, and visitors. It should be read with the Terms of Service and Cookie and Tracking Notice. Exchange Partners, wallet providers, blockchain networks, and third-party social platforms process information under their own privacy notices.',
    ),
    _LegalSection(
      'Personal Information We Collect',
      '''We collect only categories reasonably connected to operating the MVP. Depending on how you use the Service, these may include:
(a) account and profile information, such as email address, display name, age or eligibility confirmation, declared country or region, and information used for supported sign-in methods;
(b) KOL onboarding and Campaign information, such as public social-account details, Campaign participation, approved channels, contract and settlement information;
(c) Game, AIP, AIT, and Campaign information, such as Game events, Campaign identifiers, AIP accrual and use, Campaign Conversion requests, AIT balances and status, attribution results, validation, reversals, and appeals;
(d) wallet and settlement information, such as a public address, selected network, settlement amount, transaction identifier, payout status, and information required for eligibility, sanctions, fraud, or payment review. Airvana does not ask for a private key, seed phrase, or Exchange Partner password;
(e) technical and usage information, including IP address, device and browser information, timestamps, pages or Games viewed, session identifiers, referral information, cookie choices and security logs;
(f) information from Exchange Partners or other third parties necessary to administer a Campaign; and
(g) support, complaint, legal, compliance, and business records.''',
    ),
    _LegalSection(
      'How We Use Personal Information',
      '''We use personal information to provide Accounts, Games, Campaigns, AIP and AIT functions, Campaign Conversion, settlement functions and support; authenticate users; administer participation and attribution; maintain ledgers; operate consent, analytics, fraud prevention, security, sanctions and geographic restrictions; communicate notices; improve and troubleshoot the MVP; comply with law; enforce agreements; and carry out corporate transactions.''',
    ),
    _LegalSection(
      'How We Share Personal Information',
      '''We do not sell personal information for monetary consideration. We may share necessary information with service providers supporting hosting, authentication, security, communications, consent management, analytics, customer support, eligibility screening and business operations; Exchange Partners and attribution providers; wallet or blockchain providers for a user-requested operation; professional advisers and authorities; or a successor in a corporate transaction. Airvana does not obtain social-platform account authorization in the MVP and does not publish on a KOL's behalf.''',
    ),
    _LegalSection(
      'Cookies and Similar Technologies',
      '''Airvana uses cookies, local storage, server logs, and similar technologies for authentication, security, preferences, geographic restrictions, AIP and AIT records, Campaign Conversion, settlement administration, measurement, Campaign attribution, and analytics. Where required by law, Airvana requests consent before using non-essential analytics, advertising, cross-site tracking, personalization, profiling, pixels, or device-fingerprinting technologies.''',
    ),
    _LegalSection(
      'International Transfers',
      'Airvana is operated from the United States and may use service providers in the United States and other countries. Personal information may therefore be processed outside the country where it was collected. Where required by applicable law, Airvana uses appropriate transfer safeguards.',
    ),
    _LegalSection(
      'Retention',
      'We retain personal information for as long as reasonably necessary to provide the Service, administer Campaigns, AIP, AIT and settlements, support fraud prevention and security, comply with legal, tax, accounting, sanctions and contractual obligations, resolve disputes, and maintain appropriate business records. Aggregated or de-identified information may be retained for longer periods.',
    ),
    _LegalSection(
      'Security',
      'Airvana uses reasonable administrative, technical, and organizational safeguards designed to protect personal information and settlement records. No service, wallet, blockchain network, or transmission method is completely secure. Users are responsible for protecting Account credentials, wallet private keys, seed phrases, and Exchange Partner credentials. Airvana will never ask a user to provide a private key or seed phrase.',
    ),
    _LegalSection(
      'Your Choices and Rights',
      'Depending on applicable law, you may have rights to access, correct, delete, restrict, object to, or obtain a copy of personal information, and to withdraw consent where processing is based on consent. You may also manage non-essential cookie choices. Airvana may verify identity and may retain information where permitted or required for security, fraud prevention, legal, or recordkeeping purposes.',
    ),
    _LegalSection(
      'Age and Restricted Locations',
      'The Service is not directed to persons under 18. Airvana does not knowingly permit persons under 18 to use Account, Campaign, AIP, AIT, or settlement functions. Eligibility may require additional location, residency, identity, sanctions, or Exchange Partner checks. Attempts to bypass restrictions may be logged, reviewed, and result in suspension or denial.',
    ),
    _LegalSection(
      'Third-Party Links and Digital Asset Services',
      'Games and Campaign pages may link to an Exchange Partner, wallet, blockchain explorer, or social platform. Airvana does not control the privacy, security, identity verification, custody, deposit, trading, blockchain, or account practices of those third parties. Review their policies before providing information or using a third-party service.',
    ),
    _LegalSection(
      'Changes to This Policy',
      'Airvana may update this Policy as the MVP, service providers, or legal requirements change. The updated version will state a new date and will be posted through the Service or communicated by another reasonable method.',
    ),
    _LegalSection('Contact Us', '''Cerdar Ai Limited
Start Chambers, Wickham’s Cay II, P. O. Box 2221, Road Town, Tortola, British Virgin Islands
Support, privacy, legal, and compliance requests: [AIRVANA CONTACT EMAIL]'''),
  ],
);
