from django.contrib import admin
from .models import Produit, ProduitAgriculteur, Commande, LigneCommande


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'prix_min', 'prix_max']


@admin.register(ProduitAgriculteur)
class ProduitAgriculteurAdmin(admin.ModelAdmin):
    list_display = ['produit', 'agriculteur', 'vendeur_nom', 'prix', 'quantite', 'statut']
    list_filter = ['statut', 'produit__categorie']
    search_fields = ['produit__nom', 'vendeur_nom', 'agriculteur__user__username']


class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0
    readonly_fields = ['produit_agriculteur', 'quantite', 'prix_unitaire', 'sous_total']


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['id', 'acheteur', 'agriculteur', 'statut', 'total', 'date_creation']
    list_filter = ['statut', 'date_creation']
    search_fields = ['acheteur__user__username', 'agriculteur__user__username']
    inlines = [LigneCommandeInline]
