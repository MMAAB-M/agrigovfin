/* ═══════════════════════════════════════════════════════════════
   AgriGov Chatbot — Version Complète Adaptative — v3.0
   Couvre : Accueil, Inscription, Connexion, Agriculteur, Acheteur,
            Transporteur, Vétérinaire, Organisation, Admin
   Français correct · Aide contextuelle par rôle · Sécurisé
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Configuration ── */
  const CHATBOT_CONFIG = {
    title: 'AgriGov Assistant',
    subtitle: 'Votre aide intelligente 24/7',
    placeholder: 'Posez votre question...',
    welcomeDelay: 1200,
    maxHistory: 20,
    storageKey: 'agrigov_chat_history',
  };

  /* ── Détection du contexte / page / rôle ── */
  function detectContext() {
    const path = window.location.pathname;
    const body = document.body;
    // Pages publiques
    if (path === '/' || path === '') return 'home';
    if (path.includes('signup') || path.includes('register') || path.includes('creecomte')) return 'inscription';
    if (path.includes('login') || path.includes('seconnecter')) return 'connexion';
    if (path.includes('services')) return 'services';
    if (path.includes('contact')) return 'contact';
    if (path.includes('ensavoir')) return 'ensavoir';
    // Pages connectées
    if (body.classList.contains('admin-premium-ui') || path.includes('admin')) return 'admin';
    if (body.classList.contains('agri-body') || path.includes('agriculteur') || document.getElementById('agriDashboardPage')) return 'agriculteur';
    if (document.getElementById('achDashboardPage') || path.includes('achat')) return 'acheteur';
    if (document.getElementById('tpDashboardPage') || path.includes('transport') || document.querySelector('.tp-sidebar')) return 'transporteur';
    if (path.includes('veterinaire')) return 'veterinaire';
    if (path.includes('organisation')) return 'organisation';
    return 'home';
  }

  /* ── Rôle affiché dans le header ── */
  function getRoleLabel(ctx) {
    const labels = {
      home: 'Aide générale',
      inscription: 'Aide à l\'inscription',
      connexion: 'Aide à la connexion',
      services: 'Nos services',
      contact: 'Contact & Support',
      ensavoir: 'En savoir plus',
      admin: 'Mode Administrateur',
      agriculteur: 'Mode Agriculteur',
      acheteur: 'Mode Acheteur',
      transporteur: 'Mode Transporteur',
      veterinaire: 'Mode Vétérinaire',
      organisation: 'Mode Organisation',
    };
    return labels[ctx] || 'Aide';
  }

  /* ── Prompts système détaillés par rôle ── */
  function buildSystemPrompt(ctx) {
    const base = `Tu es l'assistant intelligent d'AgriGov Market, une plateforme agricole officielle algérienne sous la supervision du Ministère de l'Agriculture. Tu connectes agriculteurs, acheteurs, transporteurs, vétérinaires et organisations phytosanitaires.

RÈGLES ABSOLUES :
- Tu réponds TOUJOURS en français correct et soigné (pas d'argot, pas de fautes).
- Tu utilises des emojis pertinents pour rendre les réponses plus claires.
- Tu réponds en 2-6 phrases maximum sauf si une liste ou explication par étapes est nécessaire.
- Tu utilises des listes à puces (•) pour les étapes.
- Si tu n'es pas sûr d'une réponse, dis-le honnêtement et propose de contacter le support via la page Contact.
- Tu ne divulgues JAMAIS d'informations d'un rôle à un autre (sécurité des données).
- Tu restes toujours positif, professionnel et utile.
- Pour les questions techniques complexes, propose des étapes claires numérotées.

INFORMATIONS SUR LA PLATEFORME :
AgriGov Market est une marketplace agricole numérique qui permet :
• Aux agriculteurs de vendre leurs produits directement
• Aux acheteurs de s'approvisionner depuis les fermes
• Aux transporteurs de livrer les commandes
• Aux vétérinaires de proposer leurs services (consultations, tournées)
• Aux organisations de protection des plantes de participer
• À l'administrateur (Ministère) de superviser tout le système

PAGES DU SITE :
• Accueil (/) : Présentation de la plateforme, statistiques en direct, services, carte des wilayas
• Créer un compte (/signup/) : Inscription avec choix du rôle (Agriculteur, Acheteur, Transporteur, Autres)
• Se connecter (/login/) : Connexion sécurisée avec choix du rôle + Admin
• Services (/services/) : Détail de chaque service proposé
• Contact (/contact/) : Formulaire pour joindre le support AgriGov
• En savoir plus (/ensavoir/) : Informations détaillées sur la plateforme

TYPES DE COMPTES ET AVANTAGES :
1. Agriculteur 🌾 : Publier des produits, gérer des fermes, recevoir des commandes, accéder aux avantages (subventions, formations, équipements), consulter des vétérinaires, demander des RDV
2. Acheteur 🛒 : Parcourir le catalogue, passer des commandes, suivre les livraisons en temps réel, évaluer les vendeurs et transporteurs, contacter directement les intervenants
3. Transporteur 🚛 : Voir et accepter des missions de livraison, carte GPS en temps réel, historique des livraisons, évaluations
4. Vétérinaire 🩺 : Gérer les RDV avec les agriculteurs, créer des tournées/annonces, messagerie, profil professionnel
5. Organisation 💡 : Protection des plantes, coordination avec le ministère
6. Administrateur 🏛️ : Valider/rejeter les comptes, gérer le catalogue officiel, surveiller les commandes, gérer les avantages, coordonner vétérinaires et organisations, statistiques et KPIs

PROCESSUS D'INSCRIPTION :
1. Aller sur la page "Créer un compte" depuis l'accueil
2. Choisir son rôle (Agriculteur, Acheteur, Transporteur, ou Autres)
3. Remplir le formulaire (nom, prénom, email, mot de passe, téléphone, date et lieu de naissance)
4. Selon le rôle : informations supplémentaires (fermes pour agriculteur, registre commercial pour acheteur, véhicule pour transporteur, certificat pour vétérinaire/organisation)
5. Soumettre → Le compte doit être validé par un administrateur (24-48h)
6. Une fois validé, on reçoit un email de confirmation et on peut se connecter

PROBLÈMES DE CONNEXION POSSIBLES :
• Mot de passe incorrect → Vérifier la saisie, utiliser "Mot de passe oublié" pour réinitialiser
• Compte non validé → L'administrateur n'a pas encore approuvé le compte, patienter 24-48h
• Compte rejeté → L'administrateur a refusé le compte, contacter le support via la page Contact pour comprendre la raison
• Email inconnu → Le compte n'existe pas, créer un nouveau compte

STATUTS DES COMMANDES :
• En attente → L'agriculteur n'a pas encore répondu
• Confirmée → L'agriculteur a accepté la commande
• Refusée → L'agriculteur a refusé
• En préparation → Le produit est préparé pour l'expédition
• En attente transporteur → En attente d'un transporteur disponible
• En livraison (Expédiée) → Le transporteur est en route
• Livrée → La commande a été livrée avec succès
• Annulée → La commande a été annulée`;

    const roleSpecific = {
      home: `\n\nTu es sur la PAGE D'ACCUEIL. L'utilisateur est un visiteur. Tu dois :
- L'accueillir chaleureusement et lui présenter la plateforme
- Lui expliquer pourquoi s'inscrire (accès au marché agricole, traçabilité, sécurité, connexion directe producteur-consommateur)
- Présenter les différents rôles et leurs avantages
- L'orienter vers la page d'inscription (/signup/) ou de connexion (/login/)
- Répondre aux questions sur le nombre d'utilisateurs, les wilayas couvertes, les statistiques
- Informer que les comptes sont validés par le Ministère de l'Agriculture`,

      inscription: `\n\nTu es sur la PAGE D'INSCRIPTION. Tu dois aider l'utilisateur à :
- Comprendre les différents rôles disponibles et choisir le bon
- Remplir correctement le formulaire d'inscription
- Comprendre les documents nécessaires selon le rôle choisi
- Savoir que le compte sera validé par un administrateur sous 24-48h
- Résoudre les erreurs possibles lors de l'inscription (email déjà utilisé, champs manquants, format de mot de passe)
- Lien de la page d'inscription : /signup/
- Lien vers la connexion si déjà inscrit : /login/`,

      connexion: `\n\nTu es sur la PAGE DE CONNEXION. Tu dois aider l'utilisateur à :
- Choisir le bon rôle avant de se connecter
- Résoudre les problèmes de connexion :
  → Mot de passe incorrect : vérifier la saisie, utiliser "Mot de passe oublié"
  → Compte non validé : l'administrateur n'a pas encore approuvé le compte, patienter ou contacter le support
  → Compte rejeté : contacter le support via la page Contact pour connaître la raison
  → Email non reconnu : vérifier l'adresse ou créer un nouveau compte
- Expliquer la fonction "Mot de passe oublié" (réinitialisation par email)
- Rediriger vers /signup/ s'il n'a pas encore de compte`,

      admin: `\n\nTu parles à un ADMINISTRATEUR (Ministère de l'Agriculture). Sections disponibles :

📊 TABLEAU DE BORD : Vue d'ensemble avec KPIs en temps réel — nombre d'utilisateurs par rôle, nombre de commandes, revenus totaux, utilisateurs en attente de validation, produits actifs, statistiques de livraison.

👥 UTILISATEURS : Gérer tous les comptes inscrits — valider (approuver) ou rejeter les inscriptions en attente. Voir les détails de chaque utilisateur (profil, rôle, date d'inscription). Filtrer par rôle ou statut.

📦 PRODUITS : Gérer le catalogue officiel de produits (ajouter, modifier, supprimer). Définir les catégories et les fourchettes de prix. Les agriculteurs publient leurs annonces à partir de ce catalogue.

🛒 COMMANDES : Surveiller toutes les commandes de la plateforme. Voir les statuts, les montants, les acheteurs et agriculteurs impliqués.

🎁 AVANTAGES : Créer et gérer les avantages agricoles (subventions, formations, équipements, crédits, assurances, irrigation). Examiner les demandes des agriculteurs et les accepter ou refuser avec une note.

🩺 VÉTÉRINAIRES & ORGANISATIONS : Voir les vétérinaires inscrits, créer des alertes (stock animal faible, risque épidémie, campagne nationale, urgent). Coordonner les tournées vétérinaires. Gérer les organisations phytosanitaires.

👤 MON PROFIL : Modifier les informations personnelles, changer la photo de profil, mettre à jour le mot de passe.`,

      agriculteur: `\n\nTu parles à un AGRICULTEUR. Sections disponibles dans son espace :

🥕 MES PRODUITS : Publier de nouveaux produits à vendre à partir du catalogue officiel. Pour chaque annonce : choisir le produit, fixer le prix (dans la fourchette autorisée), indiquer la quantité disponible, ajouter une photo et une description. Modifier ou supprimer ses annonces. Les statuts possibles : Disponible, Stock faible, Rupture.

🌾 MES FERMES : Ajouter et gérer ses exploitations agricoles. Informations : nom de la ferme, wilaya, commune, adresse, superficie (hectares), cultures principales, coordonnées GPS (latitude/longitude). Possibilité de gérer plusieurs fermes.

📦 MES COMMANDES : Voir toutes les commandes reçues des acheteurs. L'agriculteur peut ACCEPTER (confirmer) ou REFUSER une commande en attente. Après confirmation, il peut passer la commande en "En préparation" puis demander un transporteur. Il peut aussi annuler la demande de course.
• Comment accepter une commande : Ouvrir la commande → cliquer sur "Confirmer"
• Comment refuser : Ouvrir la commande → cliquer sur "Refuser"
• Comment demander un transporteur : Après confirmation, cliquer sur "Demander un transporteur"

🩺 AIDE VÉTÉRINAIRE : Consulter la liste des vétérinaires disponibles (avec spécialité, tarif, note). Voir les tournées et annonces vétérinaires par wilaya. Demander un rendez-vous (type : consultation, vaccination, urgence, suivi, chirurgie). Suivre ses RDV dans "Mes RDV". Recevoir des notifications de confirmation.
• Comment prendre un RDV : Aller dans Aide Vétérinaire → choisir un vétérinaire → cliquer "Demander un RDV" → remplir le formulaire (type, date, heure, lieu, animaux concernés, description du problème)

🎁 AVANTAGES : Consulter les aides agricoles disponibles (subventions, formations, équipements, crédits, assurances, systèmes d'irrigation). Postuler en soumettant une demande avec les documents justificatifs. Suivre le statut de sa demande (en attente, acceptée, refusée).
• Comment demander un soutien : Aller dans Avantages → choisir l'avantage → cliquer "Postuler" → remplir le formulaire (nom complet, téléphone, wilaya, description du projet, document justificatif)

👤 MON PROFIL : Modifier ses informations personnelles (nom, prénom, téléphone, email). Changer sa photo de profil. Mettre à jour son mot de passe (onglet Sécurité, minimum 8 caractères).

🔔 NOTIFICATIONS : RDV vétérinaires confirmés/refusés, alertes, rappels.`,

      acheteur: `\n\nTu parles à un ACHETEUR. Sections disponibles dans son espace :

🛒 CATALOGUE / PRODUITS : Parcourir tous les produits disponibles publiés par les agriculteurs. Filtrer par catégorie. Voir les détails (prix, quantité, vendeur, photo, description). Passer une commande en cliquant sur "Commander" puis en indiquant l'adresse de livraison et une note éventuelle.

📦 MES COMMANDES : Suivre toutes ses commandes avec leurs statuts en temps réel. Annuler une commande si elle est encore "En attente". Voir les détails de chaque commande (produits, quantités, prix, agriculteur).

🚚 SUIVI LIVRAISON : Chaque commande en cours de livraison a sa propre carte de suivi. Voir le statut de livraison, le nom et le téléphone du transporteur. Contacter le transporteur directement par téléphone. Signaler un problème de livraison. Marquer une commande comme "Reçue" une fois livrée.

⭐ ÉVALUATIONS : Après réception d'une commande, évaluer l'agriculteur, le transporteur et le produit (note sur 5 + commentaire). Accessible via les notifications.

👤 MON PROFIL : Modifier ses informations personnelles, changer la photo de profil, mettre à jour le mot de passe, informations d'entreprise (lieu de travail, nom d'établissement, registre commercial).

🔔 NOTIFICATIONS : Changements de statut des commandes, invitations à évaluer, confirmations.`,

      transporteur: `\n\nTu parles à un TRANSPORTEUR. Sections disponibles dans son espace :

🚛 MISSIONS DISPONIBLES : Voir toutes les missions de livraison disponibles dans la zone. Chaque mission affiche : le trajet (départ → destination), la distance en km, le prix de course (calculé automatiquement ~10 DA/km — c'est ce que le transporteur gagne, différent du total de la commande), les contacts de l'acheteur et de l'agriculteur (nom + téléphone). Accepter ou refuser une mission.

📦 MES LIVRAISONS : Suivre les livraisons en cours qu'on a acceptées. Voir les détails complets, les contacts, le trajet. Marquer une livraison comme "Livrée" une fois arrivé à destination.

🗺️ CARTE EN TEMPS RÉEL : La carte affiche la position GPS du transporteur en temps réel. Les routes sont tracées depuis la position actuelle vers la destination. Chaque mission et livraison est visible sur la carte. Cliquer sur un élément de la liste pour centrer la carte.

📜 HISTORIQUE : Voir l'historique de toutes les livraisons terminées, avec les détails et les évaluations reçues.

👤 MON PROFIL : Modifier ses informations personnelles, changer la photo de profil, mettre à jour le mot de passe, informations du véhicule.

🔔 NOTIFICATIONS : Nouvelles missions disponibles, évaluations reçues des acheteurs, rappels.

⭐ ÉVALUATIONS : Consulter les notes et commentaires laissés par les acheteurs après livraison.`,

      veterinaire: `\n\nTu parles à un VÉTÉRINAIRE. Sections disponibles dans son espace :

📋 MES RENDEZ-VOUS : Voir toutes les demandes de RDV des agriculteurs. Confirmer ou refuser un RDV. Marquer un RDV comme terminé avec diagnostic et traitement. Types de visites : consultation, vaccination, urgence, suivi, chirurgie.

📢 MES ANNONCES / TOURNÉES : Créer des tournées vétérinaires dans les wilayas de son choix. Publier des annonces pour informer les agriculteurs de sa disponibilité. Définir les services offerts, les dates, et un tarif spécial éventuel.

💬 MESSAGERIE : Envoyer et recevoir des messages avec les agriculteurs liés à un RDV. Communication directe pour le suivi des traitements.

⚠️ ALERTES : Recevoir les alertes de l'administrateur (stock animal faible, risque d'épidémie, campagne nationale, urgences).

👤 MON PROFIL : Modifier les informations professionnelles : spécialité, numéro d'ordre, wilaya principale, biographie, années d'expérience, tarif de consultation, disponibilité.

📊 STATISTIQUES : Note moyenne, nombre total de consultations, évaluations reçues.`,

      organisation: `\n\nTu parles à un membre d'une ORGANISATION de protection des plantes. L'espace organisation permet de :
- Coordonner avec le Ministère de l'Agriculture
- Recevoir les alertes et directives de l'administrateur
- Gérer le profil de l'organisation (nom, certificat)
- Participer aux campagnes phytosanitaires nationales`,

      services: `\n\nTu es sur la PAGE SERVICES. Présente les services de la plateforme AgriGov Market : vente agricole, achat direct, transport logistique, aide vétérinaire, avantages et subventions.`,

      contact: `\n\nTu es sur la PAGE CONTACT. L'utilisateur peut envoyer un message au support AgriGov. Encourage-le à décrire son problème clairement. L'équipe répond sous 24h ouvrables.`,

      ensavoir: `\n\nTu es sur la PAGE EN SAVOIR PLUS. Fournis des informations détaillées sur la plateforme, son fonctionnement, ses objectifs et son lien avec le Ministère de l'Agriculture.`,
    };

    return base + (roleSpecific[ctx] || roleSpecific.home);
  }

  /* ── FAQ instantanée étendue (réponses sans API) ── */
  function buildQuickAnswers(ctx) {
    // Réponses communes à toutes les pages
    const common = [
      /* ── Contact / Support ── */
      { keywords: ['contact','support','aide technique','problème technique','bug','signaler'],
        answer: '📞 Pour contacter le support AgriGov :\n• Rendez-vous sur la page **Contact** depuis le menu principal\n• Décrivez votre problème avec le maximum de détails\n• Notre équipe vous répondra dans les **24 heures ouvrables**\nVous pouvez aussi utiliser ce chat, je ferai de mon mieux pour vous aider !' },

      /* ── Mode sombre ── */
      { keywords: ['dark mode','mode nuit','thème sombre','nuit','mode sombre'],
        answer: '🌙 Pour activer le mode sombre : cliquez sur l\'icône 🌙/☀️ dans la barre supérieure. Votre préférence est sauvegardée automatiquement.' },

      /* ── C'est quoi AgriGov ── */
      { keywords: ['c\'est quoi','qu\'est-ce que','présente','agrigov','plateforme','a quoi sert'],
        answer: '🌿 **AgriGov Market** est la plateforme agricole officielle algérienne, supervisée par le Ministère de l\'Agriculture. Elle connecte :\n• 🌾 **Agriculteurs** — vendent leurs produits directement\n• 🛒 **Acheteurs** — s\'approvisionnent depuis les fermes\n• 🚛 **Transporteurs** — assurent la livraison\n• 🩺 **Vétérinaires** — proposent des consultations et tournées\n• 💡 **Organisations** — protection des plantes\n\nLe tout est supervisé par un **administrateur** (Ministère) qui valide les comptes et assure la traçabilité et la sécurité des échanges.' },
    ];

    /* ── Réponses pour la page d'accueil et visiteurs ── */
    const homeAnswers = [
      { keywords: ['pourquoi inscrire','pourquoi inscription','pourquoi m\'inscrire','pourquoi s\'inscrire','pourquoi créer','avantage inscription','intérêt'],
        answer: '🌟 **Pourquoi s\'inscrire sur AgriGov ?**\n\n• 🔗 **Connexion directe** — Producteurs et acheteurs échangent sans intermédiaire\n• 🛡️ **Sécurité** — Tous les comptes sont vérifiés par le Ministère de l\'Agriculture\n• 📊 **Traçabilité** — Suivi complet de chaque transaction, de la ferme à la livraison\n• 💰 **Prix justes** — Les agriculteurs fixent leurs propres prix dans une fourchette officielle\n• 🚛 **Logistique intégrée** — Transport certifié avec suivi GPS en temps réel\n• 🩺 **Services vétérinaires** — Accès aux consultations et tournées vétérinaires\n• 🎁 **Aides et subventions** — Accès aux avantages agricoles (crédits, formations, équipements)\n\n👉 Créez votre compte sur la page **Créer un compte** !' },

      { keywords: ['quel rôle','choisir rôle','rôle','role','type compte','types de compte','quel type','les comptes','quels comptes'],
        answer: '👤 **Les types de comptes sur AgriGov :**\n\n🌾 **Agriculteur** — Pour les producteurs agricoles : publiez vos récoltes, gérez vos fermes, recevez des commandes, accédez aux subventions et aux vétérinaires.\n\n🛒 **Acheteur** — Pour les grossistes, restaurants, commerces : parcourez le catalogue, passez commande et suivez vos livraisons en temps réel.\n\n🚛 **Transporteur** — Pour les livreurs : acceptez des missions, suivez votre trajet sur la carte GPS, gagnez le prix de course par livraison.\n\n🩺 **Vétérinaire** — Pour les professionnels de santé animale : gérez vos RDV, créez des tournées, recevez les alertes du ministère.\n\n💡 **Organisation** — Pour les organismes de protection des plantes : participez aux campagnes phytosanitaires.\n\n🏛️ **Administrateur** — Réservé au Ministère de l\'Agriculture : supervision de toute la plateforme.' },

      { keywords: ['comment inscrire','comment inscription','comment créer compte','créer un compte','s\'inscrire','comment m\'inscrire','inscription','enregistrer','comment je m\'inscris'],
        answer: '📝 **Comment s\'inscrire sur AgriGov ?**\n\n1️⃣ Allez sur la page **Créer un compte** → /signup/\n2️⃣ Choisissez votre rôle : Agriculteur, Acheteur, Transporteur ou Autres (Vétérinaire/Organisation)\n3️⃣ Remplissez le formulaire : nom, prénom, email, mot de passe, téléphone, date et lieu de naissance\n4️⃣ Selon votre rôle, ajoutez les informations supplémentaires requises\n5️⃣ Soumettez votre demande\n6️⃣ Un administrateur validera votre compte sous **24 à 48 heures**\n7️⃣ Vous recevrez un email de confirmation et pourrez vous connecter\n\n👉 Lien direct : **/signup/**' },

      { keywords: ['nombre utilisateur','nombre d\'utilisateur','combien utilisateur','combien inscrits','statistiques','stats','combien de personnes','combien membres'],
        answer: '📊 **Nombre d\'utilisateurs sur AgriGov**\n\nLes statistiques sont affichées en temps réel sur la page d\'accueil dans la barre de statistiques. Elles incluent :\n• Le nombre total d\'acteurs inscrits\n• Le nombre de wilayas couvertes\n• Le nombre de transactions réalisées\n• Le taux de satisfaction\n\nPour des chiffres précis et en direct, consultez la section statistiques de la page d\'accueil. L\'administrateur dispose de données détaillées par rôle dans son tableau de bord.' },

      { keywords: ['wilaya','couverture','zone','région','disponible où','quelle wilaya'],
        answer: '🗺️ AgriGov couvre les **58 wilayas d\'Algérie**. Les agriculteurs peuvent enregistrer leurs fermes dans n\'importe quelle wilaya. Les statistiques de couverture sont affichées en temps réel sur la page d\'accueil et sur la carte interactive.' },
    ];

    /* ── Réponses pour la page d'inscription ── */
    const inscriptionAnswers = [
      { keywords: ['document','documents requis','pièce','justificatif','papiers','quoi fournir'],
        answer: '📄 **Documents requis selon votre rôle :**\n\n🌾 **Agriculteur** — Informations sur vos fermes (nom, wilaya, superficie, cultures). Ajoutées après l\'inscription.\n\n🛒 **Acheteur** — Lieu de travail, nom d\'établissement, registre commercial (fichier à téléverser).\n\n🚛 **Transporteur** — Nom du véhicule, documents du véhicule (permis, assurance — fichiers à téléverser).\n\n🩺 **Vétérinaire / Organisation** — Type (vétérinaire ou organisation), nom de l\'organisation le cas échéant, certificat professionnel (fichier).' },

      { keywords: ['erreur','email déjà','existe déjà','problème inscription','pas marcher','échec','échoué'],
        answer: '⚠️ **Problèmes courants lors de l\'inscription :**\n\n• **"Email déjà utilisé"** → Un compte existe déjà avec cette adresse. Essayez de vous connecter ou utilisez un autre email.\n• **Champs manquants** → Tous les champs marqués d\'un astérisque (*) sont obligatoires.\n• **Mot de passe faible** → Le mot de passe doit contenir au minimum 8 caractères.\n• **Photo trop lourde** → Réduisez la taille de votre image de profil.\n\nSi le problème persiste, contactez le support via la page **Contact**.' },

      { keywords: ['combien temps','délai','validation','attente','quand validé','approuvé quand','combien attendre'],
        answer: '⏳ La validation de votre compte par l\'administrateur prend généralement **24 à 48 heures ouvrables**. Vous recevrez un email de confirmation une fois votre compte approuvé. En attendant, vous ne pourrez pas vous connecter. Si cela prend plus de temps, contactez le support via la page **Contact**.' },

      { keywords: ['mot de passe','password','mdp','caractères','exigence mot de passe'],
        answer: '🔑 Le mot de passe doit contenir au minimum **8 caractères**. Nous recommandons d\'utiliser une combinaison de lettres majuscules, minuscules, chiffres et caractères spéciaux pour plus de sécurité.' },

      { keywords: ['photo','photo profil','avatar','image profil'],
        answer: '📷 La photo de profil est facultative lors de l\'inscription. Vous pourrez l\'ajouter ou la modifier à tout moment depuis la section **Mon Profil** après la connexion.' },
    ];

    /* ── Réponses pour la page de connexion ── */
    const connexionAnswers = [
      { keywords: ['mot de passe incorrect','mauvais mot de passe','password incorrect','pas bon','se trompe','erreur mot de passe','je peux pas entrer','impossible connecter','pas entrer'],
        answer: '🔐 **Mot de passe incorrect ?** Voici les solutions :\n\n1️⃣ **Vérifiez la saisie** — Attention aux majuscules/minuscules et au verrouillage des touches\n2️⃣ **Vérifiez votre rôle** — Assurez-vous d\'avoir sélectionné le bon rôle (Agriculteur, Acheteur, Transporteur, etc.)\n3️⃣ Si vous avez oublié votre mot de passe, contactez le **support via la page Contact** pour une réinitialisation.\n\nSi le problème persiste, contactez le support via la page **Contact**.' },

      { keywords: ['non validé','pas validé','pas approuvé','admin valide pas','en attente validation','compte en attente','pas activé','pas encore activé'],
        answer: '⏳ **Compte non validé ?**\n\nVotre compte doit être approuvé par un administrateur du Ministère de l\'Agriculture avant de pouvoir vous connecter. Cela prend généralement **24 à 48 heures ouvrables**.\n\n• Si votre inscription est récente, **patientez** quelques heures.\n• Si cela fait plus de 48h, contactez le support via la page **Contact** en précisant votre email d\'inscription.\n• Si votre compte a été **rejeté**, vous recevrez une notification. Contactez le support pour connaître la raison et refaire une demande.' },

      { keywords: ['rejeté','refusé','compte refusé','compte rejeté','pourquoi rejeté','raison refus'],
        answer: '❌ **Compte rejeté ?**\n\nL\'administrateur peut rejeter un compte si :\n• Les informations fournies sont incomplètes ou incorrectes\n• Les documents justificatifs sont manquants ou invalides\n• Le profil ne correspond pas aux critères de la plateforme\n\nContactez le support via la page **Contact** en précisant votre email pour connaître la raison exacte. Vous pourrez ensuite créer un nouveau compte avec les corrections nécessaires.' },

      { keywords: ['oublié','oublier','mot de passe oublié','récupérer','réinitialiser','reset'],
        answer: '🔑 **Mot de passe oublié ?**\n\nLa réinitialisation du mot de passe se fait via le support AgriGov :\n1️⃣ Rendez-vous sur la page **Contact**\n2️⃣ Envoyez un message en précisant votre adresse email d\'inscription\n3️⃣ L\'équipe vous contactera pour réinitialiser votre mot de passe\n\nNotre équipe répond dans les **24 heures ouvrables**.' },

      { keywords: ['quel rôle choisir','quel rôle','sélectionner rôle','bon rôle','choisir connexion'],
        answer: '🎯 Sur la page de connexion, vous devez sélectionner **le même rôle** que celui choisi lors de votre inscription :\n• 🌾 Agriculteur\n• 🛒 Acheteur\n• 🚛 Transporteur\n• 🐾 Vétérinaire / Organisme (catégorie "Autres")\n• 🏛️ Administrateur (réservé au Ministère)\n\nSi vous ne vous souvenez plus de votre rôle, essayez chaque option ou contactez le support.' },
    ];

    /* ── Réponses pour l'agriculteur ── */
    const agriculteurAnswers = [
      { keywords: ['produit','publier','ajouter produit','stock','annonce','mes produits','créer produit','nouveau produit','vendre'],
        answer: '🥕 **Section "Mes Produits" :**\n\nCette section vous permet de gérer vos annonces de vente :\n• **Ajouter un produit** → Cliquez sur "Ajouter un produit", choisissez un produit du catalogue officiel, fixez votre prix (dans la fourchette autorisée), indiquez la quantité, ajoutez une photo et une description\n• **Modifier** → Cliquez sur l\'icône de modification pour changer le prix, la quantité ou la description\n• **Supprimer** → Supprimez une annonce qui n\'est plus d\'actualité\n• **Statuts** → Disponible, Stock faible, Rupture\n\nVos produits seront visibles dans le catalogue des acheteurs dès publication.' },

      { keywords: ['commande','commander','mes commandes','accepter commande','refuser commande','confirmer commande','gérer commande','accepter','refuser'],
        answer: '📦 **Section "Mes Commandes" :**\n\nVous recevez ici les commandes passées par les acheteurs :\n• **Accepter (Confirmer)** → Ouvrez la commande en attente → cliquez "Confirmer" pour valider\n• **Refuser** → Ouvrez la commande → cliquez "Refuser" si vous ne pouvez pas honorer la commande\n• **Préparer** → Après confirmation, passez la commande en "En préparation"\n• **Demander un transporteur** → Cliquez "Demander un transporteur" pour assigner un livreur\n• **Annuler la course** → Vous pouvez annuler la demande de transporteur si nécessaire\n\n⚠️ L\'agriculteur ne livre pas lui-même, un transporteur est assigné automatiquement.' },

      { keywords: ['ferme','fermes','ajouter ferme','ma ferme','exploitation','mes fermes'],
        answer: '🌾 **Section "Mes Fermes" :**\n\n• **Ajouter une ferme** → Cliquez "Ajouter une ferme" et renseignez : nom, wilaya, commune, adresse, superficie (en hectares), cultures principales, coordonnées GPS\n• Vous pouvez gérer **plusieurs fermes**\n• Les informations de vos fermes sont visibles sur votre profil\n• La localisation GPS aide les transporteurs à calculer les distances' },

      { keywords: ['vétérinaire','veterinaire','vet','rdv','rendez-vous','santé animale','tournée','consultation'],
        answer: '🩺 **Section "Aide Vétérinaire" :**\n\n• **Vétérinaires disponibles** → Consultez la liste avec spécialité, tarif, note moyenne et wilaya\n• **Tournées & Annonces** → Voyez les campagnes vétérinaires dans votre wilaya\n• **Prendre un RDV** → Choisissez un vétérinaire → cliquez "Demander un RDV" → remplissez : type de visite (consultation, vaccination, urgence, suivi, chirurgie), date, heure, lieu, animaux concernés, nombre, description du problème\n• **Mes RDV** → Suivez vos rendez-vous et leurs statuts (en attente, confirmé, refusé, terminé)' },

      { keywords: ['avantage','avantages','bénéfice','subvention','aide','soutien','formation','équipement','crédit','assurance','irrigation','postuler'],
        answer: '🎁 **Section "Avantages" :**\n\nAccédez aux aides agricoles proposées par le Ministère :\n• **Types** → Subventions, formations, équipements, crédits, assurances, systèmes d\'irrigation\n• **Comment postuler** → Choisissez un avantage → cliquez "Postuler" → remplissez : nom complet, téléphone, wilaya, description du projet, document justificatif\n• **Suivi** → Statuts : En attente, Acceptée, Refusée\n• L\'administrateur examine chaque demande et vous notifie\n\n💡 Préparez vos documents justificatifs à l\'avance !' },

      { keywords: ['profil','mon profil','changer photo','modifier profil','mot de passe','password','sécurité'],
        answer: '👤 **Section "Mon Profil" :**\n\n• **Informations personnelles** → Modifiez votre nom, prénom, téléphone, email\n• **Photo de profil** → Cliquez sur l\'icône 📷 sur votre avatar pour changer votre photo\n• **Sécurité** → Onglet "Sécurité" → entrez votre ancien mot de passe puis le nouveau (minimum 8 caractères)' },

      { keywords: ['notification','notif','alerte'],
        answer: '🔔 **Notifications :** Vous recevez des alertes pour les nouvelles commandes, RDV vétérinaires, alertes du Ministère, résultats de vos demandes d\'avantages, et rappels de profil.' },
    ];

    /* ── Réponses pour l'acheteur ── */
    const acheteurAnswers = [
      { keywords: ['catalogue','trouver produit','chercher','produit','acheter','commander','passer commande','comment acheter'],
        answer: '🛒 **Catalogue et commandes :**\n\n• **Parcourir le catalogue** → Explorez tous les produits disponibles, filtrez par catégorie\n• **Détails produit** → Cliquez sur un produit pour voir : prix, quantité disponible, vendeur, photo, description\n• **Passer commande** → Cliquez "Commander" → indiquez votre adresse de livraison et une note éventuelle → confirmez\n• Le statut sera visible dans "Mes Commandes"' },

      { keywords: ['commande','mes commandes','suivre commande','suivi','statut','état commande'],
        answer: '📦 **Suivi de vos commandes :**\n\n• **En attente** → L\'agriculteur n\'a pas encore répondu\n• **Confirmée** → L\'agriculteur a accepté\n• **Refusée** → L\'agriculteur a refusé\n• **En préparation** → Le produit est en cours de préparation\n• **En livraison** → Le transporteur est en route\n• **Livrée** → Vous avez reçu votre commande\n• **Annulée** → La commande a été annulée' },

      { keywords: ['livraison','suivi livraison','suivre livraison','transport','colis'],
        answer: '🚚 **Section "Suivi Livraison" :**\n\n• Chaque commande en cours de livraison a sa **propre carte de suivi**\n• Vous voyez : statut, nom du transporteur, son numéro de téléphone\n• **Contacter le livreur** → Cliquez sur le numéro pour appeler\n• **Signaler un problème** → Bouton dédié pour signaler un souci\n• **Marquer comme reçue** → Confirmez la réception une fois livrée' },

      { keywords: ['annuler','annulation','annuler commande'],
        answer: '❌ **Annuler une commande :**\n\n• L\'annulation est possible **uniquement** si le statut est "**En attente**"\n• Allez dans "Mes Commandes" → ouvrez la commande → cliquez "Annuler"\n• Une fois confirmée ou en préparation, contactez directement l\'agriculteur' },

      { keywords: ['évaluer','evaluation','note','avis','noter','feedback'],
        answer: '⭐ **Évaluer après livraison :**\n\n1️⃣ Une fois la commande "Livrée", allez dans **Notifications**\n2️⃣ Cliquez "Évaluer" à côté de la commande livrée\n3️⃣ Notez séparément : l\'agriculteur, le transporteur et le produit (sur 5)\n4️⃣ Laissez un commentaire pour aider la communauté' },

      { keywords: ['contact transporteur','contacter livreur','téléphone livreur','appeler transporteur','joindre livreur'],
        answer: '📞 **Contacter votre transporteur :**\n\n• Allez dans **Suivi Livraison**\n• Trouvez la carte de votre commande\n• Le nom et le **numéro de téléphone** du transporteur sont affichés\n• Cliquez sur le numéro pour **appeler directement**' },

      { keywords: ['profil','mon profil','changer photo','registre commercial','entreprise'],
        answer: '👤 **Section "Mon Profil" :**\n\n• Modifiez vos informations personnelles\n• Changez votre photo de profil (icône 📷)\n• Mettez à jour vos infos professionnelles : lieu de travail, nom d\'établissement, registre commercial\n• Onglet **Sécurité** pour changer le mot de passe' },
    ];

    /* ── Réponses pour le transporteur ── */
    const transporteurAnswers = [
      { keywords: ['mission','missions disponibles','accepter mission','voir mission','nouvelle mission','chercher mission'],
        answer: '🚛 **Section "Missions" :**\n\n• Consultez les **missions de livraison disponibles**\n• Chaque mission affiche : trajet (départ → destination), distance en km, **prix de course**\n• Contacts : nom et téléphone de l\'acheteur et de l\'agriculteur\n• **Accepter** → Cliquez "Accepter" pour prendre en charge la livraison\n• **Refuser** → Cliquez "Refuser" si non disponible\n• La mission acceptée apparaît dans "Mes Livraisons"' },

      { keywords: ['livraison','mes livraisons','livrer','en cours','marquer livré'],
        answer: '📦 **Section "Mes Livraisons" :**\n\n• Suivez vos livraisons en cours\n• Voyez les détails complets : produits, adresses, contacts\n• **Marquer comme livrée** → Une fois arrivé, cliquez "Marquer comme livrée"\n• L\'acheteur confirmera la réception de son côté' },

      { keywords: ['prix course','prix livraison','tarif transport','combien','rémunération','gagner','payer'],
        answer: '💰 **Prix de course :**\n\n• Calculé automatiquement selon la distance (~**10 DA/km**)\n• C\'est le montant que **vous recevez** en tant que transporteur\n• ⚠️ Différent du total de la commande (prix des produits)\n• Visible dans les détails de chaque mission avant acceptation' },

      { keywords: ['carte','gps','position','route','trajet','localisation','temps réel','map'],
        answer: '🗺️ **Section "Carte en temps réel" :**\n\n• Votre **position GPS** est affichée automatiquement (📡)\n• Les **routes** sont tracées vers la destination\n• Chaque mission et livraison est visible sur la carte\n• **Cliquez** sur un élément de la liste pour centrer la carte' },

      { keywords: ['historique','livraisons terminées','passé','ancien'],
        answer: '📜 **Section "Historique" :**\n\n• Consultez toutes vos **livraisons terminées**\n• Détails : date, trajet, prix, acheteur, agriculteur\n• Les **évaluations** des acheteurs sont visibles ici' },

      { keywords: ['évaluer','evaluation','note','avis'],
        answer: '⭐ Après chaque livraison, l\'acheteur peut vous évaluer (note sur 5 + commentaire). Consultez vos évaluations dans **Notifications** ou **Historique**. Une bonne note augmente votre visibilité !' },

      { keywords: ['profil','mon profil','véhicule','changer photo','photo'],
        answer: '👤 **Section "Mon Profil" :**\n\n• Modifiez vos informations personnelles\n• Changez votre photo de profil (icône 📷)\n• Informations de véhicule gérées ici\n• Onglet **Sécurité** pour le mot de passe' },
    ];

    /* ── Réponses pour le vétérinaire ── */
    const veterinaireAnswers = [
      { keywords: ['rdv','rendez-vous','demande','confirmer','refuser','gestion rdv','mes rdv'],
        answer: '📋 **Gestion des RDV :**\n\n• Consultez les **demandes de RDV** des agriculteurs\n• **Confirmer** → Acceptez un RDV pour programmer la visite\n• **Refuser** → Déclinez si non disponible\n• **Terminer** → Marquez le RDV comme terminé avec diagnostic et traitement\n• Types : consultation, vaccination, urgence, suivi, chirurgie' },

      { keywords: ['tournée','annonce','campagne','publier','créer tournée'],
        answer: '📢 **Tournées et annonces :**\n\n• **Créer une tournée** → Titre, description, wilayas ciblées, dates, services offerts, tarif spécial\n• Les agriculteurs de votre zone seront informés\n• Statuts : Planifiée, En cours, Terminée, Annulée' },

      { keywords: ['message','messagerie','contacter','communication','discuter'],
        answer: '💬 **Messagerie :**\n\n• Échangez directement avec les agriculteurs ayant un RDV\n• Envoyez des suivis, prescriptions ou conseils\n• Messages liés à un RDV spécifique\n• Communication sécurisée et privée' },

      { keywords: ['alerte','urgence','épidémie','stock animal','campagne nationale'],
        answer: '⚠️ **Alertes du Ministère :**\n\n• Recevez les alertes : stock animal faible, risque d\'épidémie, campagne nationale, urgences\n• Alertes ciblées par wilaya\n• Vous pouvez organiser une tournée en réponse' },

      { keywords: ['profil','spécialité','tarif','consultation','disponibilité','expérience'],
        answer: '👤 **Mon profil vétérinaire :**\n\n• Mettez à jour : spécialité, numéro d\'ordre, wilaya principale, bio, expérience\n• Fixez votre **tarif de consultation** en DA\n• Indiquez votre **disponibilité**\n• Note moyenne et nombre de consultations calculés automatiquement' },
    ];

    /* ── Réponses pour l'admin ── */
    const adminAnswers = [
      { keywords: ['utilisateur','valider','approuver','rejeter','compte','gestion utilisateur','utilisateurs en attente'],
        answer: '👥 **Section "Utilisateurs" :**\n\n• Consultez tous les comptes inscrits\n• **Valider** → Approuvez les inscriptions en attente\n• **Rejeter** → Refusez les comptes si informations incorrectes\n• Filtrez par rôle ou statut\n• Voir les détails complets de chaque utilisateur' },

      { keywords: ['produit','catalogue','ajouter produit','gérer produit','produits officiels'],
        answer: '📦 **Section "Produits" :**\n\n• Gérez le **catalogue officiel** de produits agricoles\n• **Ajouter** → nom, catégorie, fourchette de prix, photo, description\n• **Modifier** ou **supprimer** les produits existants\n• Gérer les **catalogues** (catégories)\n• Les agriculteurs publient à partir de ce catalogue' },

      { keywords: ['commande','commandes','surveiller','transactions'],
        answer: '🛒 **Section "Commandes" :**\n\n• Surveillez **toutes les commandes** de la plateforme\n• Voyez statuts, montants, acheteurs et agriculteurs impliqués\n• Suivez les transactions en temps réel' },

      { keywords: ['avantage','subvention','aide','soutien','bénéfice','demande avantage'],
        answer: '🎁 **Section "Avantages" :**\n\n• **Créer** des avantages (subventions, formations, équipements, crédits, assurances, irrigation)\n• **Examiner** les demandes des agriculteurs\n• **Accepter** ou **Refuser** avec une note explicative\n• Les agriculteurs sont notifiés de votre décision' },

      { keywords: ['vétérinaire','veterinaire','organisation','alerte','tournée','stock animal','épidémie'],
        answer: '🩺 **Section "Vétérinaires & Organisations" :**\n\n• Voir les vétérinaires et organisations inscrits\n• **Créer des alertes** → Stock animal faible, Risque épidémie, Campagne nationale, Urgent\n• Cibler par **wilayas**\n• Coordonner les tournées vétérinaires' },

      { keywords: ['tableau de bord','dashboard','statistiques','kpi','stats','chiffres'],
        answer: '📊 **Tableau de bord :** Vue d\'ensemble avec KPIs en temps réel — utilisateurs par rôle, commandes, revenus totaux, produits actifs, statistiques de livraison.' },

      { keywords: ['profil','mon profil'],
        answer: '👤 **Section "Mon Profil" :** Modifiez vos informations d\'administrateur, changez votre photo de profil, et mettez à jour votre mot de passe.' },
    ];

    /* ── Réponses globales (tous rôles connectés) ── */
    const globalConnected = [
      { keywords: ['déconnexion','déconnecter','logout','quitter','sortir'],
        answer: '🚪 Pour vous déconnecter, cliquez sur **"Déconnexion"** dans le menu ou la barre latérale. Vous serez redirigé vers la page d\'accueil.' },

      { keywords: ['mot de passe','changer mot de passe','password','sécurité','modifier mot de passe'],
        answer: '🔑 Pour changer votre mot de passe :\n1️⃣ Allez dans **Mon Profil**\n2️⃣ Cliquez sur l\'onglet **Sécurité**\n3️⃣ Entrez votre ancien mot de passe\n4️⃣ Saisissez le nouveau (minimum 8 caractères)\n5️⃣ Confirmez et sauvegardez' },

      { keywords: ['photo profil','changer photo','avatar','image'],
        answer: '📷 Pour changer votre photo de profil :\n• Allez dans **Mon Profil**\n• Cliquez sur l\'icône 📷 sur votre avatar\n• Sélectionnez une image depuis votre appareil\n• Sauvegardez — la photo apparaîtra partout sur la plateforme' },
    ];

    // Sélection des réponses selon le contexte
    const contextMap = {
      home: [...common, ...homeAnswers],
      inscription: [...common, ...homeAnswers, ...inscriptionAnswers],
      connexion: [...common, ...connexionAnswers],
      services: [...common, ...homeAnswers],
      contact: [...common],
      ensavoir: [...common, ...homeAnswers],
      admin: [...common, ...adminAnswers, ...globalConnected],
      agriculteur: [...common, ...agriculteurAnswers, ...globalConnected],
      acheteur: [...common, ...acheteurAnswers, ...globalConnected],
      transporteur: [...common, ...transporteurAnswers, ...globalConnected],
      veterinaire: [...common, ...veterinaireAnswers, ...globalConnected],
      organisation: [...common, ...globalConnected],
    };

    return contextMap[ctx] || [...common, ...homeAnswers];
  }

  /* ── Trouver une réponse rapide ── */
  function findQuickAnswer(text, ctx) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const quickAnswers = buildQuickAnswers(ctx);

    // Sécurité : bloquer les tentatives d'accès cross-rôle
    const adminOnlyTerms = ['panneau admin','valider compte','rejeter compte','admin panel','gerer utilisateurs'];
    const privateContexts = ['home','inscription','connexion','services','contact','ensavoir','acheteur','transporteur','veterinaire','organisation'];
    if (privateContexts.includes(ctx) && adminOnlyTerms.some(k => lower.includes(k))) {
      return '🔒 Cette fonctionnalité est réservée aux administrateurs AgriGov. Contactez le support via la page **Contact** si vous avez besoin d\'aide.';
    }

    for (const qa of quickAnswers) {
      if (qa.keywords.some(k => {
        const normalK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return lower.includes(normalK);
      })) {
        return qa.answer;
      }
    }
    return null;
  }

  /* ── Messages de bienvenue contextuels ── */
  function getWelcomeMessage(ctx) {
    const welcomes = {
      home: '🌿 **Bienvenue dans notre espace agricole !** Je suis l\'assistant AgriGov, votre guide sur cette plateforme.\n\nJe suis là pour vous aider à découvrir nos services, comprendre les différents rôles, et vous accompagner dans votre inscription. N\'hésitez pas à me poser vos questions !\n\n💡 Souhaitez-vous en savoir plus sur la plateforme, créer un compte, ou vous connecter ?',

      inscription: '📝 **Bienvenue sur la page d\'inscription d\'AgriGov !**\n\nJe vais vous accompagner dans la création de votre compte. Voici les étapes principales :\n1️⃣ Choisissez votre rôle\n2️⃣ Remplissez vos informations\n3️⃣ Soumettez votre demande\n\nQuel rôle souhaitez-vous choisir ? Ou avez-vous une question sur l\'inscription ?',

      connexion: '🔐 **Bienvenue sur la page de connexion d\'AgriGov !**\n\nSélectionnez votre rôle et entrez vos identifiants pour accéder à votre espace. Si vous rencontrez un problème (mot de passe oublié, compte non validé), je suis là pour vous aider !',

      admin: '🏛️ Bonjour Administrateur ! Je suis votre assistant AgriGov.\n\nJe peux vous aider à :\n• **Gérer les utilisateurs** (valider/rejeter des comptes)\n• **Surveiller les commandes** et transactions\n• **Gérer le catalogue** de produits officiels\n• **Administrer les avantages** agricoles\n• **Coordonner les vétérinaires** et organisations\n\nQue souhaitez-vous faire ?',

      agriculteur: '🌾 Bonjour ! Bienvenue dans votre espace agriculteur sur AgriGov.\n\nJe peux vous aider avec :\n• 🥕 **Mes Produits** — publier et gérer vos annonces\n• 📦 **Mes Commandes** — accepter ou refuser les commandes\n• 🌾 **Mes Fermes** — gérer vos exploitations\n• 🩺 **Aide Vétérinaire** — prendre un RDV\n• 🎁 **Avantages** — demander des subventions et aides\n\nComment puis-je vous aider ?',

      acheteur: '🛒 Bonjour ! Bienvenue dans votre espace acheteur sur AgriGov.\n\nJe peux vous aider à :\n• 📋 **Parcourir le catalogue** et trouver des produits\n• 📦 **Passer et suivre vos commandes**\n• 🚚 **Suivre vos livraisons** en temps réel\n• ⭐ **Évaluer** vos expériences\n• 📞 **Contacter** votre transporteur\n\nQue souhaitez-vous faire ?',

      transporteur: '🚛 Bonjour ! Bienvenue dans votre espace transporteur sur AgriGov.\n\nJe peux vous aider avec :\n• 📋 **Missions disponibles** — voir et accepter des livraisons\n• 📦 **Mes Livraisons** — suivre vos missions en cours\n• 🗺️ **Carte GPS** — navigation en temps réel\n• 💰 **Prix de course** — comprendre votre rémunération\n\nComment puis-je vous aider ?',

      veterinaire: '🩺 Bonjour ! Bienvenue dans votre espace vétérinaire sur AgriGov.\n\nJe peux vous aider avec :\n• 📋 **Mes RDV** — gérer les demandes des agriculteurs\n• 📢 **Tournées** — créer des campagnes vétérinaires\n• 💬 **Messagerie** — communiquer avec les agriculteurs\n• ⚠️ **Alertes** — recevoir les notifications du Ministère\n\nQue souhaitez-vous faire ?',

      organisation: '💡 Bonjour ! Bienvenue dans votre espace organisation sur AgriGov.\n\nJe suis là pour vous aider à naviguer sur la plateforme et coordonner vos activités avec le Ministère de l\'Agriculture. N\'hésitez pas à me poser vos questions !',

      services: '🌟 Bienvenue sur la page des services AgriGov ! Je peux vous détailler chacun de nos services : vente agricole, achat direct, transport, aide vétérinaire, avantages et subventions. Que souhaitez-vous savoir ?',

      contact: '📞 Bienvenue sur la page Contact d\'AgriGov ! Vous pouvez envoyer un message à notre équipe de support. Je suis aussi là pour vous aider si vous avez des questions.',

      ensavoir: '📖 Bienvenue sur la page "En savoir plus" ! Je peux vous fournir des informations détaillées sur AgriGov Market, son fonctionnement et ses objectifs.',
    };

    return welcomes[ctx] || welcomes.home;
  }

  /* ── Suggestions contextuelles ── */
  function getSuggestions(ctx) {
    const suggestions = {
      home: ['Pourquoi m\'inscrire ?', 'Les types de comptes', 'Comment s\'inscrire ?', 'C\'est quoi AgriGov ?'],
      inscription: ['Documents requis', 'Délai de validation', 'Quel rôle choisir ?', 'Problème d\'inscription'],
      connexion: ['Mot de passe oublié', 'Compte non validé', 'Compte rejeté', 'Quel rôle choisir ?'],
      admin: ['Gérer les utilisateurs', 'Voir les commandes', 'Gérer les avantages', 'Tableau de bord', 'Alertes vétérinaires'],
      agriculteur: ['Ajouter un produit', 'Gérer mes commandes', 'Aide vétérinaire', 'Demander un soutien', 'Mes fermes'],
      acheteur: ['Passer une commande', 'Suivre ma livraison', 'Annuler une commande', 'Évaluer ma commande', 'Contacter le livreur'],
      transporteur: ['Voir les missions', 'Carte GPS', 'Prix de course', 'Historique livraisons', 'Mon profil'],
      veterinaire: ['Gérer mes RDV', 'Créer une tournée', 'Messagerie', 'Alertes', 'Mon profil'],
      organisation: ['Mon espace', 'Contacter le support', 'Mon profil'],
      services: ['Services agriculteur', 'Services acheteur', 'Services transporteur', 'C\'est quoi AgriGov ?'],
      contact: ['Signaler un problème', 'Question sur mon compte', 'Aide technique'],
      ensavoir: ['Fonctionnement', 'Objectifs', 'Partenaires'],
    };
    return suggestions[ctx] || suggestions.home;
  }

  /* ── Render markdown-lite ── */
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n- /g, '<br>• ')
      .replace(/\n• /g, '<br>• ')
      .replace(/\n(\d+[️⃣]?\.) /g, (m, num) => '<br>' + num + ' ')
      .replace(/\n/g, '<br>');
  }

  /* ── Chat history ── */
  let chatHistory = [];

  function loadHistory() {
    try {
      const savedCtx = sessionStorage.getItem(CHATBOT_CONFIG.storageKey + '_ctx');
      // Si le contexte a changé → on efface tout
      if (savedCtx && savedCtx !== detectContext()) {
        sessionStorage.removeItem(CHATBOT_CONFIG.storageKey);
        sessionStorage.removeItem(CHATBOT_CONFIG.storageKey + '_ctx');
        chatHistory = [];
        return;
      }
      const saved = sessionStorage.getItem(CHATBOT_CONFIG.storageKey);
      if (saved) chatHistory = JSON.parse(saved).slice(-CHATBOT_CONFIG.maxHistory);
    } catch (e) { chatHistory = []; }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(CHATBOT_CONFIG.storageKey, JSON.stringify(chatHistory.slice(-CHATBOT_CONFIG.maxHistory)));
      sessionStorage.setItem(CHATBOT_CONFIG.storageKey + '_ctx', detectContext());
    } catch (e) {}
  }

  function clearHistory() {
    chatHistory = [];
    try {
      sessionStorage.removeItem(CHATBOT_CONFIG.storageKey);
      sessionStorage.removeItem(CHATBOT_CONFIG.storageKey + '_ctx');
    } catch (e) {}
  }

  /* ── DOM Elements ── */
  let chatWidget, chatMessages, chatInput, chatSendBtn, chatToggleBtn, typingEl;
  let isOpen = false;
  let isTyping = false;
  const context = detectContext();

  /* ── Build UI ── */
  function buildChatbot() {
    const style = document.createElement('style');
    style.textContent = `
      #agrigov-chat-btn {
        position: fixed; bottom: 28px; right: 28px; z-index: 99998;
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, #2d7a2d, #5bb85b);
        border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(45,122,45,0.45);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem; transition: transform 0.2s, box-shadow 0.2s;
        color: #fff;
      }
      #agrigov-chat-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(45,122,45,0.6); }
      #agrigov-chat-btn .chat-badge {
        position: absolute; top: -3px; right: -3px;
        background: #ef4444; color: #fff; border-radius: 50%;
        width: 18px; height: 18px; font-size: 0.65rem;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; border: 2px solid #fff;
      }
      #agrigov-chat-widget {
        position: fixed; bottom: 100px; right: 28px; z-index: 99999;
        width: 400px; max-width: calc(100vw - 32px);
        height: 550px; max-height: calc(100vh - 120px);
        background: #fff; border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        display: flex; flex-direction: column; overflow: hidden;
        transform: scale(0.8) translateY(20px); opacity: 0;
        transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), opacity 0.2s;
        pointer-events: none;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      #agrigov-chat-widget.open {
        transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
      }
      .agrigov-chat-header {
        background: linear-gradient(135deg, #2d7a2d, #4caf50);
        color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 12px;
      }
      .agrigov-chat-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: rgba(255,255,255,0.2); display: flex; align-items: center;
        justify-content: center; font-size: 1.4rem; flex-shrink: 0;
      }
      .agrigov-chat-header-info { flex: 1; }
      .agrigov-chat-header-info strong { display: block; font-size: 0.95rem; }
      .agrigov-chat-header-info small { font-size: 0.75rem; opacity: 0.85; }
      .agrigov-chat-close {
        background: rgba(255,255,255,0.15); border: none; color: #fff;
        width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
        font-size: 1rem; display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .agrigov-chat-close:hover { background: rgba(255,255,255,0.3); }
      .agrigov-chat-messages {
        flex: 1; overflow-y: auto; padding: 16px; display: flex;
        flex-direction: column; gap: 10px; background: #f8faf8;
        scroll-behavior: smooth;
      }
      .agrigov-chat-messages::-webkit-scrollbar { width: 4px; }
      .agrigov-chat-messages::-webkit-scrollbar-thumb { background: #c8e6c9; border-radius: 4px; }
      .chat-msg { max-width: 85%; display: flex; flex-direction: column; gap: 2px; }
      .chat-msg.bot { align-self: flex-start; }
      .chat-msg.user { align-self: flex-end; }
      .chat-bubble {
        padding: 10px 14px; border-radius: 16px; font-size: 0.875rem;
        line-height: 1.5; word-break: break-word;
      }
      .chat-msg.bot .chat-bubble {
        background: #fff; color: #1a2e1a; border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      }
      .chat-msg.user .chat-bubble {
        background: linear-gradient(135deg, #2d7a2d, #4caf50);
        color: #fff; border-bottom-right-radius: 4px;
      }
      .chat-bubble code { background: rgba(0,0,0,0.08); padding: 1px 5px; border-radius: 4px; font-size: 0.8rem; }
      .chat-time { font-size: 0.68rem; color: #aaa; padding: 0 4px; }
      .chat-msg.user .chat-time { text-align: right; }
      .chat-typing {
        display: flex; align-items: center; gap: 6px;
        padding: 10px 14px; background: #fff; border-radius: 16px;
        border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        align-self: flex-start; max-width: 80px;
      }
      .chat-typing span {
        width: 7px; height: 7px; border-radius: 50%; background: #4caf50;
        animation: chatDot 1.2s infinite;
      }
      .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
      .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes chatDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
      .agrigov-chat-suggestions {
        padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px;
        border-top: 1px solid #e8f5e9; background: #fff;
      }
      .chat-suggestion {
        padding: 5px 10px; border-radius: 20px; font-size: 0.75rem;
        background: #e8f5e9; color: #2d7a2d; border: 1px solid #c8e6c9;
        cursor: pointer; transition: background 0.15s, transform 0.1s;
        white-space: nowrap;
      }
      .chat-suggestion:hover { background: #c8e6c9; transform: translateY(-1px); }
      .agrigov-chat-input-row {
        display: flex; padding: 12px; gap: 8px;
        border-top: 1px solid #e8f5e9; background: #fff; align-items: flex-end;
      }
      .agrigov-chat-input {
        flex: 1; border: 1.5px solid #c8e6c9; border-radius: 12px;
        padding: 9px 14px; font-size: 0.875rem; outline: none;
        resize: none; min-height: 40px; max-height: 100px; overflow-y: auto;
        font-family: inherit; line-height: 1.4; transition: border 0.2s;
      }
      .agrigov-chat-input:focus { border-color: #4caf50; }
      .agrigov-chat-send {
        width: 40px; height: 40px; border-radius: 12px;
        background: linear-gradient(135deg, #2d7a2d, #4caf50);
        border: none; color: #fff; cursor: pointer; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; transition: opacity 0.2s, transform 0.1s;
      }
      .agrigov-chat-send:disabled { opacity: 0.4; cursor: default; transform: none; }
      .agrigov-chat-send:not(:disabled):hover { transform: scale(1.05); }
      body.dark-mode #agrigov-chat-widget { background: #1a2e1a; }
      body.dark-mode .agrigov-chat-messages { background: #162016; }
      body.dark-mode .chat-msg.bot .chat-bubble { background: #243024; color: #e0f2e0; }
      body.dark-mode .agrigov-chat-input-row,
      body.dark-mode .agrigov-chat-suggestions { background: #1a2e1a; border-color: #2d4a2d; }
      body.dark-mode .agrigov-chat-input { background: #243024; color: #e0f2e0; border-color: #3a5a3a; }
      body.dark-mode .chat-suggestion { background: #2d4a2d; color: #a5d6a7; border-color: #3a5a3a; }
      @media (max-width: 480px) {
        #agrigov-chat-widget { width: calc(100vw - 16px); right: 8px; bottom: 90px; height: calc(100vh - 110px); }
        #agrigov-chat-btn { bottom: 16px; right: 16px; }
      }
    `;
    document.head.appendChild(style);

    // Toggle button
    chatToggleBtn = document.createElement('button');
    chatToggleBtn.id = 'agrigov-chat-btn';
    chatToggleBtn.innerHTML = '🌾<span class="chat-badge" id="chatBadge" style="display:none">1</span>';
    chatToggleBtn.setAttribute('aria-label', 'Ouvrir le chat AgriGov');
    chatToggleBtn.title = 'AgriGov Assistant';
    document.body.appendChild(chatToggleBtn);

    // Widget
    chatWidget = document.createElement('div');
    chatWidget.id = 'agrigov-chat-widget';
    chatWidget.setAttribute('role', 'dialog');
    chatWidget.setAttribute('aria-label', 'Chat AgriGov');

    const roleLabel = getRoleLabel(context);

    chatWidget.innerHTML = `
      <div class="agrigov-chat-header">
        <div class="agrigov-chat-avatar">🤖</div>
        <div class="agrigov-chat-header-info">
          <strong>${CHATBOT_CONFIG.title}</strong>
          <small>${roleLabel} · ${CHATBOT_CONFIG.subtitle}</small>
        </div>
        <button class="agrigov-chat-close" id="agrigovChatClose" aria-label="Fermer">✕</button>
      </div>
      <div class="agrigov-chat-messages" id="agrigovChatMessages"></div>
      <div class="agrigov-chat-suggestions" id="agrigovChatSuggestions"></div>
      <div class="agrigov-chat-input-row">
        <textarea class="agrigov-chat-input" id="agrigovChatInput" placeholder="${CHATBOT_CONFIG.placeholder}" rows="1" maxlength="500"></textarea>
        <button class="agrigov-chat-send" id="agrigovChatSend" aria-label="Envoyer">➤</button>
      </div>
    `;
    document.body.appendChild(chatWidget);

    chatMessages = document.getElementById('agrigovChatMessages');
    chatInput = document.getElementById('agrigovChatInput');
    chatSendBtn = document.getElementById('agrigovChatSend');

    // Bind events
    chatToggleBtn.addEventListener('click', toggleChat);
    document.getElementById('agrigovChatClose').addEventListener('click', closeChat);
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    chatInput.addEventListener('input', autoResizeInput);

    // Suggestions
    renderSuggestions();

    // Load history
    loadHistory();
    if (chatHistory.length > 0) {
      chatHistory.forEach(msg => appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.content, false));
    } else {
      // Welcome message
      setTimeout(() => {
        appendMessage('bot', getWelcomeMessage(context));
        const badge = document.getElementById('chatBadge');
        if (badge) badge.style.display = 'flex';
      }, CHATBOT_CONFIG.welcomeDelay);
    }
  }

  function renderSuggestions() {
    const container = document.getElementById('agrigovChatSuggestions');
    if (!container) return;
    const list = getSuggestions(context);
    container.innerHTML = list.map(s =>
      `<button class="chat-suggestion" type="button">${s}</button>`
    ).join('');
    container.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.textContent;
        sendMessage();
      });
    });
  }

  function autoResizeInput() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  }

  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    chatWidget.classList.add('open');
    chatToggleBtn.innerHTML = '✕';
    const badge = document.getElementById('chatBadge');
    if (badge) badge.style.display = 'none';
    // Si aucun message → afficher bienvenue
    if (chatMessages.children.length === 0) {
      appendMessage('bot', getWelcomeMessage(context));
    }
    chatInput.focus();
    scrollToBottom();
  }

  function closeChat() {
    isOpen = false;
    chatWidget.classList.remove('open');
    chatToggleBtn.innerHTML = '🌾<span class="chat-badge" id="chatBadge" style="display:none">1</span>';
    // Effacer l'historique et les messages à la fermeture
    clearHistory();
    chatMessages.innerHTML = '';
  }

  function scrollToBottom() {
    requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
  }

  function now() {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function appendMessage(type, text, save = true) {
    if (typingEl && chatMessages.contains(typingEl)) chatMessages.removeChild(typingEl);
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.innerHTML = `<div class="chat-bubble">${renderMarkdown(text)}</div><span class="chat-time">${now()}</span>`;
    chatMessages.appendChild(msg);
    scrollToBottom();
    if (save) {
      chatHistory.push({ role: type === 'user' ? 'user' : 'assistant', content: text });
      saveHistory();
    }
  }

  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingEl);
    scrollToBottom();
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isTyping) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendBtn.disabled = true;
    isTyping = true;

    appendMessage('user', text);

    // Détection salutations → message de bienvenue contextuel
    const greetings = ['bonjour','salut','hello','bonsoir','salam','ahla','hi','hey','coucou','bsr','bjr'];
    const lowerText = text.toLowerCase().trim().replace(/[!?,. ]+$/g, '');
    if (greetings.includes(lowerText)) {
      showTyping();
      setTimeout(() => {
        appendMessage('bot', getWelcomeMessage(context));
        isTyping = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
      }, 400 + Math.random() * 400);
      return;
    }

    // Try quick answer
    const quick = findQuickAnswer(text, context);
    if (quick) {
      showTyping();
      setTimeout(() => {
        appendMessage('bot', quick);
        isTyping = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
      }, 400 + Math.random() * 400);
      return;
    }

    // Call Claude API for complex questions
    showTyping();
    try {
      const messages = chatHistory
        .filter(m => m.role !== 'assistant' || m.content !== text)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      if (!messages.length || messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: text });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(context),
          messages: messages,
        }),
      });

      if (!response.ok) throw new Error('API error ' + response.status);
      const data = await response.json();
      const reply = data.content?.map(b => b.text || '').join('') || 'Désolé, je n\'ai pas pu répondre. Veuillez réessayer.';
      appendMessage('bot', reply);
    } catch (err) {
      console.warn('Chatbot API error:', err);
      // Fallback intelligent
      const fallbackMsg = getFallbackMessage(text, context);
      appendMessage('bot', fallbackMsg);
    } finally {
      isTyping = false;
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  }

  /* ── Message de secours quand l'API n'est pas disponible ── */
  function getFallbackMessage(text, ctx) {
    const lower = text.toLowerCase();

    if (lower.includes('comment') || lower.includes('aide') || lower.includes('help')) {
      const helps = {
        home: '💡 Je suis temporairement limité. En attendant :\n• Cliquez sur **Créer un compte** pour vous inscrire\n• Cliquez sur **Se connecter** pour accéder à votre espace\n• Consultez la page **Services** pour nos offres\n• Contactez-nous via la page **Contact**',
        inscription: '📝 Pour vous inscrire : choisissez votre rôle, remplissez le formulaire, et soumettez votre demande. Validation sous 24-48h.',
        connexion: '🔐 Sélectionnez votre rôle, entrez votre email et mot de passe. En cas de problème, utilisez "Mot de passe oublié" ou contactez le support.',
        agriculteur: '🌾 Explorez vos sections : Mes Produits, Mes Commandes, Mes Fermes, Aide Vétérinaire et Avantages. Cliquez sur les suggestions ci-dessous.',
        acheteur: '🛒 Parcourez le catalogue, suivez vos commandes et livraisons. Utilisez les suggestions ci-dessous.',
        transporteur: '🚛 Consultez les missions disponibles, suivez vos livraisons sur la carte GPS. Utilisez les suggestions ci-dessous.',
        admin: '🏛️ Accédez au tableau de bord pour une vue d\'ensemble. Gérez les utilisateurs, produits, commandes et avantages.',
        veterinaire: '🩺 Gérez vos RDV, créez des tournées et communiquez avec les agriculteurs.',
      };
      return helps[ctx] || helps.home;
    }

    return '⚠️ Je suis temporairement indisponible pour les questions complexes. Essayez de :\n• Cliquer sur une **suggestion rapide** ci-dessous\n• Reformuler votre question avec des mots-clés simples\n• Consulter la page **Contact** pour joindre le support AgriGov\n\nJe m\'excuse pour la gêne occasionnée !';
  }

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildChatbot);
  } else {
    buildChatbot();
  }

})();
