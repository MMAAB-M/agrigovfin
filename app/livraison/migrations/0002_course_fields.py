# Generated manually for AgriGov course workflow
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('livraison', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='demandetransporteur',
            name='details_course',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='demandetransporteur',
            name='distance_km',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='demandetransporteur',
            name='prix_estime',
            field=models.FloatField(default=0),
        ),
    ]
