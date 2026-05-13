from django.contrib import admin
from .models import Benefit, BenefitRequest


@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')


@admin.register(BenefitRequest)
class BenefitRequestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'benefit', 'status', 'created_at')
    list_filter = ('status', 'benefit')
    search_fields = ('full_name', 'phone', 'wilaya', 'benefit__title')
