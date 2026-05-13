from django.db import models
from app.users.models import Profile

WILAYAS_ALGERIE = [
    ('01', 'Adrar'), ('02', 'Chlef'), ('03', 'Laghouat'), ('04', 'Oum El Bouaghi'), ('05', 'Batna'),
    ('06', 'Béjaïa'), ('07', 'Biskra'), ('08', 'Béchar'), ('09', 'Blida'), ('10', 'Bouïra'),
    ('11', 'Tamanrasset'), ('12', 'Tébessa'), ('13', 'Tlemcen'), ('14', 'Tiaret'), ('15', 'Tizi Ouzou'),
    ('16', 'Alger'), ('17', 'Djelfa'), ('18', 'Jijel'), ('19', 'Sétif'), ('20', 'Saïda'),
    ('21', 'Skikda'), ('22', 'Sidi Bel Abbès'), ('23', 'Annaba'), ('24', 'Guelma'), ('25', 'Constantine'),
    ('26', 'Médéa'), ('27', 'Mostaganem'), ('28', "M'Sila"), ('29', 'Mascara'), ('30', 'Ouargla'),
    ('31', 'Oran'), ('32', 'El Bayadh'), ('33', 'Illizi'), ('34', 'Bordj Bou Arréridj'), ('35', 'Boumerdès'),
    ('36', 'El Tarf'), ('37', 'Tindouf'), ('38', 'Tissemsilt'), ('39', 'El Oued'), ('40', 'Khenchela'),
    ('41', 'Souk Ahras'), ('42', 'Tipaza'), ('43', 'Mila'), ('44', 'Aïn Defla'), ('45', 'Naâma'),
    ('46', 'Aïn Témouchent'), ('47', 'Ghardaïa'), ('48', 'Relizane'), ('49', "El M'Ghair"), ('50', 'El Meniaa'),
    ('51', 'Ouled Djellal'), ('52', 'Bordj Baji Mokhtar'), ('53', 'Béni Abbès'), ('54', 'Timimoun'),
    ('55', 'Touggourt'), ('56', 'Djanet'), ('57', 'In Salah'), ('58', 'In Guezzam'),
]


class TourneeOrganisateur(models.Model):
    """Tournée planifiée par un organisateur suite à une alerte admin ou de sa propre initiative."""
    STATUT_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    organisateur = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name='tournees_organisateur'
    )
    nom = models.CharField(max_length=255, verbose_name='Nom de la tournée')
    date_debut = models.DateField(verbose_name='Date de début')
    date_fin = models.DateField(verbose_name='Date de fin')
    wilaya = models.CharField(max_length=2, choices=WILAYAS_ALGERIE, blank=True, verbose_name='Wilaya')
    description = models.TextField(blank=True, verbose_name='Description / Ce qui sera fait')
    # Référence optionnelle à l'alerte admin qui a déclenché cette tournée
    alerte = models.ForeignKey(
        'veterinaire.AlerteAdmin',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tournees_organisateur'
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifiee')
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = 'Tournée Organisateur'
        verbose_name_plural = 'Tournées Organisateurs'

    def __str__(self):
        return f"Tournée Org: {self.nom} ({self.date_debut} → {self.date_fin})"
