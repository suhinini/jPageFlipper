/// <reference path="../lib/jquery-1.4.1-vsdoc.js" />

(function ($s) {  // TODO rename $s to $
	$.fn.pageFlipper = function (userOptions) {
		var defaults = {
			className: 'canvasHolder',
			pageWidth: 500,
			pageHeight: 375,
			easing: 0.5,
			fps: 20,
			defaultPageColor: 'white',
			backgroundColor: 'white',
			cornerSide: 50
		};

		var options = $.extend(defaults, userOptions);
		options.updateDelay = 1000 / options.fps;
		options.spreadWidth = options.pageWidth * 2;
		options.pageDiagonal = Math.sqrt(options.pageWidth * options.pageWidth + options.pageHeight * options.pageHeight);
		options.pageClipWidth = options.pageWidth;
		options.pageClipHeight = options.pageWidth * 10;
		options.pageHeightOffset = options.pageDiagonal - options.pageHeight;

		var canvas = null;
		var tempCanvas = null;
		var holder = null;
		var context = null;
		var tempContext = null;

		var mousePosition = null;
		var followerPosition = null;

		var pageAngle = 0;

		var spineTopX = options.pageWidth;
		var spineTopY = 0;
		var spineBottomTop = options.pageHeight;

		var bisectorTangetY = options.pageHeight;

		var leftIsActive;

		function createHandles() {
			mousePosition = {top: options.pageHeight, left: options.pageWidth * 2};
			followerPosition = {top: options.pageHeight, left: options.pageWidth * 2};
			leftIsActive = false;
		}

		function createCanvas(element) {
			holder = $("<div id='canvasHolder'></div>");
			holder
				.insertAfter(element)
				.addClass(options.className)
				.attr('width', options.pageWidth * 2)
				.attr('height', options.pageHeight + options.pageHeightOffset * 2);
			
			canvas = $("<canvas id='mainCanvas'></canvas>");
			holder.append(canvas);

			canvas
				.attr('width', options.pageWidth * 2)
				.attr('height', options.pageHeight + options.pageHeightOffset * 2);

			tempCanvas = $("<canvas id='tempCanvas'></canvas>");
			tempCanvas
				.css({
					position: 'absolute',
					top: canvas.position().top,
					left: canvas.position().left
				})
				.attr('width', canvas.width())
				.attr('height', canvas.height())
				.appendTo(holder);
				
			context = canvas.get(0).getContext('2d');
			tempContext = tempCanvas.get(0).getContext('2d');

			context.strokeStyle = "#aaaaaa";
			context.beginPath();
			context.moveTo(options.pageWidth, options.pageHeightOffset);
			context.lineTo(options.pageWidth, options.pageHeight + options.pageHeightOffset);
			context.stroke();
		}

		function getRealPosition(element, position) {
			element = $(element);
			if (position == null) {
				position = element.position();
			}

			return {
				top: position.top + element.height() / 2 - options.pageHeightOffset,
				left: position.left + element.width() / 2
			};
		}

		var dragging = false;
		var flipInProgress = false;

		function activateMouseHandle() { 
			$(tempCanvas)
				.bind('mousemove', onCanvasHovering)
				.bind('mouseout', onCanvasHoverOut)
				.bind('mousedown', onCanvasActionStart)
				.bind('touchstart', onCanvasActionStart);

			$(document)
				.bind('mousemove', function(event) {
					nextMouseUpIsClick = false;
					if (!flipInProgress) {
						if (dragging) {
							mousePosition = {left: event.pageX - $(holder).position().left, top: event.pageY - options.pageHeightOffset + 70};
						}
					}
				})
				.bind('touchmove', function(event) {
					nextMouseUpIsClick = false;
					if (!flipInProgress) {
						if (dragging && event.originalEvent != null && event.originalEvent.touches.length == 1) {
							event.preventDefault();
							var touch = event.originalEvent.touches[0];
							mousePosition = {left: touch.screenX - $(holder).position().left, top: touch.screenY - options.pageHeightOffset + 70};
						}
					}
				})
				.bind('mouseup', onCanvasActionStop)
				.bind('touchend', onCanvasActionStop);
		}

		var onCornerMoveComplete;

		function clearTempCanvas() {
			tempContext.clearRect(0, 0, tempCanvas.width(), tempCanvas.height());
		}

		function onCanvasClick() {
			if (flipInProgress) {
				completeFlip();
				clearTempCanvas();

				invalidate();
			}

			var lastDirectionPage = leftIsActive ? imageIndex == 0 : imageIndex == sourceImagesLength - 2;
			if (lastDirectionPage) {
				return;
			}

			var pageIsNotLast = leftIsActive ? imageIndex > 0 : imageIndex < sourceImagesLength - 2;
			if (pageIsNotLast) {
				mousePosition = {top: options.pageHeight, left: leftIsActive ? options.pageWidth * 2 : 0};
				followerPosition = {left: leftIsActive ? 1 : options.pageWidth * 2 - 1, top: options.pageHeight - 1};
				
				flipInProgress = true;

				onCornerMoveComplete = getOnCornerMoveComplete(leftIsActive);
			}
		}

		function getOnCornerMoveComplete(leftPageIsActive) {
			return function() {
				imageIndex += leftPageIsActive ? -2 : 2;
				mousePosition = {left: leftPageIsActive ? 0 : options.pageWidth * 2, top: options.pageHeight};
				followerPosition = mousePosition;
				drawBackgroundPages();
				clearTempCanvas();

				dragging = false;
			}
		}

		function onCanvasActionStop(event) {
			if (nextMouseUpIsClick) {
				onCanvasClick();
				return;
			}

			if (!flipInProgress) {
				dragging = false;

				if (leftIsActive ? imageIndex == 0 : imageIndex == sourceImagesLength - 2) {
					return;
				}

				var left = event.pageX - $(holder).position().left;

				var actionDropArea = leftIsActive ? left > options.pageWidth : left < options.pageWidth;

				if (actionDropArea) {
					mousePosition = {left: leftIsActive ? options.spreadWidth : 0, top: options.pageHeight};
					flipInProgress = true;

					onCornerMoveComplete = getOnCornerMoveComplete(leftIsActive);
				} else {
					mousePosition = {left: leftIsActive ? options.cornerSide : options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
				}
			}
		}

		var nextMouseUpIsClick = false;

		function onCanvasActionStart(event) {
			nextMouseUpIsClick = true;
			if (!flipInProgress) {
				var zeroPoint = $(holder).position();
				var relativePosition = {top: event.pageY - zeroPoint.top - options.pageHeightOffset, left: event.pageX - zeroPoint.left};
			
				if (relativePosition.top >= 0 && relativePosition.top < options.pageHeight) {
					if (relativePosition.left >= 0 && relativePosition.left < options.pageWidth) {
						mousePosition = {left: options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (!leftIsActive) {
							leftIsActive = true;
							followerPosition = {left: 0, top: options.pageHeight};
						}
					} else if (relativePosition.left >= options.pageWidth && relativePosition.left < options.spreadWidth) {
						mousePosition = {left: options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (leftIsActive) {
							leftIsActive = false;
							followerPosition = {left: options.spreadWidth, top: options.pageHeight};
						}
					} else {
						mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
					}

					event.preventDefault();
					dragging = true;
				}
			}
		}
		
		function onCanvasHoverOut(event) {
			if (!dragging && !flipInProgress) {
				mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};;
			}
		}

		function onCanvasHovering(event) {
			nextMouseUpIsClick = false;
			if (!dragging && !flipInProgress) {
				var zeroPoint = $(holder).position();
				var relativePosition = {top: event.pageY - zeroPoint.top - options.pageHeightOffset, left: event.pageX - zeroPoint.left};
			
				if (relativePosition.top >= 0 && relativePosition.top < options.pageHeight) {
					if (relativePosition.left >= 0 && relativePosition.left < options.pageWidth) {
						mousePosition = {left: options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (!leftIsActive) {
							leftIsActive = true;
							followerPosition = {left: 0, top: options.pageHeight};
						}
					} else if (relativePosition.left >= options.pageWidth && relativePosition.left < options.spreadWidth) {
						mousePosition = {left: options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (leftIsActive) {
							leftIsActive = false;
							followerPosition = {left: options.spreadWidth, top: options.pageHeight};
						}
					} else {
						mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
					}
				} else {
					mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
				}
			}
		}

		function completeFlip() {
			if (onCornerMoveComplete != null) {
				onCornerMoveComplete();
				onCornerMoveComplete = null;
			}

			flipInProgress = false;
		}

		function updateHandlePositions() {
			if (mousePosition == null) {
				return;
			}

			var followerDeltaTop = (mousePosition.top - followerPosition.top) * options.easing;
			var followerDeltaLeft = (mousePosition.left - followerPosition.left) * options.easing;

			followerDeltaLeft = Math.abs(followerDeltaLeft) < 0.5 ? 0 : followerDeltaLeft;
			followerDeltaTop = Math.abs(followerDeltaTop) < 0.5 ? 0 : followerDeltaTop;

			if (followerDeltaLeft == 0 && followerDeltaTop == 0) {
				completeFlip();
				return;
			}

			followerPosition.top += followerDeltaTop;
			followerPosition.left += followerDeltaLeft;

//			console.debug('mouse: x - ' + mousePosition.left + ', y - ' + mousePosition.top);
//			console.debug('follower: x - ' + followerPosition.left + ', y - ' + followerPosition.top);

			var deltaX = followerPosition.left - options.pageWidth;
			var deltaY = spineBottomTop - followerPosition.top;

			var spineBottomToFollowerAngle = Math.atan2(deltaY, deltaX);

			var radiusLeft = Math.cos(spineBottomToFollowerAngle) * options.pageWidth + options.pageWidth;
			var radiusTop = spineBottomTop - Math.sin(spineBottomToFollowerAngle) * options.pageWidth;

			var distanceToFollower = Math.sqrt(
				(spineBottomTop - followerPosition.top) * (spineBottomTop - followerPosition.top) +
				(followerPosition.left - options.pageWidth) * (followerPosition.left - options.pageWidth)
			);
			var distanceToRadius = Math.sqrt(
				(spineBottomTop - radiusTop) * (spineBottomTop - radiusTop) +
				(radiusLeft - options.pageWidth) * (radiusLeft - options.pageWidth)
			);

			var cornerX;
			var cornerY;
			if (distanceToRadius < distanceToFollower) {
				cornerX = radiusLeft;
				cornerY = radiusTop;
			} else {
				cornerX = followerPosition.left;
				cornerY = followerPosition.top;
			}
			
			deltaX = spineTopX - cornerX;
			deltaY = cornerY;

			distanceToFollower = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			var spineTopToFollowerAngle = Math.atan2(deltaY, deltaX);

			if (distanceToFollower > options.pageDiagonal) {
				var radius2HandleX = -Math.cos(spineTopToFollowerAngle) * options.pageDiagonal + options.pageWidth;
				var radius2HandleY = spineTopY + Math.sin(spineTopToFollowerAngle) * options.pageDiagonal;

				cornerX = radius2HandleX;
				cornerY = radius2HandleY;
			}

			var bisectorX = leftIsActive ? cornerX / 2 : ((options.pageWidth * 2 - cornerX) / 2 + cornerX);
			var bisectorY = (options.pageHeight - cornerY) / 2 + cornerY;

			var bisectorAngle = Math.atan2(options.pageHeight - bisectorY, leftIsActive ? bisectorX : options.pageWidth * 2 - bisectorX);
			var bisectorDeltaX = Math.tan(bisectorAngle) * (options.pageHeight - bisectorY);
			var bisectorTangetX = bisectorX + bisectorDeltaX * (leftIsActive ? 1 : -1);
			if (bisectorTangetX < 0) {
				bisectorTangetX = 0;
			}

			var pageAngleDeltaY = bisectorTangetY - cornerY;
			var pageAngleDeltaX = bisectorTangetX - cornerX;
			pageAngle = leftIsActive ? Math.atan2(-pageAngleDeltaY, -pageAngleDeltaX) : Math.atan2(pageAngleDeltaY, pageAngleDeltaX);

			var pageX = cornerX + options.pageWidth / 2 * Math.cos(pageAngle) * (leftIsActive ? -1 : 1)
				+ options.pageHeight / 2 * Math.sin(pageAngle);
			var pageY = cornerY - options.pageHeight / 2 * Math.cos(pageAngle)
				+ options.pageWidth / 2 * Math.sin(pageAngle) * (leftIsActive ? -1 : 1);
			
			var maskTanAngle = Math.atan2(options.pageHeight - bisectorY,
				bisectorX - bisectorTangetX);
			var maskAngle = 90 * (maskTanAngle / Math.abs(maskTanAngle)) - maskTanAngle * 180 / Math.PI;
			maskAngle = maskAngle / 180 * Math.PI;

			var xCoefficient = bisectorTangetY - bisectorY;
			var yCoefficient = bisectorX - bisectorTangetX;
			var freeCoefficient = bisectorTangetX * bisectorY - bisectorX * bisectorTangetY;

			var halfPageClipX = -(yCoefficient * options.pageHeight / 2 + freeCoefficient) / xCoefficient;
			var halfPageClipOffset = options.pageClipWidth / 2 / Math.cos(maskAngle);

			var maskLeft = halfPageClipX + halfPageClipOffset * (leftIsActive ? 1 : -1);
			var maskTop = options.pageHeight / 2;

			var anotherMaskLeft = maskLeft +
				(leftIsActive ?
					-halfPageClipOffset * 3:
					halfPageClipOffset);

//			anotherMaskLeft -= options.pageWidth * Math.cos(maskAngle);

			drawPage(pageX, pageY, pageAngle, maskLeft, maskTop, maskAngle, anotherMaskLeft);
		}

		function mirrorX(value) {
			return options.spreadWidth - value;
		}

		function drawPage(pageX, pageY, pageAngle, maskX, maskY, maskAngle, anotherMaskX) {
			tempContext.clearRect(0, 0, tempCanvas.width(), tempCanvas.height());

			tempContext.save();

			tempContext.translate(maskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);

			tempContext.beginPath();
			tempContext.rect(-options.pageClipWidth / 2, -options.pageClipHeight / 2, options.pageClipWidth, options.pageClipHeight);
			tempContext.clip();

			tempContext.rotate(-maskAngle);
			tempContext.translate(-maskX, -maskY - options.pageHeightOffset);

			tempContext.translate(pageX, pageY + options.pageHeightOffset);
			tempContext.rotate(pageAngle);

			drawSource(tempContext, getFlipperImage(), -options.pageWidth / 2, -options.pageHeight / 2);

			tempContext.restore();
			tempContext.save();

			tempContext.translate(anotherMaskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);

			tempContext.beginPath();
//			tempContext.fillStyle = 'red';
//			tempContext.fillRect(0, -options.pageDiagonal, options.pageClipWidth, options.pageClipHeight);
			tempContext.rect(0, -options.pageDiagonal, options.pageClipWidth, options.pageClipHeight);
			tempContext.clip();

			tempContext.rotate(-maskAngle);
			tempContext.translate(-anotherMaskX, -maskY - options.pageHeightOffset);

			tempContext.translate(0, 0);
			drawSource(tempContext, getAppearingImage(), leftIsActive ? 0 : options.pageWidth, options.pageHeightOffset);
			
			tempContext.restore();
		}

		function positionElement(element, x, y) {
			element = $(element);
			element.css({
				top: y - element.height() / 2 + options.pageHeightOffset,
				left: x - element.width() / 2
			});
		}

		function rotateElement(element, angle) {
			var angleInDegrees = angle / Math.PI * 180;
			$(element)
				.css({
					'-moz-transform': 'rotate(' + angleInDegrees + 'deg)',
					'-webkit-transform': 'rotate(' + angleInDegrees + 'deg)'
				});
		}

		function startInvalidationWorker() {
			var worker = function() {
				invalidate();
				setTimeout(worker, options.updateDelay);
			};

			worker();
		}

		function invalidate() {
			updateHandlePositions();
		}

		function initializeFlipper(element) {
			createCanvas(element);

			createHandles();

			activateMouseHandle();
			startInvalidationWorker();
			
			initializeDefaultImage();

			var listImages = $('li img', element);
			sourceImagesLength = listImages.length + 2;
			for (var index = 0; index < listImages.length; index++) {
				sourceImages[index] = defaultImage;
				loadPageImage(listImages, index);
			}

			if (listImages.length % 2 == 1) {
				sourceImages.push(defaultImage);
				sourceImagesLength++;
			}

			drawBackgroundPages();
		};

		function drawBackgroundPages() {
			var leftImage = getLeftImage();
			var rightImage = getRightImage();

			if (leftImage != null) {
				drawSource(context, leftImage, 0, options.pageHeightOffset);
			} else {
				context.clearRect(0, options.pageHeightOffset, options.pageWidth, options.pageHeight);
			}
			if (rightImage != null) {
				drawSource(context, rightImage, options.pageWidth, options.pageHeightOffset);
			} else {
				context.clearRect(options.pageWidth, options.pageHeightOffset, options.pageWidth, options.pageHeight);
			}
		}

		function drawSource(drawingContext, source, x, y) {
			if (source != null && source.type != null && source.type.length > 0) {
				if ((source.type == 'image') && source.data != null) {
					if (source.isLoaded) {
						drawingContext.drawImage(source.data, x, y);
					}
				} else if (source.type == 'background') {
					drawingContext.fillStyle = options.backgroundColor;
					drawingContext.fillRect(x, y, options.pageWidth, options.pageHeight);
				}
			}
		}

		var defaultImage = null;
		
		function initializeDefaultImage() {
			var defaultImageCanvas = $("<canvas></canvas>");
			defaultImageCanvas
				.attr('width', options.pageWidth)
				.attr('height', options.pageHeight);

			var context = defaultImageCanvas[0].getContext('2d');
			context.fillStyle = options.defaultPageColor;
			context.fillRect(0, 0, options.pageWidth, options.pageHeight);

			var imageData = new Image();
			imageData.onload = function() {
				defaultImage.isLoaded = true;
			};
			imageData.src = defaultImageCanvas[0].toDataURL();
			defaultImage = {type: 'image', data: imageData, isLoaded: false};
		}

		function getPageImage(index) {
			if (index == 0 || index == sourceImagesLength - 1) {
				return {type: 'background'};
			}

			return sourceImages[index - 1];
		}

		function loadPageImage(images, index) {
			var source = $(images[index]).attr('src');
			loadImage(source, function(loadedImage) {
				sourceImages[index] = {type: 'image', data: loadedImage, isLoaded: true};
				if (index == imageIndex || index == imageIndex + 1) {
					 drawBackgroundPages();
				}
			});
		}

		function loadImage(url, onLoaded) {
			var image = new Image();
			image.onload = function() {
				onLoaded(image);
			};
			image.src = url;
		}

		function getLeftImage() {
			return getPageImage(imageIndex);
		}

		function getRightImage() {
			return getPageImage(imageIndex + 1);
		}

		function getFlipperImage() {
			return getPageImage(leftIsActive ? imageIndex - 1 : imageIndex + 2);
		}

		function getAppearingImage() {
			return getPageImage(leftIsActive ? imageIndex - 2 : imageIndex + 3);
		}

		var sourceImagesLength = 0;
		var sourceImages = [];
		var imageIndex = 0;

		return this.each(function () {
			initializeFlipper(this);
		});
	};
})(jQuery);
