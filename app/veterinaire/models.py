from django.db import models
from app.users.models import Profile

WILAYAS_ALGERIE = [
    ('01','Adrar'),('02','Chlef'),('03','Laghouat'),('04','Oum El Bouaghi'),('05','Batna'),
    ('06','Béjaïa'),('07','Biskra'),('08','Béchar'),('09','Blida'),('10','Bouïra'),
    ('11','Tamanrasset'),('12','Tébessa'),('13','Tlemcen'),('14','Tiaret'),('15','Tizi Ouzou'),
    ('16','Alger'),('17','Djelfa'),('18','Jijel'),('19','Sétif'),('20','Saïda'),
    ('21','Skikda'),('22','Sidi Bel Abbès'),('23','Annaba'),('24','Guelma'),('25','Constantine'),
    ('26','Médéa'),('27','Mostaganem'),('28','M\'Sila'),('29','Mascara'),('30','Ouargla'),
    ('31','Oran'),('32','El Bayadh'),('33','Illizi'),('34','Bordj Bou Arréridj'),('35','Boumerdès'),
    ('36','El Tarf'),('37','Tindouf'),('38','Tissemsilt'),('39','El Oued'),('40','Khenchela'),
    ('41','Souk Ahras'),('42','Tipaza'),('43','Mila'),('44','Aïn Defla'),('45','Naâma'),
    ('46','Aïn Témouchent'),('47','Ghardaïa'),('48','Relizane'),('49','El M\'Ghair'),('50','El Meniaa'),
    ('51','Ouled Djellal'),('52','Bordj Baji Mokhtar'),('53','Béni Abbès'),('54','Timimoun'),
    ('55','Touggourt'),('56','Djanet'),('57','In Salah'),('58','In Guezzam'),
]


class VeterinaireProfile(models.Model):
    """Profil étendu pour les vétérinaires."""
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='vet_profile')
    specialite = models.CharField(max_length=200, blank=True)
    numero_ordre = models.CharField(max_length=100, blank=True)
    wilaya_principale = models.CharField(max_length=2, choices=WILAYAS_ALGERIE, blank=True)
    bio = models.TextField(blank=True)
    experience_annees = models.PositiveIntegerField(default=0)
    tarif_consultation = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, default=None)
    disponible = models.BooleanField(default=True)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_consultations = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Vét. {self.profile.user.get_full_name()}"


class RendezVous(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirme', 'Confirmé'),
        ('refuse', 'Refusé'),
        ('termine', 'Terminé'),
        ('annule', 'Annulé'),
    ]
    TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('vaccination', 'Vaccination'),
        ('urgence', 'Urgence'),
        ('suivi', 'Suivi'),
        ('chirurgie', 'Chirurgie'),
    ]

    veterinaire = models.ForeignKey(VeterinaireProfile, on_delete=models.CASCADE, related_name='rendez_vous')
    agriculteur = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='mes_rdv')
    type_visite = models.CharField(max_length=20, choices=TYPE_CHOICES, default='consultation')
    date_rdv = models.DateField()
    heure_rdv = models.TimeField()
    lieu = models.CharField(max_length=255, blank=True)
    wilaya = models.CharField(max_length=2, choices=WILAYAS_ALGERIE, blank=True)
    animaux_concernes = models.CharField(max_length=255, blank=True)
    nombre_animaux = models.PositiveIntegerField(default=1)
    description_probleme = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    note_veterinaire = models.TextField(blank=True)
    diagnostic = models.TextField(blank=True)
    traitement = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_rdv', '-heure_rdv']

    def __str__(self):
        return f"RDV #{self.id} - {self.agriculteur.user.get_full_name()} - {self.date_rdv}"


class MessageVet(models.Model):
    """Messages entre vétérinaire et agriculteur."""
    expediteur = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='messages_envoyes_vet')
    destinataire = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='messages_recus_vet')
    rdv = models.ForeignKey(RendezVous, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_envoi']

    def __str__(self):
        return f"Msg de {self.expediteur.user.username} à {self.destinataire.user.username}"


class TourneeVeterinaire(models.Model):
    """Tournée/campagne vétérinaire annoncée dans des wilayas."""
    STATUT_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    veterinaire = models.ForeignKey(VeterinaireProfile, on_delete=models.CASCADE, related_name='tournees')
    titre = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    wilayas = models.JSONField(default=list)  # liste de codes wilaya
    date_debut = models.DateField()
    date_fin = models.DateField()
    services_offerts = models.TextField(blank=True)
    tarif_special = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifiee')
    alerte_admin = models.BooleanField(default=False)  # déclenchée par une alerte admin
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tournée: {self.titre} ({self.date_debut} → {self.date_fin})"


class AlerteAdmin(models.Model):
    """Alerte envoyée par l'admin aux vétérinaires ou organisateurs (stock faible, etc.)."""
    TYPE_CHOICES = [
        ('stock_faible', 'Stock Animaux Faible'),
        ('epidemie', 'Risque Épidémie'),
        ('campagne', 'Campagne Nationale'),
        ('urgent', 'Urgent'),
    ]
    DESTINATAIRE_CHOICES = [
        ('veterinaire', 'Vétérinaire'),
        ('organisateur', 'Organisateur'),
        ('tous', 'Tous'),
    ]
    titre = models.CharField(max_length=255)
    message = models.TextField()
    type_alerte = models.CharField(max_length=20, choices=TYPE_CHOICES, default='stock_faible')
    destinataire_type = models.CharField(
        max_length=20, choices=DESTINATAIRE_CHOICES, default='veterinaire'
    )
    wilayas_cibles = models.JSONField(default=list)
    active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    creee_par = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )

    def __str__(self):
        return f"Alerte: {self.titre}"


class EvaluationVet(models.Model):
    """Évaluation d'un vétérinaire par un agriculteur après RDV."""
    rdv = models.OneToOneField(RendezVous, on_delete=models.CASCADE, related_name='evaluation')
    agriculteur = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='evaluations_donnees')
    veterinaire = models.ForeignKey(VeterinaireProfile, on_delete=models.CASCADE, related_name='evaluations_recues')
    note = models.PositiveSmallIntegerField(default=5)  # 1-5
    commentaire = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Éval {self.note}/5 par {self.agriculteur.user.username}"