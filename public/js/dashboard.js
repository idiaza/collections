$(document).ready(function () {

  const TAG_DEFAULT = {
    name: 'any',
    words: []
  };
  
  _.each([
    'dictionary-tag',
  ], (name) => {
    Handlebars.registerPartial(name, $('script#' + name + '-template').text().trim());
  });

  Handlebars.registerHelper('eq', function(a, b) {
    return a == b;
  });

  var $dashboard = $('.dashboard');
  var $busy = $dashboard.find('.busy');
  var $popup = $dashboard.find('.popup');
  var $collections = $('.collections');

  function template(name, data) {
    var source = $('script#' + name + '-template').text().trim();
    
    // if (!data)
    //   return Handlebars.registerPartial(name, source);

    var render = Handlebars.compile(source);
    return $(render(data));
  }

  function busy($trigger) {
    $busy.addClass('visible');
    $trigger.addClass('disabled');
  }

  function unbusy($trigger) {
    $busy.removeClass('visible');
    $trigger.removeClass('disabled');
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
    // console.log(html.slice(
    //   html.indexOf('var fbra_browseMainProductConfig = ') + 35,
    //   html.indexOf('var fbra_browseMainProduct = FalabellaReactApplication.createComponent("ProductDetailApp", fbra_browseMainProductConfig);') -10
    // ));
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
    var tags = storage.getTags();

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

  function distribute(collectionId, products, positions, callback) {
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

        storage.setCollectionItems(collectionId, items);
        callback();
      });
  }

  function openDictionary() {
    var tags = storage.getTags();
    var $dictionary = template('dictionary', { tags: tags });
    
    $dictionary.find('.dictionary-new-word').on('keyup', function (e) {
      if (e.keyCode == 13) {
        var $input = $(this);
        var tag = $input
                    .closest('.dictionary-tag')
                    .find('.dictionary-name')
                    .text().trim();
        var word = $input.val();

        storage.setWord(tag, word);

        openDictionary();

        // $input.before('<div class="dictionary-word">' + word + '</div>');
        // $input.val('');
      }
    });

    $dictionary.find('.dictionary-word .dictionary-word-remove').on('click', function () {
      var tag = $(this).closest('.dictionary-tag').find('.dictionary-name').text();
      var word = $(this).parent().find('.dictionary-word-text').text();

      storage.removeWord(tag, word);
      openDictionary()
    });

    $dictionary.find('.dictionary-tag-remove').on('click', function () {
      var $tag = $(this).closest('.dictionary-tag');
      var tag = $tag.find('.dictionary-name').text().trim();

      storage.removeTag(tag);
      $tag.remove();
      renderCollections();
    });

    $dictionary.find('.dictionary-tag-new-button').on('click', function () {
      var $input = $('.dictionary-tag-new-input');
      storage.setTag($input.val().trim(), []);
      openDictionary();
      renderCollections();
    });

    $dictionary.find('.dictionary-tag-new-input').on('keyup', function (e) {
      var $input = $(this);
      if (e.keyCode == 13) {
        storage.setTag($input.val().trim(), []);
        openDictionary();
        renderCollections();
      }
    });

    $dictionary.find('.dictionary-save').on('click', function () {
      var $button = $(this);

      busy($button);
      axios.post('/tags', storage.getTags())
        .then(function (response) {
          unbusy($button);
          closePopup();
          renderCollections();
        });
    });

    $dictionary.find('.dictionary-close').on('click', function () {
      closePopup();
    });

    openPopup('Diccionario', $dictionary, false);
  }

  function openPosition(collectionIndex, positionIndex) {
    // var $position = $(this);
    // var positionIndex = $position.index();
    var collections = storage.getCollections()[collectionIndex];

    var $box = template('box', {
      tag: collections.positions[positionIndex],
      products: collections.items[positionIndex],
      tags: storage.getTags(),
    });

    var $select = $box.find('.box-select');

    $select.on('change', function (e) {
      storage.setPosition($collections.index(), positionIndex, $select.val());
      openPosition(collectionIndex, positionIndex);
    });

    $box.find('.box-close').on('click', function () {
      closePopup();
    });

    $box.find('.box-save').on('click', function () {
      // var tag = $box.find('.box-select').val();
    });

    openPopup('Posición', $box, false);
  }

  function renderCollections() {
    $collections.empty();

    _.each(storage.getCollections(), function (collection, collectionIndex) {
      var parents = _.map(_.flatten(collection.items), 'id');
      var $collection = template('collection', _.create(collection, {
        parents,
        tags: _.concat(storage.getTags(), [TAG_DEFAULT]),
      }));

      // $collection.find('.position').on('click', function () {
      //   var $position = $(this);
      //   var positionIndex = $position.index();
        
      //   openPosition(collectionIndex, positionIndex);
      // });

      // // FIX
      // $collection.find('.position').each(function () {
      //   var $position = $(this);
      //   var positionIndex = $position.index();

      //   storage.on('ChangeCollection' + collectionIndex + 'Position' + positionIndex, function () {
      //     $position.find('.tag').text(storage.getCollections()[collectionIndex].positions[positionIndex]);
      //   });
      // });

      $collection.find('select.position-tag').on('change', function () {
        var $select = $(this);
        storage.setPosition(collectionIndex, $select.closest('.position').index(), $select.val());
      });

      $collection.find('.collection-distribute').on('click', function () {
        var $button = $(this);
        var products = _.compact(_.split(
          $collection.find('.collection-products')
            .val()
            .trim()
            .replace(/\s/g, ''),
          ','
        ));

        $button.addClass('disabled');
        distribute(
          collection.id,
          products,
          collection.positions,
          function () {
            $button.removeClass('disabled');
          }
        );
      });

      $collection.find('.collection-remove').on('click', function () {
        storage.removeCollection(collection.name);
        $collection.remove();
      });

      $collection.find('.collection-save').on('click', function () {
        var $button = $(this);
        var products = _.compact(_.split(
          $collection.find('.collection-products')
            .val()
            .trim()
            .replace(/\s/g, ''),
          ','
        ));

        // A duplicate-free version of products array
        products = _.uniq(products);

        busy($button);
        distribute(
          collection.id,
          products,
          collection.positions,
          function () {
            collection.name = $collection.find('.collection-name').val().trim();
            collection.description = $collection.find('.collection-description').val().trim();
            axios.post('/collections', storage.getCollection(collection.id))
              .then(function (response) {
                unbusy($button);
              });
          }
        );
      });

      $collections.append($collection);
    });
  }

  $.getJSON('/collections', function (collections) {
    $.getJSON('/tags', function (tags) {
      storage.collections = collections;
      storage.tags = tags;
      
      renderCollections();
    });
  });

  $popup.find('.popup-backdrop, .popup-close').on('click', function () {
    closePopup();
  });

  $('.dictionary-open').on('click', function () {
    openDictionary();
  });

  $('.collections-add').on('click', function () {
    storage.createCollection();
    renderCollections();
  });
});
