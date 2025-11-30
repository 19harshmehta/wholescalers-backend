function createUserData(context, events, done) {
  const r = Math.floor(Math.random() * 99999999);

  context.vars.name = `User${r}`;
  context.vars.email = `user${r}@test.com`;
  context.vars.password = "password123";

  // Optional fields:
  context.vars.role = "retailer";                // you can change if needed
  context.vars.company = `Company${r}`;
  context.vars.phone = `900${r}`;            // generates unique phone

  return done();
}

module.exports = { createUserData };
