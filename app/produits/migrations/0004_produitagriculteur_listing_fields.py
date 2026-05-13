from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('produits', '0003_remove_produitagriculteur_agriculteur'),
    ]

    operations = [
        migrations.AddField(
            model_name='produitagriculteur',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='produitagriculteur',
            name='photo',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='produitagriculteur',
            name='vendeur_nom',
            field=models.CharField(blank=True, default='Agriculteur', max_length=150),
        ),
        migrations.AlterField(
            model_name='produitagriculteur',
            name='produit',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='annonces', to='produits.produit'),
        ),
    ]
