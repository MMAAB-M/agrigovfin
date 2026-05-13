from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('produits', '0005_produitagriculteur_agriculteur_commande_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Catalogue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100, unique=True)),
            ],
            options={'ordering': ['nom']},
        ),
    ]
