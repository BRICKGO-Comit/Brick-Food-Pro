const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file to avoid external dependency on dotenv
const envPath = path.join(__dirname, '../apps/api/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if any
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://kgcmbbesrzldoiwkckke.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined in apps/api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function seed() {
  console.log('Starting seeding database...');

  // Define test accounts
  const usersToCreate = [
    {
      email: 'eric.admin@brickfood.com',
      password: 'password123',
      fullName: 'Eric Admin',
      role: 'admin',
    },
    {
      email: 'agent.eric@brickfood.com',
      password: 'password123',
      fullName: 'Eric Agent',
      role: 'agent',
    },
    {
      email: 'owner.bateau@email.com',
      password: 'password123',
      fullName: 'Bateau Owner',
      role: 'restaurant',
    },
    {
      email: 'client.test@brickfood.com',
      password: 'password123',
      fullName: 'Eric Client',
      role: 'client',
    }
  ];

  const createdUsers = {};

  for (const u of usersToCreate) {
    console.log(`Checking/Creating user: ${u.email}`);
    
    // Check if user already exists in auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }
    
    let user = users.find(user => user.email === u.email);
    
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.fullName,
          role: u.role
        }
      });
      
      if (error) {
        console.error(`Error creating user ${u.email}:`, error.message);
        continue;
      }
      user = data.user;
      console.log(`Created user in auth: ${u.email} (ID: ${user.id})`);
    } else {
      console.log(`User already exists in auth: ${u.email} (ID: ${user.id})`);
    }
    
    createdUsers[u.role] = user;
    
    // Ensure profile exists in profiles table
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profError) {
      console.error(`Error checking profile for ${u.email}:`, profError);
      continue;
    }
    
    if (!profile) {
      const { error: insError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: u.email,
          full_name: u.fullName,
          role: u.role
        });
      if (insError) {
        console.error(`Error inserting profile for ${u.email}:`, insError.message);
      } else {
        console.log(`Inserted profile for ${u.email}`);
      }
    } else {
      // Update role just in case
      await supabase
        .from('profiles')
        .update({ role: u.role })
        .eq('id', user.id);
      console.log(`Profile already exists for ${u.email}`);
    }
  }

  // Create mock restaurants if they don't exist
  const restaurantsToCreate = [
    {
      name: 'Le Bateau Ivoire',
      address: 'Cocody 2 Plateaux, Abidjan',
      phone: '07 58 45 12 36',
      description: 'Spécialités ivoiriennes et européennes.',
      agentRole: 'agent'
    },
    {
      name: 'Toni Fast Food',
      address: 'Riviera Bonoumin, Abidjan',
      phone: '05 06 78 90 12',
      description: 'Fast food rapide, burgers de qualité.',
      agentRole: 'agent'
    },
    {
      name: 'Le QG Lounge',
      address: 'Riviera Palmeraie, Abidjan',
      phone: '07 01 02 03 04',
      description: 'Lounge chic, grillades et cocktails.',
      agentRole: 'agent'
    },
    {
      name: 'Chez Georges',
      address: 'Marcory Zone 4, Abidjan',
      phone: '01 02 03 04 05',
      description: 'Cuisine traditionnelle braisée.',
      agentRole: 'agent'
    }
  ];

  const agentUser = createdUsers['agent'];
  const restaurantUser = createdUsers['restaurant'];
  let primaryRestoId = null;

  for (const r of restaurantsToCreate) {
    console.log(`Checking restaurant: ${r.name}`);
    const { data: existingResto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('name', r.name)
      .maybeSingle();

    let restoId;
    if (!existingResto) {
      const { data: newResto, error: insErr } = await supabase
        .from('restaurants')
        .insert({
          name: r.name,
          address: r.address,
          phone: r.phone,
          description: r.description,
          agent_id: agentUser ? agentUser.id : null
        })
        .select()
        .single();

      if (insErr) {
        console.log(`Error inserting restaurant ${r.name}:`, insErr.message);
        continue;
      }
      restoId = newResto.id;
      console.log(`Created restaurant: ${r.name} (ID: ${restoId})`);
    } else {
      restoId = existingResto.id;
      // Update agent just in case
      if (agentUser && existingResto.agent_id !== agentUser.id) {
        await supabase
          .from('restaurants')
          .update({ agent_id: agentUser.id })
          .eq('id', restoId);
      }
      console.log(`Restaurant already exists: ${r.name} (ID: ${restoId})`);
    }

    if (r.name === 'Le Bateau Ivoire') {
      primaryRestoId = restoId;
    }
  }

  // Link restaurant owner to Le Bateau Ivoire
  if (restaurantUser && primaryRestoId) {
    console.log(`Linking restaurant owner ${restaurantUser.email} to restaurant ID: ${primaryRestoId}`);
    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ restaurant_id: primaryRestoId })
      .eq('id', restaurantUser.id);
    
    if (linkErr) {
      console.error('Error linking restaurant owner:', linkErr.message);
    } else {
      console.log('Linked restaurant owner successfully.');
    }
  }

  // Create initial offers (proposals)
  if (primaryRestoId && agentUser) {
    console.log('Creating initial offers (proposals)...');
    
    const offersToCreate = [
      {
        restaurant_id: primaryRestoId,
        agent_id: agentUser.id,
        type: 'deal',
        title: 'Pack Couple Romantique',
        description: 'Une expérience gastronomique inoubliable pour 2 personnes. Entrée assortie + 2 Plats + 2 Boissons + 1 Dessert + Décoration de table.',
        status: 'validee',
        is_confirmed: true,
        commission_rate: 10.00,
        pack_type: 'couple',
        price: 25000,
        capacity_persons: 2,
        available_date: '2026-08-30',
        available_time: '19:00:00'
      },
      {
        restaurant_id: primaryRestoId,
        agent_id: agentUser.id,
        type: 'flash',
        title: 'Menu Burger Duo',
        description: 'Deux burgers gourmands avec frites croustillantes et canettes de soda.',
        status: 'validee',
        is_confirmed: true,
        commission_rate: 12.00,
        price_normal: 12000,
        price_promo: 7500,
        quantity_initial: 20,
        quantity_remaining: 18,
        start_timestamp: new Date().toISOString(),
        end_timestamp: new Date(Date.now() + 2 * 3600 * 1000).toISOString() // 2 hours from now
      },
      {
        restaurant_id: primaryRestoId,
        agent_id: agentUser.id,
        type: 'flash',
        title: 'Poulet Braisé + Attiéké',
        description: 'Poulet braisé entier servi chaud avec attiéké frais.',
        status: 'en_attente',
        is_confirmed: false,
        commission_rate: 10.00,
        price_normal: 10000,
        price_promo: 6000,
        quantity_initial: 15,
        quantity_remaining: 15,
        start_timestamp: new Date().toISOString(),
        end_timestamp: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
      }
    ];

    for (const off of offersToCreate) {
      const { data: existingOffer } = await supabase
        .from('offers')
        .select('*')
        .eq('title', off.title)
        .eq('restaurant_id', off.restaurant_id)
        .maybeSingle();

      if (!existingOffer) {
        const { error: insErr } = await supabase
          .from('offers')
          .insert(off);
        
        if (insErr) {
          console.error(`Error inserting offer ${off.title}:`, insErr.message);
        } else {
          console.log(`Created offer: ${off.title}`);
        }
      } else {
        console.log(`Offer already exists: ${off.title}`);
      }
    }
  }

  console.log('Database seeding completed successfully.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
