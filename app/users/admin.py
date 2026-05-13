from django.contrib import admin
from .models import Profile, Farm, BuyerInfo, TransporterInfo, VehicleDocument


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone', 'is_approved', 'is_rejected')
    list_filter = ('role', 'is_approved', 'is_rejected')
    search_fields = ('user__username', 'user__email', 'phone', 'birth_city')


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ('name', 'profile', 'surface')


@admin.register(BuyerInfo)
class BuyerInfoAdmin(admin.ModelAdmin):
    list_display = ('profile', 'workplace', 'establishment_name')


@admin.register(TransporterInfo)
class TransporterInfoAdmin(admin.ModelAdmin):
    list_display = ('profile', 'vehicle_name')


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'transporter', 'document')