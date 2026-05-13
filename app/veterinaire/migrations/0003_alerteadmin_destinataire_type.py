from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('veterinaire', '0002_veterinaireprofile_tarif_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='alerteadmin',
            name='destinataire_type',
            field=models.CharField(
                choices=[
                    ('veterinaire', 'Vétérinaire'),
                    ('organisateur', 'Organisateur'),
                    ('tous', 'Tous'),
                ],
                default='veterinaire',
                max_length=20,
            ),
        ),
    ]
