#!/bin/bash

EMAIL="infos@ciscar.fr"

# Mode dry run par défaut
DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "🔹 Mode dry run activé"
fi

# Domaines à cibler
DOMAINS=("pim.ciscar.fr" "pim-oauth.ciscar.fr")

echo "🔹 Domaines ciblés : ${DOMAINS[*]}"

# Boucle sur chaque domaine
for domain in "${DOMAINS[@]}"; do
    echo "🔹 Tentative de création pour : $domain"
    echo "sudo certbot certonly --nginx -d $domain --email $EMAIL --agree-tos --non-interactive $DRY_RUN"

    # Exécution réelle
    sudo certbot certonly --nginx -d "$domain" --email "$EMAIL" --agree-tos --non-interactive $DRY_RUN

    # Vérifier si Certbot a réussi
    if [[ $? -eq 0 ]]; then
        echo "✅ Certificat généré pour $domain"
    else
        echo "⚠️ Échec pour $domain"
    fi
done