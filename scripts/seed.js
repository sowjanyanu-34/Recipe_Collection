require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Favorite = require('../models/Favorite');

const DEMO = { name: 'Demo Chef', email: 'demo@recipes.local', password: 'Demo@1234' };
const I = (pairs) => pairs.map(([name, quantity]) => ({ name, quantity }));

const recipes = [
  {
    recipeName: 'Masala Dosa', category: 'Breakfast', cuisine: 'South Indian', difficulty: 'Medium', preparationTime: 480, cookingTime: 30, servings: 4,
    description: 'Crisp, golden fermented rice-and-lentil crepes folded around a spiced potato filling.',
    tags: ['dosa', 'fermented', 'vegetarian'], image: '/images/seed/masala-dosa.svg',
    ingredients: I([['Dosa rice', '2 cups'], ['Urad dal', '1/2 cup'], ['Fenugreek seeds', '1/2 tsp'], ['Potatoes, boiled', '4 medium'], ['Onion, sliced', '1 large'], ['Mustard seeds', '1 tsp'], ['Turmeric powder', '1/2 tsp'], ['Curry leaves', '10'], ['Oil or ghee', '4 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Soak rice, urad dal and fenugreek separately for 5 hours, then grind to a smooth batter.', 'Ferment the batter covered for 8 hours or overnight, then stir in salt.', 'Heat oil, splutter mustard seeds, then add curry leaves and onion; cook until soft.', 'Add turmeric, mashed potatoes and salt. Mix well to make the filling.', 'Spread a ladle of batter thinly on a hot tawa, drizzle ghee and cook until crisp and golden.', 'Place filling in the centre, fold and serve with chutney and sambar.']
  },
  {
    recipeName: 'Idli Sambar', category: 'Breakfast', cuisine: 'South Indian', difficulty: 'Medium', preparationTime: 420, cookingTime: 40, servings: 4,
    description: 'Soft steamed rice cakes served with a tangy lentil and vegetable stew.',
    tags: ['idli', 'sambar', 'steamed'], image: '/images/seed/idli-sambar.svg',
    ingredients: I([['Idli rice', '2 cups'], ['Urad dal', '1 cup'], ['Toor dal', '3/4 cup'], ['Mixed vegetables', '2 cups'], ['Tamarind pulp', '2 tbsp'], ['Sambar powder', '2 tbsp'], ['Mustard seeds', '1 tsp'], ['Curry leaves', '8'], ['Salt', 'to taste']]),
    instructions: ['Soak rice and urad dal separately for 5 hours; grind to a fluffy batter and ferment overnight.', 'Pressure cook toor dal until very soft and mash it.', 'Simmer vegetables with tamarind pulp, sambar powder and salt until tender.', 'Add the mashed dal and boil for 5 minutes. Temper with mustard seeds and curry leaves.', 'Pour batter into greased idli moulds and steam for 12 minutes.', 'Serve hot idlis with the sambar.']
  },
  {
    recipeName: 'Paneer Butter Masala', category: 'Vegetarian', cuisine: 'North Indian', difficulty: 'Easy', preparationTime: 15, cookingTime: 30, servings: 4,
    description: 'Soft paneer cubes in a rich, creamy tomato gravy finished with butter and kasuri methi.',
    tags: ['paneer', 'creamy', 'curry'], image: '/images/seed/paneer-butter-masala.svg',
    ingredients: I([['Paneer, cubed', '250 g'], ['Tomatoes, chopped', '4 large'], ['Onion, chopped', '1 large'], ['Cashews', '10'], ['Butter', '3 tbsp'], ['Fresh cream', '1/4 cup'], ['Ginger-garlic paste', '1 tbsp'], ['Kashmiri chilli powder', '1 tsp'], ['Garam masala', '1/2 tsp'], ['Kasuri methi', '1 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Cook onion, tomatoes, cashews and ginger-garlic paste in 1 tbsp butter until soft, then cool and blend smooth.', 'Melt the remaining butter, add chilli powder and the blended gravy; simmer 10 minutes.', 'Add salt, garam masala and a splash of water to adjust thickness.', 'Slide in the paneer cubes and simmer for 5 minutes.', 'Stir in cream and crushed kasuri methi. Serve with naan or rice.']
  },
  {
    recipeName: 'Vegetable Biryani', category: 'Lunch', cuisine: 'Indian', difficulty: 'Hard', preparationTime: 30, cookingTime: 50, servings: 5,
    description: 'Fragrant basmati rice layered with spiced vegetables, saffron milk and fried onions.',
    tags: ['biryani', 'rice', 'festive'], image: '/images/seed/vegetable-biryani.svg',
    ingredients: I([['Basmati rice', '2 cups'], ['Mixed vegetables', '3 cups'], ['Yogurt', '1/2 cup'], ['Onions, fried', '1 cup'], ['Biryani masala', '2 tbsp'], ['Ginger-garlic paste', '1 tbsp'], ['Saffron in milk', '1/4 cup'], ['Mint and coriander leaves', '1/2 cup'], ['Ghee', '3 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Soak basmati rice for 30 minutes, then parboil with whole spices until 70% cooked; drain.', 'Marinate vegetables with yogurt, biryani masala, ginger-garlic paste and salt.', 'Cook the vegetables in ghee until half done to make the masala base.', 'Layer rice over the vegetables, topping with fried onions, herbs and saffron milk.', 'Seal the pot and cook on the lowest heat for 20 minutes (dum). Rest 10 minutes, then fluff and serve.']
  },
  {
    recipeName: 'Veg Fried Rice', category: 'Lunch', cuisine: 'Indo-Chinese', difficulty: 'Easy', preparationTime: 15, cookingTime: 10, servings: 3,
    description: 'A fast wok-tossed rice with crunchy vegetables, soy sauce and spring onions.',
    tags: ['quick', 'wok', 'rice'], image: '/images/seed/veg-fried-rice.svg',
    ingredients: I([['Cooked basmati rice, cooled', '3 cups'], ['Carrot, finely diced', '1 medium'], ['French beans, chopped', '1/2 cup'], ['Capsicum, diced', '1/2 cup'], ['Spring onions', '4'], ['Garlic, minced', '4 cloves'], ['Soy sauce', '2 tbsp'], ['Black pepper', '1/2 tsp'], ['Oil', '3 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Heat oil in a wok on high heat and fry garlic for 20 seconds.', 'Add carrot and beans; stir-fry for 2 minutes, then add capsicum and the white part of the spring onions.', 'Add the rice, soy sauce, pepper and salt; toss for 3 minutes.', 'Finish with spring onion greens and serve hot.']
  },
  {
    recipeName: 'Chicken Curry', category: 'Non-Vegetarian', cuisine: 'Indian', difficulty: 'Medium', preparationTime: 20, cookingTime: 40, servings: 4,
    description: 'A home-style chicken curry simmered in an onion-tomato masala with warm spices.',
    tags: ['chicken', 'curry', 'spicy'], image: '/images/seed/chicken-curry.svg',
    ingredients: I([['Chicken, curry cut', '700 g'], ['Onions, chopped', '2 large'], ['Tomatoes, pureed', '3 medium'], ['Ginger-garlic paste', '1 tbsp'], ['Yogurt', '1/4 cup'], ['Coriander powder', '1 tbsp'], ['Turmeric', '1/2 tsp'], ['Red chilli powder', '1 tsp'], ['Garam masala', '1 tsp'], ['Oil', '3 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Marinate chicken with yogurt, turmeric and salt for 15 minutes.', 'Brown the onions in oil, then cook the ginger-garlic paste for 1 minute.', 'Add tomato puree, coriander and chilli powder; cook until oil separates.', 'Add the chicken and sear for 5 minutes, then add 1 cup of water.', 'Cover and simmer for 25 minutes until the chicken is tender. Stir in garam masala and serve.']
  },
  {
    recipeName: 'Penne Arrabbiata', category: 'Dinner', cuisine: 'Italian', difficulty: 'Easy', preparationTime: 10, cookingTime: 20, servings: 2,
    description: 'Penne tossed in a garlicky, chilli-spiked tomato sauce, finished with fresh basil.',
    tags: ['pasta', 'italian', 'quick'], image: '/images/seed/penne-arrabbiata.svg',
    ingredients: I([['Penne pasta', '200 g'], ['Canned crushed tomatoes', '400 g'], ['Garlic cloves, sliced', '4'], ['Dried red chilli flakes', '1 tsp'], ['Olive oil', '3 tbsp'], ['Fresh basil', 'a handful'], ['Parmesan, grated', '3 tbsp'], ['Salt', 'to taste']]),
    instructions: ['Boil penne in well-salted water until al dente; reserve a cup of pasta water and drain.', 'Warm olive oil, add garlic and chilli flakes and cook for 1 minute without browning.', 'Add the tomatoes and simmer for 12 minutes until the sauce thickens.', 'Toss the pasta in the sauce with a splash of pasta water.', 'Finish with basil and parmesan.']
  },
  {
    recipeName: 'Margherita Pizza', category: 'Dinner', cuisine: 'Italian', difficulty: 'Medium', preparationTime: 90, cookingTime: 12, servings: 2,
    description: 'Classic thin-crust pizza with tomato sauce, fresh mozzarella and basil.',
    tags: ['pizza', 'baked', 'cheese'], image: '/images/seed/margherita-pizza.svg',
    ingredients: I([['All-purpose flour', '2 cups'], ['Instant yeast', '1 tsp'], ['Warm water', '3/4 cup'], ['Olive oil', '2 tbsp'], ['Tomato sauce', '1/2 cup'], ['Fresh mozzarella', '150 g'], ['Fresh basil leaves', '8'], ['Salt', '1 tsp']]),
    instructions: ['Mix flour, yeast, salt, water and oil; knead for 8 minutes into a smooth dough.', 'Cover and let rise for 1 hour until doubled.', 'Preheat the oven to its highest setting (250 °C) with a baking tray inside.', 'Roll the dough thin, spread the sauce and top with torn mozzarella.', 'Bake for 10–12 minutes until the crust is blistered. Scatter basil on top and serve.']
  },
  {
    recipeName: 'Chocolate Cake', category: 'Desserts', cuisine: 'International', difficulty: 'Medium', preparationTime: 25, cookingTime: 35, servings: 8,
    description: 'A moist, deeply chocolatey cake topped with a silky ganache.',
    tags: ['cake', 'chocolate', 'baking'], image: '/images/seed/chocolate-cake.svg',
    ingredients: I([['All-purpose flour', '1 3/4 cups'], ['Sugar', '1 1/2 cups'], ['Cocoa powder', '3/4 cup'], ['Baking powder', '1 1/2 tsp'], ['Eggs', '2'], ['Milk', '1 cup'], ['Vegetable oil', '1/2 cup'], ['Vanilla extract', '2 tsp'], ['Hot water', '1 cup'], ['Dark chocolate', '200 g'], ['Cream', '1/2 cup']]),
    instructions: ['Heat the oven to 175 °C and grease two 8-inch tins.', 'Whisk flour, sugar, cocoa, baking powder and a pinch of salt.', 'Beat in eggs, milk, oil and vanilla, then stir in the hot water; the batter will be thin.', 'Divide between tins and bake for 30–35 minutes. Cool completely.', 'Warm the cream, pour it over chopped chocolate and stir to a ganache.', 'Sandwich and cover the cake with the ganache.']
  },
  {
    recipeName: 'Gulab Jamun', category: 'Desserts', cuisine: 'North Indian', difficulty: 'Medium', preparationTime: 20, cookingTime: 30, servings: 6,
    description: 'Soft milk-solid dumplings fried golden and soaked in cardamom-rose sugar syrup.',
    tags: ['sweet', 'festive', 'fried'], image: '/images/seed/gulab-jamun.svg',
    ingredients: I([['Milk powder', '1 cup'], ['All-purpose flour', '2 tbsp'], ['Baking soda', '1/4 tsp'], ['Ghee', '1 tbsp'], ['Milk', '4 tbsp'], ['Sugar', '1 1/2 cups'], ['Water', '1 1/2 cups'], ['Cardamom pods, crushed', '3'], ['Rose water', '1 tsp'], ['Oil or ghee for frying', '2 cups']]),
    instructions: ['Boil sugar, water and cardamom for 8 minutes into a light syrup; add rose water and keep warm.', 'Mix milk powder, flour, baking soda and ghee; add milk gradually to make a soft dough without kneading hard.', 'Roll into 16 smooth, crack-free balls.', 'Fry on low heat, turning constantly, until deep golden brown.', 'Drop the hot jamuns into the warm syrup and soak for at least 1 hour.']
  },
  {
    recipeName: 'Fruit Salad', category: 'Snacks', cuisine: 'International', difficulty: 'Easy', preparationTime: 15, cookingTime: 0, servings: 4,
    description: 'Seasonal fruit tossed with honey and lime for a fresh, light snack.',
    tags: ['fresh', 'healthy', 'no-cook'], image: '/images/seed/fruit-salad.svg',
    ingredients: I([['Apple, diced', '1'], ['Banana, sliced', '1'], ['Grapes, halved', '1 cup'], ['Orange segments', '1'], ['Pomegranate seeds', '1/2 cup'], ['Honey', '2 tbsp'], ['Lime juice', '1 tbsp'], ['Mint leaves', '6']]),
    instructions: ['Wash and chop all the fruit into bite-size pieces.', 'Whisk honey and lime juice together.', 'Toss the fruit gently with the dressing and mint.', 'Chill for 15 minutes and serve.']
  },
  {
    recipeName: 'Fresh Lemon Juice', category: 'Beverages', cuisine: 'Indian', difficulty: 'Easy', preparationTime: 5, cookingTime: 0, servings: 2,
    description: 'A cooling, tangy lemonade with a hint of black salt and mint.',
    tags: ['drink', 'summer', 'refreshing'], image: '/images/seed/lemon-juice.svg',
    ingredients: I([['Lemons', '3'], ['Sugar', '4 tbsp'], ['Cold water', '3 cups'], ['Black salt', '1/4 tsp'], ['Mint leaves', '6'], ['Ice cubes', '1 cup']]),
    instructions: ['Squeeze the lemons and strain out the seeds.', 'Stir the juice with sugar and black salt until dissolved.', 'Add cold water and crushed mint, then pour over ice and serve.']
  }
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recipe_collection_db';
  try {
    await connectDB(uri);
  } catch (err) {
    console.error('\n[ERROR] Could not connect to MongoDB: ' + err.message);
    console.error('Start MongoDB (or fix MONGODB_URI in .env) and run the seed command again.\n');
    process.exit(1);
  }
  let user = await User.findOne({ email: DEMO.email });
  if (!user) user = await User.create({ name: DEMO.name, email: DEMO.email, password: await bcrypt.hash(DEMO.password, 12) });

  // Re-running the seed replaces only the demo user's recipes
  const old = await Recipe.find({ author: user._id }).select('_id');
  await Favorite.deleteMany({ recipe: { $in: old.map((r) => r._id) } });
  await Recipe.deleteMany({ author: user._id });
  const created = await Recipe.insertMany(recipes.map((r) => ({ ...r, author: user._id })));

  console.log(`Seeded ${created.length} recipes into "${mongoose.connection.name}".`);
  console.log(`Demo login: ${DEMO.email} / ${DEMO.password}`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
