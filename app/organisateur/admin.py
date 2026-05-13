from django.contrib import admin
from .models import TourneeOrganisateur


@admin.register(TourneeOrganisateur)
class TourneeOrganisateurAdmin(admin.ModelAdmin):
    list_display = ('nom', 'organisateur', 'wilaya', 'date_debut', 'date_fin', 'statut', 'date_creation')
    list_filter = ('statut', 'wilaya')
    search_fields = ('nom', 'organisateur__user__username', 'organisateur__user__first_name')
    ordering = ('-date_creation',)
