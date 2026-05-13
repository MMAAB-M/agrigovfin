import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from functools import wraps

from app.users.models import Profile
from app.veterinaire.models import AlerteAdmin, WILAYAS_ALGERIE
from .models import TourneeOrganisateur

logger = logging.getLogger(__name__)


def api_login_required(view_func):
    """Login required qui retourne JSON 401 au lieu d'une redirection."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Non authentifié'}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


def _get_profile(request):
    """Retourne le profil de l'utilisateur connecté ou None."""
    try:
        return Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        return None


def _is_organisateur_or_admin(request):
    """Vérifie que l'utilisateur est organisateur ou admin."""
    if request.user.is_staff or request.user.is_superuser:
        return True
    profile = _get_profile(request)
    if not profile:
        return False
    return profile.role == 'autres' and profile.other_type == 'organisation'


# ══════════════════════════════════════════════════
#  API ORGANISATEUR — Alertes admin pour l'organisateur
# ══════════════════════════════════════════════════
@api_login_required
def api_org_alertes(request):
    """Retourne les alertes admin destinées aux organisateurs."""
    wilayas_dict = dict(WILAYAS_ALGERIE)
    data = []
    try:
        # Essayer d'abord avec le filtre destinataire_type (migration appliquée)
        alertes = list(AlerteAdmin.objects.filter(
            active=True,
            destinataire_type__in=['organisateur', 'tous']
        ).order_by('-date_creation'))
    except Exception:
        # Fallback si la colonne n'existe pas encore en base : retourner toutes les actives
        try:
            alertes = list(AlerteAdmin.objects.filter(active=True).order_by('-date_creation'))
        except Exception as e:
            logger.error(f"api_org_alertes error: {e}")
            return JsonResponse({'alertes': []})

    for a in alertes:
        try:
            dest_type = getattr(a, 'destinataire_type', 'veterinaire')
        except Exception:
            dest_type = 'veterinaire'
        data.append({
            'id': a.id,
            'titre': a.titre,
            'message': a.message,
            'type_alerte': a.type_alerte,
            'type': a.get_type_alerte_display(),
            'type_label': a.get_type_alerte_display(),
            'active': a.active,
            'destinataire_type': dest_type,
            'wilayas': a.wilayas_cibles,
            'wilayas_noms': [wilayas_dict.get(w, w) for w in a.wilayas_cibles],
            'date': a.date_creation.strftime('%d/%m/%Y'),
        })
    return JsonResponse({'alertes': data})


# ══════════════════════════════════════════════════
#  API ORGANISATEUR — Stats pour le tableau de bord
# ══════════════════════════════════════════════════
@api_login_required
def api_org_dashboard(request):
    """Retourne les stats pour le tableau de bord de l'organisateur."""
    profile = _get_profile(request)
    if not profile:
        return JsonResponse({'error': 'Profil introuvable'}, status=404)

    wilayas_dict = dict(WILAYAS_ALGERIE)

    # Alertes destinées à l'organisateur
    alertes_count = 0
    try:
        alertes_count = AlerteAdmin.objects.filter(
            active=True,
            destinataire_type__in=['organisateur', 'tous']
        ).count()
    except Exception:
        try:
            alertes_count = AlerteAdmin.objects.filter(active=True).count()
        except Exception:
            alertes_count = 0

    # Tournées de l'organisateur
    try:
        tournees_total = TourneeOrganisateur.objects.filter(organisateur=profile).count()
        tournees_actives = TourneeOrganisateur.objects.filter(
            organisateur=profile, statut='en_cours'
        ).count()
        tournees_planif = TourneeOrganisateur.objects.filter(
            organisateur=profile, statut='planifiee'
        ).count()
        # Dernières tournées
        dernières = list(TourneeOrganisateur.objects.filter(
            organisateur=profile
        ).order_by('-date_creation')[:3])
        dernieres_data = [{
            'id': t.id, 'nom': t.nom,
            'wilaya_nom': wilayas_dict.get(t.wilaya, t.wilaya),
            'statut': t.statut, 'statut_label': t.get_statut_display(),
            'date_debut': str(t.date_debut), 'date_fin': str(t.date_fin),
        } for t in dernières]
    except Exception as e:
        logger.error(f"api_org_dashboard tournees error: {e}")
        tournees_total = tournees_actives = tournees_planif = 0
        dernieres_data = []

    return JsonResponse({
        'ok': True,
        'stats': {
            'alertes_actives': alertes_count,
            'tournees_total': tournees_total,
            'tournees_actives': tournees_actives,
            'tournees_planifiees': tournees_planif,
        },
        'dernieres_tournees': dernieres_data,
        'utilisateur': {
            'nom': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
        }
    })


# ══════════════════════════════════════════════════
#  API ORGANISATEUR — Créer une tournée
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_org_tournee_creer(request):
    """Crée une tournée pour l'organisateur connecté (ou admin)."""
    profile = _get_profile(request)
    if not profile:
        return JsonResponse({'error': 'Profil introuvable'}, status=404)

    # Autoriser : organisateurs ET admins
    if not _is_organisateur_or_admin(request):
        return JsonResponse({'error': 'Accès réservé aux organisateurs'}, status=403)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Données invalides'}, status=400)

    nom = data.get('nom', '').strip()
    date_debut = data.get('date_debut', '')
    date_fin = data.get('date_fin', '')
    wilaya = data.get('wilaya', '')
    description = data.get('description', '').strip()
    alerte_id = data.get('alerte_id')

    if not nom:
        return JsonResponse({'error': 'Le nom de la tournée est obligatoire.'}, status=400)
    if not date_debut:
        return JsonResponse({'error': 'La date de début est obligatoire.'}, status=400)
    if not date_fin:
        return JsonResponse({'error': 'La date de fin est obligatoire.'}, status=400)

    alerte = None
    if alerte_id:
        try:
            # Essayer avec destinataire_type d'abord
            alerte = AlerteAdmin.objects.get(
                pk=alerte_id,
                destinataire_type__in=['organisateur', 'tous']
            )
        except Exception:
            try:
                # Fallback sans filtre destinataire_type
                alerte = AlerteAdmin.objects.get(pk=alerte_id)
            except AlerteAdmin.DoesNotExist:
                alerte = None

    tournee = TourneeOrganisateur.objects.create(
        organisateur=profile,
        nom=nom,
        date_debut=date_debut,
        date_fin=date_fin,
        wilaya=wilaya,
        description=description,
        alerte=alerte,
        statut='planifiee',
    )

    wilayas_dict = dict(WILAYAS_ALGERIE)
    return JsonResponse({
        'ok': True,
        'id': tournee.id,
        'nom': tournee.nom,
        'wilaya_nom': wilayas_dict.get(tournee.wilaya, tournee.wilaya),
        'statut': tournee.statut,
        'statut_label': tournee.get_statut_display(),
        'date_debut': str(tournee.date_debut),
        'date_fin': str(tournee.date_fin),
        'date_creation': tournee.date_creation.strftime('%d/%m/%Y'),
        'message': 'Tournée planifiée avec succès.',
    })


# ══════════════════════════════════════════════════
#  API ORGANISATEUR — Mes tournées (liste)
# ══════════════════════════════════════════════════
@api_login_required
def api_org_mes_tournees(request):
    """Retourne la liste des tournées de l'organisateur connecté."""
    profile = _get_profile(request)
    if not profile:
        return JsonResponse({'error': 'Profil introuvable'}, status=404)

    wilayas_dict = dict(WILAYAS_ALGERIE)
    try:
        tournees = TourneeOrganisateur.objects.filter(
            organisateur=profile
        ).order_by('-date_creation')
        data = []
        for t in tournees:
            data.append({
                'id': t.id,
                'nom': t.nom,
                'date_debut': str(t.date_debut),
                'date_fin': str(t.date_fin),
                'wilaya': t.wilaya,
                'wilaya_nom': wilayas_dict.get(t.wilaya, t.wilaya),
                'description': t.description,
                'statut': t.statut,
                'statut_label': t.get_statut_display(),
                'alerte_id': t.alerte_id,
                'date_creation': t.date_creation.strftime('%d/%m/%Y'),
            })
    except Exception as e:
        logger.error(f"api_org_mes_tournees error: {e}")
        data = []
    return JsonResponse({'tournees': data})


# ══════════════════════════════════════════════════
#  API PUBLIQUE — Tournées organisateurs (pour agriculteurs)
# ══════════════════════════════════════════════════
@api_login_required
def api_org_tournees_publiques(request):
    """Tournées des organisateurs, visibles pour les agriculteurs."""
    wilayas_dict = dict(WILAYAS_ALGERIE)
    try:
        tournees = TourneeOrganisateur.objects.filter(
            statut__in=['planifiee', 'en_cours']
        ).select_related('organisateur__user').order_by('date_debut')
        data = []
        for t in tournees:
            try:
                org_nom = t.organisateur.user.get_full_name() or t.organisateur.user.username
            except Exception:
                org_nom = 'Organisateur'
            data.append({
                'id': t.id,
                'titre': t.nom,
                'nom': t.nom,
                'organisateur_nom': org_nom,
                'date_debut': str(t.date_debut),
                'date_fin': str(t.date_fin),
                'wilaya': t.wilaya,
                'wilaya_nom': wilayas_dict.get(t.wilaya, t.wilaya),
                'wilayas_noms': [wilayas_dict.get(t.wilaya, t.wilaya)] if t.wilaya else [],
                'description': t.description,
                'statut': t.statut,
                'statut_label': t.get_statut_display(),
            })
    except Exception as e:
        logger.error(f"api_org_tournees_publiques error: {e}")
        data = []
    return JsonResponse({'tournees': data})
