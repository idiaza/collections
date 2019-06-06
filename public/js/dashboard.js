$(document).ready(function () {

  var $dashboard = $('.dashboard');
  var $busy = $dashboard.find('.busy');
  var $popup = $dashboard.find('.popup');
  var $collections = $('.collections');

  var store = {
    tags: [],
    getTags: function () {
      return this.tags;
    },
    setTag: function (tag, words) {
      this.tags.push({ name: tag, words: words });
    },
    removeTag: function (tag) {
      _.pullAllBy(this.tags, [{ name: tag }], 'name');
    },
    setWord: function (tag, word) {
      var index = _.findIndex(this.tags, { name: tag });
      this.tags[index].words.push(word);
    },
    collections: [],
    getCollections: function () {
      return this.collections;
    },
    setCollectionItems: function (collectionName, items) {
      var index = _.findIndex(this.collections, { name: collectionName });
      this.collections[index].items = items;
    },
  };

  function template(name, data) {
    var source = $('script#' + name + '-template').text().trim();
    var render = Handlebars.compile(source);
    return $(render(data));
  }

  function closePopup() {
    $popup.removeClass('visible');
  }

  function openPopup(title, $content, defaultControls) {
    if (typeof title === 'string')
      $popup.find('.popup-title').text(title);

    if (defaultControls)
      $popup.find('.popup-close').css('visibility', 'visible');

    $popup.find('.popup-content').html($content);
    $busy.removeClass('visible');
    $popup.addClass('visible');
  }

  function url(sku) {
    return 'https://www.falabella.com.pe/falabella-pe/product/' + sku + '/';
  }

  function parse(html) {
    return JSON.parse(html.slice(
      html.indexOf('var fbra_browseMainProductConfig = ') + 35,
      html.indexOf('var fbra_browseMainProduct = FalabellaReactApplication.createComponent("ProductDetailApp", fbra_browseMainProductConfig);') -10
    ));
  }

  function process(response) {
    var html = response.data;
    var details = parse(html);
    var product = details.state.product;
    var description = product.displayName.toLowerCase();
    var result = { tag: '', views: [] };
    var tags = store.getTags();

    result.id = product.id;

    _.each(tags, function (tag) {
      _.each(tag.words, function (word) {
        if (description.toLowerCase().indexOf(word.toLowerCase()) > -1)
          result.tag = tag.name;
      });
    });

    if (product.variations && product.variations.color && product.variations.color.length > 0) {
      result.views = _.map(_.uniqBy(product.skus, 'color'), 'skuId');
    }
    else {
      result.views.push(product.skus[0].skuId);
    }

    return result;
  }

  function distribute(collectionName, products, positions, callback) {
    axios.all(_.map(products, function (parentSku) {
      return axios.get(url(parentSku)).then(process);
    }))
      .then(function (products) {
        var products = _.groupBy(products, 'tag');
        var items = [];

        _.each(_.countBy(positions), function (count, tag) {
          if (products[tag])
            products[tag] = _.chunk(products[tag], Math.ceil(products[tag].length / count));
        });

        _.map(positions, function (tag) {
          if (products[tag]) {
            items.push(products[tag][0]);
            products[tag] = _.tail(products[tag]);
          } else {
            items.push([]);
          }
        });

        store.setCollectionItems(collectionName, items);
        callback();
      });
  }

  $.getJSON('/collections', function (collections) {
    $.getJSON('/tags', function (tags) {

      store.collections = collections;
      store.tags = tags;

      _.each(store.getCollections(), function (collection) {
        var parents = _.map(_.flatten(collection.items), 'id');
        var $collection = template('collection', _.assign(collection, { parents: parents }));

        $collection.find('.collection-distribute').on('click', function () {
          var $button = $(this);
          var products = _.split(
            $button.parent().find('.collection-products')
              .val().trim().replace(/\s/g, ''),
            ','
          );

          $button.addClass('disabled');
          distribute(
            collection.name,
            _.compact(products),
            collection.positions,
            function () {
              $button.removeClass('disabled');
            }
          );
        });

        $collection.find('.position').on('click', function () {
          var $position = $(this);
          var positionIndex = $position.index();

          var $box = template('box', {
            products: collection.items[positionIndex],
            tags: store.getTags(),
          });

          $box.find('.box-close').on('click', function () {
            closePopup();
          });

          openPopup('Posición', $box, false);
        });

        $collections.append($collection);
      });
    });
  });

  $popup.find('.popup-backdrop, .popup-close').on('click', function () {
    closePopup();
  });

  $('.dictionary-open').on('click', function () {
    var tags = store.getTags();
    var $dictionary = template('dictionary', { tags: tags });

    $dictionary.find('.dictionary-new-word').on('keyup', function (e) {
      if (e.keyCode == 13) {
        var $input = $(this);
        var tag = $input
                    .closest('.dictionary-tag')
                    .find('.dictionary-name')
                    .text().trim();
        var word = $input.val();

        store.setWord(tag, word);

        $input.before('<div class="dictionary-word">' + word + '</div>');
        $input.val('');
      }
    });

    $dictionary.find('.dictionary-tag-remove').on('click', function () {
      var $tag = $(this).closest('.dictionary-tag');
      var tag = $tag.find('.dictionary-name').text().trim();

      store.removeTag(tag);
      $tag.remove();
    });

    $dictionary.find('.dictionary-save').on('click', function () {
      var $button = $(this);

      $button.addClass('disabled');
      axios.post('/tags', store.getTags())
        .then(function (response) {
          $button.removeClass('disabled');
        });
    });

    $dictionary.find('.dictionary-close').on('click', function () {
      closePopup();
    });

    openPopup('Diccionario', $dictionary, false);
  });

  $('.collections-save').on('click', function () {
    var $button = $(this);

    $button.addClass('disabled');
    axios.post('/collections', store.getCollections())
      .then(function (response) {
        $button.removeClass('disabled');
      });
  });
});
