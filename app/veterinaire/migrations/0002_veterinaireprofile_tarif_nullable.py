from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('veterinaire', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='veterinaireprofile',
            name='tarif_consultation',
            field=models.DecimalField(
                max_digits=8,
                decimal_places=2,
                null=True,
                blank=True,
                default=None,
                verbose_name='Tarif de consultation (DA)',
            ),
        ),
    ]
