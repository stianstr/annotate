var Annotate = function(settings) {

    var $                = jQuery;
    var self             = this;
    self.settings        = $.extend({ annotationMinimumSize:  10 }, settings);
    self.leftMouseButton = 1;
    self.eventHandlers   = {};

    self.enable = function() {
        if (!self.container) {
            self.reset();
            self.container = $('<div></div>').appendTo('body');
        }
        self.createOverlay(self.container);
        self.enableOverlayEventHandlers();
        $('.annotate-close-link').show();
        self.triggerEvent('enabled', {
            zIndex: self.overlayZIndex
        });
    }

    self.disable = function() {
        if (!self.overlay)
            return;
		self.processLastComment();
        self.overlay.remove();
        self.overlay = null;
        $('.annotate-close-link').hide();
        self.triggerEvent('disabled');
    }

    self.toggle = function() {
        if (self.overlay)
            self.disable();
        else
            self.enable();
    }

    self.reset = function() {
        if (self.container) {
            self.container.remove();
            self.container = null;
        }
        self.startCoordinates     = { top: 0, left: 0 };
        self.currentAnnotation    = null;
        self.currentId            = 0;
        self.triggerEvent('reset');
    }

    self.on = function(event, callback) {
        if (!self.eventHandlers[event])
            self.eventHandlers[event] = [];
        self.eventHandlers[event][self.eventHandlers[event].length] = callback;
    }

	self.getTexts = function() {
		var result = [];
		$('.annotate-container .annotate-comment').each(function(n, elem) {
			var html = $(elem).html().trim();
			if (html)
				result[result.length] = html;
		});
		return result;
	}


    // =================================================================


    self.triggerEvent = function(event, data) {
        if (!self.eventHandlers[event])
            return;
        for(var i=0; i < self.eventHandlers[event].length; i++) {
            self.eventHandlers[event][i](data);
        }
    }

    self.createOverlay = function(container) {
        self.overlay = $('<div class="annotate-overlay"></div>')
        .css({
            position:         'absolute',
            width:            '100%',
            height:           '100%',
            left:             '0',
            top:              '0',
            textAlign:        'center'
        })
        .appendTo(container);
        self.overlay.height($(document).height());
        self.overlayZIndex = self.overlay.css('zIndex');
    }

    self.enableOverlayEventHandlers = function() {
        self.overlay.bind('mousedown', self.onOverlayMouseDown);
        self.overlay.bind('mousemove', self.onOverlayMouseMove);
        self.overlay.bind('mouseup',   self.onOverlayMouseUp);
    }

    self.disableOverlayEventHandlers = function() {
        self.overlay.unbind('mousedown', self.onOverlayMouseDown);
        self.overlay.unbind('mousemove', self.onOverlayMouseMove);
        self.overlay.unbind('mouseup',   self.onOverlayMouseUp);
    }

    self.onOverlayMouseDown = function(e) {
        if (e.which != self.leftMouseButton)
            return;

        self.processLastComment();
        self.currentId++;
        var container = $('<div id="annotate-' + self.currentId + '" class="annotate-container"></div>');
        self.currentAnnotation = $('<div class="annotate-annotation"></div>').css({
            width:        '1px',
            height:       '1px',
            position:     'absolute',
            left:         e.pageX,
            top:          e.pageY,
            zIndex:       self.overlayZIndex - 1
        })
        .appendTo(container);
        container.appendTo(self.container);

        self.annotationBorderWidth = (self.currentAnnotation.outerWidth()-self.currentAnnotation.width())/2;
        self.startCoordinates = { top: e.pageY, left: e.pageX };
    }

    self.onOverlayMouseMove = function(e) {
        if (!self.currentAnnotation)
            return;

        var newCoords = { top: e.pageY, left: e.pageX };

        if (newCoords.top < self.startCoordinates.top) 
            self.currentAnnotation.css('top', newCoords.top);
        if (newCoords.left < self.startCoordinates.left) 
            self.currentAnnotation.css('left', newCoords.left);

        self.currentAnnotation.height(Math.abs(newCoords.top - self.startCoordinates.top));
        self.currentAnnotation.width(Math.abs(newCoords.left - self.startCoordinates.left));

        if (self.checkAnnotationSize(self.getCoordinates(self.currentAnnotation)))
            self.triggerEvent('draw');
    }

    self.onOverlayMouseUp = function(e) {
        if (!self.currentAnnotation)
            return;

        var container = self.currentAnnotation.closest('.annotate-container');
        var coords = self.getCoordinates(self.currentAnnotation);

        if (!self.checkAnnotationSize(coords)) {
            container.remove();
            self.currentAnnotation = null;
            return;
        }

        var closer = $('<a class="annotate-close-link">X</a>').css({
            display:      'block',
            position:     'absolute',
            textAlign:     'center',
            verticalAlign: 'middle',
            zIndex:        self.overlayZIndex + 2
        })
        .bind('click', self.onClickClose)
        .appendTo(container);

        closer.css({
            top:  coords.top-(closer.outerHeight()/2)+(self.annotationBorderWidth/2),
            left: coords.right-(closer.outerWidth()/2)+(self.annotationBorderWidth/2),
        });

        var commentWidth   = self.currentAnnotation.width();
        var commentHeight  = self.currentAnnotation.height();
        var commentTop     = coords.top;
        var commentLeft    = coords.left;

        var textAreaPadding = 5;
        var textArea = $('<textarea placeholder="Enter comment..."></textarea>').css({
            border:  '0',
            borderRadius: '0',
            padding: textAreaPadding + 'px',
            width:   (commentWidth-(textAreaPadding*2)) + 'px',
            height:  (commentHeight-(textAreaPadding*2)) + 'px'
        });
        var currentComment = $('<div class="annotate-edit-comment"></div>').css({
            width:       commentWidth + 'px',
            height:      commentHeight + 'px',
            margin:      self.annotationBorderWidth,
            border:      '0',
            position:    'absolute',
            left:        commentLeft,
            top:         commentTop,
            background:  'white',
            zIndex:      self.overlayZIndex + 1
        })
        .append(textArea)
        .appendTo(container);

        textArea.focus();

        self.currentAnnotation = null;
        self.lastComment = currentComment;

        self.triggerEvent('drawn');
    }

    self.getCoordinates = function(highlight) {
        var coords     = highlight.position();
        coords.right   = coords.left + highlight.width();
        coords.bottom  = coords.top + highlight.height();
        return coords;
    }

    self.processLastComment = function() {
        if (!self.lastComment)
            return;
        var textarea = self.lastComment.find('textarea');
        var annotation = self.lastComment.closest('.annotate-container').find('.annotate-annotation');
        var text = textarea.val();
        self.lastComment.remove();
        self.lastComment = null;
        self.addCommentTextToAnnotation(annotation, text);
    }

    self.addCommentTextToAnnotation = function(annotation, text) {
        if (!text)
            return;

        var container = annotation.closest('.annotate-container');
        var coords = self.getCoordinates(annotation);

        var comment = $('<div class="annotate-comment"></div>').css({
            position:   'absolute',
            top:         coords.bottom + (self.annotationBorderWidth*2),
            left:        coords.left,
            zIndex:      self.overlayZIndex + 1
        })
        .html(text)
        .appendTo(container);

        comment.css({
            width: annotation.outerWidth() - (comment.outerWidth()-comment.width())
        });
    }

    self.checkAnnotationSize = function(coords) {
        return ( (coords.bottom-coords.top) >= self.settings.annotationMinimumSize || (coords.right-coords.left) >= self.settings.annotationMinimumSize );
    }

    self.onClickClose = function(e) {
        var container = $(e.currentTarget).closest('.annotate-container');
        container.remove();
    }

}
