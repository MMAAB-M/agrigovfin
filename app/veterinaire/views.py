import json
from datetime import date, timedelta
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, Count, Avg
from django.utils import timezone
from functools import wraps

from app.users.models import Profile
from .models import (
    VeterinaireProfile, RendezVous, MessageVet,
    TourneeVeterinaire, AlerteAdmin, EvaluationVet, WILAYAS_ALGERIE
)


def api_login_required(view_func):
    """Login required that returns JSON 401 instead of redirect for API calls."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Non authentifié'}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


def get_vet_profile(request):
    """Helper: récupère le profil vétérinaire de l'utilisateur connecté."""
    profile = get_object_or_404(Profile, user=request.user)
    vet, _ = VeterinaireProfile.objects.get_or_create(profile=profile)
    return profile, vet


# ══════════════════════════════════════════════════
#  PAGE PRINCIPALE VÉTÉRINAIRE
# ══════════════════════════════════════════════════
@login_required
def veterinaire_dashboard(request):
    from django.shortcuts import redirect as _redirect
    # Role check — only veterinaires can access this page
    try:
        profile = get_object_or_404(Profile, user=request.user)
    except Exception:
        return _redirect('home')
    if profile.role != 'autres' or profile.other_type != 'veterinaire':
        return _redirect('home')
    vet, _ = VeterinaireProfile.objects.get_or_create(profile=profile)

    # Stats globales
    rdv_total = RendezVous.objects.filter(veterinaire=vet).count()
    rdv_attente = RendezVous.objects.filter(veterinaire=vet, statut='en_attente').count()
    rdv_aujourd_hui = RendezVous.objects.filter(
        veterinaire=vet, date_rdv=date.today()
    ).count()
    messages_non_lus = MessageVet.objects.filter(
        destinataire=profile, lu=False
    ).count()
    alertes_actives = AlerteAdmin.objects.filter(active=True).count()
    tournees = TourneeVeterinaire.objects.filter(
        veterinaire=vet, statut__in=['planifiee', 'en_cours']
    ).count()

    # Prochain RDV
    prochain_rdv = RendezVous.objects.filter(
        veterinaire=vet,
        date_rdv__gte=date.today(),
        statut='confirme'
    ).first()

    # Alertes admin actives
    alertes = AlerteAdmin.objects.filter(active=True).order_by('-date_creation')[:5]

    # RDV à venir (7 jours)
    rdv_semaine = RendezVous.objects.filter(
        veterinaire=vet,
        date_rdv__gte=date.today(),
        date_rdv__lte=date.today() + timedelta(days=7),
        statut__in=['confirme', 'en_attente']
    ).select_related('agriculteur__user').order_by('date_rdv', 'heure_rdv')[:10]

    # Agriculteurs distincts avec qui on a des RDV
    agriculteurs_ids = RendezVous.objects.filter(
        veterinaire=vet
    ).values_list('agriculteur_id', flat=True).distinct()
    agriculteurs = Profile.objects.filter(id__in=agriculteurs_ids).select_related('user')[:20]

    # Historique RDV terminés
    historique_rdv = RendezVous.objects.filter(
        veterinaire=vet, statut='termine'
    ).select_related('agriculteur__user').order_by('-date_rdv')[:10]

    # Tournées actives
    tournees_qs = TourneeVeterinaire.objects.filter(
        veterinaire=vet
    ).order_by('-date_creation')[:10]

    # Note moyenne
    note_moy = EvaluationVet.objects.filter(veterinaire=vet).aggregate(
        moy=Avg('note')
    )['moy'] or 0

    # Conversations (dernier message par agriculteur)
    conversations = []
    seen = set()
    for msg in MessageVet.objects.filter(
        Q(expediteur=profile) | Q(destinataire=profile)
    ).select_related('expediteur__user', 'destinataire__user').order_by('-date_envoi'):
        other = msg.destinataire if msg.expediteur == profile else msg.expediteur
        if other.id not in seen:
            seen.add(other.id)
            non_lus = MessageVet.objects.filter(
                expediteur=other, destinataire=profile, lu=False
            ).count()
            conversations.append({
                'profile': other,
                'dernier_msg': msg,
                'non_lus': non_lus,
            })
        if len(conversations) >= 20:
            break

    wilayas_dict = dict(WILAYAS_ALGERIE)

    context = {
        'vet': vet,
        'profile': profile,
        'rdv_total': rdv_total,
        'rdv_attente': rdv_attente,
        'rdv_aujourd_hui': rdv_aujourd_hui,
        'messages_non_lus': messages_non_lus,
        'alertes_actives': alertes_actives,
        'tournees_actives': tournees,
        'prochain_rdv': prochain_rdv,
        'alertes': alertes,
        'rdv_semaine': rdv_semaine,
        'agriculteurs': agriculteurs,
        'historique_rdv': historique_rdv,
        'tournees_qs': tournees_qs,
        'note_moy': round(note_moy, 1),
        'conversations': conversations,
        'wilayas': WILAYAS_ALGERIE,
        'wilayas_dict_json': json.dumps(wilayas_dict),
        'wilayas_json': json.dumps(WILAYAS_ALGERIE),
    }
    return render(request, 'veterinaire.html', context)


# ══════════════════════════════════════════════════
#  API RDV
# ══════════════════════════════════════════════════
@api_login_required
def api_rdv_list(request):
    profile, vet = get_vet_profile(request)
    rdvs = RendezVous.objects.filter(veterinaire=vet).select_related(
        'agriculteur__user'
    ).order_by('-date_rdv', '-heure_rdv')

    statut = request.GET.get('statut', '')
    if statut:
        rdvs = rdvs.filter(statut=statut)

    data = []
    for r in rdvs:
        data.append({
            'id': r.id,
            'agriculteur_nom': r.agriculteur.user.get_full_name() or r.agriculteur.user.username,
            'agriculteur_id': r.agriculteur.id,
            'type_visite': r.type_visite,
            'type_label': r.get_type_visite_display(),
            'date_rdv': str(r.date_rdv),
            'heure_rdv': str(r.heure_rdv)[:5],
            'lieu': r.lieu,
            'wilaya': r.wilaya,
            'animaux': r.animaux_concernes,
            'nombre_animaux': r.nombre_animaux,
            'description': r.description_probleme,
            'statut': r.statut,
            'statut_label': r.get_statut_display(),
            'diagnostic': r.diagnostic,
            'traitement': r.traitement,
            'note_vet': r.note_veterinaire,
        })
    return JsonResponse({'rdvs': data})


@api_login_required
@require_POST
def api_rdv_confirmer(request, rdv_id):
    profile, vet = get_vet_profile(request)
    rdv = get_object_or_404(RendezVous, id=rdv_id, veterinaire=vet)
    rdv.statut = 'confirme'
    rdv.save()
    return JsonResponse({'ok': True, 'statut': 'confirme'})


@api_login_required
@require_POST
def api_rdv_refuser(request, rdv_id):
    profile, vet = get_vet_profile(request)
    rdv = get_object_or_404(RendezVous, id=rdv_id, veterinaire=vet)
    data = json.loads(request.body or '{}')
    rdv.statut = 'refuse'
    rdv.note_veterinaire = data.get('raison', '')
    rdv.save()
    return JsonResponse({'ok': True, 'statut': 'refuse'})


@api_login_required
@require_POST
def api_rdv_terminer(request, rdv_id):
    profile, vet = get_vet_profile(request)
    rdv = get_object_or_404(RendezVous, id=rdv_id, veterinaire=vet)
    data = json.loads(request.body or '{}')
    rdv.statut = 'termine'
    rdv.diagnostic = data.get('diagnostic', '')
    rdv.traitement = data.get('traitement', '')
    rdv.note_veterinaire = data.get('notes', '')
    rdv.save()
    # Mettre à jour les stats
    vet.total_consultations += 1
    vet.save()
    return JsonResponse({'ok': True})


# ══════════════════════════════════════════════════
#  API MESSAGES
# ══════════════════════════════════════════════════
@api_login_required
def api_messages_get(request, agriculteur_id):
    profile, vet = get_vet_profile(request)
    agriculteur = get_object_or_404(Profile, id=agriculteur_id)

    # Marquer comme lus
    MessageVet.objects.filter(
        expediteur=agriculteur, destinataire=profile, lu=False
    ).update(lu=True)

    messages = MessageVet.objects.filter(
        Q(expediteur=profile, destinataire=agriculteur) |
        Q(expediteur=agriculteur, destinataire=profile)
    ).order_by('date_envoi')

    data = []
    for m in messages:
        data.append({
            'id': m.id,
            'contenu': m.contenu,
            'expediteur_id': m.expediteur.id,
            'est_moi': m.expediteur == profile,
            'date_envoi': m.date_envoi.strftime('%d/%m/%Y %H:%M'),
            'lu': m.lu,
        })
    return JsonResponse({
        'messages': data,
        'agriculteur_nom': agriculteur.user.get_full_name() or agriculteur.user.username,
    })


@api_login_required
@require_POST
def api_messages_envoyer(request):
    profile, vet = get_vet_profile(request)
    data = json.loads(request.body)
    destinataire = get_object_or_404(Profile, id=data['destinataire_id'])
    msg = MessageVet.objects.create(
        expediteur=profile,
        destinataire=destinataire,
        contenu=data['contenu'],
    )
    return JsonResponse({
        'ok': True,
        'id': msg.id,
        'date_envoi': msg.date_envoi.strftime('%d/%m/%Y %H:%M'),
    })


# ══════════════════════════════════════════════════
#  API TOURNÉES
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_tournee_creer(request):
    profile, vet = get_vet_profile(request)
    data = json.loads(request.body)
    # alerte_id is passed when the vet creates a tournee in response to an admin alert
    alerte_id = data.get('alerte_id') or data.get('from_alerte')
    is_from_alerte = bool(alerte_id)
    tournee = TourneeVeterinaire.objects.create(
        veterinaire=vet,
        titre=data['titre'],
        description=data.get('description', ''),
        wilayas=data.get('wilayas', []),
        date_debut=data['date_debut'],
        date_fin=data['date_fin'],
        services_offerts=data.get('services', ''),
        tarif_special=data.get('tarif') or None,
        alerte_admin=is_from_alerte,
    )
    return JsonResponse({'ok': True, 'id': tournee.id, 'titre': tournee.titre})


@api_login_required
def api_tournees_list(request):
    profile, vet = get_vet_profile(request)
    tournees = TourneeVeterinaire.objects.filter(veterinaire=vet).order_by('-date_creation')
    wilayas_dict = dict(WILAYAS_ALGERIE)
    data = []
    for t in tournees:
        data.append({
            'id': t.id,
            'titre': t.titre,
            'description': t.description,
            'wilayas': t.wilayas,
            'wilayas_noms': [wilayas_dict.get(w, w) for w in t.wilayas],
            'date_debut': str(t.date_debut),
            'date_fin': str(t.date_fin),
            'services': t.services_offerts,
            'tarif': str(t.tarif_special) if t.tarif_special else None,
            'statut': t.statut,
            'statut_label': t.get_statut_display(),
            'alerte_admin': t.alerte_admin,
        })
    return JsonResponse({'tournees': data})


# ══════════════════════════════════════════════════
#  API ALERTES ADMIN (lecture)
# ══════════════════════════════════════════════════
@api_login_required
def api_alertes(request):
    # Filtre uniquement les alertes destinées aux vétérinaires (ou à tous)
    alertes = AlerteAdmin.objects.filter(
        active=True,
        destinataire_type__in=['veterinaire', 'tous']
    ).order_by('-date_creation')
    wilayas_dict = dict(WILAYAS_ALGERIE)
    data = []
    for a in alertes:
        data.append({
            'id': a.id,
            'titre': a.titre,
            'message': a.message,
            'type_alerte': a.type_alerte,
            'type_label': a.get_type_alerte_display(),
            'wilayas': a.wilayas_cibles,
            'wilayas_noms': [wilayas_dict.get(w, w) for w in a.wilayas_cibles],
            'date': a.date_creation.strftime('%d/%m/%Y'),
        })
    return JsonResponse({'alertes': data})


# ══════════════════════════════════════════════════
#  API PROFIL VET
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_tarif_update(request):
    """Met à jour uniquement le tarif de consultation du vétérinaire."""
    profile, vet = get_vet_profile(request)
    data = json.loads(request.body)
    tarif = data.get('tarif_consultation')
    if tarif is None or str(tarif).strip() == '':
        vet.tarif_consultation = None
    else:
        try:
            vet.tarif_consultation = float(tarif)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Montant invalide.'}, status=400)
    vet.save()
    return JsonResponse({
        'ok': True,
        'tarif_consultation': float(vet.tarif_consultation) if vet.tarif_consultation is not None else None,
    })


@api_login_required
@require_POST
def api_profil_update(request):
    profile, vet = get_vet_profile(request)
    data = json.loads(request.body)
    vet.specialite = data.get('specialite', vet.specialite)
    vet.bio = data.get('bio', vet.bio)
    vet.experience_annees = int(data.get('experience', vet.experience_annees))
    vet.tarif_consultation = data.get('tarif', vet.tarif_consultation)
    vet.disponible = data.get('disponible', vet.disponible)
    vet.wilaya_principale = data.get('wilaya', vet.wilaya_principale)
    vet.save()
    return JsonResponse({'ok': True})


# ══════════════════════════════════════════════════
#  VUE AGRICULTEUR — Prendre RDV avec un vétérinaire
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_prendre_rdv(request):
    """API appelée par l'agriculteur pour prendre un RDV."""
    try:
        profile = get_object_or_404(Profile, user=request.user)
    except Exception:
        return JsonResponse({'error': 'Profil introuvable.'}, status=404)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Données invalides.'}, status=400)

    vet_id = data.get('veterinaire_id')
    if not vet_id:
        return JsonResponse({'error': 'Vétérinaire non spécifié.'}, status=400)

    try:
        vet = VeterinaireProfile.objects.select_related('profile__user').get(id=vet_id)
    except VeterinaireProfile.DoesNotExist:
        return JsonResponse({'error': 'Vétérinaire introuvable.'}, status=404)

    # Vérifier que le vétérinaire est validé par l'admin
    if not vet.profile.is_approved:
        return JsonResponse({'error': 'Ce vétérinaire n\'est pas encore validé.'}, status=400)

    # Bloquer la prise de RDV si le tarif n'est pas défini
    if vet.tarif_consultation is None:
        return JsonResponse({
            'error': 'Ce vétérinaire n\'a pas encore défini son tarif de consultation. La prise de rendez-vous est impossible pour le moment.',
            'code': 'tarif_manquant',
        }, status=400)

    date_rdv = data.get('date_rdv', '')
    heure_rdv = data.get('heure_rdv', '')
    if not date_rdv:
        return JsonResponse({'error': 'Date du rendez-vous obligatoire.'}, status=400)
    if not heure_rdv:
        return JsonResponse({'error': 'Heure du rendez-vous obligatoire.'}, status=400)

    try:
        rdv = RendezVous.objects.create(
            veterinaire=vet,
            agriculteur=profile,
            type_visite=data.get('type_visite', 'consultation'),
            date_rdv=date_rdv,
            heure_rdv=heure_rdv,
            lieu=data.get('lieu', ''),
            wilaya=data.get('wilaya', ''),
            animaux_concernes=data.get('animaux', ''),
            nombre_animaux=int(data.get('nombre_animaux', 1)),
            description_probleme=data.get('description', ''),
        )
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la création du RDV : {str(e)}'}, status=500)

    return JsonResponse({'ok': True, 'rdv_id': rdv.id})


@api_login_required
def api_agriculteur_rdv_list(request):
    """Liste des RDV de l'agriculteur connecté (acceptés, en attente, rejetés)."""
    profile = get_object_or_404(Profile, user=request.user)
    rdvs = RendezVous.objects.filter(agriculteur=profile).select_related(
        'veterinaire__profile__user'
    ).order_by('-date_rdv', '-heure_rdv')
    data = []
    for r in rdvs:
        try:
            vet_user = r.veterinaire.profile.user
            vet_nom = vet_user.get_full_name() or vet_user.username
        except Exception:
            vet_nom = '—'
        data.append({
            'id': r.id,
            'veterinaire_nom': vet_nom,
            'veterinaire_id': r.veterinaire.id,
            'type_visite': r.type_visite,
            'type_label': r.get_type_visite_display(),
            'date_rdv': str(r.date_rdv),
            'heure_rdv': str(r.heure_rdv)[:5],
            'lieu': r.lieu,
            'wilaya': r.wilaya,
            'statut': r.statut,
            'statut_label': r.get_statut_display(),
            'diagnostic': r.diagnostic,
            'traitement': r.traitement,
            'note_veterinaire': r.note_veterinaire,
        })
    return JsonResponse({'rdvs': data})


@api_login_required
def api_vets_publics(request):
    """Liste des vétérinaires validés par l'admin et réellement enregistrés."""
    wilayas_dict = dict(WILAYAS_ALGERIE)
    data = []
    # Uniquement les VeterinaireProfile liés à un Profile :
    #   - inscrit via la plateforme (user actif, non rejeté)
    #   - validé explicitement par l'admin (is_approved=True)
    #   - ayant le bon rôle et type
    # Pas de get_or_create : on n'affiche que les vrais inscrits
    vet_queryset = VeterinaireProfile.objects.filter(
        profile__role='autres',
        profile__other_type='veterinaire',
        profile__is_approved=True,
        profile__is_rejected=False,
        profile__user__is_active=True,
    ).select_related('profile__user')
    for vet in vet_queryset:
        try:
            profile = vet.profile
            nom = profile.user.get_full_name() or profile.user.username
            data.append({
                'id': vet.id,
                'profile_id': profile.id,
                'nom': nom,
                'specialite': vet.specialite or 'Médecine vétérinaire générale',
                'wilaya': vet.wilaya_principale,
                'wilaya_nom': wilayas_dict.get(vet.wilaya_principale, vet.wilaya_principale or '—'),
                'experience': vet.experience_annees,
                'tarif': float(vet.tarif_consultation) if vet.tarif_consultation is not None else None,
                'tarif_defini': vet.tarif_consultation is not None,
                'note': float(vet.note_moyenne),
                'consultations': vet.total_consultations,
                'disponible': vet.disponible,
                'bio': vet.bio or '',
            })
        except Exception:
            continue
    return JsonResponse({'veterinaires': data})


@api_login_required
def api_tournees_publiques(request):
    """Tournées vétérinaires visibles pour les agriculteurs (planifiées et en cours)."""
    tournees = TourneeVeterinaire.objects.filter(
        statut__in=['planifiee', 'en_cours'],
        date_fin__gte=date.today(),
        veterinaire__profile__is_approved=True,
    ).select_related('veterinaire__profile__user').order_by('date_debut')
    wilayas_dict = dict(WILAYAS_ALGERIE)
    data = []
    for t in tournees:
        try:
            vet_user = t.veterinaire.profile.user
            vet_nom = vet_user.get_full_name() or vet_user.username
            data.append({
                'id': t.id,
                'titre': t.titre,
                'description': t.description,
                'veterinaire_nom': vet_nom,
                'veterinaire_id': t.veterinaire.id,
                'veterinaire_specialite': t.veterinaire.specialite or '',
                'veterinaire_wilaya': wilayas_dict.get(t.veterinaire.wilaya_principale, t.veterinaire.wilaya_principale or ''),
                'wilayas': t.wilayas,
                'wilayas_noms': [wilayas_dict.get(w, w) for w in t.wilayas],
                'date_debut': str(t.date_debut),
                'date_fin': str(t.date_fin),
                'services': t.services_offerts,
                'tarif': str(t.tarif_special) if t.tarif_special else None,
                'statut': t.statut,
                'statut_label': t.get_statut_display(),
                'alerte_admin': t.alerte_admin,
                'date_creation': t.date_creation.strftime('%d/%m/%Y'),
            })
        except Exception:
            continue
    return JsonResponse({'tournees': data})


# ══════════════════════════════════════════════════
#  ADMIN — Créer une alerte
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_admin_creer_alerte(request):
    if not request.user.is_staff:
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    data = json.loads(request.body)
    alerte = AlerteAdmin.objects.create(
        titre=data['titre'],
        message=data['message'],
        type_alerte=data.get('type_alerte', 'stock_faible'),
        wilayas_cibles=data.get('wilayas', []),
        creee_par=request.user,
    )
    return JsonResponse({'ok': True, 'id': alerte.id})

# ══════════════════════════════════════════════════
#  API ANNONCES (vétérinaire publie pour agriculteurs)
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_annonce_creer(request):
    profile, vet = get_vet_profile(request)
    data = json.loads(request.body)
    alerte_id = data.get('alerte_id') or data.get('from_alerte')
    is_from_alerte = bool(alerte_id)
    tournee = TourneeVeterinaire.objects.create(
        veterinaire=vet,
        titre=data['titre'],
        description=data.get('description', ''),
        wilayas=data.get('wilayas', []),
        date_debut=data['date_debut'],
        date_fin=data['date_fin'],
        services_offerts=data.get('services', ''),
        tarif_special=data.get('tarif') or None,
        statut='planifiee',
        alerte_admin=is_from_alerte,
    )
    return JsonResponse({'ok': True, 'id': tournee.id, 'titre': tournee.titre})


# ══════════════════════════════════════════════════
#  API NOTIFICATIONS AGRICULTEUR
# ══════════════════════════════════════════════════
@api_login_required
def api_notifications_agriculteur(request):
    """Notifications pour l'agriculteur: ses RDVs, alertes admin, annonces vets."""
    profile = get_object_or_404(Profile, user=request.user)

    notifications = []

    # Changements de statut sur ses RDVs
    rdvs = RendezVous.objects.filter(
        agriculteur=profile
    ).select_related('veterinaire__profile__user').order_by('-date_modification')[:20]

    for rdv in rdvs:
        vet_nom = rdv.veterinaire.profile.user.get_full_name() or rdv.veterinaire.profile.user.username
        if rdv.statut == 'confirme':
            icon = '✅'
            titre = f'RDV confirmé par Dr. {vet_nom}'
            desc = f'Votre rendez-vous du {rdv.date_rdv} à {str(rdv.heure_rdv)[:5]} a été confirmé.'
        elif rdv.statut == 'refuse':
            icon = '❌'
            titre = f'RDV refusé par Dr. {vet_nom}'
            desc = f'Votre demande du {rdv.date_rdv} a été refusée. {rdv.note_veterinaire or ""}'
        elif rdv.statut == 'termine':
            icon = '🏥'
            titre = f'Consultation terminée — Dr. {vet_nom}'
            desc = f'Diagnostic: {rdv.diagnostic or "—"}. Traitement: {rdv.traitement or "—"}'
        else:
            continue
        notifications.append({
            'id': f'rdv_{rdv.id}',
            'type': 'rdv',
            'icon': icon,
            'titre': titre,
            'desc': desc,
            'date': rdv.date_modification.strftime('%d/%m/%Y %H:%M'),
        })

    # Alertes admin actives
    alertes = AlerteAdmin.objects.filter(active=True).order_by('-date_creation')[:5]
    for a in alertes:
        notifications.append({
            'id': f'alerte_{a.id}',
            'type': 'alerte',
            'icon': '⚠️',
            'titre': a.titre,
            'desc': a.message[:200],
            'date': a.date_creation.strftime('%d/%m/%Y'),
        })

    # Nouvelles tournées / annonces vétérinaires
    tournees = TourneeVeterinaire.objects.filter(
        statut__in=['planifiee', 'en_cours'],
        date_fin__gte=date.today(),
    ).select_related('veterinaire__profile__user').order_by('-date_creation')[:5]
    wilayas_dict = dict(WILAYAS_ALGERIE)
    for t in tournees:
        vet_nom = t.veterinaire.profile.user.get_full_name() or t.veterinaire.profile.user.username
        wilayas_noms = ', '.join([wilayas_dict.get(w, w) for w in t.wilayas]) or 'Toutes les wilayas'
        notifications.append({
            'id': f'tournee_{t.id}',
            'type': 'annonce',
            'icon': '🚗',
            'titre': t.titre,
            'desc': f'Dr. {vet_nom} — {wilayas_noms} | {t.date_debut} → {t.date_fin}',
            'date': t.date_creation.strftime('%d/%m/%Y'),
        })

    return JsonResponse({'notifications': notifications, 'total': len(notifications)})


# ══════════════════════════════════════════════════
#  API ADMIN — Modifier une alerte existante
# ══════════════════════════════════════════════════
@api_login_required
def api_admin_alerte_modifier(request, alerte_id):
    """Modifie une alerte admin existante (titre, message, type, wilayas)."""
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    try:
        alerte = AlerteAdmin.objects.get(pk=alerte_id)
    except AlerteAdmin.DoesNotExist:
        return JsonResponse({'error': 'Alerte introuvable'}, status=404)
    data = json.loads(request.body)
    if 'titre' in data:
        alerte.titre = data['titre']
    if 'message' in data:
        alerte.message = data['message']
    if 'type_alerte' in data:
        alerte.type_alerte = data['type_alerte']
    if 'wilayas' in data:
        alerte.wilayas_cibles = data['wilayas']
    alerte.save()
    return JsonResponse({'ok': True})


# ══════════════════════════════════════════════════
#  API ADMIN — Supprimer une alerte existante
# ══════════════════════════════════════════════════
@api_login_required
def api_admin_alerte_supprimer(request, alerte_id):
    """Supprime définitivement une alerte admin."""
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
    try:
        alerte = AlerteAdmin.objects.get(pk=alerte_id)
    except AlerteAdmin.DoesNotExist:
        return JsonResponse({'error': 'Alerte introuvable'}, status=404)
    alerte.delete()
    return JsonResponse({'ok': True})


# ══════════════════════════════════════════════════
#  API ADMIN — Alerte stock faible → notifie vétérinaires
# ══════════════════════════════════════════════════
@api_login_required
@require_POST
def api_admin_alerte_stock(request):
    """Crée une alerte stock faible et la rend visible aux vétérinaires."""
    if not request.user.is_staff and not (
        hasattr(request.user, 'profile') and
        getattr(request.user.profile, 'role', '') in ('admin', 'autres')
    ):
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    data = json.loads(request.body)
    alerte = AlerteAdmin.objects.create(
        titre=data.get('titre', 'Alerte stock faible'),
        message=data.get('message', ''),
        type_alerte='stock_faible',
        destinataire_type='veterinaire',
        wilayas_cibles=data.get('wilayas', []),
        creee_par=request.user,
        active=True,
    )
    # Compter les vétérinaires ciblés
    vets_count = VeterinaireProfile.objects.filter(disponible=True).count()
    return JsonResponse({
        'ok': True,
        'id': alerte.id,
        'vets_notifies': vets_count,
        'message': f'Alerte envoyée à {vets_count} vétérinaire(s)'
    })


# ══════════════════════════════════════════════════
#  API ADMIN — Tableau de bord Vét/Organisation
# ══════════════════════════════════════════════════
def _is_admin_or_organisateur(request):
    """Vérifie si l'utilisateur est admin, superuser ou organisateur."""
    if request.user.is_staff or request.user.is_superuser:
        return True
    try:
        profile = Profile.objects.get(user=request.user)
        return profile.role == 'autres' and profile.other_type == 'organisation'
    except Profile.DoesNotExist:
        return False


@api_login_required
def api_admin_tournees_rdv(request):
    """Retourne toutes les tournées et RDV pour le tableau de bord admin/organisateur."""
    if not _is_admin_or_organisateur(request):
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    wilayas_dict = dict(WILAYAS_ALGERIE)

    # --- Tournées vétérinaires ---
    tournees = TourneeVeterinaire.objects.select_related(
        'veterinaire__profile__user'
    ).order_by('-date_creation')
    tournees_data = []
    for t in tournees:
        vet_profile_obj = t.veterinaire
        vet_user = vet_profile_obj.profile.user
        vet_profile = vet_profile_obj.profile
        tournees_data.append({
            'id': t.id,
            'titre': t.titre,
            'description': t.description,
            'vet_nom': vet_user.get_full_name() or vet_user.username,
            'vet_titre': f"Dr. {vet_user.get_full_name() or vet_user.username}",
            'vet_fonction': vet_profile.other_type or 'veterinaire',
            'vet_fonction_label': 'Vétérinaire',
            'vet_specialite': vet_profile_obj.specialite or '',
            'vet_wilaya': wilayas_dict.get(vet_profile_obj.wilaya_principale, vet_profile_obj.wilaya_principale or ''),
            'wilayas': [wilayas_dict.get(w, w) for w in t.wilayas],
            'wilayas_codes': t.wilayas,
            'date_debut': str(t.date_debut),
            'date_fin': str(t.date_fin),
            'services': t.services_offerts,
            'statut': t.statut,
            'statut_label': t.get_statut_display(),
            'alerte_admin': t.alerte_admin,
        })

    # --- Rendez-vous (toutes les consultations) ---
    rdvs = RendezVous.objects.select_related(
        'veterinaire__profile__user', 'agriculteur__user'
    ).order_by('-date_rdv')[:100]
    rdvs_data = []
    for r in rdvs:
        rdvs_data.append({
            'id': r.id,
            'vet_nom': r.veterinaire.profile.user.get_full_name() or r.veterinaire.profile.user.username,
            'agriculteur_nom': r.agriculteur.user.get_full_name() or r.agriculteur.user.username,
            'type_visite': r.get_type_visite_display(),
            'date_rdv': str(r.date_rdv),
            'heure_rdv': str(r.heure_rdv)[:5],
            'lieu': r.lieu,
            'wilaya': wilayas_dict.get(r.wilaya, r.wilaya),
            'animaux': r.animaux_concernes,
            'statut': r.statut,
            'statut_label': r.get_statut_display(),
        })

    # --- Alertes admin actives ---
    alertes = AlerteAdmin.objects.filter(active=True).order_by('-date_creation')[:20]
    alertes_data = []
    for a in alertes:
        alertes_data.append({
            'id': a.id,
            'titre': a.titre,
            'message': a.message,
            'type': a.get_type_alerte_display(),
            'type_alerte': a.type_alerte,
            'destinataire_type': a.destinataire_type,
            'destinataire_label': a.get_destinataire_type_display(),
            'wilayas': [wilayas_dict.get(w, w) for w in a.wilayas_cibles],
            'wilayas_cibles': a.wilayas_cibles,
            'date': a.date_creation.strftime('%d/%m/%Y'),
        })

    # --- Tournées organisateurs ---
    try:
        from app.organisateur.models import TourneeOrganisateur
        org_tournees = TourneeOrganisateur.objects.select_related(
            'organisateur__user'
        ).order_by('-date_creation')
        org_tournees_data = []
        for t in org_tournees:
            org_tournees_data.append({
                'id': t.id,
                'nom': t.nom,
                'organisateur_nom': t.organisateur.user.get_full_name() or t.organisateur.user.username,
                'date_debut': str(t.date_debut),
                'date_fin': str(t.date_fin),
                'wilaya': wilayas_dict.get(t.wilaya, t.wilaya),
                'wilaya_code': t.wilaya,
                'description': t.description,
                'statut': t.statut,
                'statut_label': t.get_statut_display(),
                'alerte_id': t.alerte_id,
            })
    except Exception:
        org_tournees_data = []

    return JsonResponse({
        'tournees': tournees_data,
        'org_tournees': org_tournees_data,
        'rdvs': rdvs_data,
        'alertes': alertes_data,
        'stats': {
            'total_tournees': tournees.count(),
            'tournees_actives': tournees.filter(statut='en_cours').count(),
            'total_rdvs': RendezVous.objects.count(),
            'rdvs_en_attente': RendezVous.objects.filter(statut='en_attente').count(),
            'alertes_actives': AlerteAdmin.objects.filter(active=True).count(),
        }
    })


@api_login_required
@require_POST
def api_admin_alerte_organisation(request):
    """Alerte envoyée à l'organisateur (produits végétaux non vendus / stock insuffisant)."""
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'error': 'Non autorisé'}, status=403)
    data = json.loads(request.body)
    # On stocke comme alerte admin de type campagne, destinée à l'organisateur
    alerte = AlerteAdmin.objects.create(
        titre=data.get('titre', 'Alerte Organisateur'),
        message=data.get('message', ''),
        type_alerte='campagne',
        destinataire_type='organisateur',
        wilayas_cibles=data.get('wilayas', []),
        creee_par=request.user,
        active=True,
    )
    return JsonResponse({
        'ok': True,
        'id': alerte.id,
        'message': 'Alerte envoyée à l\'organisateur des plantes.',
    })
