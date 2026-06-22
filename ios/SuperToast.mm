#import "SuperToast.h"

#import <React/RCTUtils.h>
#import <ReactCommon/RCTTurboModule.h>
#import <UIKit/UIKit.h>

#if __has_include(<SuperToastSpec/SuperToastSpec.h>)
#import <SuperToastSpec/SuperToastSpec.h>
#endif

#if __has_include(<SuperToastSpec/SuperToastSpec.h>)
@interface SuperToast () <NativeSuperToastSpec>
@end
#endif

static CGFloat STNumber(NSDictionary *dict, NSString *key, CGFloat fallback) {
  id value = dict[key];
  return [value respondsToSelector:@selector(doubleValue)] ? [value doubleValue] : fallback;
}

static BOOL STBool(NSDictionary *dict, NSString *key, BOOL fallback) {
  id value = dict[key];
  return [value respondsToSelector:@selector(boolValue)] ? [value boolValue] : fallback;
}

static NSString *STString(NSDictionary *dict, NSString *key, NSString *fallback) {
  id value = dict[key];
  return [value isKindOfClass:NSString.class] ? value : fallback;
}

static UIColor *STColor(NSString *hex, UIColor *fallback) {
  if (![hex isKindOfClass:NSString.class]) return fallback;
  NSString *clean = [[hex stringByReplacingOccurrencesOfString:@"#" withString:@""] uppercaseString];
  unsigned int value = 0;
  if (![[NSScanner scannerWithString:clean] scanHexInt:&value]) return fallback;
  CGFloat a = 1.0, r = 0, g = 0, b = 0;
  if (clean.length == 8) {
    a = ((value >> 24) & 0xFF) / 255.0;
    r = ((value >> 16) & 0xFF) / 255.0;
    g = ((value >> 8) & 0xFF) / 255.0;
    b = (value & 0xFF) / 255.0;
  } else if (clean.length == 6) {
    r = ((value >> 16) & 0xFF) / 255.0;
    g = ((value >> 8) & 0xFF) / 255.0;
    b = (value & 0xFF) / 255.0;
  } else {
    return fallback;
  }
  return [UIColor colorWithRed:r green:g blue:b alpha:a];
}


@interface STToastIcon : NSObject
@property (nonatomic, copy) NSString *type;
@property (nonatomic, copy, nullable) NSString *value;
@property (nonatomic, copy, nullable) NSString *glyph;
@property (nonatomic, copy, nullable) NSString *fontFamily;
@property (nonatomic, copy, nullable) NSString *uri;
@property (nonatomic) CGFloat width;
@property (nonatomic) CGFloat height;
@property (nonatomic) CGFloat size;
@property (nonatomic, strong, nullable) UIColor *color;
@property (nonatomic, strong, nullable) UIColor *tintColor;
@property (nonatomic) CGFloat cornerRadius;
+ (nullable instancetype)fromValue:(id)value fallback:(nullable STToastIcon *)fallback;
@end

@implementation STToastIcon
+ (nullable instancetype)fromValue:(id)value fallback:(nullable STToastIcon *)fallback {
  if (!value || value == (id)kCFNull) return fallback;

  STToastIcon *icon = [STToastIcon new];
  icon.type = @"text";
  icon.size = 22;
  icon.width = 0;
  icon.height = 0;
  icon.cornerRadius = 0;

  if ([value isKindOfClass:NSString.class]) {
    icon.value = value;
    return icon;
  }

  if (![value isKindOfClass:NSDictionary.class]) return fallback;

  NSDictionary *dict = (NSDictionary *)value;
  icon.type = STString(dict, @"type", @"text");
  icon.value = STString(dict, @"value", nil);
  icon.glyph = STString(dict, @"glyph", nil);
  icon.fontFamily = STString(dict, @"fontFamily", nil);
  icon.uri = STString(dict, @"uri", nil);
  icon.size = STNumber(dict, @"size", 22);
  icon.width = STNumber(dict, @"width", icon.size);
  icon.height = STNumber(dict, @"height", icon.size);
  icon.color = STColor(dict[@"color"], nil);
  icon.tintColor = STColor(dict[@"tintColor"], nil);
  icon.cornerRadius = STNumber(dict, @"cornerRadius", 0);

  return icon;
}
@end

@interface STToastConfig : NSObject
@property (nonatomic, copy) NSString *toastId;
@property (nonatomic, copy) NSString *kind;
@property (nonatomic, copy, nullable) NSString *title;
@property (nonatomic, copy, nullable) NSString *message;
@property (nonatomic, strong, nullable) STToastIcon *icon;
@property (nonatomic) NSTimeInterval duration;
@property (nonatomic, copy) NSString *position;
@property (nonatomic, copy) NSString *widthMode;
@property (nonatomic, copy) NSString *animation;
@property (nonatomic) NSTimeInterval enterDuration;
@property (nonatomic) NSTimeInterval exitDuration;
@property (nonatomic) CGFloat topOffset;
@property (nonatomic) CGFloat bottomOffset;
@property (nonatomic) CGFloat maxWidth;
@property (nonatomic) CGFloat horizontalMargin;
@property (nonatomic, strong) UIColor *backgroundColor;
@property (nonatomic, strong) UIColor *titleColor;
@property (nonatomic, strong) UIColor *messageColor;
@property (nonatomic, strong) UIColor *iconColor;
@property (nonatomic, strong) UIColor *borderColor;
@property (nonatomic) CGFloat borderWidth;
@property (nonatomic) CGFloat borderRadius;
@property (nonatomic) CGFloat paddingHorizontal;
@property (nonatomic) CGFloat paddingVertical;
@property (nonatomic) CGFloat gap;
@property (nonatomic) CGFloat titleSize;
@property (nonatomic) CGFloat messageSize;
@property (nonatomic) CGFloat shadowOpacity;
@property (nonatomic) BOOL swipeToDismiss;
@property (nonatomic) BOOL closeOnPress;
@property (nonatomic) BOOL haptic;
@property (nonatomic) BOOL queue;
+ (instancetype)defaults;
+ (instancetype)fromDictionary:(NSDictionary *)dict defaults:(STToastConfig *)defaults;
@end

@implementation STToastConfig
+ (instancetype)defaults {
  STToastConfig *c = [STToastConfig new];
  c.toastId = [NSUUID UUID].UUIDString;
  c.kind = @"default";
  c.duration = 3.0;
  c.position = @"top";
  c.widthMode = @"content";
  c.animation = @"slide";
  c.enterDuration = 0.32;
  c.exitDuration = 0.23;
  c.topOffset = 48;
  c.bottomOffset = 48;
  c.maxWidth = 420;
  c.horizontalMargin = 16;
  c.backgroundColor = [UIColor colorWithRed:31/255.0 green:41/255.0 blue:55/255.0 alpha:1];
  c.titleColor = UIColor.whiteColor;
  c.messageColor = UIColor.whiteColor;
  c.iconColor = UIColor.whiteColor;
  c.borderColor = UIColor.clearColor;
  c.borderWidth = 0;
  c.borderRadius = 14;
  c.paddingHorizontal = 16;
  c.paddingVertical = 12;
  c.gap = 8;
  c.titleSize = 15;
  c.messageSize = 14;
  c.shadowOpacity = 0.18;
  c.swipeToDismiss = YES;
  c.closeOnPress = NO;
  c.haptic = NO;
  c.queue = YES;
  return c;
}

+ (UIColor *)paletteBackground:(NSString *)kind {
  if ([kind isEqualToString:@"success"]) return [UIColor colorWithRed:22/255.0 green:101/255.0 blue:52/255.0 alpha:1];
  if ([kind isEqualToString:@"error"]) return [UIColor colorWithRed:127/255.0 green:29/255.0 blue:29/255.0 alpha:1];
  if ([kind isEqualToString:@"warning"]) return [UIColor colorWithRed:113/255.0 green:63/255.0 blue:18/255.0 alpha:1];
  if ([kind isEqualToString:@"info"]) return [UIColor colorWithRed:30/255.0 green:64/255.0 blue:175/255.0 alpha:1];
  return [UIColor colorWithRed:31/255.0 green:41/255.0 blue:55/255.0 alpha:1];
}

+ (UIColor *)paletteIcon:(NSString *)kind {
  if ([kind isEqualToString:@"success"]) return [UIColor colorWithRed:187/255.0 green:247/255.0 blue:208/255.0 alpha:1];
  if ([kind isEqualToString:@"error"]) return [UIColor colorWithRed:254/255.0 green:202/255.0 blue:202/255.0 alpha:1];
  if ([kind isEqualToString:@"warning"]) return [UIColor colorWithRed:254/255.0 green:240/255.0 blue:138/255.0 alpha:1];
  if ([kind isEqualToString:@"info"]) return [UIColor colorWithRed:191/255.0 green:219/255.0 blue:254/255.0 alpha:1];
  return UIColor.whiteColor;
}

+ (instancetype)fromDictionary:(NSDictionary *)dict defaults:(STToastConfig *)d {
  STToastConfig *c = [STToastConfig new];
  NSString *kind = STString(dict, @"kind", d.kind);
  c.toastId = STString(dict, @"id", [NSUUID UUID].UUIDString);
  c.kind = kind;
  c.title = STString(dict, @"title", nil);
  c.message = STString(dict, @"message", nil);
  c.icon = [STToastIcon fromValue:dict[@"icon"] fallback:d.icon];
  c.duration = STNumber(dict, @"duration", d.duration * 1000) / 1000.0;
  c.position = STString(dict, @"position", d.position);
  c.widthMode = STString(dict, @"widthMode", d.widthMode);
  c.animation = STString(dict, @"animation", d.animation);
  c.enterDuration = MAX(0, STNumber(dict, @"enterDuration", d.enterDuration * 1000) / 1000.0);
  c.exitDuration = MAX(0, STNumber(dict, @"exitDuration", d.exitDuration * 1000) / 1000.0);
  c.topOffset = STNumber(dict, @"topOffset", d.topOffset);
  c.bottomOffset = STNumber(dict, @"bottomOffset", d.bottomOffset);
  c.maxWidth = STNumber(dict, @"maxWidth", d.maxWidth);
  c.horizontalMargin = STNumber(dict, @"horizontalMargin", d.horizontalMargin);
  c.backgroundColor = STColor(dict[@"backgroundColor"], [self paletteBackground:kind]);
  c.titleColor = STColor(dict[@"titleColor"], d.titleColor);
  c.messageColor = STColor(dict[@"messageColor"], d.messageColor);
  c.iconColor = STColor(dict[@"iconColor"], [self paletteIcon:kind]);
  c.borderColor = STColor(dict[@"borderColor"], d.borderColor);
  c.borderWidth = STNumber(dict, @"borderWidth", d.borderWidth);
  c.borderRadius = STNumber(dict, @"borderRadius", d.borderRadius);
  c.paddingHorizontal = STNumber(dict, @"paddingHorizontal", d.paddingHorizontal);
  c.paddingVertical = STNumber(dict, @"paddingVertical", d.paddingVertical);
  c.gap = STNumber(dict, @"gap", d.gap);
  c.titleSize = STNumber(dict, @"titleSize", d.titleSize);
  c.messageSize = STNumber(dict, @"messageSize", d.messageSize);
  c.shadowOpacity = STNumber(dict, @"shadowOpacity", d.shadowOpacity);
  c.swipeToDismiss = STBool(dict, @"swipeToDismiss", d.swipeToDismiss);
  c.closeOnPress = STBool(dict, @"closeOnPress", d.closeOnPress);
  c.haptic = STBool(dict, @"haptic", d.haptic);
  c.queue = STBool(dict, @"queue", d.queue);
  return c;
}
@end

@interface STPassthroughView : UIView
@property (nonatomic, weak) UIView *interactiveView;
@end

@implementation STPassthroughView
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
  UIView *target = [super hitTest:point withEvent:event];
  if (!self.interactiveView) return nil;
  CGPoint local = [self.interactiveView convertPoint:point fromView:self];
  if ([self.interactiveView pointInside:local withEvent:event]) return target;
  return nil;
}
@end

@interface STToastView : UIControl
@property (nonatomic, strong) STToastConfig *config;
@property (nonatomic, copy) dispatch_block_t dismiss;
@property (nonatomic) CGPoint panStart;
- (instancetype)initWithConfig:(STToastConfig *)config dismiss:(dispatch_block_t)dismiss;
- (void)animateIn;
- (void)animateOut:(dispatch_block_t)completion;
@end

@implementation STToastView
- (UIView *)createIconView {
  STToastIcon *icon = self.config.icon;
  if (!icon) return nil;

  if ([icon.type isEqualToString:@"font"]) {
    if (icon.glyph.length == 0) return nil;

    UILabel *label = [UILabel new];
    label.text = icon.glyph;
    label.textColor = icon.color ?: self.config.iconColor;
    label.textAlignment = NSTextAlignmentCenter;
    label.font = icon.fontFamily.length > 0
      ? ([UIFont fontWithName:icon.fontFamily size:icon.size] ?: [UIFont systemFontOfSize:icon.size])
      : [UIFont systemFontOfSize:icon.size];
    label.translatesAutoresizingMaskIntoConstraints = NO;
    [NSLayoutConstraint activateConstraints:@[
      [label.widthAnchor constraintEqualToConstant:icon.size],
      [label.heightAnchor constraintEqualToConstant:icon.size],
    ]];
    return label;
  }

  if ([icon.type isEqualToString:@"image"]) {
    if (icon.uri.length == 0) return nil;

    UIImageView *imageView = [UIImageView new];
    imageView.contentMode = UIViewContentModeScaleAspectFit;
    imageView.translatesAutoresizingMaskIntoConstraints = NO;
    imageView.clipsToBounds = icon.cornerRadius > 0;
    imageView.layer.cornerRadius = icon.cornerRadius;
    if (icon.tintColor) imageView.tintColor = icon.tintColor;

    CGFloat width = icon.width > 0 ? icon.width : icon.size;
    CGFloat height = icon.height > 0 ? icon.height : icon.size;
    [NSLayoutConstraint activateConstraints:@[
      [imageView.widthAnchor constraintEqualToConstant:width],
      [imageView.heightAnchor constraintEqualToConstant:height],
    ]];

    [self loadImageInto:imageView uri:icon.uri tintColor:icon.tintColor];
    return imageView;
  }

  if (icon.value.length == 0) return nil;

  UILabel *label = [UILabel new];
  label.text = icon.value;
  label.textColor = icon.color ?: self.config.iconColor;
  label.font = [UIFont systemFontOfSize:icon.size > 0 ? icon.size : self.config.titleSize];
  label.textAlignment = NSTextAlignmentCenter;
  return label;
}

- (void)loadImageInto:(UIImageView *)imageView uri:(NSString *)uri tintColor:(UIColor *)tintColor {
  NSURL *url = [NSURL URLWithString:uri];
  if (!url) url = [NSURL fileURLWithPath:uri];
  if (!url) return;

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @try {
      NSData *data = [NSData dataWithContentsOfURL:url];
      UIImage *image = data ? [UIImage imageWithData:data] : nil;
      if (tintColor) image = [image imageWithRenderingMode:UIImageRenderingModeAlwaysTemplate];

      dispatch_async(dispatch_get_main_queue(), ^{
        imageView.image = image;
      });
    } @catch (__unused NSException *exception) {
      // Icon loading must never crash toast rendering.
    }
  });
}

- (instancetype)initWithConfig:(STToastConfig *)config dismiss:(dispatch_block_t)dismiss {
  if ((self = [super initWithFrame:CGRectZero])) {
    _config = config;
    _dismiss = dismiss;
    self.isAccessibilityElement = YES;
    self.accessibilityLabel = [[@[config.title ?: @"", config.message ?: @""] componentsJoinedByString:@". "] stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    self.backgroundColor = config.backgroundColor;
    self.layer.cornerRadius = config.borderRadius;
    self.layer.borderColor = config.borderColor.CGColor;
    self.layer.borderWidth = config.borderWidth;
    self.layer.shadowColor = UIColor.blackColor.CGColor;
    self.layer.shadowOffset = CGSizeMake(0, 6);
    self.layer.shadowRadius = 14;
    self.layer.shadowOpacity = config.shadowOpacity;

    UIStackView *row = [[UIStackView alloc] init];
    row.axis = UILayoutConstraintAxisHorizontal;
    row.alignment = UIStackViewAlignmentCenter;
    row.spacing = config.gap;
    row.translatesAutoresizingMaskIntoConstraints = NO;
    [self addSubview:row];

    UIView *iconView = [self createIconView];
    if (iconView) {
      [row addArrangedSubview:iconView];
    }

    UIStackView *texts = [[UIStackView alloc] init];
    texts.axis = UILayoutConstraintAxisVertical;
    texts.spacing = 2;
    [row addArrangedSubview:texts];

    if (config.title.length > 0) {
      UILabel *title = [UILabel new];
      title.text = config.title;
      title.textColor = config.titleColor;
      title.font = [UIFont boldSystemFontOfSize:config.titleSize];
      title.numberOfLines = 2;
      [texts addArrangedSubview:title];
    }

    if (config.message.length > 0) {
      UILabel *message = [UILabel new];
      message.text = config.message;
      message.textColor = config.messageColor;
      message.font = [UIFont systemFontOfSize:config.messageSize];
      message.numberOfLines = 4;
      [texts addArrangedSubview:message];
    }

    [NSLayoutConstraint activateConstraints:@[
      [row.leadingAnchor constraintEqualToAnchor:self.leadingAnchor constant:config.paddingHorizontal],
      [row.trailingAnchor constraintEqualToAnchor:self.trailingAnchor constant:-config.paddingHorizontal],
      [row.topAnchor constraintEqualToAnchor:self.topAnchor constant:config.paddingVertical],
      [row.bottomAnchor constraintEqualToAnchor:self.bottomAnchor constant:-config.paddingVertical],
    ]];

    if (config.closeOnPress) [self addTarget:self action:@selector(closePressed) forControlEvents:UIControlEventTouchUpInside];
    if (config.swipeToDismiss) {
      UIPanGestureRecognizer *pan = [[UIPanGestureRecognizer alloc] initWithTarget:self action:@selector(handlePan:)];
      [self addGestureRecognizer:pan];
    }
  }
  return self;
}

- (void)didMoveToWindow {
  [super didMoveToWindow];
  if (self.window) {
    UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, self.accessibilityLabel);
    if (self.config.haptic) {
      UIImpactFeedbackGenerator *gen = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
      [gen impactOccurred];
    }
  }
}

- (void)closePressed { if (self.dismiss) self.dismiss(); }

- (void)handlePan:(UIPanGestureRecognizer *)pan {
  CGPoint t = [pan translationInView:self.superview];
  BOOL bottom = [self.config.position isEqualToString:@"bottom"];
  if (pan.state == UIGestureRecognizerStateChanged) {
    CGFloat y = bottom ? MAX(0, t.y) : MIN(0, t.y);
    self.transform = CGAffineTransformMakeTranslation(0, y);
    self.alpha = MAX(0.35, 1 - fabs(y) / 96.0);
  } else if (pan.state == UIGestureRecognizerStateEnded || pan.state == UIGestureRecognizerStateCancelled) {
    if (fabs(t.y) > 40) {
      if (self.dismiss) self.dismiss();
    } else {
      [UIView animateWithDuration:0.16 delay:0 options:UIViewAnimationOptionCurveEaseOut | UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction animations:^{ self.transform = CGAffineTransformIdentity; self.alpha = 1; } completion:nil];
    }
  }
}

- (void)animateIn {
  if ([self.config.animation isEqualToString:@"none"]) return;
  self.alpha = 0;
  if ([self.config.animation isEqualToString:@"scale"]) self.transform = CGAffineTransformMakeScale(0.96, 0.96);
  else if ([self.config.animation isEqualToString:@"slide"]) {
    CGFloat y = [self.config.position isEqualToString:@"top"] ? -(CGRectGetMaxY(self.frame) + 8) : ([self.config.position isEqualToString:@"bottom"] ? CGRectGetMaxY(self.superview.bounds) - CGRectGetMinY(self.frame) + 8 : -12);
    self.transform = CGAffineTransformMakeTranslation(0, y);
  }
  [UIView animateWithDuration:self.config.enterDuration delay:0 usingSpringWithDamping:0.90 initialSpringVelocity:0.25 options:UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction animations:^{
    self.alpha = 1;
    self.transform = CGAffineTransformIdentity;
  } completion:nil];
}

- (void)animateOut:(dispatch_block_t)completion {
  if ([self.config.animation isEqualToString:@"none"]) { if (completion) completion(); return; }
  CGFloat y = [self.config.position isEqualToString:@"top"] ? -(CGRectGetMaxY(self.frame) + 8) : ([self.config.position isEqualToString:@"bottom"] ? CGRectGetMaxY(self.superview.bounds) - CGRectGetMinY(self.frame) + 8 : -12);
  [UIView animateWithDuration:self.config.exitDuration delay:0 options:UIViewAnimationOptionCurveEaseIn | UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction animations:^{
    self.alpha = 0;
    if ([self.config.animation isEqualToString:@"slide"]) self.transform = CGAffineTransformMakeTranslation(0, y);
  } completion:^(__unused BOOL finished) { if (completion) completion(); }];
}
@end

@interface STToastManager : NSObject
@property (nonatomic, strong) STToastConfig *defaults;
@property (nonatomic, strong) NSMutableArray<STToastConfig *> *queue;
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) STPassthroughView *root;
@property (nonatomic, strong) STToastView *toast;
@property (nonatomic, strong) STToastConfig *current;
+ (instancetype)shared;
- (void)configure:(NSDictionary *)dict;
- (void)show:(STToastConfig *)config;
- (void)dismiss:(NSString *)toastId;
- (void)dismissAll;
@end

@implementation STToastManager
+ (instancetype)shared {
  static STToastManager *m;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ m = [STToastManager new]; });
  return m;
}

- (instancetype)init {
  if ((self = [super init])) {
    _defaults = [STToastConfig defaults];
    _queue = [NSMutableArray new];
  }
  return self;
}

- (void)configure:(NSDictionary *)dict { self.defaults = [STToastConfig fromDictionary:dict defaults:self.defaults]; }

- (UIWindowScene *)activeScene {
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (scene.activationState == UISceneActivationStateForegroundActive && [scene isKindOfClass:UIWindowScene.class]) return (UIWindowScene *)scene;
  }
  return (UIWindowScene *)UIApplication.sharedApplication.connectedScenes.anyObject;
}

- (void)ensureWindow {
  if (self.window) return;
  UIWindowScene *scene = [self activeScene];
  if (!scene) return;
  self.window = [[UIWindow alloc] initWithWindowScene:scene];
  self.window.windowLevel = UIWindowLevelAlert - 1;
  self.window.backgroundColor = UIColor.clearColor;
  self.window.hidden = NO;
  self.root = [[STPassthroughView alloc] initWithFrame:self.window.bounds];
  self.root.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  UIViewController *vc = [UIViewController new];
  vc.view = self.root;
  self.window.rootViewController = vc;
}

- (void)show:(STToastConfig *)config {
  if (!config.queue) { [self.queue removeAllObjects]; [self dismissCurrent:NO showNext:NO]; }
  if (!self.current) [self present:config];
  else [self.queue addObject:config];
}

- (void)present:(STToastConfig *)config {
  [self ensureWindow];
  if (!self.root) return;
  self.current = config;
  STToastView *toast = [[STToastView alloc] initWithConfig:config dismiss:^{ [[STToastManager shared] dismiss:config.toastId]; }];
  toast.translatesAutoresizingMaskIntoConstraints = NO;
  [self.root addSubview:toast];
  self.root.interactiveView = toast;
  self.toast = toast;

  UILayoutGuide *safe = self.root.safeAreaLayoutGuide;
  NSMutableArray *constraints = [NSMutableArray array];
  if ([config.widthMode isEqualToString:@"screen"]) {
    [constraints addObject:[toast.leadingAnchor constraintEqualToAnchor:self.root.leadingAnchor constant:config.horizontalMargin]];
    [constraints addObject:[toast.trailingAnchor constraintEqualToAnchor:self.root.trailingAnchor constant:-config.horizontalMargin]];
  } else {
    [constraints addObject:[toast.centerXAnchor constraintEqualToAnchor:self.root.centerXAnchor]];
    [constraints addObject:[toast.widthAnchor constraintLessThanOrEqualToConstant:config.maxWidth]];
    [constraints addObject:[toast.leadingAnchor constraintGreaterThanOrEqualToAnchor:self.root.leadingAnchor constant:config.horizontalMargin]];
    [constraints addObject:[toast.trailingAnchor constraintLessThanOrEqualToAnchor:self.root.trailingAnchor constant:-config.horizontalMargin]];
  }
  if ([config.position isEqualToString:@"bottom"]) {
    [constraints addObject:[toast.bottomAnchor constraintEqualToAnchor:safe.bottomAnchor constant:-config.bottomOffset]];
  } else if ([config.position isEqualToString:@"center"]) {
    [constraints addObject:[toast.centerYAnchor constraintEqualToAnchor:self.root.centerYAnchor]];
  } else {
    [constraints addObject:[toast.topAnchor constraintEqualToAnchor:safe.topAnchor constant:config.topOffset]];
  }
  [NSLayoutConstraint activateConstraints:constraints];
  [self.root layoutIfNeeded];
  [toast animateIn];
  if (config.duration > 0) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(config.duration * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      if ([self.current.toastId isEqualToString:config.toastId]) [self dismiss:config.toastId];
    });
  }
}

- (void)dismiss:(NSString *)toastId {
  if (!toastId) { [self dismissCurrent:YES showNext:YES]; return; }
  if ([self.current.toastId isEqualToString:toastId]) [self dismissCurrent:YES showNext:YES];
  else {
    NSIndexSet *matches = [self.queue indexesOfObjectsPassingTest:^BOOL(STToastConfig *obj, NSUInteger idx, BOOL *stop) {
      return [obj.toastId isEqualToString:toastId];
    }];
    [self.queue removeObjectsAtIndexes:matches];
  }
}

- (void)dismissAll {
  [self.queue removeAllObjects];
  [self dismissCurrent:YES showNext:NO];
}

- (void)dismissCurrent:(BOOL)animated showNext:(BOOL)showNext {
  STToastView *toast = self.toast;
  dispatch_block_t finish = ^{
    [toast removeFromSuperview];
    self.toast = nil;
    self.root.interactiveView = nil;
    self.current = nil;
    if (showNext && self.queue.count > 0) {
      STToastConfig *next = self.queue.firstObject;
      [self.queue removeObjectAtIndex:0];
      [self present:next];
    } else if (!self.toast) {
      self.window.hidden = YES;
      self.window = nil;
      self.root = nil;
    }
  };
  if (animated && toast) [toast animateOut:finish];
  else finish();
}
@end

@implementation SuperToast
RCT_EXPORT_MODULE(SuperToast)

+ (BOOL)requiresMainQueueSetup { return YES; }

- (NSString *)show:(NSDictionary *)options {
  STToastConfig *config = [STToastConfig fromDictionary:options ?: @{} defaults:STToastManager.shared.defaults];
  NSString *toastId = config.toastId;
  dispatch_async(dispatch_get_main_queue(), ^{ [STToastManager.shared show:config]; });
  return toastId;
}

- (void)update:(NSString *)toastId options:(NSDictionary *)options {
  // iOS toast updates are rendered by SuperToastHost through FullWindowOverlay.
  (void)toastId;
  (void)options;
}

- (void)dismiss:(NSString *)toastId {
  dispatch_async(dispatch_get_main_queue(), ^{ [STToastManager.shared dismiss:toastId]; });
}

- (void)dismissAll {
  dispatch_async(dispatch_get_main_queue(), ^{ [STToastManager.shared dismissAll]; });
}

- (void)configure:(NSDictionary *)defaults {
  dispatch_async(dispatch_get_main_queue(), ^{ [STToastManager.shared configure:defaults ?: @{}]; });
}

- (void)triggerHaptic {
  dispatch_async(dispatch_get_main_queue(), ^{
    UIImpactFeedbackGenerator *generator =
      [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
    [generator impactOccurred];
  });
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
#if __has_include(<SuperToastSpec/SuperToastSpec.h>)
  return std::make_shared<facebook::react::NativeSuperToastSpecJSI>(params);
#else
  return nullptr;
#endif
}
#endif
@end
