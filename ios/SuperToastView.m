#import "SuperToastView.h"

#import <React/RCTFont.h>

#import "SuperToastGlyphView.h"

static void SuperToastApplyBoxStyle(UIView *view, SuperToastBoxStyle *style)
{
  view.backgroundColor = style.backgroundColor;
  view.layer.borderColor = style.borderColor.CGColor;
  view.layer.borderWidth = style.borderWidth;
  view.layer.cornerCurve = kCACornerCurveContinuous;
}

/** Clamps like React Native, so a radius of 999 draws a pill. */
static CGFloat SuperToastCornerRadius(UIView *view, CGFloat radius)
{
  CGSize size = view.bounds.size;
  return MIN(radius, MIN(size.width, size.height) / 2);
}

static void SuperToastPin(UIView *view, UIView *container, UIEdgeInsets insets)
{
  view.translatesAutoresizingMaskIntoConstraints = NO;
  [NSLayoutConstraint activateConstraints:@[
    [view.topAnchor constraintEqualToAnchor:container.topAnchor constant:insets.top],
    [view.leadingAnchor constraintEqualToAnchor:container.leadingAnchor constant:insets.left],
    [container.trailingAnchor constraintEqualToAnchor:view.trailingAnchor constant:insets.right],
    [container.bottomAnchor constraintEqualToAnchor:view.bottomAnchor constant:insets.bottom],
  ]];
}

static void SuperToastSetSize(UIView *view, CGFloat width, CGFloat height)
{
  view.translatesAutoresizingMaskIntoConstraints = NO;
  [NSLayoutConstraint activateConstraints:@[
    [view.widthAnchor constraintEqualToConstant:width],
    [view.heightAnchor constraintEqualToConstant:height],
  ]];
  [view setContentHuggingPriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
  [view setContentCompressionResistancePriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
}

static NSCache<NSString *, UIImage *> *SuperToastImageCache(void)
{
  static NSCache *cache;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    cache = [NSCache new];
  });
  return cache;
}

#pragma mark - Controls

@interface SuperToastBoxView : UIView
@property (nonatomic) CGFloat borderRadius;
@end

@implementation SuperToastBoxView

- (void)layoutSubviews
{
  [super layoutSubviews];
  self.layer.cornerRadius = SuperToastCornerRadius(self, self.borderRadius);
}

@end

@interface SuperToastControl : UIControl
@property (nonatomic) CGFloat borderRadius;
/** Extends the touch target beyond the visible bounds. */
@property (nonatomic) CGFloat hitOutset;
@end

@implementation SuperToastControl

- (void)setHighlighted:(BOOL)highlighted
{
  [super setHighlighted:highlighted];
  self.alpha = highlighted ? 0.7 : 1;
}

- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event
{
  return CGRectContainsPoint(CGRectInset(self.bounds, -self.hitOutset, -self.hitOutset), point);
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  self.layer.cornerRadius = SuperToastCornerRadius(self, self.borderRadius);
}

@end

#pragma mark - Toast view

@interface SuperToastView () <UIGestureRecognizerDelegate>
@end

@implementation SuperToastView {
  __weak id<SuperToastViewDelegate> _delegate;
  SuperToastBoxView *_contentView;
  UIPanGestureRecognizer *_panRecognizer;
}

- (instancetype)initWithConfig:(SuperToastConfig *)config delegate:(id<SuperToastViewDelegate>)delegate
{
  if (self = [super initWithFrame:CGRectZero]) {
    _config = config;
    _delegate = delegate;

    self.backgroundColor = UIColor.clearColor;
    self.layer.shadowColor = UIColor.blackColor.CGColor;
    self.layer.shadowOffset = CGSizeMake(0, 4);
    self.layer.shadowOpacity = 0.106;
    self.layer.shadowRadius = 12;

    _contentView = [SuperToastBoxView new];
    _contentView.borderRadius = config.style.borderRadius;
    SuperToastApplyBoxStyle(_contentView, config.style);
    [self addSubview:_contentView];
    SuperToastPin(_contentView, self, UIEdgeInsetsZero);

    [self buildContent];

    UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleTap)];
    tap.delegate = self;
    [self addGestureRecognizer:tap];

    _panRecognizer = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(handlePan:)];
    _panRecognizer.delegate = self;
    [self addGestureRecognizer:_panRecognizer];
  }
  return self;
}

- (void)buildContent
{
  SuperToastConfig *config = self.config;

  UIStackView *row = [UIStackView new];
  row.axis = UILayoutConstraintAxisHorizontal;
  row.spacing = 16;
  row.alignment = config.toastDescription ? UIStackViewAlignmentTop : UIStackViewAlignmentCenter;
  [_contentView addSubview:row];
  SuperToastPin(
      row,
      _contentView,
      UIEdgeInsetsMake(
          config.style.paddingVertical,
          config.style.paddingHorizontal,
          config.style.paddingVertical,
          config.style.paddingHorizontal));

  UIView *icon = [self createIconView];
  if (icon) {
    [row addArrangedSubview:icon];
  }

  UIStackView *column = [UIStackView new];
  column.axis = UILayoutConstraintAxisVertical;
  column.alignment = UIStackViewAlignmentFill;
  [column setContentHuggingPriority:UILayoutPriorityDefaultLow - 1 forAxis:UILayoutConstraintAxisHorizontal];
  [column setContentCompressionResistancePriority:UILayoutPriorityDefaultLow - 1
                                          forAxis:UILayoutConstraintAxisHorizontal];
  [row addArrangedSubview:column];

  NSString *title = [config.title stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
  if (title.length > 0) {
    UILabel *label = [self createLabel:config.title style:config.titleStyle];
    [column addArrangedSubview:label];
    [column setCustomSpacing:2 afterView:label];
  }

  if (config.toastDescription) {
    UILabel *label = [self createLabel:config.toastDescription style:config.descriptionStyle];
    [column addArrangedSubview:label];
  }

  if (config.action || config.cancel) {
    UIStackView *buttons = [UIStackView new];
    buttons.axis = UILayoutConstraintAxisHorizontal;
    buttons.alignment = UIStackViewAlignmentCenter;
    buttons.spacing = 16;
    if (config.action) {
      [buttons addArrangedSubview:[self createButton:config.action action:@selector(handleAction)]];
    }
    if (config.cancel) {
      [buttons addArrangedSubview:[self createButton:config.cancel action:@selector(handleCancel)]];
    }

    // Buttons keep their natural width instead of stretching across the column.
    UIView *container = [UIView new];
    [container addSubview:buttons];
    buttons.translatesAutoresizingMaskIntoConstraints = NO;
    [NSLayoutConstraint activateConstraints:@[
      [buttons.topAnchor constraintEqualToAnchor:container.topAnchor],
      [buttons.bottomAnchor constraintEqualToAnchor:container.bottomAnchor],
      [buttons.leadingAnchor constraintEqualToAnchor:container.leadingAnchor],
      [buttons.trailingAnchor constraintLessThanOrEqualToAnchor:container.trailingAnchor],
    ]];

    if (column.arrangedSubviews.lastObject) {
      [column setCustomSpacing:16 afterView:column.arrangedSubviews.lastObject];
    }
    [column addArrangedSubview:container];
  }

  if (config.closeButton && config.dismissible) {
    SuperToastControl *close = [SuperToastControl new];
    close.hitOutset = 10;
    close.isAccessibilityElement = YES;
    close.accessibilityLabel = @"Close";
    close.accessibilityTraits = UIAccessibilityTraitButton;
    [close addTarget:self action:@selector(handleClose) forControlEvents:UIControlEventTouchUpInside];

    SuperToastGlyphView *glyph = [[SuperToastGlyphView alloc] initWithGlyph:@"close" color:config.closeButtonColor];
    [close addSubview:glyph];
    SuperToastPin(glyph, close, UIEdgeInsetsZero);
    SuperToastSetSize(close, 20, 20);
    [row addArrangedSubview:close];
  }
}

- (UILabel *)createLabel:(NSString *)text style:(SuperToastTextStyle *)style
{
  UILabel *label = [UILabel new];
  label.numberOfLines = 0;
  label.attributedText = [style attributedStringWithText:text];
  return label;
}

- (UIView *)createButton:(SuperToastButtonConfig *)button action:(SEL)action
{
  SuperToastControl *control = [SuperToastControl new];
  control.borderRadius = button.style.borderRadius;
  SuperToastApplyBoxStyle(control, button.style);
  control.isAccessibilityElement = YES;
  control.accessibilityLabel = button.label;
  control.accessibilityTraits = UIAccessibilityTraitButton;
  [control addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];

  UILabel *label = [UILabel new];
  label.numberOfLines = 1;
  label.attributedText = [button.textStyle attributedStringWithText:button.label];
  [control addSubview:label];
  SuperToastPin(
      label,
      control,
      UIEdgeInsetsMake(
          button.style.paddingVertical,
          button.style.paddingHorizontal,
          button.style.paddingVertical,
          button.style.paddingHorizontal));
  return control;
}

#pragma mark - Icons

- (UIView *)createIconView
{
  SuperToastConfig *config = self.config;
  SuperToastIconConfig *icon = config.icon;
  if (!icon) {
    return [self createStateIconView];
  }

  if ([icon.type isEqualToString:@"image"]) {
    if (icon.uri.length == 0) {
      return nil;
    }
    UIImageView *imageView = [UIImageView new];
    imageView.contentMode = UIViewContentModeScaleAspectFit;
    imageView.tintColor = icon.tintColor;
    if (icon.cornerRadius > 0) {
      imageView.layer.cornerRadius = icon.cornerRadius;
      imageView.layer.cornerCurve = kCACornerCurveContinuous;
      imageView.clipsToBounds = YES;
    }
    CGFloat fallback = icon.size ? icon.size.doubleValue : 20;
    SuperToastSetSize(
        imageView,
        icon.width ? icon.width.doubleValue : fallback,
        icon.height ? icon.height.doubleValue : fallback);
    [self loadImage:icon into:imageView];
    return imageView;
  }

  BOOL isFont = [icon.type isEqualToString:@"font"];
  NSString *text = isFont ? icon.glyph : icon.value;
  if ([text stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceCharacterSet].length == 0) {
    return nil;
  }

  CGFloat size = icon.size ? icon.size.doubleValue : 20;
  UIFont *font = [RCTFont updateFont:nil
                          withFamily:isFont && icon.fontFamily.length > 0 ? icon.fontFamily : nil
                                size:@(size)
                              weight:nil
                               style:nil
                             variant:nil
                     scaleMultiplier:1];

  UILabel *label = [UILabel new];
  label.text = text;
  label.font = font;
  label.textColor = icon.color ?: config.iconColor;
  label.textAlignment = NSTextAlignmentCenter;
  if (isFont) {
    SuperToastSetSize(label, size, size);
  } else {
    [label setContentHuggingPriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
    [label setContentCompressionResistancePriority:UILayoutPriorityRequired
                                           forAxis:UILayoutConstraintAxisHorizontal];
  }
  return label;
}

- (UIView *)createStateIconView
{
  SuperToastConfig *config = self.config;

  if ([config.variant isEqualToString:@"loading"]) {
    UIActivityIndicatorView *spinner =
        [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleMedium];
    spinner.color = config.iconColor;
    [spinner startAnimating];
    SuperToastSetSize(spinner, 20, 20);
    return spinner;
  }

  if ([SuperToastGlyphView hasGlyph:config.variant] && ![config.variant isEqualToString:@"close"]) {
    SuperToastGlyphView *glyph = [[SuperToastGlyphView alloc] initWithGlyph:config.variant color:config.iconColor];
    SuperToastSetSize(glyph, 20, 20);
    return glyph;
  }

  return nil;
}

- (void)loadImage:(SuperToastIconConfig *)icon into:(UIImageView *)imageView
{
  NSString *uri = icon.uri;
  BOOL tinted = icon.tintColor != nil;
  void (^apply)(UIImage *) = ^(UIImage *image) {
    imageView.image = tinted ? [image imageWithRenderingMode:UIImageRenderingModeAlwaysTemplate] : image;
  };

  UIImage *cached = [SuperToastImageCache() objectForKey:uri];
  if (cached) {
    apply(cached);
    return;
  }

  NSURL *url = [NSURL URLWithString:uri];
  if (!url.scheme) {
    // A bare name refers to an image in the app's asset catalog.
    UIImage *image = [UIImage imageNamed:uri];
    if (image) {
      apply(image);
    }
    return;
  }

  // Handles http(s) (Metro in development), file (release bundles), and data URIs.
  CGFloat scale = icon.scale ? icon.scale.doubleValue : 1;
  __weak UIImageView *weakImageView = imageView;
  NSURLSessionDataTask *task = [NSURLSession.sharedSession
        dataTaskWithURL:url
      completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        UIImage *image = data ? [UIImage imageWithData:data scale:scale] : nil;
        if (!image) {
          return;
        }
        [SuperToastImageCache() setObject:image forKey:uri];
        dispatch_async(dispatch_get_main_queue(), ^{
          if (weakImageView) {
            apply(image);
          }
        });
      }];
  [task resume];
}

#pragma mark - Layout

- (CGFloat)heightForWidth:(CGFloat)width
{
  return ceil([self systemLayoutSizeFittingSize:CGSizeMake(width, UILayoutFittingCompressedSize.height)
                  withHorizontalFittingPriority:UILayoutPriorityRequired
                        verticalFittingPriority:UILayoutPriorityFittingSizeLevel]
                  .height);
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  self.layer.shadowPath =
      [UIBezierPath bezierPathWithRoundedRect:self.bounds
                                 cornerRadius:SuperToastCornerRadius(self, self.config.style.borderRadius)]
          .CGPath;
}

- (CGAffineTransform)transformForSwipeOffset:(CGFloat)offset
{
  NSString *direction = self.config.swipeDirection;
  CGFloat translation =
      [direction isEqualToString:@"right"] || [direction isEqualToString:@"down"] ? -offset : offset;
  return self.config.swipesHorizontally ? CGAffineTransformMakeTranslation(translation, 0)
                                        : CGAffineTransformMakeTranslation(0, translation);
}

- (void)wiggle
{
  CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"transform.scale"];
  animation.fromValue = @1;
  animation.toValue = @1.035;
  animation.duration = 0.15;
  animation.autoreverses = YES;
  animation.repeatCount = 2;
  [self.layer addAnimation:animation forKey:@"superToastWiggle"];
}

#pragma mark - Gestures

- (void)handleTap
{
  [_delegate toastViewDidPress:self];
}

- (void)handleAction
{
  [_delegate toastViewDidPressAction:self];
}

- (void)handleCancel
{
  [_delegate toastViewDidPressCancel:self];
}

- (void)handleClose
{
  [_delegate toastViewDidPressClose:self];
}

- (CGFloat)normalizedAxisValue:(CGPoint)point
{
  CGFloat value = self.config.swipesHorizontally ? point.x : point.y;
  NSString *direction = self.config.swipeDirection;
  return [direction isEqualToString:@"right"] || [direction isEqualToString:@"down"] ? -value : value;
}

- (CGFloat)swipeOffset
{
  CGFloat raw = [self normalizedAxisValue:[_panRecognizer translationInView:self.window]];
  if (raw < 0) {
    return raw;
  }
  // Elastic resistance away from the dismiss direction.
  return raw * 0.4 / (1 + raw * 0.02);
}

- (void)handlePan:(UIPanGestureRecognizer *)recognizer
{
  switch (recognizer.state) {
    case UIGestureRecognizerStateBegan:
      [_delegate toastViewDidBeginSwipe:self];
      [_delegate toastView:self didSwipeToOffset:[self swipeOffset]];
      break;
    case UIGestureRecognizerStateChanged:
      [_delegate toastView:self didSwipeToOffset:[self swipeOffset]];
      break;
    case UIGestureRecognizerStateEnded:
      [_delegate toastView:self
          didEndSwipeAtOffset:[self swipeOffset]
                     velocity:[self normalizedAxisValue:[recognizer velocityInView:self.window]]];
      break;
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      [_delegate toastView:self didEndSwipeAtOffset:0 velocity:0];
      break;
    default:
      break;
  }
}

- (BOOL)gestureRecognizerShouldBegin:(UIGestureRecognizer *)gestureRecognizer
{
  if (gestureRecognizer != _panRecognizer) {
    return YES;
  }
  if (!self.config.dismissible) {
    return NO;
  }
  CGPoint translation = [_panRecognizer translationInView:self.window];
  CGFloat dx = fabs(translation.x);
  CGFloat dy = fabs(translation.y);
  return self.config.swipesHorizontally ? dx > dy : dy > dx;
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldReceiveTouch:(UITouch *)touch
{
  // Buttons handle their own taps; swipes may still start on top of them.
  if (gestureRecognizer == _panRecognizer) {
    return YES;
  }
  for (UIView *view = touch.view; view && view != self; view = view.superview) {
    if ([view isKindOfClass:[UIControl class]]) {
      return NO;
    }
  }
  return YES;
}

@end
