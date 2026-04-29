# ODOS MVP - Technical Roadmap & Implementation Plan

This roadmap addresses the missing elements to reach the MVP by March, focusing on the User/Activity recommendation flow.

## 1. Modélisation BDD (Entities & Relations)

We will implement 3 core entities using `make:entity`.

### **Entity: Category**
Represents "Intérêts" (Interests) for Users and classifications for Activities.
- **Fields**:
    - `name` (string, 255, unique)
- **Groups**: `['category:read']`

### **Entity: User**
- **Fields**:
    - `email` (string, 180, unique)
    - `roles` (json)
    - `password` (string)
    - `interests` (ManyToMany with **Category**) -> *Crucial for matching.*
- **API Platform**:
    - `itemOperations`: GET, PATCH (Update profile/interests), DELETE.
    - `normalizationContext`: `['groups' => ['user:read']]`
    - `denormalizationContext`: `['groups' => ['user:write']]`
- **Security**:
    - Password should NEVER be readable (`user:read` must NOT include password).
    - Only Owner or Admin can view full profile.

### **Entity: Activity**
- **Fields**:
    - `name` (string, 255)
    - `description` (text)
    - `latitude` (float)
    - `longitude` (float)
    - `category` (ManyToOne with **Category**) -> *Links activity to an interest.*
    - `city` (string, optional, for filtering)
- **API Platform**:
    - `normalizationContext`: `['groups' => ['activity:read']]`
    - `denormalizationContext`: `['groups' => ['activity:write']]`

## 2. Logique Métier (Recommendations)

The PDF mentions a recommendation system. Since we are using API Platform, the cleanest way (REST) is a **StateProvider**.

### **Endpoint**
`GET /api/recommendations`

### **Implementation Strategy**
1.  **Create a Custom StateProvider**: `App\State\RecommendationStateProvider`.
2.  **Register it in Activity Entity**:
    ```php
    #[ApiResource(
        operations: [
            new GetCollection(
                uriTemplate: '/recommendations',
                provider: RecommendationStateProvider::class,
                normalizationContext: ['groups' => ['activity:read']]
            )
        ]
    )]
    ```
3.  **Logic (SQL/DQL)**:
    - Inject `Security` to get current User.
    - Start QueryBuilder on `Activity` repository.
    - `join` Activity.category.
    - `where` category IN (AuthUser.interests).
    - If user has no interests, return random/all activities or top rated (fallback).

## 3. Sécurité & Permissions (Security.yaml)

We need a clear separation between Public, User, and Admin.

### **Access Control (`security.config`)**
```yaml
access_control:
    - { path: ^/api/login, roles: PUBLIC_ACCESS }
    - { path: ^/api/docs, roles: PUBLIC_ACCESS }
    - { path: ^/api/activities, methods: [GET], roles: PUBLIC_ACCESS } # Browse without logic
    - { path: ^/api/recommendations, roles: ROLE_USER } # Must be logged in for tailored results
    - { path: ^/api/admin, roles: ROLE_ADMIN } # Future Backoffice
    - { path: ^/api, roles: IS_AUTHENTICATED_FULLY } # Default fallback
```

### **Roles**
- `ROLE_USER`: Can view recommendations, update their own profile.
- `ROLE_ADMIN`: Can create/edit/delete Activities and Categories.

## 4. Jeux de Données (Fixtures)

To unblock the Front React Native, we need consistent data.

**Plan (DoctrineFixtures):**
1.  **Categories (10)**: "Sport", "Culture", "Gastronomy", "Music", "Nature", "Nightlife"...
2.  **Users (2)**:
    - `admin@odos.com` (ROLE_ADMIN, password: 'password')
    - `user@odos.com` (ROLE_USER, password: 'password', interests: ['Sport', 'Nature'])
3.  **Activities (50)**:
    - Generated with Faker.
    - Lat/Lon near a specific testing city (e.g., Paris or User's mock location).
    - Randomly assigned to Categories.
    - *Goal*: Ensure `user@odos.com` sees only "Sport" and "Nature" activities on `/recommendations`.

## Verification Plan

### Automated Tests
- **PHPUnit**:
    - Test `GET /api/recommendations` as anonymous -> 401 Unauthorized.
    - Test `GET /api/recommendations` as `user@odos.com` -> Returns only Sport/Nature activities.

### Manual Verification
- **Curl/Postman/Browser**:
    1.  Login as `user@odos.com` -> Get Token.
    2.  `GET /api/recommendations` with Token.
    3.  Verify JSON response contains expected activities.
