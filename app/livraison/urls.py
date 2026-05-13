from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.stats_transporteur, name='stats_transporteur'),
    # Missions disponibles pour le transporteur
    path('missions/', views.missions_disponibles, name='missions_disponibles'),
    path('missions/<int:commande_id>/accepter/', views.accepter_mission, name='accepter_mission'),
    path('missions/<int:commande_id>/refuser/', views.refuser_mission, name='refuser_mission'),

    # Mes livraisons en cours
    path('livraisons/', views.mes_livraisons, name='mes_livraisons'),
    path('livraisons/<int:commande_id>/livree/', views.marquer_livree, name='marquer_livree'),

    # Historique
    path('historique/', views.historique_livraisons, name='historique_livraisons'),
]