from django.conf import settings
from django.db import models


class Benefit(models.Model):
    title = models.CharField('Nom de l’avantage', max_length=160)
    description = models.TextField('Description')
    conditions = models.TextField('Conditions', blank=True)
    documents_required = models.TextField('Documents requis', blank=True)
    image = models.ImageField('Photo', upload_to='benefits/', blank=True, null=True)
    default_image = models.CharField(max_length=255, blank=True, help_text='Image statique par défaut, ex: images/benefits/credit.svg')
    is_active = models.BooleanField('Actif', default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_benefits')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Avantage'
        verbose_name_plural = 'Avantages'

    def __str__(self):
        return self.title

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        if self.default_image:
            return settings.STATIC_URL + self.default_image
        return settings.STATIC_URL + 'images/benefits/default.svg'


class BenefitRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'En attente'),
        (STATUS_ACCEPTED, 'Acceptée'),
        (STATUS_REJECTED, 'Refusée'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='benefit_requests')
    benefit = models.ForeignKey(Benefit, on_delete=models.CASCADE, related_name='requests')
    full_name = models.CharField('Nom complet', max_length=180)
    phone = models.CharField('Téléphone', max_length=40, blank=True)
    wilaya = models.CharField('Wilaya', max_length=120, blank=True)
    project_description = models.TextField('Description du projet', blank=True)
    document = models.FileField('Document justificatif', upload_to='benefit_requests/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_note = models.TextField('Note admin', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Demande d’avantage'
        verbose_name_plural = 'Demandes d’avantages'

    def __str__(self):
        return f'{self.user} - {self.benefit} - {self.get_status_display()}'
