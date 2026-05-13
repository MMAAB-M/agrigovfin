from django.db import models
from django.contrib.auth.models import User


class DemandeTransporteur(models.Model):
    """
    Lie une commande produits a un transporteur.
    Creee automatiquement quand le farmer confirme une commande (statut='confirmee').
    """
    STATUS_CHOICES = [
        ('en_attente_transporteur', 'En attente transporteur'),
        ('acceptee_transporteur', 'Acceptee par transporteur'),
        ('refusee_transporteur', 'Refusee par transporteur'),
        ('en_route', 'En route'),
        ('livree', 'Livree'),
    ]

    # Lien vers produits.Commande via son ID
    commande_id = models.IntegerField(unique=True)
    nom = models.CharField(max_length=255, blank=True)

    acheteur = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='livraisons_acheteur', null=True, blank=True
    )
    agriculteur = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='livraisons_agriculteur', null=True, blank=True
    )
    transporteur = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='livraisons_transporteur'
    )

    lieu_depart = models.CharField(max_length=255, blank=True)
    lieu_destination = models.CharField(max_length=255, blank=True)
    distance_km = models.FloatField(default=0)
    prix_estime = models.FloatField(default=0)
    details_course = models.TextField(blank=True)

    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='en_attente_transporteur'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Livraison commande #{self.commande_id}"
