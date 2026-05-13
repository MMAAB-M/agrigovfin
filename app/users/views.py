import json
import secrets
import hashlib
from decimal import Decimal, InvalidOperation
from datetime import timedelta

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.http import JsonResponse
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .models import Profile, Farm, BuyerInfo, TransporterInfo, VehicleDocument


def splash_view(request):
    """PWA Splash screen — redirects to home after animation."""
    return render(request, 'splash.html')


def home_view(request):
    return render(request, 'home.html')


def services_view(request):
    return render(request, 'services.html')


def contact_view(request):
    return render(request, 'contact.html')


def ensavoir_view(request):
    return render(request, 'ensavoir.html')




# ============================================================
# PUBLIC DYNAMIC MARKET STATS  GET /api/public-stats/
# ============================================================
def public_market_stats(request):
    try:
        from app.produits.models import Produit, ProduitAgriculteur, Commande
    except Exception:
        Produit = ProduitAgriculteur = Commande = None

    profiles = Profile.objects.all()
    roles = {
        'agriculteurs': profiles.filter(role='agriculteur').count(),
        'acheteurs': profiles.filter(role='acheteur').count(),
        'transporteurs': profiles.filter(role='transporteur').count(),
        'autres': profiles.filter(role='autres').count(),
    }
    approved = profiles.filter(is_approved=True, is_rejected=False).count()

    wilayas = set()
    for city in profiles.exclude(birth_city__isnull=True).exclude(birth_city='').values_list('birth_city', flat=True):
        if city:
            wilayas.add(str(city).strip())
    for wilaya in Farm.objects.exclude(wilaya__isnull=True).exclude(wilaya='').values_list('wilaya', flat=True):
        if wilaya:
            wilayas.add(str(wilaya).strip())

    product_stats = {'official': 0, 'listings': 0, 'active_listings': 0, 'stock_total': 0, 'categories': {}}
    order_stats = {'total': 0, 'active': 0, 'delivered': 0, 'sales_total': 0}
    recent_products = []

    if Produit is not None:
        product_stats['official'] = Produit.objects.count()
        for name in Produit.objects.values_list('categorie', flat=True):
            key = name or 'Autre'
            product_stats['categories'][key] = product_stats['categories'].get(key, 0) + 1

    if ProduitAgriculteur is not None:
        listings = ProduitAgriculteur.objects.select_related('produit', 'agriculteur__user').order_by('-date_ajout')
        product_stats['listings'] = listings.count()
        product_stats['active_listings'] = listings.exclude(statut='Rupture').filter(quantite__gt=0).count()
        product_stats['stock_total'] = sum(int(q or 0) for q in listings.values_list('quantite', flat=True))
        for item in listings[:6]:
            recent_products.append({
                'id': item.id,
                'nom': item.produit.nom if item.produit_id else '',
                'categorie': item.produit.categorie if item.produit_id else '',
                'prix': item.prix,
                'quantite': item.quantite,
                'vendeur': item.vendeur_nom or (item.agriculteur.user.get_full_name().strip() if item.agriculteur_id and item.agriculteur.user_id else 'Agriculteur'),
                'photo': item.photo or (item.produit.photo if item.produit_id else ''),
            })

    if Commande is not None:
        orders = Commande.objects.all()
        order_stats['total'] = orders.count()
        order_stats['active'] = orders.filter(statut__in=['confirmee', 'en_preparation', 'expediee']).count()
        order_stats['delivered'] = orders.filter(statut='livree').count()
        order_stats['sales_total'] = round(sum(float(total or 0) for total in orders.values_list('total', flat=True)), 2)

    return JsonResponse({
        'success': True,
        'users': {
            'total': User.objects.count(),
            'profiles': profiles.count(),
            'approved_profiles': approved,
            'pending_profiles': profiles.filter(is_approved=False, is_rejected=False).count(),
            'roles': roles,
        },
        'wilayas_count': len(wilayas),
        'products': product_stats,
        'orders': order_stats,
        'recent_products': recent_products,
    })


def signup_view(request):
    if request.method == 'POST':
        role = request.POST.get('role')
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        phone = request.POST.get('phone', '').strip()
        birth_date = request.POST.get('birth_date')
        birth_city = request.POST.get('birth_city', '').strip()
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password')
        password2 = request.POST.get('password2')

        other_type = request.POST.get('other_type')
        organization_name = request.POST.get('organization_name', '').strip()
        workplace = request.POST.get('workplace', '').strip()
        establishment_name = request.POST.get('establishment_name', '').strip()
        vehicle_name = request.POST.get('vehicle_name', '').strip()
        surface = request.POST.get('surface')
        main_products = request.POST.get('main_products', '').strip()

        profile_photo = request.FILES.get('profile_photo')
        certificate = request.FILES.get('certificate')
        commercial_register = request.FILES.get('commercial_register')
        vehicle_documents = request.FILES.getlist('vehicle_documents')

        if not role:
            messages.error(request, "Choisissez un rôle.")
            return render(request, 'creecomte.html')

        if password != password2:
            messages.error(request, "Les mots de passe ne correspondent pas.")
            return render(request, 'creecomte.html')

        if User.objects.filter(username=email).exists():
            messages.error(request, "Cet email existe déjà.")
            return render(request, 'creecomte.html')

        if role == 'agriculteur':
            farm_names = request.POST.getlist('farm_names')
            if not any(name.strip() for name in farm_names):
                messages.error(request, "Ajoutez au moins une ferme.")
                return render(request, 'creecomte.html')
            if not surface:
                messages.error(request, "La surface est obligatoire.")
                return render(request, 'creecomte.html')
            if not main_products:
                messages.error(request, "Ajoutez au moins un produit principal.")
                return render(request, 'creecomte.html')

        elif role == 'acheteur':
            if not commercial_register:
                messages.error(request, "Le registre de commerce est obligatoire.")
                return render(request, 'creecomte.html')

        elif role == 'transporteur':
            if not vehicle_name:
                messages.error(request, "Le véhicule est obligatoire.")
                return render(request, 'creecomte.html')
            if not vehicle_documents:
                messages.error(request, "Les documents du véhicule sont obligatoires.")
                return render(request, 'creecomte.html')

        elif role == 'autres':
            if not other_type:
                messages.error(request, "Veuillez choisir votre spécialité.")
                return render(request, 'creecomte.html')

        user = User.objects.create(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=make_password(password),
            is_active=True
        )

        profile = Profile.objects.create(
            user=user,
            role=role,
            phone=phone,
            birth_date=birth_date,
            birth_city=birth_city,
            profile_photo=profile_photo,
            other_type=other_type if role == 'autres' else None,
            organization_name=organization_name if role == 'autres' else None,
            certificate=certificate if role == 'autres' else None,
            is_approved=False,
            is_rejected=False
        )

        if role == 'agriculteur':
            for farm_name in request.POST.getlist('farm_names'):
                farm_name = farm_name.strip()
                if farm_name:
                    Farm.objects.create(
                        profile=profile,
                        name=farm_name,
                        surface=surface or 0,
                        main_products=main_products
                    )

        elif role == 'acheteur':
            BuyerInfo.objects.create(
                profile=profile,
                workplace=workplace,
                establishment_name=establishment_name,
                commercial_register=commercial_register
            )

        elif role == 'transporteur':
            transporter = TransporterInfo.objects.create(
                profile=profile,
                vehicle_name=vehicle_name
            )
            for doc in vehicle_documents:
                VehicleDocument.objects.create(
                    transporter=transporter,
                    document=doc
                )

        return render(request, 'creecomte.html', {
            'signup_success': True,
            'user_role': role
        })

    return render(request, 'creecomte.html')


def login_view(request):
    return render(request, 'seconnecter.html')


def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode non autorisée.'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Requête invalide.'}, status=400)

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    selected_role = data.get('role') or ''

    if not email or not password:
        return JsonResponse({'error': 'Email et mot de passe requis.'}, status=400)

    user = authenticate(request, username=email, password=password)

    if user is None:
        return JsonResponse({'error': 'Email ou mot de passe incorrect.'}, status=400)

    if user.is_staff or user.is_superuser:
        if selected_role != 'admin':
            return JsonResponse({'error': 'Choisissez le profil Administrateur.'}, status=403)
        login(request, user)
        return JsonResponse({'success': True, 'redirect_url': '/adminpage/'})

    try:
        profile = user.profile
    except Profile.DoesNotExist:
        return JsonResponse({'error': 'Profil introuvable.'}, status=400)

    if profile.is_rejected:
        return JsonResponse({'error': "Votre compte a été rejeté par l'administration."}, status=403)

    if not profile.is_approved:
        return JsonResponse({'error': "Compte en attente de validation par l'administration."}, status=403)

    if selected_role and selected_role != profile.role:
        return JsonResponse({'error': 'Ce compte ne correspond pas au rôle choisi.'}, status=403)

    login(request, user)

    if profile.role == 'agriculteur':
        redirect_url = '/agriculteur/'
    elif profile.role == 'acheteur':
        redirect_url = '/acheteur/'
    elif profile.role == 'transporteur':
        redirect_url = '/transporteur/'
    elif profile.role == 'autres':
        if profile.other_type == 'veterinaire':
            redirect_url = '/veterinaire/'
        elif profile.other_type == 'organisation':
            redirect_url = '/organisation/'
        else:
            redirect_url = '/'
    else:
        redirect_url = '/'

    return JsonResponse({'success': True, 'redirect_url': redirect_url})


def session_info(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({
            'authenticated': False,
            'role': None,
            'dashboard_url': '/login/',
        }, status=401)

    role = 'admin' if (user.is_staff or user.is_superuser) else getattr(getattr(user, 'profile', None), 'role', None)
    dashboard_url = '/'

    if role == 'admin':
        dashboard_url = '/adminpage/'
    elif role == 'agriculteur':
        dashboard_url = '/agriculteur/'
    elif role == 'acheteur':
        dashboard_url = '/acheteur/'
    elif role == 'transporteur':
        dashboard_url = '/transporteur/'
    elif role == 'autres':
        profile = getattr(user, 'profile', None)
        if profile and profile.other_type == 'veterinaire':
            dashboard_url = '/veterinaire/'
        elif profile and profile.other_type == 'organisation':
            dashboard_url = '/organisation/'

    return JsonResponse({
        'authenticated': True,
        'role': role,
        'full_name': user.get_full_name().strip() or user.username,
        'email': user.email or user.username,
        'dashboard_url': dashboard_url,
    })


@login_required
def logout_view(request):
    logout(request)
    return redirect('home')


def parse_farm_meta_text(text=''):
    meta = {'wilaya': '', 'lieu': '', 'commune': '', 'adresse': '', 'culture': '', 'latitude': None, 'longitude': None}
    for part in (text or '').split('|'):
        part = part.strip()
        if not part or ':' not in part:
            continue
        raw_key, raw_value = part.split(':', 1)
        key = raw_key.strip().lower()
        value = raw_value.strip()
        if key == 'wilaya':
            meta['wilaya'] = value
        elif key == 'lieu':
            meta['lieu'] = value
        elif key == 'commune':
            meta['commune'] = value
        elif key == 'adresse':
            meta['adresse'] = value
        elif key == 'culture':
            meta['culture'] = value
        elif key == 'coords':
            coords = [v.strip() for v in value.split(',')]
            if len(coords) == 2:
                try:
                    meta['latitude'] = Decimal(coords[0].replace(',', '.'))
                    meta['longitude'] = Decimal(coords[1].replace(',', '.'))
                except (InvalidOperation, ValueError):
                    pass
    return meta


def serialize_farm(farm):
    fallback = parse_farm_meta_text(farm.main_products or '')
    latitude = farm.latitude if farm.latitude is not None else fallback['latitude']
    longitude = farm.longitude if farm.longitude is not None else fallback['longitude']
    return {
        'id': farm.id,
        'name': farm.name,
        'surface': str(farm.surface),
        'main_products': farm.main_products or '',
        'wilaya': farm.wilaya or fallback['wilaya'],
        'lieu': farm.lieu or fallback['lieu'],
        'commune': farm.commune or fallback['commune'],
        'adresse': farm.adresse or fallback['adresse'],
        'culture': farm.culture or fallback['culture'],
        'latitude': float(latitude) if latitude is not None else None,
        'longitude': float(longitude) if longitude is not None else None,
    }


def profile_photo_url(request, photo):
    if not photo:
        return ''
    try:
        return request.build_absolute_uri(photo.url)
    except Exception:
        return getattr(photo, 'url', '') or ''


def build_profile_payload(request, user):
    is_admin = user.is_staff or user.is_superuser
    profile = getattr(user, 'profile', None) if not is_admin else None
    role = 'admin' if is_admin else getattr(profile, 'role', None)

    payload = {
        'role': role,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': user.get_full_name().strip() or user.username,
        'email': user.email or user.username,
        'phone': getattr(profile, 'phone', '') or '',
        'city': getattr(profile, 'birth_city', '') or '',
        'birth_date': profile.birth_date.isoformat() if getattr(profile, 'birth_date', None) else '',
        'profile_photo_url': profile_photo_url(request, getattr(profile, 'profile_photo', None)) if profile else '',
        'stats': {},
    }

    if role == 'agriculteur' and profile:
        farms = list(profile.farms.all().order_by('id'))
        stats = {
            'farms_count': len(farms),
            'products_count': 0,
            'orders_count': 0,
            'revenue_total': 0,
        }
        try:
            from app.produits.models import ProduitAgriculteur, Commande
            stats['products_count'] = ProduitAgriculteur.objects.filter(agriculteur=profile).count()
            farmer_orders = Commande.objects.filter(agriculteur=profile)
            stats['orders_count'] = farmer_orders.count()
            stats['revenue_total'] = round(sum(float(order.total or 0) for order in farmer_orders), 2)
        except Exception:
            pass
        payload.update({
            'wilaya': farms[0].wilaya if farms and farms[0].wilaya else (profile.birth_city or ''),
            'farms': [serialize_farm(farm) for farm in farms],
            'stats': stats,
        })
    elif role == 'acheteur' and profile:
        buyer = getattr(profile, 'buyer_info', None)
        stats = {
            'orders_count': 0,
            'active_orders_count': 0,
            'delivered_orders_count': 0,
            'suppliers_count': 0,
            'total_spent': 0,
        }
        try:
            from app.produits.models import Commande
            buyer_orders = list(Commande.objects.filter(acheteur=profile))
            stats['orders_count'] = len(buyer_orders)
            stats['active_orders_count'] = sum(1 for order in buyer_orders if order.statut in ['confirmee', 'en_preparation', 'expediee'])
            stats['delivered_orders_count'] = sum(1 for order in buyer_orders if order.statut == 'livree')
            stats['suppliers_count'] = len({order.agriculteur_id for order in buyer_orders if order.agriculteur_id})
            stats['total_spent'] = round(sum(float(order.total or 0) for order in buyer_orders), 2)
        except Exception:
            pass
        payload.update({
            'workplace': getattr(buyer, 'workplace', '') or '',
            'establishment_name': getattr(buyer, 'establishment_name', '') or '',
            'stats': stats,
        })
    elif role == 'transporteur' and profile:
        transporter = getattr(profile, 'transporter_info', None)
        transport_meta = parse_transporter_meta(getattr(transporter, 'vehicle_name', '') or '')
        document_count = 0
        try:
            document_count = transporter.documents.count() if transporter else 0
        except Exception:
            document_count = 0
        completion_fields = [
            user.first_name or user.last_name,
            user.email,
            profile.phone,
            profile.birth_city,
            transport_meta['vehicle_name'],
            transport_meta['plate'],
            transport_meta['capacity'],
            transport_meta['condition'],
        ]
        completion_percent = round((sum(1 for field in completion_fields if field) / len(completion_fields)) * 100) if completion_fields else 0
        payload.update({
            'vehicle_name': transport_meta['vehicle_name'],
            'plate': transport_meta['plate'],
            'capacity': transport_meta['capacity'],
            'condition': transport_meta['condition'],
            'wilaya': profile.birth_city or '',
            'stats': {
                'documents_count': document_count,
                'profile_completion': completion_percent,
                'has_vehicle': bool(transport_meta['vehicle_name']),
                'has_plate': bool(transport_meta['plate']),
            },
        })
    elif role == 'admin':
        stats = {'users_count': 0, 'orders_count': 0, 'products_count': 0, 'sales_total': 0}
        try:
            from app.produits.models import Commande, Produit, ProduitAgriculteur
            stats['users_count'] = User.objects.count()
            stats['orders_count'] = Commande.objects.count()
            stats['products_count'] = Produit.objects.count() + ProduitAgriculteur.objects.count()
            stats['sales_total'] = round(sum(float(order.total or 0) for order in Commande.objects.all()), 2)
        except Exception:
            pass
        payload.update({
            'phone': '',
            'city': '',
            'stats': stats,
        })

    return payload


def parse_transporter_meta(raw_value=''):
    meta = {'vehicle_name': '', 'plate': '', 'capacity': '', 'condition': ''}
    text = (raw_value or '').strip()
    if not text:
        return meta
    if '|' not in text and ':' not in text:
        meta['vehicle_name'] = text
        return meta
    for part in text.split('|'):
        part = part.strip()
        if ':' not in part:
            continue
        key, value = [item.strip() for item in part.split(':', 1)]
        key = key.lower()
        if key in ('type', 'vehicule', 'véhicule', 'vehicle'):
            meta['vehicle_name'] = value
        elif key in ('plate', 'immatriculation'):
            meta['plate'] = value
        elif key in ('capacity', 'capacite', 'capacité'):
            meta['capacity'] = value
        elif key in ('condition', 'etat', 'état'):
            meta['condition'] = value
    return meta


def build_transporter_meta(vehicle_name='', plate='', capacity='', condition=''):
    return ' | '.join([
        f'Type: {vehicle_name}'.strip(),
        f'Plate: {plate}'.strip(),
        f'Capacity: {capacity}'.strip(),
        f'Condition: {condition}'.strip(),
    ])


def _request_data(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return None
    return request.POST


@login_required
def api_profile(request):
    user = request.user

    if request.method == 'GET':
        return JsonResponse({'success': True, 'profile': build_profile_payload(request, user)})

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée.'}, status=405)

    data = _request_data(request)
    if data is None:
        return JsonResponse({'success': False, 'error': 'Corps JSON invalide.'}, status=400)

    email = (data.get('email') or '').strip().lower()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    city = (data.get('city') or data.get('wilaya') or '').strip()

    if not first_name and not last_name:
        return JsonResponse({'success': False, 'error': 'Le nom est obligatoire.'}, status=400)

    if not email:
        return JsonResponse({'success': False, 'error': "L'email est obligatoire."}, status=400)

    if User.objects.exclude(id=user.id).filter(username=email).exists():
        return JsonResponse({'success': False, 'error': 'Cet email est déjà utilisé.'}, status=400)

    with transaction.atomic():
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.username = email
        user.save()

        if not (user.is_staff or user.is_superuser):
            profile = getattr(user, 'profile', None)
            if profile is None:
                return JsonResponse({'success': False, 'error': 'Profil introuvable.'}, status=404)

            profile.phone = phone
            if city:
                profile.birth_city = city
            photo = request.FILES.get('profile_photo')
            if photo:
                profile.profile_photo = photo
            profile.save()

            if profile.role == 'acheteur':
                buyer, _ = BuyerInfo.objects.get_or_create(profile=profile)
                buyer.workplace = (data.get('workplace') or '').strip()
                buyer.establishment_name = (data.get('establishment_name') or '').strip()
                buyer.save()
            elif profile.role == 'transporteur':
                transporter, _ = TransporterInfo.objects.get_or_create(profile=profile, defaults={'vehicle_name': ''})
                transporter.vehicle_name = build_transporter_meta(
                    (data.get('vehicle_name') or '').strip(),
                    (data.get('plate') or '').strip(),
                    (data.get('capacity') or '').strip(),
                    (data.get('condition') or '').strip(),
                )
                transporter.save()

        return JsonResponse({'success': True, 'profile': build_profile_payload(request, user)})


@login_required
def api_change_password(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée.'}, status=405)

    data = _request_data(request)
    if data is None:
        return JsonResponse({'success': False, 'error': 'Corps JSON invalide.'}, status=400)

    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''
    confirm_password = data.get('confirm_password') or ''

    if not current_password or not new_password or not confirm_password:
        return JsonResponse({'success': False, 'error': 'Tous les champs sont obligatoires.'}, status=400)

    if not request.user.check_password(current_password):
        return JsonResponse({'success': False, 'error': 'Mot de passe actuel incorrect.'}, status=400)

    if len(new_password) < 8:
        return JsonResponse({'success': False, 'error': 'Le nouveau mot de passe doit contenir au moins 8 caractères.'}, status=400)

    if new_password != confirm_password:
        return JsonResponse({'success': False, 'error': 'La confirmation du mot de passe ne correspond pas.'}, status=400)

    try:
        validate_password(new_password, user=request.user)
    except ValidationError as exc:
        return JsonResponse({'success': False, 'error': ' '.join(exc.messages)}, status=400)

    request.user.set_password(new_password)
    request.user.save()
    update_session_auth_hash(request, request.user)

    return JsonResponse({'success': True, 'message': 'Mot de passe modifié avec succès.'})


@ensure_csrf_cookie
@login_required
def agriculteur_view(request):
    try:
        profile = request.user.profile
    except Exception:
        return redirect('home')
    if profile.role != 'agriculteur':
        return redirect('home')
    return render(request, 'agriculteur.html', {'initial_profile': build_profile_payload(request, request.user)})


@csrf_exempt
@login_required
def api_farms(request):
    try:
        profile = request.user.profile
    except Exception:
        return JsonResponse({'success': False, 'error': 'Profil introuvable.'}, status=403)

    if profile.role != 'agriculteur':
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)

    farms = list(profile.farms.all().order_by('id'))
    return JsonResponse([serialize_farm(farm) for farm in farms], safe=False)


@csrf_exempt
@login_required
def api_add_farm(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Méthode non autorisée.'}, status=405)

    try:
        profile = request.user.profile
    except Exception:
        return JsonResponse({'success': False, 'error': 'Profil introuvable.'}, status=403)

    if profile.role != 'agriculteur':
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON invalide.'}, status=400)

    try:
        name = (data.get('name') or '').strip()
        wilaya = (data.get('wilaya') or '').strip()
        lieu = (data.get('lieu') or '').strip()
        commune = (data.get('commune') or '').strip()
        adresse = (data.get('adresse') or '').strip()
        culture = (data.get('culture') or '').strip()
        lat = str(data.get('lat') or data.get('latitude') or '').strip()
        lng = str(data.get('lng') or data.get('longitude') or '').strip()
        area_raw = str(data.get('surface') or '').strip()

        if not name:
            return JsonResponse({'success': False, 'error': 'Le nom de la ferme est obligatoire.'}, status=400)

        area_number = ''.join(ch for ch in area_raw if ch.isdigit() or ch in '.,-')
        area_number = area_number.replace(',', '.') if area_number else '0'
        try:
            area_value = Decimal(area_number or '0')
        except InvalidOperation:
            return JsonResponse({'success': False, 'error': 'Superficie invalide.'}, status=400)

        latitude = None
        longitude = None
        if lat or lng:
            if not (lat and lng):
                return JsonResponse({'success': False, 'error': 'Latitude et longitude sont nécessaires ensemble.'}, status=400)
            try:
                latitude = Decimal(str(lat).replace(',', '.'))
                longitude = Decimal(str(lng).replace(',', '.'))
            except InvalidOperation:
                return JsonResponse({'success': False, 'error': 'Coordonnées invalides.'}, status=400)

        meta_parts = []
        if wilaya:
            meta_parts.append(f'Wilaya: {wilaya}')
        if lieu:
            meta_parts.append(f'Lieu: {lieu}')
        if commune:
            meta_parts.append(f'Commune: {commune}')
        if adresse:
            meta_parts.append(f'Adresse: {adresse}')
        if culture:
            meta_parts.append(f'Culture: {culture}')
        if latitude is not None and longitude is not None:
            meta_parts.append(f'Coords: {latitude},{longitude}')

        farm = Farm.objects.create(
            profile=profile,
            name=name,
            surface=area_value,
            main_products=' | '.join(meta_parts),
            wilaya=wilaya or None,
            lieu=lieu or None,
            commune=commune or None,
            adresse=adresse or None,
            culture=culture or None,
            latitude=latitude,
            longitude=longitude,
        )
        return JsonResponse({'success': True, 'farm': serialize_farm(farm)})
    except Exception as exc:
        return JsonResponse({'success': False, 'error': f"Erreur serveur: {exc}"}, status=500)


@login_required
def acheteur_view(request):
    try:
        profile = request.user.profile
    except Exception:
        return redirect('home')
    if profile.role != 'acheteur':
        return redirect('home')
    return render(request, 'achateure.html', {'initial_profile': build_profile_payload(request, request.user)})


@login_required
def transporteur_view(request):
    try:
        profile = request.user.profile
    except Exception:
        return redirect('home')
    if profile.role != 'transporteur':
        return redirect('home')
    return render(request, 'transporteur.html', {'initial_profile': build_profile_payload(request, request.user)})


@login_required
def veterinaire_view(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        return redirect('home')
    if profile.role != 'autres' or profile.other_type != 'veterinaire':
        return redirect('home')
    return render(request, 'veterinaire.html', {'initial_profile': build_profile_payload(request, request.user)})


@login_required
def organisation_view(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        return redirect('home')
    if profile.role != 'autres' or profile.other_type != 'organisation':
        return redirect('home')
    return render(request, 'organisation.html', {'initial_profile': build_profile_payload(request, request.user)})


@login_required
def admin_dynamic_stats(request):
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'success': False, 'error': 'Acces refuse'}, status=403)
    from django.db.models import Sum
    from app.produits.models import Produit, ProduitAgriculteur, Commande
    profiles = Profile.objects.all()
    total_sales = Commande.objects.aggregate(total=Sum('total')).get('total') or 0
    return JsonResponse({
        'success': True,
        'kpis': {
            'total_ventes': float(total_sales),
            'total_utilisateurs': profiles.count(),
            'total_utilisateurs_valides': profiles.filter(is_approved=True, is_rejected=False).count(),
            'total_utilisateurs_attente': profiles.filter(is_approved=False, is_rejected=False).count(),
            'total_produits': Produit.objects.count() + ProduitAgriculteur.objects.count(),
            'produits_officiels': Produit.objects.count(),
            'produits_publies': ProduitAgriculteur.objects.count(),
            'total_commandes': Commande.objects.count(),
        }
    })


@login_required
def adminpage_view(request):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('home')

    pending_users = Profile.objects.filter(
        is_approved=False,
        is_rejected=False
    ).select_related('user').prefetch_related('farms').order_by('-id')

    approved_users = Profile.objects.filter(
        is_approved=True
    ).select_related('user').prefetch_related('farms').order_by('-id')

    rejected_users = Profile.objects.filter(
        is_rejected=True
    ).select_related('user').prefetch_related('farms').order_by('-id')

    return render(request, 'admin.html', {
        'pending_users': pending_users,
        'approved_users': approved_users,
        'rejected_users': rejected_users,
        'initial_profile': build_profile_payload(request, request.user),
    })


@login_required
@require_POST
def approve_user(request, id):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('home')

    profile = get_object_or_404(Profile, id=id)
    profile.is_approved = True
    profile.is_rejected = False
    profile.save()

    messages.success(request, f"Compte de {profile.user.email} validé.")
    return redirect('adminpage')


@login_required
@require_POST
def reject_user(request, id):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('home')

    profile = get_object_or_404(Profile, id=id)
    profile.is_approved = False
    profile.is_rejected = True
    profile.save()

    messages.success(request, f"Compte de {profile.user.email} rejeté.")
    return redirect('adminpage')

