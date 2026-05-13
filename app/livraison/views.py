from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from app.produits.models import Commande as CommandeProduit
from app.users.models import Profile
from .models import DemandeTransporteur


def _get_profile(user):
    try:
        return user.profile
    except Exception:
        return None


def _serialize_commande_pour_transporteur(commande):
    livraison = DemandeTransporteur.objects.select_related('transporteur').filter(commande_id=commande.id).first()
    transporteur_nom = ''
    transporteur_phone = ''
    if livraison and livraison.transporteur:
        transporteur_nom = livraison.transporteur.get_full_name().strip() or livraison.transporteur.username
        transporteur_phone = getattr(getattr(livraison.transporteur, 'profile', None), 'phone', '') or ''

    # Contact acheteur
    acheteur_profile = commande.acheteur
    acheteur_phone = getattr(acheteur_profile, 'phone', '') or ''
    acheteur_email = acheteur_profile.user.email or '' if acheteur_profile else ''

    # Contact agriculteur
    agriculteur_profile = commande.agriculteur
    agriculteur_phone = getattr(agriculteur_profile, 'phone', '') or ''
    agriculteur_email = agriculteur_profile.user.email or '' if agriculteur_profile else ''

    return {
        'id': commande.id,
        'statut': commande.statut,
        'total': commande.total,
        'lieu_depart': (livraison.lieu_depart if livraison else '') or commande.agriculteur.birth_city or '',
        'lieu_destination': (livraison.lieu_destination if livraison else '') or commande.adresse_livraison,
        'distance_km': livraison.distance_km if livraison else 0,
        'prix_estime': livraison.prix_estime if livraison else 0,
        'prix_course': livraison.prix_estime if livraison else 0,
        'livraison_status': livraison.status if livraison else 'non_assignee',
        'transporteur': transporteur_nom,
        'transporteur_phone': transporteur_phone,
        'acheteur': commande.acheteur.user.get_full_name().strip() or commande.acheteur.user.username,
        'acheteur_phone': acheteur_phone,
        'acheteur_email': acheteur_email,
        'agriculteur': commande.agriculteur.user.get_full_name().strip() or commande.agriculteur.user.username,
        'agriculteur_phone': agriculteur_phone,
        'agriculteur_email': agriculteur_email,
        'note': commande.note or '',
        'date_creation': commande.date_creation.strftime('%d/%m/%Y %H:%M'),
        'lignes': [
            {
                'produit': ligne.produit_agriculteur.produit.nom,
                'quantite': ligne.quantite,
                'prix_unitaire': ligne.prix_unitaire,
                'sous_total': ligne.sous_total,
            }
            for ligne in commande.lignes.all()
        ],
    }


# ============================================================
# MISSIONS DISPONIBLES  GET /livraison/missions/
# ============================================================

@login_required
def missions_disponibles(request):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse. Role transporteur requis.'}, status=403)

    demande_ids = DemandeTransporteur.objects.filter(
        status='en_attente_transporteur',
        transporteur__isnull=True
    ).values_list('commande_id', flat=True)

    commandes = CommandeProduit.objects.filter(
        id__in=demande_ids
    ).select_related(
        'acheteur__user', 'agriculteur__user'
    ).prefetch_related('lignes__produit_agriculteur__produit').order_by('-date_creation')

    data = [_serialize_commande_pour_transporteur(c) for c in commandes]
    return JsonResponse({'success': True, 'commandes': data})


# ============================================================
# ACCEPTER UNE MISSION  POST /livraison/missions/<id>/accepter/
# ============================================================

@csrf_exempt
@login_required
@require_POST
def accepter_mission(request, commande_id):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    commande = get_object_or_404(
        CommandeProduit.objects.select_related('acheteur__user', 'agriculteur__user'),
        id=commande_id
    )

    livraison = get_object_or_404(
        DemandeTransporteur,
        commande_id=commande.id,
        status='en_attente_transporteur',
        transporteur__isnull=True
    )

    livraison.status = 'acceptee_transporteur'
    livraison.transporteur = request.user
    livraison.save()

    # Mettre a jour la commande et notifier agriculteur via API commandes
    commande.statut = 'expediee'
    commande.save(update_fields=['statut', 'date_modification'])

    return JsonResponse({'success': True, 'message': 'Mission acceptee. Livraison demarree.'})





@csrf_exempt
@login_required
@require_POST
def refuser_mission(request, commande_id):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    livraison = get_object_or_404(
        DemandeTransporteur,
        commande_id=commande_id,
        status='en_attente_transporteur',
        transporteur__isnull=True
    )
    livraison.status = 'refusee_transporteur'
    livraison.transporteur = request.user
    livraison.save(update_fields=['status', 'transporteur'])
    return JsonResponse({'success': True, 'message': 'Mission refusee.'})


# ============================================================
# MES LIVRAISONS  GET /livraison/livraisons/
# ============================================================

@login_required
def mes_livraisons(request):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    mes_demandes = DemandeTransporteur.objects.filter(
        transporteur=request.user,
        status__in=['acceptee_transporteur', 'en_route']
    ).values_list('commande_id', flat=True)

    commandes = CommandeProduit.objects.filter(
        id__in=mes_demandes
    ).select_related(
        'acheteur__user', 'agriculteur__user'
    ).prefetch_related('lignes__produit_agriculteur__produit').order_by('-date_creation')

    data = [_serialize_commande_pour_transporteur(c) for c in commandes]
    return JsonResponse({'success': True, 'commandes': data})


# ============================================================
# MARQUER COMME LIVREE  POST /livraison/livraisons/<id>/livree/
# ============================================================

@csrf_exempt
@login_required
@require_POST
def marquer_livree(request, commande_id):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    livraison = get_object_or_404(
        DemandeTransporteur,
        commande_id=commande_id,
        transporteur=request.user
    )

    livraison.status = 'livree'
    livraison.save()

    CommandeProduit.objects.filter(id=commande_id).update(statut='livree')

    return JsonResponse({'success': True, 'message': 'Commande marquee comme livree.'})


# ============================================================
# HISTORIQUE  GET /livraison/historique/
# ============================================================

@login_required
def historique_livraisons(request):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    mes_demandes = DemandeTransporteur.objects.filter(
        transporteur=request.user,
        status__in=['livree', 'refusee_transporteur']
    ).values_list('commande_id', flat=True)

    commandes = CommandeProduit.objects.filter(
        id__in=mes_demandes
    ).select_related(
        'acheteur__user', 'agriculteur__user'
    ).prefetch_related('lignes__produit_agriculteur__produit').order_by('-date_creation')

    data = [_serialize_commande_pour_transporteur(c) for c in commandes]
    return JsonResponse({'success': True, 'commandes': data})


# ============================================================
# STATS DASHBOARD  GET /livraison/stats/
# ============================================================

@login_required
def stats_transporteur(request):
    profile = _get_profile(request.user)
    if profile is None or profile.role != 'transporteur':
        return JsonResponse({'success': False, 'error': 'Acces refuse.'}, status=403)

    missions_disponibles = DemandeTransporteur.objects.filter(
        status='en_attente_transporteur',
        transporteur__isnull=True
    ).count()

    en_cours = DemandeTransporteur.objects.filter(
        transporteur=request.user,
        status__in=['acceptee_transporteur', 'en_route']
    ).count()

    livrees = DemandeTransporteur.objects.filter(
        transporteur=request.user,
        status='livree'
    ).count()

    return JsonResponse({
        'success': True,
        'stats': {
            'missions_disponibles': missions_disponibles,
            'en_cours': en_cours,
            'livrees': livrees,
        }
    })


# ============================================================
# ADMIN  GET /livraison/admin/livraisons/
# ============================================================

@login_required
def toutes_livraisons(request):
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'error': 'Acces admin requis'}, status=403)

    livraisons = DemandeTransporteur.objects.select_related(
        'acheteur', 'agriculteur', 'transporteur'
    ).order_by('-created_at')

    data = [{
        'id': lv.id,
        'commande_id': lv.commande_id,
        'nom': lv.nom,
        'status': lv.status,
        'depart': lv.lieu_depart,
        'destination': lv.lieu_destination,
        'acheteur': lv.acheteur.get_full_name() if lv.acheteur else None,
        'agriculteur': lv.agriculteur.get_full_name() if lv.agriculteur else None,
        'transporteur': lv.transporteur.get_full_name() if lv.transporteur else None,
    } for lv in livraisons]

    return JsonResponse(data, safe=False)