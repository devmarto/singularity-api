const express = require('express');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const cors = require('cors');


const db = require('knex')({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false},
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DABATASE_USER,
    password: process.env.DATABASE_PW,
    database: process.env.DATABASE_DB,
  },
});

app.use(express.json())
app.use(cors())


app.get('/', (req, res) => {
  res.send('API is running');
})

app.post('/login', (req, res) => {
  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
     const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
     if (isValid) {
      return db.select('*').from('users')
        .where('email', '=', req.body.email)
        .then(user => {
          res.json(user[0])
        })
        .catch(err => res.status(400).json('Unable to get user'))
     } else {
       res.status(400).json('')
     }
    })
    .catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
  const { name, lastname, phone, email, password, acceptedterms } = req.body;
  const hash = bcrypt.hashSync(password, saltRounds);
  console.log(name, lastname, phone, email, password, acceptedterms )


  db.transaction(trx => {
    return trx.insert({
      hash: hash,
      email: email
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('users')
        .returning('*')
        .insert({
          name: name,
          lastname: lastname,
          phone: phone,
          email: loginEmail[0].email,
          joined: new Date(),
          acceptedterms: acceptedterms,
        })
    })
    .then(user => {
      console.log('user', user)
      res.json(user[0])
    })
  })
  .catch(err => {
    console.error('Registration error:', err);
    res.status(400).json('Unable to register')
  })
});

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if(user.length){
        res.json(user[0])
      } else {
        res.status(400).json('Error getting user')
      }
    })
    .catch(err => res.status(400).json('Error getting user'));
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0].entries)
  })
  .catch(err => res.status(400).json('Unable to get entries'))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})