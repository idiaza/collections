
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

var storage = {
  queue: {},
  tags: [],
  collections: [],
  getTags: function () {
    return this.tags;
  },
  setTag: function (name, words) {
    var tag = { name: name, words: words };
    this.tags.push(tag);
    return tag;
  },
  removeTag: function (tag) {
    _.pullAllBy(this.tags, [{ name: tag }], 'name');
  },
  setWord: function (tag, word) {
    var index = _.findIndex(this.tags, { name: tag });
    this.tags[index].words.push(word);
  },
  removeWord: function (tag, word) {
    var tagIndex = _.findIndex(this.tags, { name: tag });
    _.pull(this.tags[tagIndex].words, word);
  },
  setPosition: function (collectionIndex, positionIndex, tag) {
    this.collections[collectionIndex].positions[positionIndex] = tag
    this.trigger('ChangeCollection' + collectionIndex + 'Position' + positionIndex);
  },
  getCollections: function () {
    return this.collections;
  },
  getCollection: function (id) {
    return this.collections[_.findIndex(this.collections, { id })];
  },
  setCollectionItems: function (collectionId, items) {
    var index = _.findIndex(this.collections, { id: collectionId });
    this.collections[index].items = items;
  },
  createCollection: function (name, description, positions, items) {
    this.collections.push({
      id: uuidv4(),
      name: name || '',
      description: description || '',
      positions: positions || [
        'any', 'any', 'any',
        'any', 'any', 'any'
      ],
      items: items || [],
    });
  },
  removeCollection: function (collectionId) {
    // var index = _.findIndex(this.collections, { name: collectionName });
    // this.collections[index];
    _.remove(this.collections, { id: collectionId });
    // console.log(this.collections);
  },
  on: function (topic, handler) {
    if (!this.queue[topic]) {
      this.queue[topic] = [];
    }
    
    this.queue[topic].push(handler);
  },
  trigger: function (topic) {
    if (this.queue[topic]) {
      _.each(this.queue[topic], function(handler) {
        handler();
      });
    }
  },
};

window.storage = storage;