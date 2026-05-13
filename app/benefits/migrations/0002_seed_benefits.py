from django.db import migrations


def seed_benefits(apps, schema_editor):
    Benefit = apps.get_model('benefits', 'Benefit')
    items = [
        {
            'title': 'Crédits subventionnés',
            'description': 'Prêts à taux réduit pour financer les projets agricoles, l’achat des semences et le matériel de production.',
            'conditions': 'Être agriculteur enregistré. Présenter un projet agricole viable. Ne pas avoir de dettes fiscales importantes.',
            'documents_required': 'Carte d’identité; Carte ou registre agricole; Plan du projet; Devis ou facture proforma',
            'default_image': 'images/benefits/credit.svg',
        },
        {
            'title': 'Octroi des terres agricoles',
            'description': 'Mise à disposition de terres agricoles à long terme pour développer l’exploitation et augmenter la production.',
            'conditions': 'Être agriculteur ou porteur de projet. Déposer un dossier foncier complet. Respecter le cahier des charges.',
            'documents_required': 'Carte d’identité; Demande manuscrite; Étude du projet; Justificatif de compétence agricole',
            'default_image': 'images/benefits/land.svg',
        },
        {
            'title': 'Soutien aux équipements agricoles',
            'description': 'Aide à l’acquisition de tracteurs, machines et outils modernes pour améliorer le rendement agricole.',
            'conditions': 'Avoir une exploitation active. Justifier le besoin du matériel. Respecter les normes d’utilisation.',
            'documents_required': 'Carte agricole; Devis du matériel; Fiche technique; Attestation d’exploitation',
            'default_image': 'images/benefits/equipment.svg',
        },
        {
            'title': 'Soutien à l’irrigation',
            'description': 'Aides pour le forage de puits, l’installation de goutte-à-goutte et les systèmes d’économie d’eau.',
            'conditions': 'Avoir une parcelle agricole. Fournir un plan d’irrigation. Obtenir les autorisations nécessaires.',
            'documents_required': 'Plan de la parcelle; Autorisation de forage si nécessaire; Devis installation; Carte agricole',
            'default_image': 'images/benefits/irrigation.svg',
        },
        {
            'title': 'Assurance agricole',
            'description': 'Couverture contre les risques climatiques, les catastrophes naturelles et les pertes de récolte.',
            'conditions': 'Déclarer les cultures ou activités assurées. Fournir les informations de l’exploitation. Respecter les délais de déclaration.',
            'documents_required': 'Carte d’identité; Carte agricole; Déclaration de culture; Informations sur l’exploitation',
            'default_image': 'images/benefits/insurance.svg',
        },
    ]
    for item in items:
        Benefit.objects.get_or_create(title=item['title'], defaults=item)


def unseed_benefits(apps, schema_editor):
    Benefit = apps.get_model('benefits', 'Benefit')
    Benefit.objects.filter(title__in=[
        'Crédits subventionnés',
        'Octroi des terres agricoles',
        'Soutien aux équipements agricoles',
        'Soutien à l’irrigation',
        'Assurance agricole',
    ]).delete()


class Migration(migrations.Migration):
    dependencies = [('benefits', '0001_initial')]
    operations = [migrations.RunPython(seed_benefits, unseed_benefits)]
