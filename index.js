const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.get('/collections', function (req, res) {
  res.sendFile(__dirname + '/data/collections.json');
});

app.post('/collections', function (req, res) {
  fs.writeFile(__dirname + '/data/collections.json', JSON.stringify(req.body), function (err) {
    res.end();
  });
});

app.get('/tags', function (req, res) {
  res.sendFile(__dirname + '/data/tags.json');
});

app.post('/tags', function (req, res) {
  fs.writeFile(__dirname + '/data/tags.json', JSON.stringify(req.body), function (err) {
    res.end();
  });
});

app.listen(8080);
