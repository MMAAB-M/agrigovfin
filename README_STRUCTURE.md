# Structure nettoyee

Les applications Django ont ete regroupees dans le dossier `app/` :

- `app/users/`
- `app/produits/`
- `app/livraison/`
- `app/benefits/`
- `app/adminpanel/`

Les doublons inutiles supprimes :

- ancien dossier `apps/`
- copies de code dans `media/Agrigovfin/`, `media/adminpanel/`, `media/apps/`, `media/livraison/`
- dossiers `__pycache__/`

Les fichiers `settings.py`, `urls.py` et les imports Python ont ete adaptes pour la nouvelle structure.
