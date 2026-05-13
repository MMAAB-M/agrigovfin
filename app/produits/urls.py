from django.urls import path
from .views import (
    page_agriculteur,
    get_produits_catalog,
    list_catalogues,
    add_catalogue,
    update_catalogue,
    delete_catalogue,
    ajouter_produit_admin,
    ajouter_produit_agriculteur,
    get_produits_agriculteur,
    creer_commande,
    liste_commandes,
    changer_statut_commande,
    demander_course_commande,
    annuler_course_commande,
    modifier_produit,
    supprimer_produit,
)

urlpatterns = [
    path('', page_agriculteur, name='page_agriculteur'),

    path('catalog/', get_produits_catalog, name='get_produits_catalog'),
    path('catalogues/', list_catalogues, name='list_catalogues'),
    path('catalogues/ajouter/', add_catalogue, name='add_catalogue'),
    path('catalogues/<str:catalogue_name>/modifier/', update_catalogue, name='update_catalogue'),
    path('catalogues/<str:catalogue_name>/supprimer/', delete_catalogue, name='delete_catalogue'),
    path('ajouter/', ajouter_produit_admin, name='ajouter_produit_admin'),

    path('agriculteur/ajouter/', ajouter_produit_agriculteur, name='ajouter_produit_agriculteur'),
    path('agriculteur/liste/', get_produits_agriculteur, name='get_produits_agriculteur'),

    # Compatibilite avec les endpoints utilises par linterface agriculteur
    path('agriculteur/<int:produit_id>/modifier/', modifier_produit, {'produit_kind': 'listing'}, name='modifier_produit_agriculteur_compat'),
    path('agriculteur/modifier/<int:produit_id>/', modifier_produit, {'produit_kind': 'listing'}, name='modifier_produit_agriculteur_compat_alt'),
    path('agriculteur/<int:produit_id>/supprimer/', supprimer_produit, {'produit_kind': 'listing'}, name='supprimer_produit_agriculteur_compat'),
    path('agriculteur/supprimer/<int:produit_id>/', supprimer_produit, {'produit_kind': 'listing'}, name='supprimer_produit_agriculteur_compat_alt'),

    path('commandes/creer/', creer_commande, name='creer_commande'),
    path('commandes/', liste_commandes, name='liste_commandes'),
    path('commandes/<int:commande_id>/statut/', changer_statut_commande, name='changer_statut_commande'),
    path('commandes/<int:commande_id>/course/demander/', demander_course_commande, name='demander_course_commande'),
    path('commandes/<int:commande_id>/course/annuler/', annuler_course_commande, name='annuler_course_commande'),
    path('produits/<str:produit_kind>/<int:produit_id>/modifier/', modifier_produit, name='modifier_produit'),
    path('produits/<str:produit_kind>/<int:produit_id>/supprimer/', supprimer_produit, name='supprimer_produit'),
]
