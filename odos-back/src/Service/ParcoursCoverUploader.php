<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Téléverse la pochette d'un parcours dans `public/uploads/parcours/` et renvoie
 * le chemin public à enregistrer sur l'entité Parcours (champ coverImageUrl).
 *
 * Mêmes garde-fous que {@see UserAvatarUploader} : whitelist MIME (jpg/png/webp),
 * taille max, nom de fichier reconstruit côté serveur (anti path-traversal),
 * extension dérivée du MIME détecté. Service stateless (le nettoyage de l'ancienne
 * pochette est géré par le contrôleur).
 */
final class ParcoursCoverUploader
{
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_BYTES = 4 * 1024 * 1024; // 4 MiB (pochette = visuel plus grand qu'un avatar)

    public function __construct(
        private readonly string $uploadDir,
        private readonly string $publicPathPrefix,
    ) {
    }

    /**
     * @throws FileException si l'upload est invalide (format, taille, IO)
     */
    public function upload(UploadedFile $file, int $parcoursId): string
    {
        if (!$file->isValid()) {
            throw new FileException(sprintf('Téléversement invalide : %s', $file->getErrorMessage()));
        }

        $size = $file->getSize();
        if (false !== $size && $size > self::MAX_BYTES) {
            throw new FileException('La pochette dépasse la taille maximale autorisée (4 Mo).');
        }

        $mime = $file->getMimeType() ?? '';
        if (!\array_key_exists($mime, self::ALLOWED_MIME)) {
            throw new FileException(sprintf(
                'Type de fichier non autorisé (%s). Formats acceptés : JPG, PNG, WEBP.',
                '' !== $mime ? $mime : 'inconnu'
            ));
        }

        $extension = self::ALLOWED_MIME[$mime];
        $filename = sprintf('p%d-%s.%s', $parcoursId, bin2hex(random_bytes(8)), $extension);

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0o775, true) && !is_dir($this->uploadDir)) {
            throw new FileException(sprintf('Impossible de créer le dossier de destination : %s', $this->uploadDir));
        }

        $file->move($this->uploadDir, $filename);

        return rtrim($this->publicPathPrefix, '/').'/'.$filename;
    }
}
