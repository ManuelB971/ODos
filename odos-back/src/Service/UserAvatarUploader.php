<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Téléverse un avatar utilisateur dans `public/uploads/avatars/` et renvoie
 * le chemin public à enregistrer sur l'entité User (champ avatarUrl).
 *
 * Politiques de sécurité :
 *  - Whitelist de types MIME (jpg/png/webp — pas de GIF pour éviter d'énormes
 *    animés sur un avatar, pas de SVG pour éviter l'XSS vectoriel).
 *  - Taille maxi 2 MiB (avatar, pas photo produit).
 *  - Nom final reconstruit à partir d'un slug + 12 hex random → impossible
 *    d'injecter un nom de fichier arbitraire (path traversal, exec côté web,
 *    écrasement d'un autre fichier…).
 *  - Extension dérivée du MIME **détecté par le serveur** (jamais du
 *    `getClientOriginalExtension()` qui vient du client).
 *  - Le service ne supprime pas les anciens avatars ici ; c'est au controller
 *    de gérer le nettoyage éventuel, pour garder cet objet stateless et testable.
 */
final class UserAvatarUploader
{
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

    public function __construct(
        private readonly string $uploadDir,
        private readonly string $publicPathPrefix,
    ) {
    }

    /**
     * @throws FileException si l'upload est invalide (format, taille, IO)
     */
    public function upload(UploadedFile $file, int $userId): string
    {
        if (!$file->isValid()) {
            throw new FileException(sprintf('Téléversement invalide : %s', $file->getErrorMessage()));
        }

        $size = $file->getSize();
        if (false !== $size && $size > self::MAX_BYTES) {
            throw new FileException('La photo dépasse la taille maximale autorisée (2 Mo).');
        }

        $mime = $file->getMimeType() ?? '';
        if (!array_key_exists($mime, self::ALLOWED_MIME)) {
            throw new FileException(sprintf(
                'Type de fichier non autorisé (%s). Formats acceptés : JPG, PNG, WEBP.',
                $mime ?: 'inconnu'
            ));
        }

        $extension = self::ALLOWED_MIME[$mime];
        // Nom purement basé sur `userId` + hex random : on ne réutilise jamais
        // le nom original donné par le client (protection path traversal /
        // collision de nommage).
        $filename = sprintf('u%d-%s.%s', $userId, bin2hex(random_bytes(8)), $extension);

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0o775, true) && !is_dir($this->uploadDir)) {
            throw new FileException(sprintf('Impossible de créer le dossier de destination : %s', $this->uploadDir));
        }

        $file->move($this->uploadDir, $filename);

        return rtrim($this->publicPathPrefix, '/') . '/' . $filename;
    }
}
