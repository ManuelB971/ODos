<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\String\Slugger\SluggerInterface;

/**
 * Téléverse une image de badge dans public/uploads/badges/.
 */
final class BadgePhotoUploader
{
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    private const MAX_BYTES = 2 * 1024 * 1024;

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
            throw new FileException('L\'image dépasse 2 Mo.');
        }

        $mime = $file->getMimeType() ?? '';
        if (!array_key_exists($mime, self::ALLOWED_MIME)) {
            throw new FileException(sprintf('Type non autorisé (%s).', $mime ?: 'inconnu'));
        }

        $extension = self::ALLOWED_MIME[$mime];
        $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = $this->slugger->slug($original)->lower()->toString();
        if ('' === $safeName) {
            $safeName = 'badge';
        }
        $filename = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0o775, true) && !is_dir($this->uploadDir)) {
            throw new FileException(sprintf('Impossible de créer le dossier : %s', $this->uploadDir));
        }

        $file->move($this->uploadDir, $filename);

        return rtrim($this->publicPathPrefix, '/').'/'.$filename;
    }
}
