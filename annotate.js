var Annotate = function(settings) {

    var $                = jQuery;
    var self             = this;

    self.leftMouseButton = 1;

    self.settings = $.extend({
        annotationMinimumSize:  10,
        collectHtml:            true,
        formId:                 null,
        formFadeDuration:       200,
        callback:               null
    }, settings);

    self.main = function() {
        self.reset();

        // todo: move some of this to reset() maybe?
        self.container = $('<div></div>').appendTo('body');
        self.originalCoords       = { top: 0, left: 0 };
        self.currentAnnotation    = null;
        self.currentId            = 0;
        self.isFormFaded          = false;

        self.createOverlay(self.container);
        self.initOverlayEventHandlers();
        self.initializeForm();
    }

    self.commit = function() {
        var data = self.collectInformation();
        self.reset();
        if (self.settings.callback)
            self.settings.callback(data);
    }

    self.cancel = function() {
        self.reset();
    }


    // =================================================================


    self.reset = function() {
        if (!self.container)
            return;
        self.container.remove();
        self.container = null;
    }


    self.createOverlay = function(container) {
        self.overlay = $('<div class="annotate-overlay"></div>')
        .css({
            position:         'absolute',
            width:            '100%',
            height:           '100%',
            left:             '0',
            top:              '0',
            //zIndex:           self.overlayZIndex,
            textAlign:        'center'
        })
        .appendTo(container);
        self.overlay.height($(document).height());
        self.overlayZIndex = self.overlay.css('zIndex');
    }

    self.initOverlayEventHandlers = function() {
        self.overlay.bind('mousedown', self.onOverlayMouseDown);
        self.overlay.bind('mousemove', self.onOverlayMouseMove);
        self.overlay.bind('mouseup',   self.onOverlayMouseUp);
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
        self.originalCoords = { top: e.pageY, left: e.pageX };
    }

    self.onOverlayMouseMove = function(e) {
        if (!self.currentAnnotation)
            return;

        var newCoords = { top: e.pageY, left: e.pageX };

        if (newCoords.top < self.originalCoords.top) 
            self.currentAnnotation.css('top', newCoords.top);
        if (newCoords.left < self.originalCoords.left) 
            self.currentAnnotation.css('left', newCoords.left);

        self.currentAnnotation.height(Math.abs(newCoords.top - self.originalCoords.top));
        self.currentAnnotation.width(Math.abs(newCoords.left - self.originalCoords.left));

        if (self.checkAnnotationSize(self.getCoordinates(self.currentAnnotation)))
            self.fadeOutForm();
    }

    self.onOverlayMouseUp = function(e) {
        if (!self.currentAnnotation)
            return;

        var container = self.currentAnnotation.closest('.annotate-container');
        var coords = self.getCoordinates(self.currentAnnotation);

        self.fadeInForm();

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

        var textArea = $('<textarea placeholder="Enter comment..."></textarea>').css({
            border:  '0',
            width:   (commentWidth) + 'px',
            height:  (commentHeight) + 'px',
        });
        var currentComment = $('<div></div>').css({
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
    }

    self.initializeForm = function() {
        self.form = (self.settings.formId) ? $('#'+self.settings.formId) : null;
        if (!self.form)
            return;
        self.form.css({
            zIndex: self.overlayZIndex + 1
        });
    }

    self.fadeOutForm = function() {
        if (!self.settings.formId || self.isFormFaded)
            return;
        self.isFormFaded = true;
        self.form.fadeOut(self.settings.formFadeDuration);
    }

    self.fadeInForm = function() {
        if (!self.settings.formId || !self.isFormFaded)
            return;
        self.isFormFaded = false;
        self.form.fadeIn(self.settings.formFadeDuration);
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
        if ( (coords.bottom-coords.top) < self.settings.annotationMinimumSize )
            return false;
        if ( (coords.right-coords.left) < self.settings.annotationMinimumSize )
            return false;
        return true;
    }

    self.onClickClose = function(e) {
        var container = $(e.currentTarget).closest('.annotate-container');
        container.remove();
    }

    self.collectHtml = function() {

        $('*').each(function () {
            if ($(this).attr('style'))
                $(this).data('oldStyle', $(this).attr('style'));
            else
                $(this).data('oldStyle', 'none');
            $(this).width($(this).width());
            $(this).height($(this).height());
        });

        var html = '<html>' + $('html').html() + '</html>';

        $('*').each(function () {
            if ($(this).data('oldStyle') != 'none')
                $(this).attr('style', $(this).data('oldStyle'));
            else
                $(this).removeAttr('style');
        });

        return html;

    }

    self.collectInformation = function() {
        var data = {
            url:       document.URL,
            userAgent: navigator.userAgent,
        };
        if (self.settings.collectHtml)
            data.html = self.collectHtml();
        return data;
    }

}
