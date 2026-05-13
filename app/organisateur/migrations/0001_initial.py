from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0002_farm_adresse_farm_commune_farm_culture_farm_latitude_and_more'),
        ('veterinaire', '0003_alerteadmin_destinataire_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='TourneeOrganisateur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=255, verbose_name='Nom de la tournee')),
                ('date_debut', models.DateField(verbose_name='Date de debut')),
                ('date_fin', models.DateField(verbose_name='Date de fin')),
                ('wilaya', models.CharField(blank=True, max_length=2, verbose_name='Wilaya')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
                ('statut', models.CharField(
                    choices=[
                        ('planifiee', 'Planifiee'),
                        ('en_cours', 'En cours'),
                        ('terminee', 'Terminee'),
                        ('annulee', 'Annulee'),
                    ],
                    default='planifiee',
                    max_length=20,
                )),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('organisateur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tournees_organisateur',
                    to='users.profile',
                )),
                ('alerte', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tournees_organisateur',
                    to='veterinaire.alerteadmin',
                )),
            ],
            options={
                'verbose_name': 'Tournee Organisateur',
                'verbose_name_plural': 'Tournees Organisateurs',
                'ordering': ['-date_creation'],
            },
        ),
    ]
