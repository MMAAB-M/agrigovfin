import json

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from django.db.models import ProtectedError

from app.users.models import Profile
from app.livraison.models import DemandeTransporteur

from .models import Catalogue, Commande, LigneCommande, Produit, ProduitAgriculteur


def _get_profile(user):
    if not user.is_authenticated:
        return None
    try:
        return user.profile
    except Profile.DoesNotExist:
        return None


def _require_role(request, allowed_roles=None, allow_admin=False):
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return None, JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    if allow_admin and (user.is_staff or user.is_superuser):
        return None, None

    profile = _get_profile(user)
    if profile is None:
        return None, JsonResponse({'success': False, 'error': 'Profil introuvable'}, status=403)

    if allowed_roles and profile.role not in allowed_roles:
        return None, JsonResponse({'success': False, 'error': 'Accès refusé pour ce rôle'}, status=403)

    if profile.is_rejected:
        return None, JsonResponse({'success': False, 'error': 'Compte rejeté'}, status=403)

    if not profile.is_approved:
        return None, JsonResponse({'success': False, 'error': "Compte non validé par l'administration"}, status=403)

    return profile, None


def page_agriculteur(request):
    produits_disponibles = Produit.objects.all()
    return render(request, 'agriculteur.html', {'list_produits': produits_disponibles})


DEFAULT_CATALOGUES = ['Fruit', 'Legume', 'Animal', 'Cereale']


def _catalogue_names():
    names = list(Catalogue.objects.values_list('nom', flat=True).order_by('nom'))
    for item in DEFAULT_CATALOGUES:
        if item not in names:
            names.append(item)
    return names


def _serialize_catalogue(name):
    return {
        'id': name,
        'nom': name,
        'produits_count': Produit.objects.filter(categorie=name).count(),
    }


def list_catalogues(request):
    return JsonResponse([_serialize_catalogue(name) for name in _catalogue_names()], safe=False)


@csrf_exempt
def add_catalogue(request):
    _, error = _require_role(request, allow_admin=True)
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)
    nom = (data.get('nom') or '').strip()
    if not nom:
        return JsonResponse({'success': False, 'error': 'Nom du catalogue obligatoire'}, status=400)
    Catalogue.objects.get_or_create(nom=nom)
    return JsonResponse({'success': True, 'message': 'Catalogue ajouté avec succès'})


@csrf_exempt
def update_catalogue(request, catalogue_name):
    _, error = _require_role(request, allow_admin=True)
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)
    new_name = (data.get('nom') or '').strip()
    if not new_name:
        return JsonResponse({'success': False, 'error': 'Nom du catalogue obligatoire'}, status=400)
    if new_name != catalogue_name and Catalogue.objects.filter(nom=new_name).exists():
        return JsonResponse({'success': False, 'error': 'Ce catalogue existe déjà'}, status=400)
    catalogue = Catalogue.objects.filter(nom=catalogue_name).first()
    if catalogue:
        catalogue.nom = new_name
        catalogue.save(update_fields=['nom'])
    elif new_name not in DEFAULT_CATALOGUES:
        Catalogue.objects.get_or_create(nom=new_name)
    Produit.objects.filter(categorie=catalogue_name).update(categorie=new_name)
    return JsonResponse({'success': True, 'message': 'Catalogue modifié avec succès'})


@csrf_exempt
def delete_catalogue(request, catalogue_name):
    _, error = _require_role(request, allow_admin=True)
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)
    if Produit.objects.filter(categorie=catalogue_name).exists():
        return JsonResponse({'success': False, 'error': 'Impossible de supprimer un catalogue qui contient des produits'}, status=400)
    Catalogue.objects.filter(nom=catalogue_name).delete()
    return JsonResponse({'success': True, 'message': 'Catalogue supprimé avec succès'})


def _serialize_official(produit):
    return {
        'kind': 'official',
        'id': f'OFF-{produit.id}',
        'db_id': produit.id,
        'produit_id': produit.id,
        'nom': produit.nom,
        'categorie': produit.categorie,
        'prix_min': produit.prix_min,
        'prix_max': produit.prix_max,
        'prix': produit.prix_min,
        'quantite': 0,
        'statut': 'Officiel',
        'photo': produit.photo,
        'description': produit.description,
        'vendeur_nom': 'Admin',
        'agriculteur_id': None,
        'wilaya': '',
        'commune': '',
        'ferme_nom': '',
    }


def _serialize_listing(listing):
    vendeur = listing.vendeur_nom or 'Agriculteur'
    farm = None
    if listing.agriculteur:
        farm = listing.agriculteur.farms.first()
    if listing.agriculteur and listing.agriculteur.user:
        vendeur = listing.agriculteur.user.get_full_name().strip() or listing.agriculteur.user.username

    return {
        'kind': 'listing',
        'id': f'ANN-{listing.id}',
        'db_id': listing.id,
        'produit_id': listing.produit_id,
        'nom': listing.produit.nom,
        'categorie': listing.produit.categorie,
        'prix_min': listing.produit.prix_min,
        'prix_max': listing.produit.prix_max,
        'prix': listing.prix,
        'quantite': listing.quantite,
        'statut': listing.statut,
        'photo': listing.photo or listing.produit.photo,
        'description': listing.description or listing.produit.description,
        'vendeur_nom': vendeur,
        'agriculteur_id': listing.agriculteur_id,
        'wilaya': getattr(farm, 'wilaya', '') or '',
        'commune': getattr(farm, 'commune', '') or '',
        'ferme_nom': getattr(farm, 'name', '') or '',
    }


def _serialize_buyer_catalog(produit, listing=None):
    item = _serialize_official(produit)
    # If a farmer listing exists and has stock, show it with farmer info
    if listing is not None and listing.quantite > 0:
        listing_data = _serialize_listing(listing)
        item.update({
            'kind': 'buyer_catalog',
            'db_id': listing_data['db_id'],
            'prix': listing_data['prix'],
            'quantite': listing_data['quantite'],
            'photo': listing_data['photo'] or produit.photo,
            'description': listing_data['description'] or produit.description,
            'vendeur_nom': listing_data['vendeur_nom'],
            'agriculteur_id': listing_data['agriculteur_id'],
            'listing_id': listing_data['db_id'],
            'statut': listing_data['statut'],
        })
    else:
        # Admin product visible in catalog — no farmer linked yet
        item.update({
            'kind': 'buyer_catalog',
            'db_id': None,
            'prix': produit.prix_min,
            'quantite': 0,
            'vendeur_nom': 'Catalogue officiel',
            'agriculteur_id': None,
            'listing_id': None,
            'statut': 'Officiel',
        })
    return item


def _profile_payload(profile):
    if not profile:
        return {'nom': 'Non assigné', 'email': '—', 'telephone': '—', 'role': '—'}
    user = profile.user
    return {
        'id': profile.id,
        'user_id': user.id,
        'nom': user.get_full_name().strip() or user.username,
        'email': user.email or '—',
        'telephone': profile.phone or '—',
        'role': profile.role,
    }




def _estimate_course_price(distance_km):
    try:
        distance = float(distance_km or 0)
    except (TypeError, ValueError):
        distance = 0
    return round(distance * 10, 2)


def _serialize_commande(commande):
    livraison = None
    try:
        livraison = DemandeTransporteur.objects.select_related('transporteur').filter(commande_id=commande.id).first()
    except Exception:
        livraison = None

    transporteur_profile = None
    if livraison and livraison.transporteur:
        transporteur_profile = getattr(livraison.transporteur, 'profile', None)

    return {
        'id': commande.id,
        'statut': commande.statut,
        'total': commande.total,
        'adresse_livraison': commande.adresse_livraison,
        'note': commande.note,
        'date_creation': commande.date_creation.isoformat(),
        'date_modification': commande.date_modification.isoformat(),
        'acheteur': commande.acheteur.user.get_full_name().strip() or commande.acheteur.user.username,
        'agriculteur': commande.agriculteur.user.get_full_name().strip() or commande.agriculteur.user.username,
        'acheteur_info': _profile_payload(commande.acheteur),
        'agriculteur_info': _profile_payload(commande.agriculteur),
        'transporteur_info': _profile_payload(transporteur_profile),
        'livraison': {
            'status': livraison.status if livraison else 'non_assignee',
            'lieu_depart': livraison.lieu_depart if livraison else '—',
            'lieu_destination': livraison.lieu_destination if livraison else commande.adresse_livraison,
            'nom': livraison.nom if livraison else '',
        },
        'lignes': [
            {
                'id': ligne.id,
                'produit_listing_id': ligne.produit_agriculteur_id,
                'produit_nom': ligne.produit_agriculteur.produit.nom,
                'quantite': ligne.quantite,
                'prix_unitaire': ligne.prix_unitaire,
                'sous_total': ligne.sous_total,
            }
            for ligne in commande.lignes.all()
        ],
    }


def get_produits_catalog(request):
    scope = request.GET.get('scope', 'buyer')

    official_products = list(Produit.objects.all().order_by('nom'))
    listings = list(ProduitAgriculteur.objects.select_related('produit', 'agriculteur__user').prefetch_related('agriculteur__farms').order_by('-date_ajout'))

    if scope == 'official':
        return JsonResponse([_serialize_official(p) for p in official_products], safe=False)

    if scope == 'admin':
        data = [_serialize_official(p) for p in official_products]
        data.extend(_serialize_listing(p) for p in listings)
        return JsonResponse(data, safe=False)

    # RÈGLE ACHETEUR : l'acheteur voit UNIQUEMENT les publications des agriculteurs.
    # Les produits du catalogue admin (Produit) ne sont PAS visibles directement.
    # Seuls les ProduitAgriculteur actifs avec stock > 0 sont retournés.
    farmer_listings = [
        _serialize_listing(listing)
        for listing in listings
        if listing.quantite > 0
    ]
    return JsonResponse(farmer_listings, safe=False)


@csrf_exempt
def ajouter_produit_admin(request):
    _, error = _require_role(request, allow_admin=True)
    if error:
        return error

    if request.method not in ['POST', 'PUT', 'PATCH']:
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    try:
        nom = (data.get('nom') or '').strip()
        categorie = (data.get('categorie') or '').strip()
        photo = (data.get('photo') or '').strip()
        description = (data.get('description') or '').strip()
        prix_min = float(data.get('prix_min'))
        prix_max = float(data.get('prix_max'))

        if not nom:
            return JsonResponse({'success': False, 'error': 'Le nom est obligatoire'}, status=400)
        allowed = _catalogue_names()
        if categorie not in allowed:
            return JsonResponse({'success': False, 'error': 'Catalogue invalide'}, status=400)
        if prix_min < 0 or prix_max < 0:
            return JsonResponse({'success': False, 'error': 'Les prix doivent être positifs'}, status=400)
        if prix_min > prix_max:
            return JsonResponse({'success': False, 'error': 'Le prix min doit être inférieur au prix max'}, status=400)

        produit = Produit.objects.create(
            nom=nom,
            categorie=categorie,
            prix_min=prix_min,
            prix_max=prix_max,
            photo=photo,
            description=description,
        )
        return JsonResponse({'success': True, 'message': 'Produit ajouté avec succès', 'id': produit.id})
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Prix invalides'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def ajouter_produit_agriculteur(request):
    profile, error = _require_role(request, allowed_roles=['agriculteur'])
    if error:
        return error

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    try:
        produit_id = int(data.get('produit_id'))
        prix = float(data.get('prix'))
        quantite = int(data.get('quantite'))
        statut = (data.get('statut') or 'Disponible').strip()
        photo = (data.get('photo') or '').strip()
        description = (data.get('description') or '').strip()

        produit = Produit.objects.get(id=produit_id)

        if quantite <= 0:
            return JsonResponse({'success': False, 'error': 'La quantité doit être supérieure à zéro'}, status=400)
        if prix < produit.prix_min or prix > produit.prix_max:
            return JsonResponse({'success': False, 'error': f'Le prix doit être entre {produit.prix_min} et {produit.prix_max}'}, status=400)
        if statut not in [s[0] for s in ProduitAgriculteur.STATUTS]:
            statut = 'Disponible'

        vendeur_nom = request.user.get_full_name().strip() or request.user.username or 'Agriculteur'

        annonce = ProduitAgriculteur.objects.create(
            produit=produit,
            agriculteur=profile,
            vendeur_nom=vendeur_nom,
            prix=prix,
            quantite=quantite,
            statut=statut,
            photo=photo,
            description=description,
        )
        return JsonResponse({'success': True, 'message': 'Annonce agriculteur ajoutée avec succès', 'id': annonce.id})
    except Produit.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Produit introuvable'}, status=404)
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Valeurs invalides'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def get_produits_agriculteur(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    queryset = ProduitAgriculteur.objects.select_related('produit', 'agriculteur__user').order_by('-date_ajout')

    profile = _get_profile(request.user)
    if profile and profile.role == 'agriculteur':
        queryset = queryset.filter(agriculteur=profile)
    elif not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    produits = [_serialize_listing(p) for p in queryset]
    return JsonResponse(produits, safe=False)




@csrf_exempt
def modifier_produit(request, produit_kind, produit_id):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    is_admin = user.is_staff or user.is_superuser
    profile = _get_profile(user)

    if not is_admin and (profile is None or profile.role != 'agriculteur'):
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    if request.method not in ["POST", "PUT", "PATCH"]:
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    try:
        if produit_kind == 'official':
            if not is_admin:
                return JsonResponse({'success': False, 'error': 'Seul un administrateur peut modifier les produits officiels'}, status=403)
            produit = Produit.objects.get(id=produit_id)
            nom = (data.get('nom') or produit.nom).strip()
            categorie = (data.get('categorie') or produit.categorie).strip()
            photo = (data.get('photo') if data.get('photo') is not None else produit.photo).strip()
            description = (data.get('description') if data.get('description') is not None else produit.description).strip()
            prix_min = float(data.get('prix_min', produit.prix_min))
            prix_max = float(data.get('prix_max', produit.prix_max))

            if not nom:
                return JsonResponse({'success': False, 'error': 'Le nom est obligatoire'}, status=400)
            allowed = _catalogue_names()
            if categorie not in allowed:
                return JsonResponse({'success': False, 'error': 'Catalogue invalide'}, status=400)
            if prix_min < 0 or prix_max < 0 or prix_min > prix_max:
                return JsonResponse({'success': False, 'error': 'Plage de prix invalide'}, status=400)

            produit.nom = nom
            produit.categorie = categorie
            produit.prix_min = prix_min
            produit.prix_max = prix_max
            produit.photo = photo
            produit.description = description
            produit.save()
            return JsonResponse({'success': True, 'message': 'Produit officiel modifié avec succès'})

        if produit_kind == 'listing':
            annonce = ProduitAgriculteur.objects.select_related('produit').get(id=produit_id)

            # Un agriculteur ne peut modifier que ses propres annonces
            if not is_admin and annonce.agriculteur_id != profile.id:
                return JsonResponse({'success': False, 'error': 'Vous ne pouvez modifier que vos propres annonces'}, status=403)

            prix = float(data.get('prix', annonce.prix))
            quantite = int(data.get('quantite', annonce.quantite))
            statut = (data.get('statut') or annonce.statut).strip()
            photo = (data.get('photo') if data.get('photo') is not None else annonce.photo).strip()
            description = (data.get('description') if data.get('description') is not None else annonce.description).strip()

            if quantite < 0:
                return JsonResponse({'success': False, 'error': 'La quantité doit être positive'}, status=400)
            if prix < annonce.produit.prix_min or prix > annonce.produit.prix_max:
                return JsonResponse({'success': False, 'error': f'Le prix doit être entre {annonce.produit.prix_min} et {annonce.produit.prix_max}'}, status=400)
            if statut not in [s[0] for s in ProduitAgriculteur.STATUTS]:
                return JsonResponse({'success': False, 'error': 'Statut invalide'}, status=400)

            annonce.prix = prix
            annonce.quantite = quantite
            annonce.statut = statut
            annonce.photo = photo
            annonce.description = description
            annonce.save()
            return JsonResponse({'success': True, 'message': 'Produit agriculteur modifié avec succès'})

        return JsonResponse({'success': False, 'error': 'Type de produit invalide'}, status=400)
    except Produit.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Produit introuvable'}, status=404)
    except ProduitAgriculteur.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Annonce introuvable'}, status=404)
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Valeurs invalides'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def supprimer_produit(request, produit_kind, produit_id):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    is_admin = user.is_staff or user.is_superuser
    profile = _get_profile(user)

    if not is_admin and (profile is None or profile.role != 'agriculteur'):
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    if request.method not in ['POST', 'DELETE']:
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    try:
        if produit_kind == 'official':
            if not is_admin:
                return JsonResponse({'success': False, 'error': 'Seul un administrateur peut supprimer les produits officiels'}, status=403)
            produit = Produit.objects.get(id=produit_id)
            produit.delete()
            return JsonResponse({'success': True, 'message': 'Produit officiel supprimé avec succès'})

        if produit_kind == 'listing':
            annonce = ProduitAgriculteur.objects.get(id=produit_id)

            # Un agriculteur ne peut supprimer que ses propres annonces
            if not is_admin and annonce.agriculteur_id != profile.id:
                return JsonResponse({'success': False, 'error': 'Vous ne pouvez supprimer que vos propres annonces'}, status=403)

            annonce.delete()
            return JsonResponse({'success': True, 'message': 'Produit agriculteur supprimé avec succès'})

        return JsonResponse({'success': False, 'error': 'Type de produit invalide'}, status=400)
    except (Produit.DoesNotExist, ProduitAgriculteur.DoesNotExist):
        return JsonResponse({'success': False, 'error': 'Produit introuvable'}, status=404)
    except ProtectedError:
        return JsonResponse({'success': False, 'error': 'Suppression impossible: produit lié à une commande'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def creer_commande(request):
    acheteur, error = _require_role(request, allowed_roles=['acheteur'])
    if error:
        return error

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    items = data.get('items') or []
    adresse = (data.get('adresse_livraison') or '').strip()
    note = (data.get('note') or '').strip()

    if not adresse:
        return JsonResponse({'success': False, 'error': "L'adresse de livraison est obligatoire"}, status=400)
    if not isinstance(items, list) or not items:
        return JsonResponse({'success': False, 'error': 'Ajoutez au moins un produit à la commande'}, status=400)

    listing_ids = []
    quantities = {}
    for item in items:
        try:
            listing_id = int(item.get('listing_id'))
            quantite = int(item.get('quantite'))
        except (TypeError, ValueError, AttributeError):
            return JsonResponse({'success': False, 'error': 'Contenu de commande invalide'}, status=400)

        if quantite <= 0:
            return JsonResponse({'success': False, 'error': 'Chaque quantité doit être supérieure à zéro'}, status=400)

        listing_ids.append(listing_id)
        quantities[listing_id] = quantities.get(listing_id, 0) + quantite

    unique_listing_ids = list(set(listing_ids))
    listings = list(
        ProduitAgriculteur.objects.select_related('produit', 'agriculteur', 'agriculteur__user').filter(id__in=unique_listing_ids)
    )
    if len(listings) != len(unique_listing_ids):
        return JsonResponse({'success': False, 'error': 'Un ou plusieurs produits sont introuvables'}, status=404)

    agriculteur_ids = {listing.agriculteur_id for listing in listings}
    if None in agriculteur_ids:
        return JsonResponse({'success': False, 'error': 'Certaines annonces ne sont pas liées à un agriculteur'}, status=400)
    if len(agriculteur_ids) != 1:
        return JsonResponse({'success': False, 'error': 'Une commande doit concerner un seul agriculteur'}, status=400)

    for listing in listings:
        qty = quantities[listing.id]
        if listing.quantite < qty:
            return JsonResponse({'success': False, 'error': f'Stock insuffisant pour {listing.produit.nom}'}, status=400)
        if listing.statut == 'Rupture':
            return JsonResponse({'success': False, 'error': f'{listing.produit.nom} est en rupture'}, status=400)

    with transaction.atomic():
        agriculteur = listings[0].agriculteur
        commande = Commande.objects.create(
            acheteur=acheteur,
            agriculteur=agriculteur,
            adresse_livraison=adresse,
            note=note,
        )

        total = 0
        for listing in listings:
            qty = quantities[listing.id]
            ligne = LigneCommande.objects.create(
                commande=commande,
                produit_agriculteur=listing,
                quantite=qty,
                prix_unitaire=listing.prix,
            )
            total += ligne.sous_total
            listing.quantite -= qty
            if listing.quantite <= 0:
                listing.quantite = 0
                listing.statut = 'Rupture'
            elif listing.quantite <= 5:
                listing.statut = 'Stock faible'
            else:
                listing.statut = 'Disponible'
            listing.save(update_fields=['quantite', 'statut'])

        commande.total = total
        commande.save(update_fields=['total'])

    commande = Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit').get(id=commande.id)
    return JsonResponse({'success': True, 'message': 'Commande créée avec succès', 'commande': _serialize_commande(commande)})


def liste_commandes(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    queryset = Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit')
    user = request.user
    profile = _get_profile(user)

    if user.is_staff or user.is_superuser:
        commandes = queryset
    elif profile and profile.role == 'acheteur':
        commandes = queryset.filter(acheteur=profile)
    elif profile and profile.role == 'agriculteur':
        direct_ids = list(queryset.filter(agriculteur=profile).values_list('id', flat=True))
        line_ids = list(queryset.filter(lignes__produit_agriculteur__agriculteur=profile).values_list('id', flat=True))
        combined_ids = sorted(set(direct_ids + line_ids))
        commandes = queryset.filter(id__in=combined_ids).distinct() if combined_ids else queryset.none()
    else:
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    return JsonResponse([_serialize_commande(cmd) for cmd in commandes.distinct().order_by('-date_creation')], safe=False)


@csrf_exempt
def changer_statut_commande(request, commande_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    nouveau_statut = (data.get('statut') or '').strip()
    statuts_valides = [s[0] for s in Commande.STATUTS]
    if nouveau_statut not in statuts_valides:
        return JsonResponse({'success': False, 'error': 'Statut invalide'}, status=400)

    commande = get_object_or_404(
        Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit'),
        id=commande_id,
    )

    user = request.user
    profile = _get_profile(user)
    allowed = False

    if user.is_staff or user.is_superuser:
        allowed = True
    elif profile and profile.role == 'agriculteur':
        owns_commande = commande.agriculteur_id == profile.id
        owns_by_line = commande.lignes.filter(produit_agriculteur__agriculteur=profile).exists()
        allowed_statuses = ['confirmee', 'refusee', 'en_preparation', 'expediee', 'livree']
        allowed = (owns_commande or owns_by_line) and (nouveau_statut in allowed_statuses)
    elif profile and profile.role == 'acheteur' and commande.acheteur_id == profile.id:
        allowed = ((nouveau_statut == 'annulee' and commande.statut == 'en_attente') or (nouveau_statut == 'livree' and commande.statut in ['expediee', 'livree']))

    if not allowed:
        return JsonResponse({"success": False, "error": "Vous n\'êtes pas autorisé à modifier cette commande"}, status=403)

    commande.statut = nouveau_statut
    commande.save(update_fields=['statut', 'date_modification'])

    return JsonResponse({'success': True, 'message': 'Statut mis à jour', 'commande': _serialize_commande(commande)})



@csrf_exempt
def demander_course_commande(request, commande_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    profile = _get_profile(request.user)
    commande = get_object_or_404(
        Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit'),
        id=commande_id,
    )

    if not (request.user.is_staff or request.user.is_superuser or (profile and profile.role == 'agriculteur' and commande.agriculteur_id == profile.id)):
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    if commande.statut not in ['en_preparation', 'confirmee', 'en_attente_transporteur']:
        return JsonResponse({'success': False, 'error': 'La course peut être demandée seulement après acceptation / préparation.'}, status=400)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide'}, status=400)

    lieu_depart = (data.get('lieu_depart') or data.get('ferme') or '').strip()
    lieu_destination = (data.get('lieu_destination') or commande.adresse_livraison or '').strip()
    try:
        distance_km = float(data.get('distance_km') or 0)
    except (TypeError, ValueError):
        distance_km = 0
    prix_estime = _estimate_course_price(distance_km)

    details = {
        'commande': commande.id,
        'acheteur': commande.acheteur.user.get_full_name().strip() or commande.acheteur.user.username,
        'telephone_acheteur': getattr(commande.acheteur, 'phone', '') or '',
        'total_commande': commande.total,
        'produits': [
            {'nom': l.produit_agriculteur.produit.nom, 'quantite': l.quantite, 'sous_total': l.sous_total}
            for l in commande.lignes.all()
        ],
        'note': commande.note or '',
    }

    livraison, _ = DemandeTransporteur.objects.update_or_create(
        commande_id=commande.id,
        defaults={
            'nom': f'Course CMD-{commande.id}',
            'acheteur': commande.acheteur.user,
            'agriculteur': commande.agriculteur.user,
            'lieu_depart': lieu_depart or getattr(commande.agriculteur, 'birth_city', '') or '',
            'lieu_destination': lieu_destination,
            'distance_km': distance_km,
            'prix_estime': prix_estime,
            'details_course': json.dumps(details, ensure_ascii=False),
            'status': 'en_attente_transporteur',
            'transporteur': None,
        }
    )

    commande.statut = 'en_attente_transporteur'
    commande.save(update_fields=['statut', 'date_modification'])

    commande = Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit').get(id=commande.id)
    return JsonResponse({
        'success': True,
        'message': 'Demande de course envoyée aux transporteurs.',
        'prix_estime': prix_estime,
        'distance_km': distance_km,
        'livraison_id': livraison.id,
        'commande': _serialize_commande(commande),
    })


@csrf_exempt
def annuler_course_commande(request, commande_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentification requise'}, status=401)

    profile = _get_profile(request.user)
    commande = get_object_or_404(Commande, id=commande_id)

    if not (request.user.is_staff or request.user.is_superuser or (profile and profile.role == 'agriculteur' and commande.agriculteur_id == profile.id)):
        return JsonResponse({'success': False, 'error': 'Accès refusé'}, status=403)

    livraison = DemandeTransporteur.objects.filter(commande_id=commande.id).first()
    if livraison:
        livraison.status = 'refusee_transporteur'
        livraison.save(update_fields=['status'])

    if commande.statut in ['en_attente_transporteur', 'expediee']:
        commande.statut = 'en_preparation'
        commande.save(update_fields=['statut', 'date_modification'])

    commande = Commande.objects.select_related('acheteur__user', 'agriculteur__user').prefetch_related('lignes__produit_agriculteur__produit').get(id=commande.id)
    return JsonResponse({'success': True, 'message': 'Course annulée.', 'commande': _serialize_commande(commande)})
