import json
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST
from .models import Benefit, BenefitRequest


def user_role(user):
    try:
        return user.profile.role
    except Exception:
        return 'admin' if (user.is_staff or user.is_superuser) else ''


def is_admin_user(user):
    return user.is_staff or user.is_superuser or user_role(user) == 'admin'


def serialize_benefit(benefit):
    return {
        'id': benefit.id,
        'title': benefit.title,
        'description': benefit.description,
        'conditions': benefit.conditions,
        'documents_required': benefit.documents_required,
        'image_url': benefit.image_url,
        'is_active': benefit.is_active,
        'created_at': benefit.created_at.strftime('%Y-%m-%d'),
    }


def serialize_request(req):
    return {
        'id': req.id,
        'benefit_id': req.benefit_id,
        'benefit_title': req.benefit.title,
        'benefit_image_url': req.benefit.image_url,
        'user_id': req.user_id,
        'username': req.user.get_full_name() or req.user.username,
        'full_name': req.full_name,
        'phone': req.phone,
        'wilaya': req.wilaya,
        'project_description': req.project_description,
        'document_url': req.document.url if req.document else '',
        'status': req.status,
        'status_label': req.get_status_display(),
        'admin_note': req.admin_note,
        'created_at': req.created_at.strftime('%Y-%m-%d %H:%M'),
    }


@login_required
@require_http_methods(['GET'])
def api_benefits(request):
    benefits = Benefit.objects.filter(is_active=True).order_by('id')
    return JsonResponse({'success': True, 'benefits': [serialize_benefit(b) for b in benefits]})


@csrf_exempt
@login_required
@require_http_methods(['POST'])
def api_create_request(request, benefit_id):
    if user_role(request.user) != 'agriculteur':
        return JsonResponse({'success': False, 'error': 'Accès réservé aux agriculteurs.'}, status=403)

    benefit = get_object_or_404(Benefit, id=benefit_id, is_active=True)
    full_name = (request.POST.get('full_name') or request.user.get_full_name() or request.user.username).strip()
    phone = (request.POST.get('phone') or '').strip()
    wilaya = (request.POST.get('wilaya') or '').strip()
    project_description = (request.POST.get('project_description') or '').strip()

    if not full_name:
        return JsonResponse({'success': False, 'error': 'Le nom complet est obligatoire.'}, status=400)

    req = BenefitRequest.objects.create(
        user=request.user,
        benefit=benefit,
        full_name=full_name,
        phone=phone,
        wilaya=wilaya,
        project_description=project_description,
        document=request.FILES.get('document'),
    )
    return JsonResponse({'success': True, 'message': 'Demande envoyée avec succès.', 'request': serialize_request(req)})


@login_required
@require_http_methods(['GET'])
def api_my_requests(request):
    if user_role(request.user) != 'agriculteur':
        return JsonResponse({'success': False, 'error': 'Accès réservé aux agriculteurs.'}, status=403)
    requests = BenefitRequest.objects.filter(user=request.user).select_related('benefit', 'user')
    return JsonResponse({'success': True, 'requests': [serialize_request(r) for r in requests]})


@login_required
@require_http_methods(['GET'])
def api_admin_requests(request):
    if not is_admin_user(request.user):
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)
    requests = BenefitRequest.objects.select_related('benefit', 'user').all()
    return JsonResponse({'success': True, 'requests': [serialize_request(r) for r in requests]})


@csrf_exempt
@login_required
@require_http_methods(['POST'])
def api_admin_create_benefit(request):
    if not is_admin_user(request.user):
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)
    title = (request.POST.get('title') or '').strip()
    description = (request.POST.get('description') or '').strip()
    conditions = (request.POST.get('conditions') or '').strip()
    documents_required = (request.POST.get('documents_required') or '').strip()
    if not title or not description:
        return JsonResponse({'success': False, 'error': 'Titre et description obligatoires.'}, status=400)
    benefit = Benefit.objects.create(
        title=title,
        description=description,
        conditions=conditions,
        documents_required=documents_required,
        image=request.FILES.get('image'),
        created_by=request.user,
    )
    return JsonResponse({'success': True, 'benefit': serialize_benefit(benefit)})


@csrf_exempt
@login_required
@require_http_methods(['POST'])
def api_admin_update_benefit(request, benefit_id):
    if not is_admin_user(request.user):
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)
    benefit = get_object_or_404(Benefit, id=benefit_id)
    for field in ['title', 'description', 'conditions', 'documents_required']:
        if field in request.POST:
            setattr(benefit, field, request.POST.get(field, '').strip())
    if 'is_active' in request.POST:
        benefit.is_active = request.POST.get('is_active') in ['true', '1', 'on', 'yes']
    if request.FILES.get('image'):
        benefit.image = request.FILES['image']
    benefit.save()
    return JsonResponse({'success': True, 'benefit': serialize_benefit(benefit)})


@csrf_exempt
@login_required
@require_http_methods(['POST'])
def api_admin_delete_benefit(request, benefit_id):
    if not is_admin_user(request.user):
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)
    benefit = get_object_or_404(Benefit, id=benefit_id)
    benefit.is_active = False
    benefit.save(update_fields=['is_active'])
    return JsonResponse({'success': True, 'message': 'Avantage désactivé.'})


@csrf_exempt
@login_required
@require_http_methods(['POST'])
def api_update_request_status(request, request_id, status):
    if not is_admin_user(request.user):
        return JsonResponse({'success': False, 'error': 'Accès refusé.'}, status=403)
    if status not in [BenefitRequest.STATUS_ACCEPTED, BenefitRequest.STATUS_REJECTED, BenefitRequest.STATUS_PENDING]:
        return JsonResponse({'success': False, 'error': 'Statut invalide.'}, status=400)
    req = get_object_or_404(BenefitRequest, id=request_id)
    req.status = status
    req.admin_note = request.POST.get('admin_note', req.admin_note)
    req.save()
    return JsonResponse({'success': True, 'request': serialize_request(req)})
