from django.urls import path
from . import views

urlpatterns = [
    # Tableau de bord
    path('api/org/dashboard/',           views.api_org_dashboard,          name='api_org_dashboard'),

    # Alertes destinées à l'organisateur
    path('api/org/alertes/',             views.api_org_alertes,             name='api_org_alertes'),

    # Tournées de l'organisateur
    path('api/org/tournees/creer/',      views.api_org_tournee_creer,       name='api_org_tournee_creer'),
    path('api/org/mes-tournees/',        views.api_org_mes_tournees,        name='api_org_mes_tournees'),

    # Tournées publiques pour les agriculteurs
    path('api/org/tournees-publiques/',  views.api_org_tournees_publiques,  name='api_org_tournees_publiques'),
]
