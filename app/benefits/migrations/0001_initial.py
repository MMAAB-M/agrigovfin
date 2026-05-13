# Generated for AgriGov benefits module
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Benefit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=160, verbose_name='Nom de l’avantage')),
                ('description', models.TextField(verbose_name='Description')),
                ('conditions', models.TextField(blank=True, verbose_name='Conditions')),
                ('documents_required', models.TextField(blank=True, verbose_name='Documents requis')),
                ('image', models.ImageField(blank=True, null=True, upload_to='benefits/', verbose_name='Photo')),
                ('default_image', models.CharField(blank=True, help_text='Image statique par défaut, ex: images/benefits/credit.svg', max_length=255)),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_benefits', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Avantage', 'verbose_name_plural': 'Avantages', 'ordering': ['id']},
        ),
        migrations.CreateModel(
            name='BenefitRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=180, verbose_name='Nom complet')),
                ('phone', models.CharField(blank=True, max_length=40, verbose_name='Téléphone')),
                ('wilaya', models.CharField(blank=True, max_length=120, verbose_name='Wilaya')),
                ('project_description', models.TextField(blank=True, verbose_name='Description du projet')),
                ('document', models.FileField(blank=True, null=True, upload_to='benefit_requests/', verbose_name='Document justificatif')),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('accepted', 'Acceptée'), ('rejected', 'Refusée')], default='pending', max_length=20)),
                ('admin_note', models.TextField(blank=True, verbose_name='Note admin')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('benefit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requests', to='benefits.benefit')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='benefit_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Demande d’avantage', 'verbose_name_plural': 'Demandes d’avantages', 'ordering': ['-created_at']},
        ),
    ]
