// 'http://www.falabella.com.pe/static/minisitios/_includes/dynprices.js'

(function () {
  $(document).ready(function () {

    // function isUrlFor(parentId) {
    //   return !!location.href.indexOf('/product/' + parentId);
    // }

    function template(name, data) {
      var template = $('script#' + name + '-template').text().trim();

      if (data) {
        $.each(data, function (key, value) {
          // {{#each}}
          // console.log(typeof value);
          if (typeof value === 'object') {
            // /{{#each ' + key + '}}1234{{/each}}/gim.match();
            // console.log((new RegExp('{{#each ' + key + '}}{{/each}}', 'g')).exec(template));
            // template = template.replace(, 'aaaaa');
          }

          // {{key}}
          template = template.replace(new RegExp('{{' + key + '}}', 'gi'), value);
        });
      }

      template = template.replace(/ *\{\{[^\}]*\}\} */g, '');

      return $(template);
    }

    function getProductId() {
      return '16318225';
    }

    // Necesitamos saber si la URL
    // es de una ficha de producto
    var productId = getProductId();
    if (!productId)
      return;

    $.getJSON('collections.json', function (collections) {

      function getCollection(productId) {
        return collections[0];
      }

      // y si ese producto es parte de
      // alguna colección.
      var collection = getCollection(productId);
      if (!collection)
        return;

      // construccion del dom
      // (column > area > carousel > product)
      var $canvas = $('.canvas');
      var $busy = $canvas.find('.canvas-busy');
      var $popup = $canvas.find('.popup');

      // function popup() {
      //   $popup
      // }

      $popup.find('.popup-backdrop, .popup-close').on('click', function () {
        $popup.removeClass('visible');
      });

      $.each(collection.items, function (columnIndex, column) {
        var $column = template('column');

        $.each(column, function (areaIndex, area) {
          var $area = template('area');
          var $carousel = template('carousel');

          $.each(area, function (productIndex, product) {

            // test
            var product = {
              sku: product
            }
            // endtest

            var $product = template('product', product);
            // var $productDetail = $product.find('.product-detail');

            $product.on('click', function (e) {

              if ($busy.hasClass('visible'))
                return;

              $busy.addClass('visible');

              $.getJSON('https://www.falabella.com.pe/falabella-pe/browse/productJson.jsp?stop_mobi=yes&productId=' + product.sku, function (data) {
                $.get('https://www.falabella.com.pe/falabella-pe/product/' + data[0].productId + '/', function (data) {

                  var detail = JSON.parse(data.slice(
                    data.indexOf('var fbra_browseMainProductConfig = ') + 35,
                    data.indexOf('var fbra_browseMainProduct = FalabellaReactApplication.createComponent("ProductDetailApp", fbra_browseMainProductConfig);') -10
                  ));

                  // console.log(detail);
                  // console.log(detail.state.product.variations.size);
                  // label, value,

                  var sizes = detail.state.product.variations.size;

                  $popup.find('.popup-product-wrapper').html(
                    template('popup-product', {
                      sku: product.sku,
                      brand: detail.state.product.brand,
                      description: detail.state.product.displayName,
                      internetPrice: 'S/' + detail.state.product.prices[0].originalPrice,
                      // internetPrice: detail.state.product[0].originalPrice,
                      // internetPrice: detail.state.product[0].originalPrice,
                      size1: sizes[0].label,
                      size2: sizes[1].label,
                      size3: sizes[2].label,
                      sizes: sizes,
                    })
                  );

                  $busy.removeClass('visible');
                  $popup.addClass('visible');
                });
              });
            });

            // var $tooltip = template('tooltip', { sku: product });

            // // tooltip
            // $product.append($tooltip);

            // // setTimeout(function () {
            //   tippy($product.get(0), {
            //     interactive: true,
            //     // theme: 'light',
            //     content() {
            //       return $tooltip.get(0);
            //     }
            //   });
            // // }, 200);

            $carousel.append($product);
          });




          // var $carouselWrapper = $('<div class="carousel-wrapper"><div class="carousel-warpper-arrow carousel-wrapper-arrow-top"></div><div class="carousel-warpper-arrow carousel-wrapper-arrow-bottom"></div><div class="carousel-wrapper-slider"></div></div>');
          // var $buttonTop = $carouselWrapper.find('.carousel-wrapper-arrow-top');
          // var $buttonBottom = $carouselWrapper.find('.carousel-wrapper-arrow-bottom');
          // var $carouselWrapperSlider = $carouselWrapper.find('.carousel-wrapper-slider');
          // $carouselWrapper.find('.carousel-wrapper-slider').append($carousel).append($carousel.clone());
          // $area.append($carouselWrapper);
          //
          // $buttonTop.on('click', function (e) {
          //   $carouselWrapperSlider.css('top', '-320px');
          // });
          // $buttonBottom.on('click', function (e) {
          //   $carouselWrapperSlider.css('top', '0px');
          // });

          var $carouselWrapper = $('<div class="carousel-wrapper vertical-carousel"></div>');
          $carouselWrapper.append($carousel);
          $carouselWrapper.append($carousel.clone());

          $area.append($carouselWrapper);












          // $area.append($carousel);
          $column.append($area);




        });

        $canvas.append($column);
      });

      $canvas.find('.carousel')
        .slick({
          // dots: true
        })
        .addClass('visible');


      $canvas.find('.vertical-carousel').slick({
        // autoplay: true,
        arrows: true,
        // dots: true,
        // slidesToShow: 3,
        // centerPadding: "10px",
        draggable: false,
        infinite: true,
        pauseOnHover: true,
        // swipe: false,
        // touchMove: false,
        vertical: true,
        // speed: 1000,
        // autoplaySpeed: 2000,
        // useTransform: true,
        // cssEase: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
        // adaptiveHeight: true,
      });

      // tippy('.product', {
      //   content() {
      //     return template('tooltip').get(0);
      //   }
      // });

    });

  });

})();
