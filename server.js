const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')
const clarifai = require('clarifai');

const db = knex({
    client: 'pg',
    connection:{
        host:'localhost',
        user: '',
        password: '',
        database: 'smart-brain'
    }
});


const key = new Clarifai.App({
    apiKey: 'bffacd411fab422098e5f5c6175cf6bf'

});


const app = express();
app.use(cors());
app.use(bodyParser.json());


app.post('/imageurl', (req, res) => {
    key.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => {
        res.json(data);
    })
    .catch(err => res.status(400).json('unable to work with API'))
})
app.post('/signin', (req,res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data =>{
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if(isValid){
            return db.select('*').from('users')
                .where('email', '=', req.body.email)
                .then(user =>{
                    res.json(user[0])
                })
                .catch(err => res.status(400).json('unable to get user'))
        }else{
            res.status(400).json('wrong credentials');
        }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req,res)=> {
    const {email, name, password} = req.body;
    if(!email || !name || !password){
        return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
        db.transaction(trx =>{
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail =>{
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0],
                        name:name,
                        joined: new Date()
                    }).then(user =>{
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
        .catch(err => res.status(400).json('unable to register'))
    
})

app.post('/profile/:id', (req,res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id})
    .then(user =>{
        if(user.length){
            res.json(user[0])
        }else{
            res.status(400).json("Not Found")
        }
        
    })
    .catch(err => res.status(400).json("error getting user"))
})

app.put('/image', (req,res) => {
    const {id} = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries =>{
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to pull entry count'))
})





app.listen(process.env.PORT || 3000, () => {
    console.log('app is running on port ${process.env.PORT}');
});

