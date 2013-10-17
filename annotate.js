var Annotate = function(settings) {

    var $                = jQuery;
    var self             = this;

    self.leftMouseButton = 1;

    self.settings = $.extend({
        overlayColor:           '#000',
        overlayOpacity:         '.25',
        overlayZIndex:          '9000000',
        annotationBorderColor:  '#f00',
        annotationBorderWidth:  3,
        annotationBorderStyle:  'solid',
        annotationMinimumSize:  10,
        collectHtml:            true,
        formId:                 null,
        formFadeDuration:       200,
        callback:               null
    }, settings);

    self.main = function() {
        self.reset();

        self.container = $('<div></div>').appendTo('body');
        self.originalCoords       = { top: 0, left: 0 };
        self.currentAnnotation    = null;
        self.currentId            = 0;
        self.isFormFaded          = false;
        self.form                 = self.initializeForm();

        self.createOverlay(self.container);

        self.overlay.bind('mousedown', self.onOverlayMouseDown);
        self.overlay.bind('mousemove', self.onOverlayMouseMove);
        self.overlay.bind('mouseup',   self.onOverlayMouseUp);

        self.overlay.height($(document).height());
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
        self.overlay = $('<div></div>')
        .css({
            position:         'absolute',
            width:            '100%',
            height:           '100%',
            backgroundColor:  self.settings.overlayColor,
            opacity:          self.settings.overlayOpacity,
            left:             '0',
            top:              '0',
            zIndex:           self.settings.overlayZIndex,
            textAlign:        'center'
        })
        .appendTo(container);
    }

    self.onOverlayMouseDown = function(e) {
        if (e.which != self.leftMouseButton)
            return;

        self.processLastComment();
        self.currentId++;
        var container = $('<div id="feedback-' + self.currentId + '" class="feedback-container"></div>');
        self.currentAnnotation = $('<div class="annotation"></div>').css({
            width:        '1px',
            height:       '1px',
            borderStyle:  self.settings.annotationBorderStyle,
            borderWidth:  self.settings.annotationBorderWidth + 'px',
            borderColor:  self.settings.annotationBorderColor,
            position:     'absolute',
            left:         e.pageX,
            top:          e.pageY,
            zIndex:       self.settings.overlayZIndex - 1
        })
        .appendTo(container);
        container.appendTo(self.container);
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

        var container = self.currentAnnotation.closest('.feedback-container');
        var coords = self.getCoordinates(self.currentAnnotation);

        self.fadeInForm();

        if (!self.checkAnnotationSize(coords)) {
            container.remove();
            self.currentAnnotation = null;
            return;
        }

        var closerHeight = 10;
        var closerWidth  = 10;

        var closer = $('<a>X</a>').css({
            display:     'block',
            width:       closerHeight + 'px',
            height:      closerWidth + 'px',
            position:    'absolute',
            border:      '1px solid #aaa',
            background:  'yellow',
            padding:     '3px',
            top:         (coords.top-(closerHeight/2)),
            left:        (coords.right-(closerWidth/2)),
            zIndex:      self.settings.overlayZIndex + 2
        })
        .bind('click', self.onClickClose)
        .appendTo(container);

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
            borderStyle: self.settings.annotationBorderStyle,
            borderWidth: self.settings.annotationBorderWidth,
            borderColor: self.settings.annotationBorderColor,
            position:    'absolute',
            left:        commentLeft,
            top:         commentTop,
            background:  'white',
            zIndex:      self.settings.overlayZIndex + 1
        })
        .append(textArea)
        .appendTo(container);

        textArea.focus();
        self.currentAnnotation = null;

        self.lastComment = currentComment;
    }

    self.initializeForm = function() {
        var form = (self.settings.formId) ? $('#'+self.settings.formId) : null;
        if (!form)
            return;
        form.css({
            zIndex: self.settings.overlayZIndex + 1
        });
        return form;
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
        var annotation = self.lastComment.closest('.feedback-container').find('.annotation');
        var text = textarea.val();
        self.lastComment.remove();
        self.lastComment = null;
        self.addCommentTextToAnnotation(annotation, text);
    }

    self.addCommentTextToAnnotation = function(annotation, text) {
        if (!text)
            return;

        var container = annotation.closest('.feedback-container');
        var coords = self.getCoordinates(annotation);

        var padding = 5;
        var comment = $('<div></div>').css({
            position:   'absolute',
            top:        coords.bottom + (self.settings.annotationBorderWidth*2),
            left:       coords.left,
            width:      annotation.width() + (self.settings.annotationBorderWidth*2) - (padding*2),
            background: 'white',
            padding:    padding + 'px',
            zIndex:     self.settings.overlayZIndex + 1
        })
        .html(text)
        .appendTo(container);
    }

    self.checkAnnotationSize = function(coords) {
        if ( (coords.bottom-coords.top) < self.settings.annotationMinimumSize )
            return false;
        if ( (coords.right-coords.left) < self.settings.annotationMinimumSize )
            return false;
        return true;
    }

    self.onClickClose = function(e) {
        var container = $(e.currentTarget).closest('.feedback-container');
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
