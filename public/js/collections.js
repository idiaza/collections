$(document).ready(function () {
  function template(name, data) {
    var source = $('script#' + name + '-template').text().trim();
    var render = Handlebars.compile(source);
    return $(render(data));
  }

  function getProductId() {
    return '881447613';
  }

  var productId = getProductId();
  if (!productId)
    return;

  var storage = {
    queue: {
      'collectionChange': [],
    },
    cache: {},
    collection: {},
    on: function (topic, cb) {
      this.queue[topic].push(cb);
    },
    addToCache: function (product) {
      this.cache[product.id] = product;
    },
    getFromCache: function (sku) {
      return this.cache[sku];
    },
    addToCollection: function (sku, quantity) {
      quantity = parseInt(quantity);

      if (this.collection[sku]) {
        this.collection[sku].quantity += quantity;

        var self = this;
        _.each(this.queue['collectionChange'], function (cb) {
          cb(self.collection[sku]);
        });

        return;
      }

      var product = _.find(this.cache, {skus: [{ skuId: sku }]});
      var child = _.find(product.skus, { skuId: sku });

      this.collection[sku] = {
        parentSku: product.id,
        sku: child.skuId,
        brand: product.brand,
        description: product.displayName,
        size: child.size,
        quantity: quantity || 1,
      };

      var self = this;
      _.each(this.queue['collectionChange'], function (cb) {
        cb(self.collection[sku]);
      });
    },
    getFromCollection: function (sku) {
      return this.collection[sku];
    },
    removeFromCollection: function (sku) {
      delete this.collection[sku];

      var self = this;
      _.each(this.queue['collectionChange'], function (cb) {
        cb(self.collection[sku]);
      });
    },
    getCollection: function () {
      return _.map(this.collection);
    }
  };

  $.getJSON('/collections', function (collections) {
    function getCollection(productId) {
      return collections[0];
    }

    var collection = getCollection(productId);
    if (!collection)
      return;

    var $collections = $('.collections');
    var $busy = $collections.find('.busy');
    var $outfit = $collections.find('.outfit');
    var $popup = $outfit.find('.popup');
    var $basket = $collections.find('.basket');

    function openPopup(childSku, product) {
      var childs = product.skus;
      var child = _.find(childs, { skuId: childSku });
      var prices = child.price;
      var collectionItem = storage.getFromCollection(childSku) || {};
      var $product = template('product', {
        sku: childSku,
        brand: product.brand,
        description: product.displayName,
        prices: _.map(_.orderBy(prices, function (price) {
          return parseFloat(price.originalPrice);
        }), function (item, itemIndex) {
          return { price: item.originalPrice, label: item.label };
        }),
        sizes: _.map(_.filter(childs, { color: child.color }), function (item) {
          var size = { sku: item.skuId, label: item.size };

          if (collectionItem.size) {
            if(collectionItem.size == size.label) {
              size.selected = true;
            }
          }
          else {
            if (child.size == size.label) {
              size.selected = true;
            }
          }

          return size;
        }),
        quantity: collectionItem.quantity || 1,
      });

      $product.find('.size').on('click', function () {
        var $this = $(this);
        var colorSku = $this.attr('data-product');
        openPopup(colorSku, product);
      });

      $product.find('.quantity-decrease').on('click', function () {
        var $number = $product.find('.quantity-number input');
        var quantity = $number.val();

        --quantity;

        if (quantity > 0)
          $number.val(quantity);
      });

      $product.find('.quantity-increase').on('click', function (e) {
        var $number = $product.find('.quantity-number input');
        var quantity = $number.val();

        ++quantity;

        if (quantity > 0)
          $number.val(quantity);
      });

      $product.find('.collection-add').on('click', function () {
        var quantity = $product.find('.quantity-number input').val();
        storage.addToCollection(childSku, quantity);
      });

      $popup.find('.popup-content').html($product);
      $busy.removeClass('visible');
      $popup.addClass('visible');
    }

    function closePopup() {
      $popup.removeClass('visible');
    }

    function parse(html) {
      return JSON.parse(html.slice(
        html.indexOf('var fbra_browseMainProductConfig = ') + 35,
        html.indexOf('var fbra_browseMainProduct = FalabellaReactApplication.createComponent("ProductDetailApp", fbra_browseMainProductConfig);') -10
      ));
    }

    $.each(collection.items, function (index, box) {
      var $box = $('<div class="box"></div>');
      var $top = $('<div class="control arrow arrow-top">❮</div>');
      var $right = $('<div class="control arrow arrow-right">❯</div>');
      var $bottom = $('<div class="control arrow arrow-bottom">❯</div>');
      var $left = $('<div class="control arrow arrow-left">❮</div>');
      var $vertical = $('<div class="slider vertical"></div>');

      $box.append($top);
      $box.append($right);
      $box.append($bottom);
      $box.append($left);

      $left.on('click', function () {
        $box.find('.horizontal.slick-current')
          .slick('slickPrev');
      });
      $right.on('click', function () {
        $box.find('.horizontal.slick-current')
          .slick('slickNext');
      });

      $top.on('click', function () {
        $vertical.slick('slickPrev');
      });
      $bottom.on('click', function () {
        $vertical.slick('slickNext');
      });

      $.each(box, function (index, product) {
        var $horizontal = $('<div class="slider horizontal"></div>');

        $horizontal.attr('data-product', product.id);
        $.each(product.views, function (index, view) {
          var $view = $('<div class="view" data-product="' + view + '"><img src="https://falabella.scene7.com/is/image/FalabellaPE/' + view + '_2?wid=320&hei=320"></div>');

          $horizontal.append($view);
        });

        $vertical.append($horizontal);
      });

      $box.append($vertical);
      $outfit.append($box);
    });

    $collections.waitForImages(function() {
      $('.horizontal').slick({ arrows: false/*, infinite: false*/, swipe: false });
      $('.vertical').slick({ arrows: false, infinite: false, swipe: false, vertical: true });
      $('.collections').addClass('visible');
    });

    $popup.find('.popup-backdrop').on('click', closePopup);
    $popup.find('.popup-close').on('click', closePopup);

    $('.view').on('click', function () {
      if ($busy.hasClass('visible'))
        return;

      $busy.addClass('visible');

      var $view = $(this);
      var parentSku = $view.closest('.horizontal').attr('data-product');
      var childSku = $view.attr('data-product');
      var product = storage.getFromCache(parentSku);

      if (product)
        return openPopup(childSku, product);

      $.get('https://www.falabella.com.pe/falabella-pe/product/' + parentSku + '/', function (html) {
        var details = parse(html);
        product = details.state.product;
        storage.addToCache(product);
        openPopup(childSku, product);
      });
    });

    storage.on('collectionChange', function () {
      var collection = storage.getCollection();

      $basket.find('.basket-items').html(
        _.map(collection, function (item) {
          var $item = template('basket-item', item);

          $item.find('.collection-remove').on('click', function (e) {
            e.preventDefault();
            storage.removeFromCollection(item.sku);
          });
          return $item;
        })
      );
    });

  });
});
