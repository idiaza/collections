$(document).ready(function () {

  console.log('collections v0.2');

  function getProductId() {
    var url = document.location.href;

    if (url.indexOf('/falabella-pe/product/') == 0) {
      return false;
    }

    var sku = url
      .split('/falabella-pe/product/')[1].split('/')[0];

    return sku;
    // return '881447613';
  }

  var productId = getProductId();
  if (!productId)
    return;

  $.getJSON('https://falabellacollections.azurewebsites.net/collections', function (collections) {
    function getCollection(productId) {
      var collection = _.find(collections, { products: [productId] });
      return collection;
    }

    var collection = getCollection(productId);
    if (!collection)
      return;

    function template(name, data) {
      var source = $('script#' + name + '-template').text().trim();
      var render = Handlebars.compile(source);
      return $(render(data));
    }
  
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
        prices: _.map(_.orderBy(prices, function (price) {return parseFloat(price.originalPrice);}), function (item, itemIndex) {
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
        closePopup();
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

    // box structure creation
    $.each(collection.items, function (index, parents) {
      var $box = $('<div class="box"></div>');
      
      if (!_.isEmpty(parents)) {
        var $vertical = $('<div class="slider vertical"></div>');

        // top, bottom arrows
        var $top = $('<div class="control arrow arrow-vertical arrow-top">❮</div>');
        var $bottom = $('<div class="control arrow arrow-vertical arrow-bottom">❯</div>');
        $top.on('click', function () {
          $vertical.slick('slickPrev');
        });
        $bottom.on('click', function () {
          $vertical.slick('slickNext');
        });
        $box.append($top);
        $box.append($bottom);

        // left, right arrows
        var $left = $('<div class="control arrow arrow-horizontal arrow-left">❮</div>');
        var $right = $('<div class="control arrow arrow-horizontal arrow-right">❯</div>');
        $left.on('click', function () {
          $box.find('.horizontal.slick-current')
            .slick('slickPrev');
        });
        $right.on('click', function () {
          $box.find('.horizontal.slick-current')
            .slick('slickNext');
        });
        $box.append($left);
        $box.append($right);
        
        $.each(parents, function (index, product) {
          var $horizontal = $(`
            <div class="slider horizontal" data-product="${product.id}"></div>
          `);
          
          $.each(product.views, function (index, view) {
            var $view = $(`
              <div class="view" data-product="${view}">
                <div class="view-overlay"></div>
                <img src="https://falabella.scene7.com/is/image/FalabellaPE/${view}_1?wid=320&hei=320">
              </div>
            `);
            $horizontal.append($view);
          });
          
          // agregar flechas

          $vertical.append($horizontal);
        });

        $box.append($vertical);
      }
      $outfit.append($box);
    });

    $collections.waitForImages(function() {
      $collections.find('.horizontal').slick({
        arrows: false,
        swipe: false,
      });

      $collections.find('.box').each(function () {
        var $box = $(this);
        var $verticalArrows = $box.find('.arrow-vertical');
        var $horizontalArrows = $box.find('.arrow-horizontal');
        var $vertical = $box.find('.vertical');

        if ($vertical.length == 0)
          return;

        $vertical.slick({
          arrows: false,
          swipe: false,
          vertical: true,
        });

        var verticalSlick = $vertical.slick('getSlick');

        if (verticalSlick.slideCount > 1) {
          $verticalArrows
            .addClass('visible');
        }

        var $horizontal = $(verticalSlick.$slides[$vertical.slick('slickCurrentSlide')]);
        
        if ($horizontal.slick('getSlick').slideCount > 1) {
          $horizontalArrows
            .addClass('visible');
        } else {
          $horizontalArrows
          .removeClass('visible');
        }
        
        $vertical.on('beforeChange', function(e, slick, currentSlide, nextSlide){
          if (e.currentTarget == e.target) {
            
            
            var $horizontal = $(verticalSlick.$slides[nextSlide]);
        
            if ($horizontal.slick('getSlick').slideCount > 1) {
              $horizontalArrows
                .addClass('visible');
            } else {
              $horizontalArrows
              .removeClass('visible');
            }
          }
        });
      });
      
      $collections.addClass('visible');
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

    $('.cart-add').on('click', function (e) {
      // $.post('/tracks/add-collection-to-cart', {
      //   items: [
      //     '12341234',
      //     '12341235',
      //     '12341236',
      //   ],
      // }, function () {
      //   console.log('done')
      // });
      console.log('.card-add is clicked - 20190808v1');

      $.ajax({
        url: '/rest/model/atg/commerce/order/purchase/CartModifierActor/addItemToBasket',
        method: 'POST',
        // dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
          "formSubmissionData": _.map(storage.getCollection(), function (item) {
            return {
              "skuId": item.sku, // child
              "quantity": item.quantity,
              "productId": item.parentSku, // parent
              "hasVariations": true
            };
          })
        }),
        success: function (data) {
          console.log('success...');
          console.log(data);
        }
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
