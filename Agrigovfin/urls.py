from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import HttpResponse
import os


def serve_sw(request):
    """Serve service worker from root with correct scope header."""
    sw_path = os.path.join(settings.BASE_DIR, 'static', 'sw.js')
    with open(sw_path, 'r') as f:
        content = f.read()
    response = HttpResponse(content, content_type='application/javascript')
    response['Service-Worker-Allowed'] = '/'
    return response


def serve_manifest(request):
    """Serve manifest.json from root."""
    manifest_path = os.path.join(settings.BASE_DIR, 'static', 'manifest.json')
    with open(manifest_path, 'r') as f:
        content = f.read()
    return HttpResponse(content, content_type='application/manifest+json')


urlpatterns = [
    path('sw.js', serve_sw, name='service_worker'),
    path('manifest.json', serve_manifest, name='manifest'),
    path('admin/', admin.site.urls),
    path('', include('app.users.urls')),
    path('api/produits/', include('app.produits.urls')),
    path('livraison/', include('app.livraison.urls')),
    path('api/', include('app.benefits.urls')),
    path('', include('app.veterinaire.urls')),
    path('', include('app.organisateur.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)