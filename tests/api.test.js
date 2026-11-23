/**
 * Integration tests. They start an in-memory MongoDB (mongodb-memory-server), so no local MongoDB is needed.
 * The first run downloads a MongoDB binary, so it needs an internet connection.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const createApp = require('../app');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Favorite = require('../models/Favorite');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let mongod, app;

const recipeFields = (over = {}) => ({
  recipeName: 'Test Pancakes', description: 'Fluffy pancakes for a lazy weekend.', category: 'Breakfast', cuisine: 'American',
  difficulty: 'Easy', preparationTime: '10', cookingTime: '15', servings: '4', tags: 'sweet, quick',
  ingredients: JSON.stringify([{ name: 'Flour', quantity: '1 cup' }, { name: 'Milk', quantity: '1 cup' }]),
  instructions: JSON.stringify(['Mix everything.', 'Fry on a pan.']), ...over
});

function postRecipe(agent, fields, withImage) {
  let r = agent.post('/api/recipes');
  Object.entries(fields).forEach(([k, v]) => { r = r.field(k, v); });
  if (withImage) r = r.attach('image', PNG, { filename: 'p.png', contentType: 'image/png' });
  return r;
}

async function signup(name, email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
  expect(res.status).toBe(201);
  return agent;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('recipe_test'));
  await Promise.all([User.init(), Recipe.init(), Favorite.init()]);
  app = createApp();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => { await Promise.all([User.deleteMany({}), Recipe.deleteMany({}), Favorite.deleteMany({})]); });

describe('authentication', () => {
  test('registers, hashes the password, logs out and logs in', async () => {
    const agent = await signup('Asha Rao', 'asha@example.com');
    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    expect(stored.password).not.toBe('Passw0rd1');
    expect(stored.password.startsWith('$2')).toBe(true);
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('asha@example.com');
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
    await agent.post('/api/auth/login').send({ email: 'asha@example.com', password: 'Passw0rd1' }).expect(200);
    await agent.get('/api/auth/me').expect(200);
  });

  test('rejects invalid input, duplicate email and wrong password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: '123', confirmPassword: '1' }).expect(400);
    await signup('Asha Rao', 'asha@example.com');
    await request(app).post('/api/auth/register').send({ name: 'Other', email: 'asha@example.com', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' }).expect(409);
    await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrongpass1' }).expect(401);
  });

  test('protected routes require login', async () => {
    await request(app).get('/api/dashboard/stats').expect(401);
    await request(app).get('/api/favorites').expect(401);
    await request(app).post('/api/recipes').send({}).expect(401);
    await request(app).get('/api/users/profile').expect(401);
  });
});

describe('recipes', () => {
  test('create with image, read, update, delete (file cleanup included)', async () => {
    const agent = await signup('Asha Rao', 'asha@example.com');
    const created = await postRecipe(agent, recipeFields(), true);
    expect(created.status).toBe(201);
    const recipe = created.body.data.recipe;
    expect(recipe.imageUrl).toMatch(/^\/uploads\/[a-f0-9]+\.png$/);
    expect(recipe.totalTime).toBe(25);
    const file = path.join(__dirname, '..', 'uploads', path.basename(recipe.imageUrl));
    expect(fs.existsSync(file)).toBe(true);

    const got = await request(app).get('/api/recipes/' + recipe.id).expect(200);
    expect(got.body.data.recipe.ingredients).toHaveLength(2);

    const updated = await agent.put('/api/recipes/' + recipe.id).field(recipeFields({ recipeName: 'Better Pancakes' })).attach('image', PNG, { filename: 'n.png', contentType: 'image/png' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.recipe.recipeName).toBe('Better Pancakes');
    expect(fs.existsSync(file)).toBe(false); // old image replaced and removed

    await agent.delete('/api/recipes/' + recipe.id).expect(200);
    await request(app).get('/api/recipes/' + recipe.id).expect(404);
    expect(await Recipe.countDocuments()).toBe(0);
  });

  test('validation errors and bad uploads are rejected', async () => {
    const agent = await signup('Asha Rao', 'asha@example.com');
    await postRecipe(agent, recipeFields({ category: 'Nonsense' })).expect(400);
    await postRecipe(agent, recipeFields({ ingredients: '[]' })).expect(400);
    const fake = await agent.post('/api/recipes').field(recipeFields()).attach('image', Buffer.from('<?php echo 1;'), { filename: 'x.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    const wrongType = await agent.post('/api/recipes').field(recipeFields()).attach('image', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);
    expect(await Recipe.countDocuments()).toBe(0);
  });

  test("users cannot edit or delete other users' recipes", async () => {
    const owner = await signup('Owner', 'owner@example.com');
    const other = await signup('Other', 'other@example.com');
    const { id } = (await postRecipe(owner, recipeFields())).body.data.recipe;
    await other.put('/api/recipes/' + id).field(recipeFields({ recipeName: 'Hacked' })).expect(403);
    await other.delete('/api/recipes/' + id).expect(403);
    expect((await Recipe.findById(id)).recipeName).toBe('Test Pancakes');
  });

  test('search, filters, sorting, pagination and mine=true work together', async () => {
    const agent = await signup('Asha Rao', 'asha@example.com');
    const make = (over) => postRecipe(agent, recipeFields(over)).expect(201);
    await make({ recipeName: 'Paneer Tikka', category: 'Snacks', cuisine: 'Indian', difficulty: 'Medium', preparationTime: '20', cookingTime: '20', ingredients: JSON.stringify([{ name: 'Paneer', quantity: '200 g' }]) });
    await make({ recipeName: 'Apple Pie', category: 'Desserts', cuisine: 'American', difficulty: 'Hard', preparationTime: '60', cookingTime: '60', ingredients: JSON.stringify([{ name: 'Apples', quantity: '5' }]) });
    await make({ recipeName: 'banana smoothie', category: 'Beverages', cuisine: 'Tropical', difficulty: 'Easy', preparationTime: '5', cookingTime: '0', ingredients: JSON.stringify([{ name: 'Banana', quantity: '2' }]) });
    const list = (qs) => request(app).get('/api/recipes?' + qs).expect(200).then((r) => r.body.data);

    expect((await list('q=paneer')).recipes.map((r) => r.recipeName)).toEqual(['Paneer Tikka']); // by ingredient
    expect((await list('q=tropical')).recipes).toHaveLength(1); // by cuisine
    expect((await list('q=apple%20pie')).pagination.total).toBe(1); // by name
    expect((await list('category=Desserts')).recipes).toHaveLength(1);
    expect((await list('difficulty=Easy')).recipes).toHaveLength(1);
    expect((await list('maxTime=40')).recipes.map((r) => r.recipeName).sort()).toEqual(['Paneer Tikka', 'banana smoothie']);
    expect((await list('maxTime=40&difficulty=Medium')).recipes).toHaveLength(1);
    expect((await list('sort=name')).recipes.map((r) => r.recipeName)).toEqual(['Apple Pie', 'banana smoothie', 'Paneer Tikka']);
    const page = await list('limit=2&page=2');
    expect(page.recipes).toHaveLength(1);
    expect(page.pagination).toMatchObject({ total: 3, pages: 2, page: 2 });
    expect((await list('q[$ne]=x')).recipes).toBeDefined(); // operator injection does not crash

    await request(app).get('/api/recipes?mine=true').expect(401);
    expect((await agent.get('/api/recipes?mine=true')).body.data.pagination.total).toBe(3);
  });
});

describe('favourites and dashboard', () => {
  test('add, no duplicates, list, remove, flag and cascade cleanup', async () => {
    const owner = await signup('Owner', 'owner@example.com');
    const fan = await signup('Fan', 'fan@example.com');
    const { id } = (await postRecipe(owner, recipeFields())).body.data.recipe;

    expect((await fan.post('/api/favorites/' + id)).status).toBe(201);
    expect((await fan.post('/api/favorites/' + id)).status).toBe(200);
    expect(await Favorite.countDocuments()).toBe(1);
    expect((await fan.get('/api/favorites')).body.data.recipes).toHaveLength(1);
    expect((await fan.get('/api/recipes/' + id)).body.data.recipe.isFavorite).toBe(true);
    await fan.post('/api/favorites/507f1f77bcf86cd799439011').expect(404);

    await fan.delete('/api/favorites/' + id).expect(200);
    expect((await fan.get('/api/favorites')).body.data.recipes).toHaveLength(0);

    await fan.post('/api/favorites/' + id).expect(201);
    await owner.delete('/api/recipes/' + id).expect(200);
    expect(await Favorite.countDocuments()).toBe(0);
  });

  test('favourites persist across logout and login', async () => {
    const owner = await signup('Owner', 'owner@example.com');
    const { id } = (await postRecipe(owner, recipeFields())).body.data.recipe;
    await owner.post('/api/favorites/' + id).expect(201);
    await owner.post('/api/auth/logout').expect(200);
    await owner.post('/api/auth/login').send({ email: 'owner@example.com', password: 'Passw0rd1' }).expect(200);
    expect((await owner.get('/api/favorites')).body.data.recipes).toHaveLength(1);
  });

  test('dashboard statistics are computed from the database', async () => {
    const a = await signup('Anna', 'a@example.com');
    const b = await signup('Ben', 'b@example.com');
    await postRecipe(a, recipeFields()).expect(201);
    await postRecipe(a, recipeFields({ recipeName: 'Lunch Bowl', category: 'Lunch' })).expect(201);
    const { id } = (await postRecipe(b, recipeFields({ recipeName: 'Dinner Pie', category: 'Dinner' }))).body.data.recipe;
    await a.post('/api/favorites/' + id).expect(201);
    const s = (await a.get('/api/dashboard/stats')).body.data;
    expect(s.totalRecipes).toBe(3);
    expect(s.myRecipes).toBe(2);
    expect(s.myFavorites).toBe(1);
    expect(s.categories.find((c) => c.name === 'Lunch').count).toBe(1);
    expect(s.categories).toHaveLength(8);
    expect(s.recentRecipes).toHaveLength(3);
    expect(s.myLatestRecipes).toHaveLength(2);
  });
});

describe('profile and pages', () => {
  test('updates profile and password', async () => {
    const agent = await signup('Asha Rao', 'asha@example.com');
    await signup('Taken', 'taken@example.com');
    await agent.put('/api/users/profile').send({ name: 'Asha R', email: 'taken@example.com' }).expect(409);
    await agent.put('/api/users/profile').send({ name: 'Asha R', email: 'asha@example.com', newPassword: 'Newpass123', confirmNewPassword: 'Newpass123', currentPassword: 'nope' }).expect(400);
    await agent.put('/api/users/profile').send({ name: 'Asha R', email: 'asha@example.com', newPassword: 'Newpass123', confirmNewPassword: 'Newpass123', currentPassword: 'Passw0rd1' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'Newpass123' }).expect(200);
  });

  test('serves pages, redirects guests and returns 404 pages', async () => {
    await request(app).get('/').expect(200);
    await request(app).get('/explore').expect(200);
    await request(app).get('/dashboard').expect(302).expect('Location', /\/login/);
    const miss = await request(app).get('/no-such-page');
    expect(miss.status).toBe(404);
    expect(miss.text).toContain('off the menu');
    const api404 = await request(app).get('/api/nothing');
    expect(api404.status).toBe(404);
    expect(api404.body.success).toBe(false);
  });
});
