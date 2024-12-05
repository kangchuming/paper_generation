import express from 'express';
const app = express();
const port = 3000;

app.use(express.static('public'));

app.use(express.static('files'));

app.use('/static', express.static('public'));

app.get('/', (req, res) => {
    res.send('Hello world');
})

app.post('/', (req, res) => {
    res.sendStatus('Got a POST request');
})

app.put('/user', (req, res) => {
    res.send('Got a PUT request at /user');
})

app.delete('/user', (req, res) => {
    res.send('Got a DELETE request at /user');
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

app.all('/secret', (req, res, next) => {
    console.log('Accessing the secret section ...');
    next();
})

app.get('/ab?cd', (req, res) => {
    res.send('ab?cd');
})

app.get('/ab+cd', (req, res) => {
    res.send('ab+cd');
})

app.get('ab*cd', (req, res) => {
    res.send('ab*cd');
})

app.get('/ab(cd)?e', (req, res) => {
    res.send('ab*cd');
})

app.get(/a/, (req, res) => {
    res.send('/a/')
})