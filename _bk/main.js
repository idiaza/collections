(function () {

  var SELECTOR_ROOT = '#fbra_browseMainProduct';

  $(document).ready(function () {

    function product($wrapper, props) {
      var $html = template('product');

      return $wrapper.html($html);
    }

    function carousel($wrapper, props) {
      var $html = template('carousel');
      var $slider = $html.find('.carousel-slider');

      $wrapper.on('mousedown', function (e) {
        $wrapper.addClass('drag');//.css('cursor', 'move');
        
        var height = $wrapper.outerHeight();
        var width = $wrapper.outerWidth();

        var max_left = $wrapper.parent().offset().left + $wrapper.parent().width() - $wrapper.width();
        var max_top = $wrapper.parent().offset().top + $wrapper.parent().height() - $wrapper.height();
        var min_left = $wrapper.parent().offset().left;
        var min_top = $wrapper.parent().offset().top;

        var ypos = $wrapper.offset().top + height - e.pageY;
        var xpos = $wrapper.offset().left + width - e.pageX;
        
        // console.log(height, width, max_left, max_top, min_left, min_top);
        
        $(document.body)
          .on('mousemove', function (e) {
            var itop = e.pageY + ypos - height;
            var ileft = e.pageX + xpos - width;
            
            if ($wrapper.hasClass('drag')) {
              if (itop <= min_top ) { itop = min_top; }
              if (ileft <= min_left ) { ileft = min_left; }
              if (itop >= max_top ) { itop = max_top; }
              if (ileft >= max_left ) { ileft = max_left; }
              // console.log(itop, ileft);
              // $wrapper.offset({ top: itop, left: ileft});
              $wrapper.css({ top: itop, left: ileft});
            }
          })
          .on('mouseup', function (e) {
            $wrapper.removeClass('drag');
          });
      });

      $html.find('.carousel-delete').on('click', function (e) {
        $wrapper.remove();
      });

      // test
      $slider.append($('<div class="carousel-slider-item"></div>').html(render(product)));
      // endtest

      return $wrapper.html($html);
    }

    function canvas($wrapper, props) {
      var $html = template('canvas');
      var $area = $html.find('.canvas-area');

      // $area
      //   .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
      //     e.preventDefault();
      //     e.stopPropagation();
      //   })
      //   .on('dragover dragenter', function () {
      //     $area.addClass('dragover');
      //   })
      //   .on('dragleave dragend drop', function () {
      //     $area.removeClass('dragover');
      //   })
      //   .on('drop', function (e) {
      //     // process(e.originalEvent.dataTransfer.files);
      //   });

      $html.find('.canvas-header-control-add').on('click', function (e) {
        $area.append(render(carousel));
      });
      $area.append(render(carousel));

      return $wrapper.html($html);
    }

    function template(name, data) {
      var template = $('script#' + name + '-template').text().trim();

      if (data) {
        $.each(data, function (key, value) {
          template = template.replace(new RegExp('{{' + key + '}}'), value);
        });
      }

      return $(template);
    }
    
    function render(component, props) {
      return component($('<div class="component"></div>'), props);
    }

    $(SELECTOR_ROOT).after($('<div class="collections"></div>').html(render(canvas)));

  });

})();