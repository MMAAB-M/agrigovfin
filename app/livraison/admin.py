from django.contrib import admin
from .models import DemandeTransporteur

@admin.register(DemandeTransporteur)
class DemandeTransporteurAdmin(admin.ModelAdmin):
    list_display = ('id', 'commande_id', 'nom', 'status', 'lieu_depart', 'lieu_destination', 'transporteur', 'created_at')
    list_filter = ('status',)
    search_fields = ('nom', 'lieu_depart', 'lieu_destination')