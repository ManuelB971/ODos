<?php

namespace App\DataFixtures;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $userPasswordHasher
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        $faker = Factory::create('fr_FR');

        // 1. Categories
        $categoryNames = [
            'Sport', 'Culture', 'Gastronomy', 'Music', 'Nature', 
            'Nightlife', 'Relaxation', 'Shopping', 'Technology', 'Travel'
        ];
        
        $categories = [];
        foreach ($categoryNames as $name) {
            $category = new Category();
            $category->setName($name);
            $manager->persist($category);
            $categories[$name] = $category;
        }

        // 2. Users
        // Admin
        $admin = new User();
        $admin->setEmail('admin@odos.com');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->userPasswordHasher->hashPassword($admin, 'password'));
        $manager->persist($admin);

        // User
        $user = new User();
        $user->setEmail('user@odos.com');
        $user->setRoles(['ROLE_USER']);
        $user->setPassword($this->userPasswordHasher->hashPassword($user, 'password'));
        
        // Add specific interests
        $user->addInterest($categories['Sport']);
        $user->addInterest($categories['Nature']);
        
        $manager->persist($user);

        // 3. Activities
        // Generate 50 activities near Paris (approx 48.8566, 2.3522)
        $allCategories = array_values($categories);
        
        for ($i = 0; $i < 50; $i++) {
            $activity = new Activity();
            $activity->setName($faker->sentence(3));
            $activity->setDescription($faker->paragraph());
            
            // Random coordinates around Paris
            $activity->setLatitude($faker->latitude(48.80, 48.90));
            $activity->setLongitude($faker->longitude(2.25, 2.45));
            
            $activity->setCity('Paris');
            
            // Random category
            $randomCategory = $faker->randomElement($allCategories);
            $activity->setCategory($randomCategory);
            
            $manager->persist($activity);
        }

        // Lyon sample for city filter / onboarding tests
        for ($i = 0; $i < 12; $i++) {
            $activity = new Activity();
            $activity->setName($faker->sentence(3));
            $activity->setDescription($faker->paragraph());
            $activity->setLatitude($faker->latitude(45.70, 45.80));
            $activity->setLongitude($faker->longitude(4.80, 4.90));
            $activity->setCity('Lyon');
            $activity->setCategory($faker->randomElement($allCategories));
            $manager->persist($activity);
        }

        $user->setHomeCity('Paris');

        $manager->flush();
    }
}
