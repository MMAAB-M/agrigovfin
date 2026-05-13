from django.urls import path
from . import views

urlpatterns = [
    # Dashboard principal vétérinaire
    path('veterinaire/', views.veterinaire_dashboard, name='veterinaire_dashboard'),

    # API RDV (côté vétérinaire)
    path('api/vet/rdvs/', views.api_rdv_list, name='api_rdv_list'),
    path('api/vet/rdv/<int:rdv_id>/confirmer/', views.api_rdv_confirmer, name='api_rdv_confirmer'),
    path('api/vet/rdv/<int:rdv_id>/refuser/', views.api_rdv_refuser, name='api_rdv_refuser'),
    path('api/vet/rdv/<int:rdv_id>/terminer/', views.api_rdv_terminer, name='api_rdv_terminer'),

    # API Messages
    path('api/vet/messages/<int:agriculteur_id>/', views.api_messages_get, name='api_messages_get'),
    path('api/vet/messages/envoyer/', views.api_messages_envoyer, name='api_messages_envoyer'),

    # API Tournées / Annonces
    path('api/vet/tournees/', views.api_tournees_list, name='api_tournees_list'),
    path('api/vet/tournees/creer/', views.api_tournee_creer, name='api_tournee_creer'),
    path('api/vet/annonces/creer/', views.api_annonce_creer, name='api_annonce_creer'),

    # API Alertes
    path('api/vet/alertes/', views.api_alertes, name='api_alertes'),

    # API Profil
    path('api/vet/profil/update/', views.api_profil_update, name='api_profil_update'),
    path('api/vet/profil/tarif/', views.api_tarif_update, name='api_tarif_update'),

    # API Agriculteur (prendre RDV / aide)
    path('api/agri/prendre-rdv/', views.api_prendre_rdv, name='api_prendre_rdv'),
    path('api/agri/mes-rdvs/', views.api_agriculteur_rdv_list, name='api_agriculteur_rdv_list'),
    path('api/agri/veterinaires/', views.api_vets_publics, name='api_vets_publics'),
    path('api/agri/tournees/', views.api_tournees_publiques, name='api_tournees_publiques'),
    path('api/agri/notifications/', views.api_notifications_agriculteur, name='api_notifications_agriculteur'),

    # API Admin
    path('api/admin/alerte/creer/', views.api_admin_creer_alerte, name='api_admin_creer_alerte'),
    path('api/admin/alerte/stock/', views.api_admin_alerte_stock, name='api_admin_alerte_stock'),
    path('api/admin/alerte/organisation/', views.api_admin_alerte_organisation, name='api_admin_alerte_organisation'),
    path('api/admin/alerte/<int:alerte_id>/modifier/', views.api_admin_alerte_modifier, name='api_admin_alerte_modifier'),
    path('api/admin/alerte/<int:alerte_id>/supprimer/', views.api_admin_alerte_supprimer, name='api_admin_alerte_supprimer'),
    path('api/admin/tournees-rdv/', views.api_admin_tournees_rdv, name='api_admin_tournees_rdv'),
]
