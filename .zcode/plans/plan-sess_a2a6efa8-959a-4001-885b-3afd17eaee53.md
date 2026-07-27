
# Plan de Synchronisation Complète — Brick Food Pro

## Objectif
Connecter le dashboard Next.js et l'app mobile Expo directement à Supabase (auth + données), en remplaçant toutes les données mock par de vraies requêtes.

---

## Phase 1 : Fondations partagées

### 1.1 Installer les dépendances
- **Dashboard** : `npm install @supabase/supabase-js` dans `apps/web`
- **Mobile** : `npx expo install @supabase/supabase-js` dans `apps/mobile`

### 1.2 Créer le client Supabase
- **Dashboard** : `apps/web/src/lib/supabase.ts` — client Supabase configuré avec les env vars existantes
- **Mobile** : `apps/mobile/src/lib/supabase.ts` — même chose, compatible React Native

### 1.3 Créer les types TypeScript
- Fichier partagé (copié dans les deux apps) : `types/database.ts`
- Interfaces pour : `Profile`, `Restaurant`, `Offer`, `Order`, `OrderHistory`
- Enums TypeScript pour : `UserRole`, `OfferType`, `OfferStatus`, `OrderStatus`, `DeliveryMode`, `PaymentStatus`, `PackType`

### 1.4 Sécuriser les .env
- Ajouter `.env*` dans le `.gitignore` racine

---

## Phase 2 : Dashboard Next.js (`apps/web`)

### 2.1 Authentification admin
- **Fichier** : `apps/web/src/app/components/AuthProvider.tsx`
- Utiliser `supabase.auth.signInWithPassword()` / `signUp()`
- Remplacer le "Eric Admin" hardcoded par la session Supabase
- Vérifier le rôle `admin` dans le `profiles` table
- Page de login si non connecté (middleware ou redirect)
- Bouton logout dans le top-bar

### 2.2 Page d'accueil (`page.tsx`)
- **Remplacer** : stats mock + ordres simulés par setInterval
- **Par** : 
  - Stats : query SQL count sur `restaurants`, `profiles WHERE role='agent'`, `orders`, `SUM(total_amount)`
  - Répartition ventes : `COUNT(*) GROUP BY type` sur `offers` join `orders`
  - Commandes temps réel : abonnement Supabase Realtime sur la table `orders`
- **Fichier modifié** : `apps/web/src/app/page.tsx`

### 2.3 Page Propositions (`proposals/page.tsx`)
- **Remplacer** : 3 offres mock
- **Par** : `supabase.from('offers').select('*').eq('status', 'en_attente')` (pour validation admin)
- Actions `handleAction` : `supabase.from('offers').update({ status }).eq('id', id)`
- `saveEdit` : update des champs édités en base
- Jointures pour afficher nom agent (`profiles.full_name`) et restaurant (`restaurants.name`)

### 2.4 Page Restaurants (`restaurants/page.tsx`)
- **Remplacer** : 4 restaurants mock
- **Par** : `supabase.from('restaurants').select('*, profiles(full_name)')`
- `handleAdd` : `supabase.from('restaurants').insert()`
- `handleUpdate` : `supabase.from('restaurants').update().eq('id', id)`
- `handleDelete` : `supabase.from('restaurants').delete().eq('id', id)`
- `offersCount` : sous-requête count sur `offers WHERE restaurant_id = id`

### 2.5 Page Agents (`agents/page.tsx`)
- **Remplacer** : 3 agents mock
- **Par** : `supabase.from('profiles').select('*').eq('role', 'agent')`
- `restaurantsCount` : count sur `restaurants WHERE agent_id = id`
- `proposalsCount` : count sur `offers WHERE agent_id = id`
- `commissions` : `SUM(commission_amount)` sur `orders WHERE agent_id = id`
- CRUD : insert/update sur `profiles` + création compte auth via `admin.auth.createUser()`

### 2.6 Page Commandes (`orders/page.tsx`)
- **Remplacer** : 5 commandes mock
- **Par** : `supabase.from('orders').select('*, profiles!client_id(*), restaurants(*), offers(*)')`
- Filtres status/type : filtres Supabase `.eq()` / `.in()`
- `handleUpdateStatus` : 
  - Update `orders.status` 
  - Insert dans `order_history` avec `action` et `actor_id`
- Détail sidebar : jointure sur `order_history` avec `profiles!actor_id`

### 2.7 Page Statistiques (`statistics/page.tsx`)
- **Remplacer** : données constantes
- **Par** : Requêtes d'agrégation SQL
  - Panier moyen : `AVG(total_amount)` sur orders
  - CA journalier : `SUM(total_amount) GROUP BY DATE(created_at)`
  - Top restaurants : `restaurant_id, COUNT(*), SUM(total_amount) GROUP BY restaurant_id ORDER BY SUM DESC`
  - Top agents : même pattern avec agent_id
  - Taux conversion et commissions : calculs depuis offers + orders

---

## Phase 3 : Mobile Expo (`apps/mobile`)

### 3.1 Refactorer l'authentification (`_layout.tsx`)
- **Remplacer** : le mock AuthContext
- **Par** : vrai Supabase Auth
  - `supabase.auth.getSession()` au démarrage
  - `supabase.auth.onAuthStateChange()` pour écouter les changements
  - Charger le profil depuis `profiles` table pour récupérer le `role`
  - Exposer : `user`, `profile`, `role`, `signIn()`, `signUp()`, `signOut()`

### 3.2 Auth client (modal existante)
- **Signup** : `supabase.auth.signUp({ email, password, options: { data: { full_name, phone, role: 'client' } } })`
- **Login** : `supabase.auth.signInWithPassword({ email, password })`
- Le trigger DB `handle_new_user()` créera automatiquement le profil

### 3.3 Auth pro (modal existante)
- **Login** : `supabase.auth.signInWithPassword()` puis vérifier le `role` dans `profiles`
- Supprimer la logique de détection par sous-chaîne email (`email.includes('agent')`)

### 3.4 Accueil client — Offres publiées
- **Flash** : `supabase.from('offers').select('*, restaurants(*)').eq('type', 'flash').eq('is_published', true).gte('end_timestamp', now())`
- **Deals** : `supabase.from('offers').select('*, restaurants(*)').eq('type', 'deal').eq('is_published', true)`
- **Restaurants** : `supabase.from('restaurants').select('*')`
- **Métriques** : counts depuis `orders WHERE client_id = auth.uid()`
- Remplacer les tableaux `flashOffers` et `dealOffers` mock par les données Supabase

### 3.5 Flow de checkout (étapes 0-4)
- **Étape 2 (Résumé)** : vérifier `isLoggedIn`, si non → montrer modal auth
- **Étape 4 (Paiement)** : créer la commande en base :
  ```
  supabase.from('orders').insert({
    client_id, restaurant_id, offer_id, agent_id,
    status: 'nouvelle', delivery_mode, quantity,
    total_amount, commission_amount,
    payment_status: 'paid', reservation_code
  })
  ```
  Le trigger DB gère automatiquement le décrément du stock flash
- **Réservation ID** : générer côté client ou via une fonction DB

### 3.6 Onglet Réservations (client)
- `supabase.from('orders').select('*, offers(*), restaurants(*)').eq('client_id', user.id).order('created_at', { ascending: false })`

### 3.7 Portail Agent
- **Accueil** : commissions depuis `orders WHERE agent_id`, count restaurants
- **Restaurants** : `supabase.from('restaurants').select('*').eq('agent_id', user.id)`
- **Ajouter restaurant** : `supabase.from('restaurants').insert()` + création compte propriétaire via `supabase.auth.admin.createUser()` (nécessite service role — possible via RPC)
- **Propositions** : `supabase.from('offers').insert({ agent_id, restaurant_id, type, title, ... })`

### 3.8 Portail Restaurant
- **Accueil** : `supabase.from('orders').select('*, profiles!client_id(*)').eq('restaurant_id', profile.restaurant_id)`
- **Changer statut** : `supabase.from('orders').update({ status }).eq('id', id)` + insert dans `order_history`
- **Stats** : agrégations depuis les commandes du restaurant

### 3.9 Nettoyage
- Extraire les écrans en composants séparés si possible (mais garder la refactorisation minimale pour limiter la casse)

---

## Phase 4 : Vérification et nettoyage

### 4.1 Tester que les seed data s'affichent correctement dans les deux apps
### 4.2 Vérifier que l'auth fonctionne (login/logout avec les comptes seed)
### 4.3 Tester le flow complet : client voit offre → réserve → commande apparaît dashboard + restaurant
### 4.4 Committer les fichiers supabase untracked + les changements

---

## Ordre d'exécution
1. Fondations (deps + client + types + gitignore)
2. Dashboard auth + toutes les pages
3. Mobile auth + toutes les vues
4. Tests croisés

## Fichiers créés (8)
- `apps/web/src/lib/supabase.ts`
- `apps/web/src/types/database.ts`
- `apps/web/src/app/components/AuthProvider.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/types/database.ts`

## Fichiers modifiés (9)
- `.gitignore` (ajouter `.env*`)
- `apps/web/src/app/layout.tsx` (AuthProvider + session)
- `apps/web/src/app/page.tsx` (stats + realtime)
- `apps/web/src/app/proposals/page.tsx` (CRUD offres)
- `apps/web/src/app/restaurants/page.tsx` (CRUD restaurants)
- `apps/web/src/app/agents/page.tsx` (CRUD profils agents)
- `apps/web/src/app/orders/page.tsx` (commandes + historique)
- `apps/web/src/app/statistics/page.tsx` (agrégations)
- `apps/mobile/src/app/_layout.tsx` (auth Supabase)
- `apps/mobile/src/app/index.tsx` (toutes les données + CRUD)
