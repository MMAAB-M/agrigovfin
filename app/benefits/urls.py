from django.urls import path
from . import views

urlpatterns = [
    path('benefits/', views.api_benefits, name='api_benefits'),
    path('benefits/<int:benefit_id>/request/', views.api_create_request, name='api_create_benefit_request'),
    path('benefits/my-requests/', views.api_my_requests, name='api_my_benefit_requests'),
    path('admin/benefits/create/', views.api_admin_create_benefit, name='api_admin_create_benefit'),
    path('admin/benefits/<int:benefit_id>/update/', views.api_admin_update_benefit, name='api_admin_update_benefit'),
    path('admin/benefits/<int:benefit_id>/delete/', views.api_admin_delete_benefit, name='api_admin_delete_benefit'),
    path('admin/benefit-requests/', views.api_admin_requests, name='api_admin_benefit_requests'),
    path('admin/benefit-requests/<int:request_id>/<str:status>/', views.api_update_request_status, name='api_admin_update_benefit_request_status'),
]
