<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\String\Slugger\SluggerInterface;

/**
 * Téléverse une photo d'activité dans `public/uploads/activities/` et renvoie
 * le chemin public à enregistrer sur l'entité Activity (champ imageUrl).
 */
final class ActivityPhotoUploader
{
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

    public function __construct(
        private readonly SluggerInterface $slugger,
        private readonly string $uploadDir,
        private readonly string $publicPathPrefix,
    ) {
    }

    public function upload(UploadedFile $file): string
    {
        if (!$file->isValid()) {
            throw new FileException(sprintf('Téléversement invalide : %s', $file->getErrorMessage()));
        }

        $size = $file->getSize();
        if (false !== $size && $size > self::MAX_BYTES) {
            throw new FileException('La photo dépasse la taille maximale autorisée (5 Mo).');
        }

        $mime = $file->getMimeType() ?? '';
        if (!array_key_exists($mime, self::ALLOWED_MIME)) {
            throw new FileException(sprintf('Type de fichier non autorisé (%s). Formats acceptés : JPG, PNG, WEBP, GIF.', $mime ?: 'inconnu'));
        }

        $extension = self::ALLOWED_MIME[$mime];
        $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = $this->slugger->slug($original)->lower()->toString();
        if ('' === $safeName) {
            $safeName = 'activity';
        }
        $filename = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0o775, true) && !is_dir($this->uploadDir)) {
            throw new FileException(sprintf('Impossible de créer le dossier de destination : %s', $this->uploadDir));
        }

        $file->move($this->uploadDir, $filename);

        return rtrim($this->publicPathPrefix, '/') . '/' . $filename;
    }
}
