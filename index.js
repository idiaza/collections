const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const csvdb = require('csv-database');
const uuidv4 = require('uuid/v4');

const app = express();

const PATH_COLLECTIONS = __dirname + '/data/collections.json';
const PATH_TAGS = __dirname + '/data/tags.json';
const PATH_TRACK = __dirname + '/data/track.csv';

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.get('/collections', function (req, res) {
  res.sendFile(PATH_COLLECTIONS);
});

app.post('/collections', function (req, res) {
  fs.readFile(PATH_COLLECTIONS, function (err, content) {
    var collections = JSON.parse(content);
    var collection = req.body;

    var collectionIndex = _.findIndex(collections, { id: collection.id });
    if (collectionIndex > -1) {
      collections[collectionIndex] = _.create(collections[collectionIndex], collection);
    } else {
      collections.push(collection);
    }

    fs.writeFile(PATH_COLLECTIONS, JSON.stringify(collections, null, 2), function (err) {
      res.end();
    });
  });
});

app.get('/tags', function (req, res) {
  res.sendFile(__dirname + '/data/tags.json');
});

app.post('/tags', function (req, res) {
  fs.writeFile(__dirname + '/data/tags.json', JSON.stringify(req.body, null, 2), function (err) {
    res.end();
  });
});

const TRACK_MODEL = ['id', 'type', 'data'];
app.post('/tracks/:type', function (req, res) {
  csvdb(PATH_TRACK, TRACK_MODEL)
    .then(function (db) {
      console.log('req');
      console.log(req);
      db.add({
        id: uuidv4(),
        type: req.params.type,//'add-collection-to-cart',
        data: JSON.stringify(req.body),
        // data: {
        //   items: [
        //     '12341234',
        //     '12341235',
        //     '12341236',
        //   ],
        // }
      })
        .then(function (result) {
          console.log(JSON.parse(result[0].data).items[0]);
        });
    });
});

app.listen(8080);
