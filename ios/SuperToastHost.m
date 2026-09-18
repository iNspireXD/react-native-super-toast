#import "SuperToastHost.h"

#import <React/RCTUtils.h>

#import "SuperToastView.h"

static const NSTimeInterval kEnterDuration = 0.3;
static const NSTimeInterval kExitDuration = 0.3;
static const NSTimeInterval kReflowDuration = 0.4;
static const NSTimeInterval kSwipeRestoreDuration = 0.25;
static const NSTimeInterval kSwipeExitDuration = 0.2;

static const CGFloat kMaxWidth = 500;
static const CGFloat kHorizontalMargin = 16;
static const CGFloat kStackGap = 8;
static const CGFloat kDefaultOffset = 8;
static const CGFloat kDefaultEdgeOffset = 16;

static NSString *const kTop = @"top-center";
static NSString *const kBottom = @"bottom-center";
static NSString *const kCenter = @"center";

static UICubicTimingParameters *SuperToastEaseOutQuart(void)
{
  return [[UICubicTimingParameters alloc] initWithControlPoint1:CGPointMake(0.165, 0.84)
                                                  controlPoint2:CGPointMake(0.44, 1)];
}

static UICubicTimingParameters *SuperToastEaseInOutCubic(void)
{
  return [[UICubicTimingParameters alloc] initWithControlPoint1:CGPointMake(0.645, 0.045)
                                                  controlPoint2:CGPointMake(0.355, 1)];
}

static UIViewPropertyAnimator *SuperToastAnimator(
    NSTimeInterval duration,
    UICubicTimingParameters *timing,
    void (^animations)(void),
    void (^_Nullable completion)(void))
{
  UIViewPropertyAnimator *animator = [[UIViewPropertyAnimator alloc] initWithDuration:duration
                                                                     timingParameters:timing];
  [animator addAnimations:animations];
  if (completion) {
    [animator addCompletion:^(UIViewAnimatingPosition position) {
      if (position == UIViewAnimatingPositionEnd) {
        completion();
      }
    }];
  }
  [animator startAnimation];
  return animator;
}

/** Leaves animated properties at their current on-screen values. */
static void SuperToastStopAnimator(UIViewPropertyAnimator *_Nullable animator)
{
  if (animator.state == UIViewAnimatingStateActive) {
    [animator stopAnimation:YES];
  }
}

#pragma mark - Keyboard

/** Keyboard end frame in screen coordinates, or CGRectZero while hidden. */
static CGRect SuperToastKeyboardFrame;

/**
 * UIKit only reports the keyboard frame when it changes, and the host is
 * created with the first toast. Tracking from launch means a keyboard that
 * opened before then is still known.
 */
@interface SuperToastKeyboardObserver : NSObject
@end

@implementation SuperToastKeyboardObserver

+ (void)load
{
  NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
  [center addObserverForName:UIKeyboardWillChangeFrameNotification
                      object:nil
                       queue:nil
                  usingBlock:^(NSNotification *notification) {
                    SuperToastKeyboardFrame = [notification.userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
                  }];
  [center addObserverForName:UIKeyboardWillHideNotification
                      object:nil
                       queue:nil
                  usingBlock:^(NSNotification *notification) {
                    SuperToastKeyboardFrame = CGRectZero;
                  }];
}

@end

#pragma mark - Window

/** Passes touches that miss every toast through to the app below. */
@interface SuperToastWindow : UIWindow
@end

@implementation SuperToastWindow

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  UIView *view = [super hitTest:point withEvent:event];
  return view == self || view == self.rootViewController.view ? nil : view;
}

@end

/** Defers status bar and orientation decisions to the app's own screens. */
@interface SuperToastViewController : UIViewController
@property (nonatomic, copy, nullable) void (^onLayout)(void);
@end

@implementation SuperToastViewController

- (void)loadView
{
  self.view = [UIView new];
  self.view.backgroundColor = UIColor.clearColor;
}

- (void)viewDidLayoutSubviews
{
  [super viewDidLayoutSubviews];
  if (self.onLayout) {
    self.onLayout();
  }
}

- (UIStatusBarStyle)preferredStatusBarStyle
{
  return RCTPresentedViewController().preferredStatusBarStyle;
}

- (BOOL)prefersStatusBarHidden
{
  return RCTPresentedViewController().prefersStatusBarHidden;
}

- (UIInterfaceOrientationMask)supportedInterfaceOrientations
{
  UIViewController *viewController = RCTPresentedViewController();
  return viewController ? viewController.supportedInterfaceOrientations : UIInterfaceOrientationMaskAll;
}

@end

#pragma mark - Entry

@interface SuperToastEntry : NSObject
@property (nonatomic, strong) SuperToastConfig *config;
/** Positioned by the layout: carries enter, exit, and reflow motion plus stack scale. */
@property (nonatomic, strong) UIView *slot;
/** Carries swipe motion. */
@property (nonatomic, strong) UIView *swipeView;
@property (nonatomic, strong) SuperToastView *card;
@property (nonatomic) CGFloat measuredWidth;
@property (nonatomic) CGFloat height;

@property (nonatomic, strong, nullable) NSTimer *timer;
@property (nonatomic) CFTimeInterval dismissAt;
@property (nonatomic) CFTimeInterval remaining;
@property (nonatomic) BOOL timerPaused;
@property (nonatomic) BOOL dismissing;
@property (nonatomic) BOOL swiping;
@property (nonatomic) BOOL hasEntered;

/** Slot center y for the current layout, excluding enter and exit motion. */
@property (nonatomic) CGFloat restingY;
@property (nonatomic) CGAffineTransform stackTransform;
@property (nonatomic, strong, nullable) UIViewPropertyAnimator *animator;
@property (nonatomic, strong, nullable) NSNumber *animatingToY;
@property (nonatomic, strong, nullable) UIViewPropertyAnimator *scaleAnimator;
@property (nonatomic, strong, nullable) UIViewPropertyAnimator *swipeAnimator;
@end

@implementation SuperToastEntry

- (instancetype)init
{
  if (self = [super init]) {
    _stackTransform = CGAffineTransformIdentity;
  }
  return self;
}

@end

#pragma mark - Host

@interface SuperToastHost () <SuperToastViewDelegate>
@end

@implementation SuperToastHost {
  SuperToastEventHandler _eventHandler;
  NSMutableArray<SuperToastEntry *> *_entries;
  NSMutableSet<NSString *> *_expandedPositions;
  SuperToastWindow *_window;
  SuperToastViewController *_viewController;
  CGSize _layoutSize;
  UIEdgeInsets _layoutInsets;
}

- (instancetype)initWithEventHandler:(SuperToastEventHandler)eventHandler
{
  if (self = [super init]) {
    _eventHandler = [eventHandler copy];
    _entries = [NSMutableArray new];
    _expandedPositions = [NSMutableSet new];

    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserver:self
               selector:@selector(keyboardWillChangeFrame:)
                   name:UIKeyboardWillChangeFrameNotification
                 object:nil];
    [center addObserver:self selector:@selector(keyboardWillHide:) name:UIKeyboardWillHideNotification object:nil];
  }
  return self;
}

- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

- (void)show:(SuperToastConfig *)config
{
  UIView *container = [self prepareContainer];
  if (!container) {
    return;
  }

  SuperToastEntry *existing = [self activeEntryWithId:config.toastId];
  if (existing) {
    [self update:existing config:config];
    return;
  }

  // A toast re-shown while its previous presentation exits replaces it.
  for (SuperToastEntry *entry in [_entries copy]) {
    if ([entry.config.toastId isEqualToString:config.toastId]) {
      [self removeEntry:entry emitRemoved:NO];
    }
  }

  SuperToastEntry *entry = [SuperToastEntry new];
  entry.config = config;
  entry.slot = [UIView new];
  entry.slot.alpha = 0;
  entry.swipeView = [UIView new];
  entry.card = [[SuperToastView alloc] initWithConfig:config delegate:self];
  [entry.swipeView addSubview:entry.card];
  [entry.slot addSubview:entry.swipeView];
  [container addSubview:entry.slot];
  [_entries addObject:entry];

  [self announce:entry];
  [self scheduleTimer:entry delay:config.duration];
  [self evictOverflow:config];
  [self layout];
}

- (void)dismiss:(NSString *)toastId
{
  for (SuperToastEntry *entry in [_entries copy]) {
    if (!entry.dismissing && (toastId == nil || [entry.config.toastId isEqualToString:toastId])) {
      [self dismissEntry:entry event:nil];
    }
  }
}

- (void)wiggle:(NSString *)toastId
{
  [[self activeEntryWithId:toastId].card wiggle];
}

- (void)invalidate
{
  for (SuperToastEntry *entry in [_entries copy]) {
    [self removeEntry:entry emitRemoved:NO];
  }
  _window.hidden = YES;
  _window = nil;
  _viewController = nil;
}

- (void)update:(SuperToastEntry *)entry config:(SuperToastConfig *)config
{
  SuperToastStopAnimator(entry.swipeAnimator);
  [entry.card removeFromSuperview];
  entry.swipeView.transform = CGAffineTransformIdentity;
  entry.swipeView.alpha = 1;
  entry.card = [[SuperToastView alloc] initWithConfig:config delegate:self];
  [entry.swipeView addSubview:entry.card];
  entry.config = config;
  entry.measuredWidth = 0;
  entry.swiping = NO;

  [self announce:entry];
  [self scheduleTimer:entry delay:config.duration];
  [self evictOverflow:config];
  [self layout];
}

- (SuperToastEntry *)activeEntryWithId:(NSString *)toastId
{
  for (SuperToastEntry *entry in _entries) {
    if (!entry.dismissing && [entry.config.toastId isEqualToString:toastId]) {
      return entry;
    }
  }
  return nil;
}

- (SuperToastEntry *)activeEntryForCard:(SuperToastView *)card
{
  for (SuperToastEntry *entry in _entries) {
    if (!entry.dismissing && entry.card == card) {
      return entry;
    }
  }
  return nil;
}

- (NSArray<SuperToastEntry *> *)activeEntriesAtPosition:(NSString *)position
{
  NSMutableArray<SuperToastEntry *> *result = [NSMutableArray new];
  for (SuperToastEntry *entry in _entries) {
    if (!entry.dismissing && [entry.config.position isEqualToString:position]) {
      [result addObject:entry];
    }
  }
  return result;
}

- (void)announce:(SuperToastEntry *)entry
{
  SuperToastConfig *config = entry.config;
  if (config.haptic) {
    UIImpactFeedbackGenerator *generator =
        [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
    [generator impactOccurred];
  }

  NSMutableArray<NSString *> *parts = [NSMutableArray new];
  if (config.title.length > 0) {
    [parts addObject:config.title];
  }
  if (config.toastDescription) {
    [parts addObject:config.toastDescription];
  }
  if (parts.count > 0) {
    UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, [parts componentsJoinedByString:@". "]);
  }
}

#pragma mark - Window

- (UIWindowScene *)activeWindowScene
{
  UIWindowScene *scene = RCTKeyWindow().windowScene;
  if (scene) {
    return scene;
  }
  for (UIScene *candidate in RCTSharedApplication().connectedScenes) {
    if (candidate.activationState == UISceneActivationStateForegroundActive &&
        [candidate isKindOfClass:[UIWindowScene class]]) {
      return (UIWindowScene *)candidate;
    }
  }
  return nil;
}

- (UIView *)prepareContainer
{
  UIWindowScene *scene = [self activeWindowScene];
  if (!scene) {
    return _viewController.view;
  }

  if (!_window || _window.windowScene != scene) {
    SuperToastWindow *previous = _window;

    SuperToastViewController *viewController = [SuperToastViewController new];
    __weak SuperToastHost *weakSelf = self;
    viewController.onLayout = ^{
      [weakSelf containerDidLayout];
    };

    SuperToastWindow *window = [[SuperToastWindow alloc] initWithWindowScene:scene];
    window.windowLevel = UIWindowLevelAlert + 1;
    window.backgroundColor = UIColor.clearColor;
    window.rootViewController = viewController;

    for (SuperToastEntry *entry in _entries) {
      [viewController.view addSubview:entry.slot];
    }
    previous.hidden = YES;

    _window = window;
    _viewController = viewController;
  }

  if (_window.hidden) {
    // Showing a window this way never makes it key, so the keyboard and
    // first responder stay with the app.
    _window.hidden = NO;
    [_window layoutIfNeeded];
  }
  return _viewController.view;
}

- (void)containerDidLayout
{
  UIView *container = _viewController.view;
  if (CGSizeEqualToSize(container.bounds.size, _layoutSize) &&
      UIEdgeInsetsEqualToEdgeInsets(container.safeAreaInsets, _layoutInsets)) {
    return;
  }
  [self layout];
}

#pragma mark - Keyboard

- (void)keyboardWillChangeFrame:(NSNotification *)notification
{
  // Set here too: observers are not called in a guaranteed order.
  SuperToastKeyboardFrame = [notification.userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  [self layout];
}

- (void)keyboardWillHide:(NSNotification *)notification
{
  SuperToastKeyboardFrame = CGRectZero;
  [self layout];
}

/** Height the docked keyboard covers at the container's bottom edge. */
- (CGFloat)keyboardOverlapInContainer:(UIView *)container
{
  UIScreen *screen = container.window.screen;
  if (!screen || CGRectIsEmpty(SuperToastKeyboardFrame)) {
    return 0;
  }
  CGRect frame = [container convertRect:SuperToastKeyboardFrame fromCoordinateSpace:screen.coordinateSpace];
  CGRect bounds = container.bounds;
  // A floating or undocked keyboard leaves the bottom edge uncovered.
  if (!CGRectIntersectsRect(frame, bounds) || CGRectGetMaxY(frame) < CGRectGetMaxY(bounds)) {
    return 0;
  }
  return MAX(0, CGRectGetMaxY(bounds) - CGRectGetMinY(frame));
}

#pragma mark - Layout

- (void)layout
{
  UIView *container = _viewController.view;
  if (!container || _window.hidden) {
    return;
  }
  _layoutSize = container.bounds.size;
  _layoutInsets = container.safeAreaInsets;

  for (NSString *position in @[ kTop, kBottom, kCenter ]) {
    [self layoutPosition:position inContainer:container];
  }
}

- (void)layoutPosition:(NSString *)position inContainer:(UIView *)container
{
  // Newest first, matching ToastDialogHost.kt on Android.
  NSArray<SuperToastEntry *> *active =
      [[self activeEntriesAtPosition:position] reverseObjectEnumerator].allObjects;
  SuperToastEntry *front = active.firstObject;
  if (!front) {
    return;
  }
  if (active.count <= 1 || !front.config.enableStacking || !front.config.expandOnPress) {
    [_expandedPositions removeObject:position];
  }

  CGRect bounds = container.bounds;
  UIEdgeInsets safeArea = container.safeAreaInsets;
  // Bottom and center toasts keep clear of the keyboard; the toast window is
  // never key, so its safe area does not include it.
  safeArea.bottom = MAX(safeArea.bottom, [self keyboardOverlapInContainer:container]);
  CGFloat width = MIN(bounds.size.width - kHorizontalMargin * 2, kMaxWidth);
  for (SuperToastEntry *entry in active) {
    [self measure:entry width:width];
  }

  BOOL stacking = front.config.enableStacking && ![_expandedPositions containsObject:position];
  CGFloat frontHeight = front.height;
  CGFloat cursor = 0;

  for (NSUInteger depth = 0; depth < active.count; depth++) {
    SuperToastEntry *entry = active[depth];
    CGFloat height = entry.height;
    CGFloat distance = stacking ? MAX(0, frontHeight - height) + depth * kStackGap : cursor;
    cursor += height + front.config.gap;

    CGFloat top;
    if ([position isEqualToString:kBottom]) {
      top = bounds.size.height - safeArea.bottom - [self edgeOffset:entry.config inset:safeArea.bottom] - distance -
          height;
    } else if ([position isEqualToString:kCenter]) {
      top = (safeArea.top + bounds.size.height - safeArea.bottom) / 2 + distance - frontHeight / 2;
    } else {
      top = safeArea.top + [self edgeOffset:entry.config inset:safeArea.top] + distance;
    }
    entry.restingY = top + height / 2;

    entry.slot.layer.zPosition = -(CGFloat)depth;
    entry.slot.userInteractionEnabled = !stacking || depth == 0;
    [self applyScale:(stacking ? MAX(0.85, 1 - depth * 0.05) : 1) toEntry:entry];

    if (entry.swiping) {
      continue;
    }
    if (!entry.hasEntered) {
      [self enter:entry];
    } else {
      [self reflow:entry];
    }
  }
}

- (void)measure:(SuperToastEntry *)entry width:(CGFloat)width
{
  if (entry.measuredWidth == width) {
    return;
  }
  entry.measuredWidth = width;
  entry.height = [entry.card heightForWidth:width];

  CGRect frame = CGRectMake(0, 0, width, entry.height);
  CGPoint center = CGPointMake(width / 2, entry.height / 2);
  for (UIView *view in @[ entry.slot, entry.swipeView, entry.card ]) {
    // Transforms are active, so size through bounds and center, never frame.
    view.bounds = frame;
    if (view != entry.slot) {
      view.center = center;
    }
  }
  [entry.card layoutIfNeeded];
}

/** Distance from the safe area edge to the card's outer edge. */
- (CGFloat)edgeOffset:(SuperToastConfig *)config inset:(CGFloat)inset
{
  if (config.offset) {
    return config.offset.doubleValue;
  }
  return inset > 0 ? kDefaultOffset : kDefaultEdgeOffset;
}

- (CGFloat)centerX
{
  return CGRectGetMidX(_viewController.view.bounds);
}

- (void)enter:(SuperToastEntry *)entry
{
  entry.hasEntered = YES;
  CGFloat targetY = entry.restingY;
  // Sonner enters from 20pt above at the top and 50pt below elsewhere.
  CGFloat startY = targetY + ([entry.config.position isEqualToString:kTop] ? -20 : 50);
  UIView *slot = entry.slot;
  CGFloat x = [self centerX];

  SuperToastStopAnimator(entry.animator);
  slot.center = CGPointMake(x, startY);
  slot.alpha = 0;
  [self animate:entry
        duration:kEnterDuration
          timing:SuperToastEaseOutQuart()
         targetY:@(targetY)
      animations:^{
        slot.center = CGPointMake(x, targetY);
        slot.alpha = 1;
      }
      completion:nil];
}

- (void)reflow:(SuperToastEntry *)entry
{
  CGPoint target = CGPointMake([self centerX], entry.restingY);
  BOOL animating = entry.animator.state == UIViewAnimatingStateActive;
  if (animating && entry.animatingToY && entry.animatingToY.doubleValue == target.y) {
    return;
  }
  if (!animating && CGPointEqualToPoint(entry.slot.center, target) && entry.slot.alpha == 1) {
    return;
  }

  UIView *slot = entry.slot;
  [self animate:entry
        duration:kReflowDuration
          timing:SuperToastEaseOutQuart()
         targetY:@(target.y)
      animations:^{
        slot.center = target;
        slot.alpha = 1;
      }
      completion:nil];
}

- (void)applyScale:(CGFloat)scale toEntry:(SuperToastEntry *)entry
{
  // Stacked cards scale towards the edge that peeks out behind the front card.
  CGFloat shift = entry.height / 2 * (1 - scale);
  NSString *position = entry.config.position;
  CGFloat translation =
      [position isEqualToString:kTop] ? shift : [position isEqualToString:kBottom] ? -shift : 0;
  CGAffineTransform transform =
      CGAffineTransformScale(CGAffineTransformMakeTranslation(0, translation), scale, scale);

  if (CGAffineTransformEqualToTransform(entry.stackTransform, transform)) {
    return;
  }
  entry.stackTransform = transform;

  UIView *slot = entry.slot;
  SuperToastStopAnimator(entry.scaleAnimator);
  if (!entry.hasEntered) {
    slot.transform = transform;
    return;
  }
  entry.scaleAnimator = SuperToastAnimator(
      kReflowDuration,
      SuperToastEaseOutQuart(),
      ^{
        slot.transform = transform;
      },
      nil);
}

- (void)animate:(SuperToastEntry *)entry
        duration:(NSTimeInterval)duration
          timing:(UICubicTimingParameters *)timing
         targetY:(NSNumber *)targetY
      animations:(void (^)(void))animations
      completion:(void (^)(void))completion
{
  SuperToastStopAnimator(entry.animator);

  __weak SuperToastEntry *weakEntry = entry;
  __block __weak UIViewPropertyAnimator *weakAnimator = nil;
  UIViewPropertyAnimator *animator = SuperToastAnimator(duration, timing, animations, ^{
    SuperToastEntry *strongEntry = weakEntry;
    if (strongEntry.animator == weakAnimator) {
      strongEntry.animator = nil;
      strongEntry.animatingToY = nil;
    }
    if (completion) {
      completion();
    }
  });
  weakAnimator = animator;
  entry.animator = animator;
  entry.animatingToY = targetY;
}

#pragma mark - Dismissal

- (void)dismissEntry:(SuperToastEntry *)entry event:(NSString *)type
{
  if (entry.dismissing) {
    return;
  }
  entry.dismissing = YES;
  entry.swiping = NO;
  [self cancelTimer:entry];
  if (type) {
    _eventHandler(entry.config.toastId, type);
  }

  if (!_viewController.view || _window.hidden) {
    [self removeEntry:entry emitRemoved:YES];
    [self layout];
    return;
  }

  BOOL hasSiblings = [self activeEntriesAtPosition:entry.config.position].count > 0;
  CGFloat distance = hasSiblings ? 8 : 150;
  CGFloat direction = [entry.config.position isEqualToString:kTop] ? -1 : 1;

  UIView *slot = entry.slot;
  slot.userInteractionEnabled = NO;
  SuperToastStopAnimator(entry.animator);
  CGPoint target = CGPointMake(slot.center.x, slot.center.y + direction * distance);

  __weak SuperToastHost *weakSelf = self;
  __weak SuperToastEntry *weakEntry = entry;
  [self animate:entry
        duration:kExitDuration
          timing:SuperToastEaseInOutCubic()
         targetY:nil
      animations:^{
        slot.center = target;
        slot.alpha = 0;
      }
      completion:^{
        if (weakEntry) {
          [weakSelf removeEntry:weakEntry emitRemoved:YES];
        }
      }];

  [self layout];
}

- (void)dismissSwipedEntry:(SuperToastEntry *)entry
{
  entry.dismissing = YES;
  entry.swiping = NO;
  [self cancelTimer:entry];
  _eventHandler(entry.config.toastId, @"dismiss");

  UIView *swipeView = entry.swipeView;
  entry.slot.userInteractionEnabled = NO;
  CGFloat distance = entry.config.swipesHorizontally ? _viewController.view.bounds.size.width : 150;
  CGAffineTransform target = [entry.card transformForSwipeOffset:-distance];

  __weak SuperToastHost *weakSelf = self;
  __weak SuperToastEntry *weakEntry = entry;
  SuperToastStopAnimator(entry.swipeAnimator);
  entry.swipeAnimator = SuperToastAnimator(
      kSwipeExitDuration,
      SuperToastEaseInOutCubic(),
      ^{
        swipeView.transform = target;
        swipeView.alpha = 0;
      },
      ^{
        if (weakEntry) {
          [weakSelf removeEntry:weakEntry emitRemoved:YES];
        }
      });

  [self layout];
}

- (void)removeEntry:(SuperToastEntry *)entry emitRemoved:(BOOL)emitRemoved
{
  NSUInteger index = [_entries indexOfObjectIdenticalTo:entry];
  if (index == NSNotFound) {
    return;
  }
  [_entries removeObjectAtIndex:index];

  [self cancelTimer:entry];
  SuperToastStopAnimator(entry.animator);
  SuperToastStopAnimator(entry.scaleAnimator);
  SuperToastStopAnimator(entry.swipeAnimator);
  entry.animator = nil;
  entry.scaleAnimator = nil;
  entry.swipeAnimator = nil;
  [entry.slot removeFromSuperview];

  if (emitRemoved) {
    _eventHandler(entry.config.toastId, @"removed");
  }

  if ([self activeEntriesAtPosition:entry.config.position].count <= 1) {
    [_expandedPositions removeObject:entry.config.position];
  }

  if (_entries.count == 0) {
    _window.hidden = YES;
  }
}

- (void)evictOverflow:(SuperToastConfig *)config
{
  NSArray<SuperToastEntry *> *active = [self activeEntriesAtPosition:config.position];
  NSInteger overflow = (NSInteger)active.count - config.visibleToasts;
  for (NSInteger index = 0; index < overflow; index++) {
    [self dismissEntry:active[index] event:nil];
  }
}

#pragma mark - Timers

- (void)scheduleTimer:(SuperToastEntry *)entry delay:(NSTimeInterval)delay
{
  [self cancelTimer:entry];
  if (entry.config.duration <= 0) {
    return;
  }

  __weak SuperToastHost *weakSelf = self;
  __weak SuperToastEntry *weakEntry = entry;
  NSTimer *timer = [NSTimer timerWithTimeInterval:delay
                                          repeats:NO
                                            block:^(NSTimer *firedTimer) {
                                              SuperToastEntry *strongEntry = weakEntry;
                                              if (strongEntry.timer != firedTimer) {
                                                return;
                                              }
                                              strongEntry.timer = nil;
                                              [weakSelf dismissEntry:strongEntry event:@"autoClose"];
                                            }];
  // Common modes keep the timer running while the user scrolls.
  [NSRunLoop.mainRunLoop addTimer:timer forMode:NSRunLoopCommonModes];
  entry.timer = timer;
  entry.dismissAt = CACurrentMediaTime() + delay;
}

- (void)pauseTimer:(SuperToastEntry *)entry
{
  if (!entry.timer) {
    return;
  }
  [entry.timer invalidate];
  entry.timer = nil;
  entry.remaining = MAX(0, entry.dismissAt - CACurrentMediaTime());
  entry.timerPaused = YES;
}

- (void)resumeTimer:(SuperToastEntry *)entry
{
  if (!entry.timerPaused) {
    return;
  }
  [self scheduleTimer:entry delay:MAX(entry.remaining, 1)];
}

- (void)cancelTimer:(SuperToastEntry *)entry
{
  [entry.timer invalidate];
  entry.timer = nil;
  entry.dismissAt = 0;
  entry.timerPaused = NO;
}

#pragma mark - SuperToastViewDelegate

- (void)toastViewDidPress:(SuperToastView *)view
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (!entry) {
    return;
  }
  SuperToastConfig *config = entry.config;
  if (config.enableStacking && config.expandOnPress && ![_expandedPositions containsObject:config.position] &&
      [self activeEntriesAtPosition:config.position].count > 1) {
    [_expandedPositions addObject:config.position];
    [self layout];
    return;
  }
  _eventHandler(config.toastId, @"press");
}

- (void)toastViewDidPressAction:(SuperToastView *)view
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (!entry) {
    return;
  }
  _eventHandler(entry.config.toastId, @"action");
  [self dismissEntry:entry event:nil];
}

- (void)toastViewDidPressCancel:(SuperToastView *)view
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (entry) {
    [self dismissEntry:entry event:@"cancel"];
  }
}

- (void)toastViewDidPressClose:(SuperToastView *)view
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (entry) {
    [self dismissEntry:entry event:@"dismiss"];
  }
}

- (void)toastViewDidBeginSwipe:(SuperToastView *)view
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (!entry) {
    return;
  }
  SuperToastStopAnimator(entry.swipeAnimator);
  entry.swipeAnimator = nil;
  entry.swiping = YES;
  [self pauseTimer:entry];
}

- (void)toastView:(SuperToastView *)view didSwipeToOffset:(CGFloat)offset
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (!entry.swiping) {
    return;
  }
  CGFloat distance = entry.config.swipesHorizontally ? _viewController.view.bounds.size.width : 60;
  entry.swipeView.transform = [view transformForSwipeOffset:offset];
  entry.swipeView.alpha = MIN(1, MAX(0, 1 + offset / distance));
}

- (void)toastView:(SuperToastView *)view didEndSwipeAtOffset:(CGFloat)offset velocity:(CGFloat)velocity
{
  SuperToastEntry *entry = [self activeEntryForCard:view];
  if (!entry.swiping) {
    return;
  }
  entry.swiping = NO;

  CGFloat threshold = entry.config.swipesHorizontally ? -_viewController.view.bounds.size.width * 0.25 : -20;
  if (offset < threshold || (offset < 0 && velocity < -800)) {
    [self dismissSwipedEntry:entry];
    return;
  }

  UIView *swipeView = entry.swipeView;
  entry.swipeAnimator = SuperToastAnimator(
      kSwipeRestoreDuration,
      SuperToastEaseOutQuart(),
      ^{
        swipeView.transform = CGAffineTransformIdentity;
        swipeView.alpha = 1;
      },
      nil);
  [self resumeTimer:entry];
  [self layout];
}

@end
