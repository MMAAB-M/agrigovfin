from django.contrib import admin
from .models import VeterinaireProfile, RendezVous, MessageVet, TourneeVeterinaire, AlerteAdmin, EvaluationVet


@admin.register(AlerteAdmin)
class AlerteAdminAdmin(admin.ModelAdmin):
    list_display = ['titre', 'type_alerte', 'active', 'date_creation', 'creee_par']
    list_filter = ['type_alerte', 'active']
    search_fields = ['titre', 'message']
    ordering = ['-date_creation']


@admin.register(TourneeVeterinaire)
class TourneeVeterinaireAdmin(admin.ModelAdmin):
    list_display = ['titre', 'veterinaire', 'date_debut', 'date_fin', 'statut', 'alerte_admin']
    list_filter = ['statut', 'alerte_admin']
    search_fields = ['titre', 'description']
    ordering = ['-date_creation']


@admin.register(RendezVous)
class RendezVousAdmin(admin.ModelAdmin):
    list_display = ['id', 'agriculteur', 'veterinaire', 'type_visite', 'date_rdv', 'heure_rdv', 'statut']
    list_filter = ['statut', 'type_visite']
    search_fields = ['agriculteur__user__username', 'veterinaire__profile__user__username']
    ordering = ['-date_rdv']


@admin.register(VeterinaireProfile)
class VeterinaireProfileAdmin(admin.ModelAdmin):
    list_display = ['profile', 'specialite', 'wilaya_principale', 'disponible', 'note_moyenne', 'total_consultations']
    list_filter = ['disponible', 'wilaya_principale']


@admin.register(MessageVet)
class MessageVetAdmin(admin.ModelAdmin):
    list_display = ['expediteur', 'destinataire', 'date_envoi', 'lu']
    list_filter = ['lu']


@admin.register(EvaluationVet)
class EvaluationVetAdmin(admin.ModelAdmin):
    list_display = ['agriculteur', 'veterinaire', 'note', 'date']
    list_filter = ['note']
