<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Category;
use App\Repository\CategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Service en charge d'importer un lot d'activités depuis un fichier Excel (.xlsx, .xls)
 * ou CSV.
 *
 * Colonnes attendues (en-tête en première ligne, ordre libre, insensible à la casse) :
 *   - name            (obligatoire)
 *   - description     (obligatoire)
 *   - latitude        (obligatoire)
 *   - longitude       (obligatoire)
 *   - category        (obligatoire — nom de la catégorie, créée si introuvable)
 *   - city            (optionnel)
 *   - price           (optionnel, EUR)
 *   - image_url       (optionnel)
 *   - date_start      (optionnel, format Y-m-d H:i ou Y-m-d, ou date Excel)
 *   - date_end        (optionnel)
 *   - is_published    (optionnel — 1/0, true/false, oui/non — défaut true)
 */
final class ActivityImportService
{
    /**
     * Colonnes reconnues, normalisées (snake_case, sans accent).
     * @var array<string, list<string>>
     */
    private const COLUMN_ALIASES = [
        'name'         => ['name', 'nom', 'titre', 'title'],
        'description'  => ['description', 'desc'],
        'latitude'     => ['latitude', 'lat'],
        'longitude'    => ['longitude', 'lng', 'lon', 'long'],
        'city'         => ['city', 'ville'],
        'category'     => ['category', 'categorie', 'cat'],
        'price'        => ['price', 'prix'],
        'image_url'    => ['image_url', 'image', 'photo', 'photo_url', 'imageurl'],
        'date_start'   => ['date_start', 'datestart', 'date_debut', 'datedebut', 'debut', 'start'],
        'date_end'     => ['date_end', 'dateend', 'date_fin', 'datefin', 'fin', 'end'],
        'is_published' => ['is_published', 'ispublished', 'publie', 'publiee', 'published'],
    ];

    private const REQUIRED_FIELDS = ['name', 'description', 'latitude', 'longitude', 'category'];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CategoryRepository $categoryRepository,
    ) {
    }

    /**
     * Lance un import depuis un fichier téléversé.
     *
     * @return ActivityImportResult
     */
    public function import(UploadedFile $file, bool $createMissingCategories = true): ActivityImportResult
    {
        $result = new ActivityImportResult();

        try {
            $rows = $this->readRows($file);
        } catch (\Throwable $e) {
            $result->fatalError = sprintf('Lecture du fichier impossible : %s', $e->getMessage());
            return $result;
        }

        if (count($rows) < 2) {
            $result->fatalError = 'Le fichier est vide ou ne contient pas de données après l\'en-tête.';
            return $result;
        }

        $header = array_shift($rows);
        $columnMap = $this->mapHeader($header);

        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($columnMap));
        if (!empty($missing)) {
            $result->fatalError = sprintf(
                'Colonnes obligatoires manquantes : %s. Colonnes attendues : %s.',
                implode(', ', $missing),
                implode(', ', array_keys(self::COLUMN_ALIASES)),
            );
            return $result;
        }

        // Cache des catégories par nom normalisé.
        $categoriesCache = [];
        foreach ($this->categoryRepository->findAll() as $cat) {
            $categoriesCache[$this->normalizeKey($cat->getName() ?? '')] = $cat;
        }

        $lineNumber = 1; // 1 = en-tête
        foreach ($rows as $row) {
            $lineNumber++;

            // Ignore les lignes totalement vides
            if (count(array_filter($row, static fn ($v) => null !== $v && '' !== trim((string) $v))) === 0) {
                continue;
            }

            $data = [];
            foreach ($columnMap as $field => $colIndex) {
                $data[$field] = $row[$colIndex] ?? null;
            }

            try {
                $activity = $this->buildActivity($data, $categoriesCache, $createMissingCategories);
                $this->entityManager->persist($activity);
                $result->createdCount++;
            } catch (\InvalidArgumentException $e) {
                $result->errors[] = sprintf('Ligne %d : %s', $lineNumber, $e->getMessage());
                $result->skippedCount++;
            }
        }

        if ($result->createdCount > 0) {
            $this->entityManager->flush();
        }

        return $result;
    }

    /**
     * Lit les lignes brutes (chaque ligne = liste indexée des cellules) depuis CSV ou XLSX.
     *
     * @return list<list<scalar|null>>
     */
    private function readRows(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: '');

        if ('csv' === $extension || 'txt' === $extension) {
            return $this->readCsv($file->getRealPath());
        }

        if (!in_array($extension, ['xlsx', 'xls', 'ods'], true)) {
            throw new \RuntimeException(sprintf('Extension non supportée : "%s". Utilisez .xlsx, .xls, .ods ou .csv.', $extension));
        }

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
        } catch (ReaderException $e) {
            throw new \RuntimeException('Le fichier Excel est illisible ou corrompu.', 0, $e);
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = [];
        foreach ($sheet->toArray(null, true, true, false) as $row) {
            $rows[] = array_map(
                static fn (mixed $value): bool|float|int|string|null => is_scalar($value) || null === $value ? $value : (string) $value,
                array_values($row)
            );
        }

        return $rows;
    }

    /**
     * @return list<list<scalar|null>>
     */
    private function readCsv(string $path): array
    {
        $rows = [];
        $handle = fopen($path, 'rb');
        if (false === $handle) {
            throw new \RuntimeException('Ouverture du fichier CSV impossible.');
        }

        // Détection simple du séparateur (virgule ou point-virgule)
        $firstLine = fgets($handle) ?: '';
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';
        rewind($handle);

        // BOM UTF-8 éventuel
        $bom = fread($handle, 3);
        if ("\xEF\xBB\xBF" !== $bom) {
            rewind($handle);
        }

        while (false !== ($row = fgetcsv($handle, 0, $delimiter, '"', '\\'))) {
            $rows[] = array_map(static fn ($v) => null === $v ? null : (string) $v, $row);
        }
        fclose($handle);

        return $rows;
    }

    /**
     * @param list<scalar|null> $header
     * @return array<string, int>
     */
    private function mapHeader(array $header): array
    {
        $map = [];
        foreach ($header as $index => $name) {
            $key = $this->normalizeKey((string) $name);
            foreach (self::COLUMN_ALIASES as $field => $aliases) {
                if (in_array($key, $aliases, true)) {
                    $map[$field] = $index;
                    break;
                }
            }
        }
        return $map;
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, Category> $categoriesCache
     */
    private function buildActivity(array $data, array &$categoriesCache, bool $createMissingCategories): Activity
    {
        $name        = $this->trimOrNull($data['name'] ?? null);
        $description = $this->trimOrNull($data['description'] ?? null);
        $latitude    = $this->parseFloat($data['latitude'] ?? null);
        $longitude   = $this->parseFloat($data['longitude'] ?? null);
        $categoryName = $this->trimOrNull($data['category'] ?? null);

        if (null === $name) {
            throw new \InvalidArgumentException('le nom est obligatoire.');
        }
        if (null === $description) {
            throw new \InvalidArgumentException('la description est obligatoire.');
        }
        if (null === $latitude || $latitude < -90 || $latitude > 90) {
            throw new \InvalidArgumentException('latitude invalide (doit être entre -90 et 90).');
        }
        if (null === $longitude || $longitude < -180 || $longitude > 180) {
            throw new \InvalidArgumentException('longitude invalide (doit être entre -180 et 180).');
        }
        if (null === $categoryName) {
            throw new \InvalidArgumentException('la catégorie est obligatoire.');
        }

        $catKey = $this->normalizeKey($categoryName);
        $category = $categoriesCache[$catKey] ?? null;
        if (null === $category) {
            if (!$createMissingCategories) {
                throw new \InvalidArgumentException(sprintf('catégorie inconnue "%s".', $categoryName));
            }
            $category = (new Category())->setName($categoryName);
            $this->entityManager->persist($category);
            $categoriesCache[$catKey] = $category;
        }

        $activity = new Activity();
        $activity->setName($name)
            ->setDescription($description)
            ->setLatitude($latitude)
            ->setLongitude($longitude)
            ->setCategory($category)
            ->setCity($this->trimOrNull($data['city'] ?? null))
            ->setPrice($this->parseFloat($data['price'] ?? null))
            ->setImageUrl($this->trimOrNull($data['image_url'] ?? null))
            ->setDateStart($this->parseDate($data['date_start'] ?? null))
            ->setDateEnd($this->parseDate($data['date_end'] ?? null))
            ->setIsPublished($this->parseBool($data['is_published'] ?? null, true));

        return $activity;
    }

    private function trimOrNull(mixed $value): ?string
    {
        if (null === $value) {
            return null;
        }
        $s = trim((string) $value);
        return '' === $s ? null : $s;
    }

    private function parseFloat(mixed $value): ?float
    {
        if (null === $value || '' === $value) {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        // Accepte la virgule décimale française
        $normalized = str_replace([' ', "\u{00A0}"], '', (string) $value);
        $normalized = str_replace(',', '.', $normalized);
        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function parseBool(mixed $value, bool $default): bool
    {
        if (null === $value || '' === $value) {
            return $default;
        }
        $v = strtolower(trim((string) $value));
        if (in_array($v, ['1', 'true', 'vrai', 'oui', 'yes', 'y', 'on'], true)) {
            return true;
        }
        if (in_array($v, ['0', 'false', 'faux', 'non', 'no', 'n', 'off'], true)) {
            return false;
        }
        return $default;
    }

    private function parseDate(mixed $value): ?\DateTimeInterface
    {
        if (null === $value || '' === $value) {
            return null;
        }

        // Date numérique Excel (nombre de jours depuis 1899-12-30)
        if (is_numeric($value)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value);
                return $dt;
            } catch (\Throwable) {
                // continue avec parsing texte
            }
        }

        $s = trim((string) $value);
        $formats = ['Y-m-d H:i:s', 'Y-m-d H:i', 'Y-m-d', 'd/m/Y H:i', 'd/m/Y', 'd-m-Y'];
        foreach ($formats as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, $s);
            if ($dt instanceof \DateTime) {
                return $dt;
            }
        }
        try {
            return new \DateTime($s);
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeKey(string $value): string
    {
        $v = strtolower(trim($value));
        $v = strtr($v, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i',
            'ô' => 'o', 'ö' => 'o',
            'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
            ' ' => '_', '-' => '_',
        ]);
        return preg_replace('/[^a-z0-9_]/', '', $v) ?? $v;
    }
}
