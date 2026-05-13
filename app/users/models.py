from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = [
        ('agriculteur', 'Agriculteur'),
        ('acheteur', 'Acheteur'),
        ('transporteur', 'Transporteur'),
        ('autres', 'Autres'),
    ]

    OTHER_TYPE_CHOICES = [
        ('veterinaire', 'Vétérinaire'),
        ('organisation', 'Organisation'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=30)
    birth_date = models.DateField()
    birth_city = models.CharField(max_length=150)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)

    other_type = models.CharField(max_length=30, choices=OTHER_TYPE_CHOICES, blank=True, null=True)
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    certificate = models.FileField(upload_to='certificates/', blank=True, null=True)

    is_approved = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} - {self.role}"


class Farm(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='farms')
    name = models.CharField(max_length=255)
    surface = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    main_products = models.TextField(blank=True, null=True)
    wilaya = models.CharField(max_length=120, blank=True, null=True)
    lieu = models.CharField(max_length=255, blank=True, null=True)
    commune = models.CharField(max_length=255, blank=True, null=True)
    adresse = models.CharField(max_length=255, blank=True, null=True)
    culture = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, blank=True, null=True)

    def __str__(self):
        return self.name


class BuyerInfo(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='buyer_info')
    workplace = models.CharField(max_length=100, blank=True, null=True)
    establishment_name = models.CharField(max_length=255, blank=True, null=True)
    commercial_register = models.FileField(upload_to='commercial_registers/', blank=True, null=True)


class TransporterInfo(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='transporter_info')
    vehicle_name = models.CharField(max_length=255)


class VehicleDocument(models.Model):
    transporter = models.ForeignKey(TransporterInfo, on_delete=models.CASCADE, related_name='documents')
    document = models.FileField(upload_to='vehicle_documents/')