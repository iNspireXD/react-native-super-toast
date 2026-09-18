#import <UIKit/UIKit.h>

#import "SuperToastConfig.h"

NS_ASSUME_NONNULL_BEGIN

@class SuperToastView;

@protocol SuperToastViewDelegate <NSObject>
- (void)toastViewDidPress:(SuperToastView *)view;
- (void)toastViewDidPressAction:(SuperToastView *)view;
- (void)toastViewDidPressCancel:(SuperToastView *)view;
- (void)toastViewDidPressClose:(SuperToastView *)view;
- (void)toastViewDidBeginSwipe:(SuperToastView *)view;
/** Offset along the swipe axis. Negative values move towards dismissal. */
- (void)toastView:(SuperToastView *)view didSwipeToOffset:(CGFloat)offset;
/** `velocity` is in points per second, normalized like `offset`. */
- (void)toastView:(SuperToastView *)view didEndSwipeAtOffset:(CGFloat)offset velocity:(CGFloat)velocity;
@end

/** Toast card with an icon, title, description, buttons, and close control. */
@interface SuperToastView : UIView

@property (nonatomic, strong, readonly) SuperToastConfig *config;

- (instancetype)initWithConfig:(SuperToastConfig *)config delegate:(id<SuperToastViewDelegate>)delegate;

- (CGFloat)heightForWidth:(CGFloat)width;

/** Converts a normalized swipe offset into a screen translation. */
- (CGAffineTransform)transformForSwipeOffset:(CGFloat)offset;

- (void)wiggle;

@end

NS_ASSUME_NONNULL_END
