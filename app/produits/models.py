from django.conf import settings
from django.db import models

from app.users.models import Profile


class Catalogue(models.Model):
    nom = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Produit(models.Model):
    """Produit officiel créé par l'admin."""
    nom = models.CharField(max_length=100)
    categorie = models.CharField(max_length=100)
    prix_min = models.FloatField()
    prix_max = models.FloatField()
    photo = models.URLField(blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.nom


class ProduitAgriculteur(models.Model):
    """Annonce publiée par un agriculteur à partir d'un produit officiel."""
    STATUTS = [
        ('Disponible', 'Disponible'),
        ('Stock faible', 'Stock faible'),
        ('Rupture', 'Rupture'),
    ]

    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='annonces')
    agriculteur = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='produits_agriculteur',
        null=True,
        blank=True,
    )
    vendeur_nom = models.CharField(max_length=150, blank=True, default='Agriculteur')
    prix = models.FloatField()
    quantite = models.IntegerField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='Disponible')
    photo = models.URLField(blank=True)
    description = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.produit.nom} - {self.prix} DA"


class Commande(models.Model):
    STATUTS = [
        ('en_attente', 'En attente'),
        ('confirmee', 'Confirmée'),
        ('refusee', 'Refusée'),
        ('en_preparation', 'En préparation'),
        ('en_attente_transporteur', 'En attente transporteur'),
        ('expediee', 'En livraison'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]

    acheteur = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='commandes_acheteur',
    )
    agriculteur = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='commandes_agriculteur',
    )
    statut = models.CharField(max_length=30, choices=STATUTS, default='en_attente')
    adresse_livraison = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    total = models.FloatField(default=0)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Commande #{self.id} - {self.acheteur.user.email}"


class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='lignes')
    produit_agriculteur = models.ForeignKey(
        ProduitAgriculteur,
        on_delete=models.PROTECT,
        related_name='lignes_commande',
    )
    quantite = models.PositiveIntegerField()
    prix_unitaire = models.FloatField()
    sous_total = models.FloatField(default=0)

    def save(self, *args, **kwargs):
        self.sous_total = float(self.quantite) * float(self.prix_unitaire)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.produit_agriculteur.produit.nom} x {self.quantite}"
